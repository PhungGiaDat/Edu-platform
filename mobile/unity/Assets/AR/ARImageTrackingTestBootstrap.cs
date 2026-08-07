using System;
using System.Collections;
using UnityEngine;
using UnityEngine.XR.ARFoundation;
using UnityEngine.XR.ARSubsystems;

/// <summary>
/// Creates the full AR test rig programmatically in the Editor.
/// No scene file GUIDs needed - everything is created at runtime.
/// Attach to any GameObject in an empty scene.
///
/// Usage:
///   1. Create empty scene
///   2. Add any GameObject (e.g. "ARTools")
///   3. Attach this component
///   4. Play - AR rig auto-creates
///   5. Press F5 to simulate image detection
/// </summary>
public class ARImageTrackingTestBootstrap : MonoBehaviour
{
    [Header("Elephant Assets")]
    [SerializeField] private string elephantCardUrl =
        "https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/assets/flashcards/elephant_card.png";

    [SerializeField] private string elephantGlbUrl =
        "https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/pets/models/animal-elephant.glb";

    [Header("Physical dimensions")]
    [SerializeField] private float physicalWidthMeters = 0.15f;
    [SerializeField] private Vector3 modelScale = new Vector3(0.3f, 0.3f, 0.3f);

    // Components created at runtime
    private UnityEngine.XR.ARFoundation.ARSession _arSession;
    private UnityEngine.XR.ARFoundation.ARTrackedImageManager _imageManager;
    private GLBLoader _glbLoader;
    private GameObject _markerCube;
    private GameObject _elephantModel;
    private GameObject _placeholderGo;
    private Texture2D _downloadedTexture;
    private bool _imageAdded;
    private string _statusText = "Initializing...";
    private string _trackingLine = "";

    // Key bindings for Editor testing
    private int _spawnIdx;

    private void Start()
    {
        StartCoroutine(SetupARRig());
    }

    private void Update()
    {
        // F5 = simulate image detected
        if (Input.GetKeyDown(KeyCode.F5))
        {
            if (_imageAdded)
                SimulateImageDetected();
            else
                Debug.LogWarning("[Test] Image not yet added to library. Wait for AR Ready.");
        }
        // F6 = simulate image lost
        if (Input.GetKeyDown(KeyCode.F6))
        {
            SimulateImageLost();
        }
        // F7 = cycle spawn position
        if (Input.GetKeyDown(KeyCode.F7))
        {
            CycleSpawnPosition();
        }
    }

