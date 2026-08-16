using System;
using System.IO;
using System.Reflection;
using System.Threading.Tasks;
using UnityEngine;
using UnityEngine.Networking;
using GLTFast;

/// <summary>
/// Loads GLB files at runtime from a URL using GLTFast.
/// Caches downloaded files to Application.temporaryCachePath.
/// </summary>
public class GLBLoader : MonoBehaviour
{
    private const string CACHE_DIR = "GLBCache/";
    private GltfImport _gltf;
    private GameObject _loadedModel;
    private AnimationClip[] _animationClips;
    private System.Threading.CancellationTokenSource _cts;

    /// <summary>
    /// Loads a GLB model from the given URL, using local cache if available.
    /// Returns the loaded GameObject or null on failure.
    /// Accepts an optional CancellationToken to allow callers to cancel the load.
    /// </summary>
    public async Task<GameObject> LoadGLB(string url, Transform parent = null, System.Threading.CancellationToken externalToken = default) {
        if (string.IsNullOrEmpty(url)) {
            RNEventEmitter.Instance.SendEvent("onError", new {
                code = "MODEL_LOAD_FAILED",
                message = "Model URL is empty"
            });
            return null;
        }

        UnityEngine.Debug.Log($"[GLBLoader] Loading: {url}");

        // Cancel any previous load that may still be running
        if (_cts != null) {
            _cts.Cancel();
            _cts.Dispose();
        }
        _cts = System.Threading.CancellationTokenSource.CreateLinkedTokenSource(externalToken);
        var token = _cts.Token;

        try {
            // Check cache first
            var localPath = GetCachedPath(url);

            var download = await TryDownload(url, localPath, token);
            if (!download.success) {
                throw new Exception(download.error);
            }

            // Dispose any previously loaded import before replacing it
            if (_gltf != null) {
                _gltf.Dispose();
                _gltf = null;
            }

            // GltfImport installs a default TimeBudgetPerFrameDeferAgent so large
            // GLBs are loaded across frames without blocking the main thread.
            _gltf = new GltfImport();
            var success = await _gltf.Load(download.uri, cancellationToken: token);

            if (!success) {
                throw new Exception($"GLTFast failed to load: {url}");
            }

            var go = new GameObject("GLBModel");
            if (parent != null) go.transform.SetParent(parent);
            go.SetActive(false);

            await _gltf.InstantiateMainSceneAsync(go.transform, token);

            // Retrieve animation clips from GLTFast and wire them into the scene Animator.
            // This must happen after InstantiateMainSceneAsync so that the Animator component
            // has been added to the scene root by GLTFast's GameObjectInstantiator.
#if UNITY_ANIMATION
            _animationClips = _gltf.GetAnimationClips();
            UnityEngine.Debug.Log($"[GLBLoader] _gltf.GetAnimationClips() returned {( _animationClips == null ? "null" : _animationClips.Length.ToString() )} clip(s)");
            if (_animationClips != null)
            {
                foreach (var clip in _animationClips)
                {
                    UnityEngine.Debug.Log($"[GLBLoader]   clip: {clip?.name}");
                }
            }

            // Diagnostic: enumerate Animator components in instantiated scene
            var animators = go.GetComponentsInChildren<Animator>(true);
            UnityEngine.Debug.Log($"[GLBLoader] Found {animators.Length} Animator component(s) in instantiated scene");
            foreach (var a in animators)
            {
                UnityEngine.Debug.Log($"[GLBLoader]   Animator on {a.gameObject.name}: runtimeController={(a.runtimeAnimatorController != null ? a.runtimeAnimatorController.name : "null")}");
            }

            if (_animationClips != null && _animationClips.Length > 0)
            {
                WireAnimationsToAnimator(go);
            }
#endif

            _loadedModel = go;
            UnityEngine.Debug.Log($"[GLBLoader] Loaded successfully: {url}");
            return go;
        } catch (OperationCanceledException) {
            UnityEngine.Debug.Log("[GLBLoader] Load cancelled");
            return null;
        } catch (Exception ex) {
            var msg = $"GLB load failed: {ex.Message}";
            UnityEngine.Debug.LogError($"[GLBLoader] {msg}");
            RNEventEmitter.Instance.SendEvent("onError", new {
                code = "MODEL_LOAD_FAILED",
                message = msg
            });
            return null;
        }
    }

    private string GetCachedPath(string url) {
        var filename = Path.GetFileName(url);
        var cacheDir = Path.Combine(Application.temporaryCachePath, CACHE_DIR);
        var localFile = Path.Combine(cacheDir, filename);

        if (File.Exists(localFile)) {
            UnityEngine.Debug.Log($"[GLBLoader] Using cached: {localFile}");
            return localFile;
        }
        return null;
    }