    private IEnumerator SetupARRig()
    {
        // Add GLBLoader
        _glbLoader = gameObject.AddComponent<GLBLoader>();

        // Find or create ARSession
        var existingSession = UnityEngine.Object.FindFirstObjectByType<UnityEngine.XR.ARFoundation.ARSession>();
        if (existingSession != null)
        {
            _arSession = existingSession;
            Debug.Log("[Bootstrap] Using existing ARSession");
        }
        else
        {
            var sessionGo = new GameObject("ARSession");
            _arSession = sessionGo.AddComponent<UnityEngine.XR.ARFoundation.ARSession>();
            Debug.Log("[Bootstrap] Created new ARSession");
        }

        // Add ARTrackedImageManager (reuse if already exists)
        _imageManager = FindFirstObjectByType<UnityEngine.XR.ARFoundation.ARTrackedImageManager>();
        if (_imageManager == null)
        {
            _imageManager = _arSession.gameObject.AddComponent<UnityEngine.XR.ARFoundation.ARTrackedImageManager>();
            Debug.Log("[Bootstrap] Created new ARTrackedImageManager");
        }
        else
        {
            Debug.Log("[Bootstrap] Using existing ARTrackedImageManager");
        }

        // Check capability (skip in Editor - AR provider not available on Windows)
        bool isEditor = Application.isEditor;
        if (!isEditor && _imageManager.descriptor == null)
        {
            Fail("ARTrackedImageManager descriptor is null. AR Image Tracking may not be available.");
            yield break;
        }

        if (!isEditor && _imageManager.descriptor != null && !_imageManager.descriptor.supportsMutableLibrary)
        {
            Fail("Provider does not support mutable image library.");
            yield break;
        }

        Debug.Log("[Bootstrap] Capability OK. Downloading reference image...");
        _statusText = "Downloading elephant_card.png...";

        // Download reference image
        yield return DownloadImage(elephantCardUrl);
        if (_downloadedTexture == null) yield break;

        // Skip mutable library work in Editor (provider unavailable on Windows)
        if (isEditor)
        {
            Debug.Log("[Bootstrap] Editor mode - skipping runtime library setup.");
            Debug.Log("[Bootstrap] Spawning EditorMockImageDetector for manual testing...");

            // Spawn mock detector so user can press Space to fire events
            var mockGo = new GameObject("EditorMockImageDetector");
            mockGo.AddComponent<EditorMockImageDetector>();
            // EditorMockImageDetector auto-finds ARTrackedImageManager in Awake()

            // Still subscribe to trackablesChanged for the editor-mock path
            _imageManager.trackablesChanged.AddListener(OnTrackablesChanged);

            _imageAdded = true;
            _statusText = "EDITOR MODE (No AR provider)\n\nPress F5 = simulate detection\nF6 = simulate lost\nF7 = cycle spawn pos";

            // GLB intentionally NOT preloaded in Editor - too heavy, locks editor.
            // Spawn a lightweight placeholder cube so user can verify pipeline instantly.
            _placeholderGo = GameObject.CreatePrimitive(PrimitiveType.Cube);
            _placeholderGo.name = "PlaceholderCube";
            _placeholderGo.transform.localScale = Vector3.one * 0.1f;
            var rend = _placeholderGo.GetComponent<Renderer>();
            if (rend != null) rend.material.color = new Color(0.6f, 0.4f, 0.2f); // brown, like elephant
            _placeholderGo.SetActive(false); // hidden until mock detect fires
            yield break;
        }

        // Create runtime library (may throw NotSupportedException on platforms without AR provider)
        UnityEngine.XR.ARSubsystems.RuntimeReferenceImageLibrary lib;
        try
        {
            lib = _imageManager.CreateRuntimeLibrary();
        }
        catch (System.Exception ex)
        {
            Fail("CreateRuntimeLibrary failed: " + ex.Message);
            yield break;
        }
        if (lib == null)
        {
            Fail("CreateRuntimeLibrary returned null.");
            yield break;
        }

        var mutableLib = lib as UnityEngine.XR.ARSubsystems.MutableRuntimeReferenceImageLibrary;

        if (mutableLib == null)
        {
            Fail("Runtime library is not mutable.");
            yield break;
        }

        _statusText = "Adding image to library...";
        Debug.Log("[Bootstrap] Adding image to runtime library...");

        // Add image (extension method on MutableRuntimeReferenceImageLibrary)
        var jobState = mutableLib.ScheduleAddImageWithValidationJob(_downloadedTexture, "elephant_card", physicalWidthMeters);

        // Wait for job completion using extension method IsComplete
        while (!jobState.status.IsComplete())
        {
            yield return null;
        }

        var status = jobState.status;
        if (status == UnityEngine.XR.ARSubsystems.AddReferenceImageJobStatus.ErrorInvalidImage)
        {
            Fail("Image validation failed - try a higher-contrast image.");
            yield break;
        }
        if (status == UnityEngine.XR.ARSubsystems.AddReferenceImageJobStatus.ErrorUnknown)
        {
            Fail("Unknown error adding image.");
            yield break;
        }
        if (status == UnityEngine.XR.ARSubsystems.AddReferenceImageJobStatus.ErrorDuplicateImage)
        {
            Fail("Image already in library.");
            yield break;
        }
        if (status != UnityEngine.XR.ARSubsystems.AddReferenceImageJobStatus.Success)
        {
            Fail("Image add failed: " + status);
            yield break;
        }

        _imageAdded = true;
        _statusText = "AR Ready!\nF5 = Simulate detection\nF6 = Simulate lost\nF7 = Cycle position";
        Debug.Log("[Bootstrap] Image added. AR Ready. Press F5 to simulate detection.");

        // Pre-load elephant GLB
        StartCoroutine(PreloadElephantGLB());

        // Subscribe to tracked images
        _imageManager.trackablesChanged.AddListener(OnTrackablesChanged);
    }

    private IEnumerator DownloadImage(string url)
    {
        using (var req = UnityEngine.Networking.UnityWebRequest.Get(url))
        {
            var op = req.SendWebRequest();
            while (!op.isDone) yield return null;

            if (req.result != UnityEngine.Networking.UnityWebRequest.Result.Success)
            {
                Fail("Download failed: " + req.error);
                yield break;
            }

            _downloadedTexture = new Texture2D(2, 2);
            _downloadedTexture.LoadImage(req.downloadHandler.data);
            Debug.Log("[Bootstrap] Texture: " + _downloadedTexture.width + "x" + _downloadedTexture.height);
        }
    }

    private IEnumerator PreloadElephantGLB()
    {
        if (_elephantModel != null) yield break;

        Debug.Log("[Bootstrap] Pre-loading elephant GLB...");
        _statusText = "AR Ready!\nLoading elephant.glb...";

        var task = _glbLoader.LoadGLB(elephantGlbUrl);
        yield return new WaitUntil(() => task.IsCompleted);

        if (task.IsFaulted)
        {
            var ex = task.Exception?.InnerException ?? task.Exception;
            Debug.LogError("[Bootstrap] GLB failed: " + (ex?.Message ?? "unknown"));
            _statusText = "AR Ready! (GLB load failed - F5 shows cube fallback)";
            yield break;
        }

        var go = task.Result;
        if (go != null)
        {
            go.SetActive(false);
            go.transform.localScale = modelScale;
            _elephantModel = go;
            Debug.Log("[Bootstrap] Elephant GLB ready: " + go.name);
        }
    }

    /// <summary>
    /// Fast-path: spawn the small placeholder cube at the mock image's pose.
    /// Used in Editor mode where the GLB would block Unity for several seconds.
    /// </summary>
    private void SpawnPlaceholder(Vector3 position, Quaternion rotation)
    {
        if (_placeholderGo == null) return;
        // Don't destroy between sessions so position rotation persists; just reactivate
        _placeholderGo.transform.SetPositionAndRotation(position, rotation);
        _placeholderGo.SetActive(true);
        Debug.Log($"[Bootstrap] Placeholder cube spawned at {position}");
    }

    private void OnTrackablesChanged(UnityEngine.XR.ARFoundation.ARTrackablesChangedEventArgs<UnityEngine.XR.ARFoundation.ARTrackedImage> changes)
    {
        foreach (var img in changes.added) HandleTrackedImage(img);
        foreach (var img in changes.updated) HandleTrackedImage(img);
        foreach (var img in changes.removed)
        {
            if (_elephantModel != null) _elephantModel.SetActive(false);
            if (_markerCube != null) _markerCube.SetActive(false);
            _trackingLine = "Tracking lost";
        }
    }

    private void HandleTrackedImage(UnityEngine.XR.ARFoundation.ARTrackedImage img)
    {
        if (img == null) return;

        if (img.trackingState == UnityEngine.XR.ARSubsystems.TrackingState.None)
        {
            if (_elephantModel != null) _elephantModel.SetActive(false);
            if (_markerCube != null) _markerCube.SetActive(false);
            if (_placeholderGo != null) _placeholderGo.SetActive(false);
            _trackingLine = "Tracking lost";
            return;
        }

        bool tracking = img.trackingState == UnityEngine.XR.ARSubsystems.TrackingState.Tracking;
        var imgName = img.referenceImage != null ? img.referenceImage.name : "?";
        _trackingLine = "TRACKING: " + imgName + " [" + img.trackingState + "]";

        // Priority: real GLB elephant > placeholder cube (Editor fast-path) > marker
        if (_elephantModel != null)
        {
            _elephantModel.SetActive(tracking);
            if (tracking)
            {
                _elephantModel.transform.SetPositionAndRotation(img.transform.position, img.transform.rotation);
            }
        }
        else if (_placeholderGo != null)
        {
            // Fast fallback used while/if the GLB never loads (e.g. heavy model,
            // no network, or Editor mode where preloading was skipped to keep Unity responsive).
            if (tracking)
            {
                SpawnPlaceholder(img.transform.position, img.transform.rotation);
            }
            else
            {
                _placeholderGo.SetActive(false);
            }
        }

        if (_elephantModel != null)
        {
            _elephantModel.SetActive(tracking);
            if (tracking)
            {
                _elephantModel.transform.SetPositionAndRotation(img.transform.position, img.transform.rotation);
            }
        }
        else
        {
            ShowMarkerCube(img, tracking);
        }
    }