    private async Task<(bool success, string uri, string error)> TryDownload(
        string url, string cachedPath, System.Threading.CancellationToken token) {
        try {
            if (!string.IsNullOrEmpty(cachedPath)) {
                return (true, $"file://{cachedPath}", null);
            }

            var filename = Path.GetFileName(url);
            var cacheDir = Path.Combine(Application.temporaryCachePath, CACHE_DIR);
            Directory.CreateDirectory(cacheDir);
            var localFile = Path.Combine(cacheDir, filename);

            using var request = UnityWebRequest.Get(url);
            request.downloadHandler = new DownloadHandlerFile(localFile);

            var operation = request.SendWebRequest();
            while (!operation.isDone && !token.IsCancellationRequested) {
                await Task.Delay(100, token);
            }

            if (token.IsCancellationRequested) {
                return (false, null, "Download cancelled");
            }

            if (request.result != UnityWebRequest.Result.Success) {
                return (false, null, request.error);
            }

            return (true, $"file://{localFile}", null);
        } catch (Exception ex) {
            return (false, null, ex.Message);
        }
    }

    /// <summary>
    /// Cancels any in-progress download or load. Safe to call when nothing is running.
    /// </summary>
    public void CancelLoad() {
        if (_cts != null) {
            try { _cts.Cancel(); } catch { /* already disposed */ }
        }
    }

    /// <summary>
    /// Returns the animation clips from the last successful GLB load, or null if no
    /// model has been loaded or the model had no animations.
    /// </summary>
    public AnimationClip[] GetAnimationClips() => _animationClips;

    /// <summary>
    /// Wires GLTFast-imported AnimationClips into the scene-root Animator by creating
    /// an AnimatorController via the internal static factory. This makes the clips
    /// discoverable via Animator.runtimeAnimatorController.animationClips so that
    /// <see cref="AnimationController.DiscoverClips"/> and
    /// <see cref="AnimationRegistry.Discover"/> work correctly.
    ///
    /// Uses reflection to access the internal AnimatorController.AllocateControllerForInspector
    /// API since it is not public. Falls back to logging a warning if the API is
    /// unavailable in this Unity version.
    ///
    /// Safe to call after <see cref="LoadGLB"/> has completed and the returned
    /// GameObject is active in the scene.
    /// </summary>
    public void WireAnimationsToAnimator(GameObject root)
    {
        if (_animationClips == null || root == null) return;

        var animator = root.GetComponent<Animator>();
        if (animator == null)
        {
            animator = root.AddComponent<Animator>();
        }

        if (animator.runtimeAnimatorController != null)
        {
            UnityEngine.Debug.LogWarning("[GLBLoader] Animator already has a RuntimeAnimatorController. Overwriting with GLTFast clips.");
        }

        // Use reflection to access the internal AnimatorController factory.
        // AnimatorController.AllocateControllerForInspector(AnimationClip[], GameObject) is
        // the mechanism GLTFast's own tests use for the same purpose.
        Type animatorControllerType = Type.GetType("UnityEngine.Animations.AnimatorController, UnityEngine.AnimationsModule");
        if (animatorControllerType == null)
        {
            // Fallback: try the non-internal variant (pre-2023 Unity)
            animatorControllerType = Type.GetType("UnityEngine.AnimatorController");
        }

        if (animatorControllerType == null)
        {
            UnityEngine.Debug.LogError("[GLBLoader] AnimatorController type not found. Animation wiring failed.");
            return;
        }

        MethodInfo allocateMethod = animatorControllerType.GetMethod(
            "AllocateControllerForInspector",
            BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Static,
            null,
            new[] { typeof(AnimationClip[]), typeof(GameObject) },
            null
        );

        if (allocateMethod == null)
        {
            UnityEngine.Debug.LogError("[GLBLoader] AnimatorController.AllocateControllerForInspector not found. Animation wiring failed.");
            return;
        }

        var controller = allocateMethod.Invoke(null, new object[] { _animationClips, root }) as RuntimeAnimatorController;
        animator.runtimeAnimatorController = controller;
        UnityEngine.Debug.Log($"[GLBLoader] Wired {_animationClips.Length} animation clips into Animator on {root.name}");
    }

    /// <summary>
    /// Releases the currently loaded GLB model and its animation clips.
    /// </summary>
    public void Unload() {
        if (_loadedModel != null) {
            Destroy(_loadedModel);
            _loadedModel = null;
        }
        if (_animationClips != null) {
            foreach (var clip in _animationClips) {
                if (clip != null) Destroy(clip);
            }
            _animationClips = null;
        }
        if (_gltf != null) {
            _gltf.Dispose();
            _gltf = null;
        }
    }
}