    private void ShowMarkerCube(UnityEngine.XR.ARFoundation.ARTrackedImage img, bool show)
    {
        if (_markerCube == null)
        {
            _markerCube = GameObject.CreatePrimitive(UnityEngine.PrimitiveType.Cube);
            _markerCube.transform.localScale = UnityEngine.Vector3.one * 0.05f;
            UnityEngine.Object.Destroy(_markerCube.GetComponent<UnityEngine.Collider>());
        }
        _markerCube.SetActive(show);
        if (show)
        {
            _markerCube.transform.SetPositionAndRotation(img.transform.position, img.transform.rotation);
        }
    }

    // ============================================================
    // EDITOR MOCK: simulate detection without real AR camera
    // ============================================================

    private void SimulateImageDetected()
    {
        Debug.Log("[Mock] Simulating image detected...");

        // Use EditorMockImageDetector if available
        var detector = UnityEngine.Object.FindFirstObjectByType<EditorMockImageDetector>();
        if (detector != null)
        {
            detector.SimulateDetection();
        }
        else
        {
            // Manual simulation: create a mock tracked image
            Debug.LogWarning("[Mock] EditorMockImageDetector not found. Creating manual mock...");
            CreateManualMockImage();
        }
    }

    private void CreateManualMockImage()
    {
        var mockGo = new GameObject("MockTrackedImage");
        var mockImage = mockGo.AddComponent<UnityEngine.XR.ARFoundation.ARTrackedImage>();
        mockImage.transform.position = new UnityEngine.Vector3(0, 0, 1.5f);
        mockImage.transform.rotation = UnityEngine.Quaternion.identity;

        // We can't directly create ARTrackedImage with tracking state
        // So this is limited - the proper way is via EditorMockImageDetector
        UnityEngine.Object.Destroy(mockGo, 2f);
    }

    private void SimulateImageLost()
    {
        Debug.Log("[Mock] Simulating image lost...");
        var detector = UnityEngine.Object.FindFirstObjectByType<EditorMockImageDetector>();
        if (detector != null)
        {
            detector.SimulateTrackingLost();
        }
    }

    private void CycleSpawnPosition()
    {
        UnityEngine.Vector3[] positions = new UnityEngine.Vector3[] {
            new UnityEngine.Vector3(0, 0, 1.5f),
            new UnityEngine.Vector3(0.8f, 0, 1.0f),
            new UnityEngine.Vector3(-0.8f, 0, 1.0f),
            new UnityEngine.Vector3(0, 0, 0.5f),
        };

        _spawnIdx = (_spawnIdx + 1) % positions.Length;
        var pos = positions[_spawnIdx];

        if (_elephantModel != null)
        {
            _elephantModel.transform.position = pos;
            Debug.Log("[Test] Elephant repositioned to: " + pos);
        }
        if (_markerCube != null)
        {
            _markerCube.transform.position = pos;
        }
    }

    private void Fail(string msg)
    {
        _statusText = "ERROR:\n" + msg;
        Debug.LogError("[Bootstrap] " + msg);
    }

    private void OnGUI()
    {
        float w = Screen.width;
        float boxW = Math.Min(w - 40f, 640f);
        float boxH = 320f;
        float x = (w - boxW) / 2f;
        float y = 20f;

        var boxStyle = new GUIStyle(GUI.skin.box) { fontSize = 20, alignment = TextAnchor.MiddleCenter };
        var labelStyle = new GUIStyle(GUI.skin.label) { fontSize = 18, wordWrap = true, alignment = TextAnchor.UpperLeft };

        GUI.Box(new Rect(x, y, boxW, boxH), "", boxStyle);
        GUI.Label(new Rect(x + 15, y + 10, boxW - 30, 60),
            "[AR Elephant Test]\n" + elephantCardUrl, boxStyle);
        GUI.Label(new Rect(x + 15, y + 80, boxW - 30, 160), _statusText, labelStyle);

        if (!string.IsNullOrEmpty(_trackingLine))
        {
            var color = _trackingLine.Contains("TRACKING") ? UnityEngine.Color.yellow :
                        _trackingLine.Contains("DETECTED") ? UnityEngine.Color.green : UnityEngine.Color.red;
            var prev = GUI.contentColor;
            GUI.contentColor = color;
            GUI.Label(new Rect(x + 15, y + 250, boxW - 30, 50), _trackingLine,
                new GUIStyle(GUI.skin.label) { fontSize = 22, alignment = TextAnchor.MiddleCenter, fontStyle = UnityEngine.FontStyle.Bold });
            GUI.contentColor = prev;
        }
    }
}
