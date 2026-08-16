using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using UnityEngine;
using UnityEngine.XR.ARFoundation;

/// <summary>
/// Top-level orchestrator for the AR experience using image tracking.
/// 1. Receives loadARExperience(json) from RN
/// 2. Starts image tracking session
/// 3. Waits for onImageDetected
/// 4. Loads GLB via GLBLoader
/// 5. Spawns model as child of tracked image
/// 6. Plays animation + audio
/// </summary>
public class ARExperienceHandler : MonoBehaviour
{
    [SerializeField] private ARSessionManager sessionManager;
    [SerializeField] private GLBLoader glbLoader;
    [SerializeField] private ModelSpawner modelSpawner;
    [SerializeField] private AnimationController animationController;
    [SerializeField] private ARAudioPlayer audioPlayer;
    [SerializeField] private ARGestureHandler gestureHandler;
    [SerializeField] private PlaneDetection planeDetection;
    [SerializeField] private ComboManager comboManager;
    [SerializeField] private PetController petController;

    private ARExperiencePayload? _currentPayload;
    private readonly Dictionary<string, ARTrackedImage> _trackedImages = new();
    private readonly Dictionary<string, GameObject> _spawnedModels = new();

    private void Awake()
    {
        AutoWire();
        SubscribeEvents();
    }

    private void AutoWire()
    {
        if (sessionManager == null) sessionManager = FindFirstObjectByType<ARSessionManager>();
        if (glbLoader == null) glbLoader = FindFirstObjectByType<GLBLoader>();
        if (modelSpawner == null) modelSpawner = FindFirstObjectByType<ModelSpawner>();
        if (animationController == null) animationController = FindFirstObjectByType<AnimationController>();
        if (audioPlayer == null) audioPlayer = FindFirstObjectByType<ARAudioPlayer>();
        if (gestureHandler == null) gestureHandler = FindFirstObjectByType<ARGestureHandler>();
        if (planeDetection == null) planeDetection = FindFirstObjectByType<PlaneDetection>();
        if (comboManager == null) comboManager = FindFirstObjectByType<ComboManager>();
        if (petController == null) petController = FindFirstObjectByType<PetController>();
    }

    private void SubscribeEvents()
    {
        if (sessionManager != null) {
            sessionManager.OnArReady += HandleArReady;
            sessionManager.OnImageDetected += HandleImageDetected;
            sessionManager.OnImageTrackingLost += HandleImageTrackingLost;
            sessionManager.OnMultiImageDetected += HandleMultiImageDetected;
            sessionManager.OnError += HandleError;
        }
        if (gestureHandler != null) {
            gestureHandler.OnInteraction += HandleInteraction;
        }
    }

    private void OnDestroy()
    {
        if (sessionManager != null) {
            sessionManager.OnArReady -= HandleArReady;
            sessionManager.OnImageDetected -= HandleImageDetected;
            sessionManager.OnImageTrackingLost -= HandleImageTrackingLost;
            sessionManager.OnMultiImageDetected -= HandleMultiImageDetected;
            sessionManager.OnError -= HandleError;
        }
        if (gestureHandler != null) {
            gestureHandler.OnInteraction -= HandleInteraction;
        }
    }

    private void HandleArReady(string version)
    {
        UnityEngine.Debug.Log($"[ARExperienceHandler] AR ready: {version}");
    }

    private void HandleImageDetected(string imageId, Vector3 position)
    {
        if (_currentPayload == null) return;
        if (_trackedImages.ContainsKey(imageId)) return;

        // Get the ARTrackedImage reference for proper image-tracking placement
        ARTrackedImage trackedImage = null;
        if (sessionManager != null) {
            trackedImage = sessionManager.GetTrackedImage(imageId);
        }

        // Track the position
        _trackedImages[imageId] = trackedImage;

        UnityEngine.Debug.Log($"[ARExperienceHandler] Image detected: {imageId} at {position}");

        SpawnModelAtImage(imageId, position, trackedImage).ContinueWith(t => {
            if (t.IsFaulted && t.Exception != null) {
                var ex = t.Exception.InnerException ?? t.Exception;
                RNEventEmitter.Instance.SendEvent("onError", new {
                    code = "MODEL_LOAD_FAILED",
                    message = ex.Message
                });
            }
        }, TaskScheduler.Default);
    }

    private void HandleImageTrackingLost(string imageId)
    {
        UnityEngine.Debug.Log($"[ARExperienceHandler] Image tracking lost: {imageId}");
        _trackedImages.Remove(imageId);

        if (_spawnedModels.TryGetValue(imageId, out var model)) {
            _spawnedModels.Remove(imageId);
        }

        comboManager?.UnregisterTrackedImage(imageId);
    }

    private void HandleMultiImageDetected(string[] imageIds, int count)
    {
        UnityEngine.Debug.Log($"[ARExperienceHandler] Multi-image detected: {count}");
        RNEventEmitter.Instance.SendEvent("onMultiImageDetected", new {
            imageIds = imageIds,
            count = count
        });
    }

    private void HandleError(string error)
    {
        RNEventEmitter.Instance.SendEvent("onError", new {
            code = "SESSION_FAILED",
            message = error
        });
    }

    /// <summary>
    /// Entry point: called by RNMessageReceiver when RN sends loadARExperience.
    /// Parses payload and starts the AR session.
    /// </summary>
    public void LoadARExperience(string json)
    {
        UnityEngine.Debug.Log("[ARExperienceHandler] LoadARExperience called");
        try {
            _currentPayload = ARPayloadMapper.Parse(json);
            var payload = _currentPayload.Value;
            UnityEngine.Debug.Log($"[ARExperienceHandler] QrId={payload.QrId}, Word={payload.Word}, ModelUrl={payload.ModelUrl}");

            sessionManager?.InitSession();
        } catch (Exception ex) {
            UnityEngine.Debug.LogError($"[ARExperienceHandler] Load failed: {ex.Message}");
            RNEventEmitter.Instance.SendEvent("onError", new {
                code = "SESSION_FAILED",
                message = $"LoadARExperience failed: {ex.Message}"
            });
        }
    }

    /// <summary>
    /// Entry point for image tracking: called by RN via startImageTracking.
    /// </summary>
    public void StartImageTracking()
    {
        UnityEngine.Debug.Log("[ARExperienceHandler] StartImageTracking called");
        sessionManager?.InitSession();
    }

    private async Task SpawnModelAtImage(string imageId, Vector3 position, ARTrackedImage trackedImage = null)
    {
        if (_currentPayload == null) return;
        var payload = _currentPayload.Value;

        try {
            var modelPrefab = await glbLoader.LoadGLB(payload.ModelUrl);
            if (modelPrefab == null) return;

            GameObject spawned;
            if (trackedImage != null) {
                // Image tracking: parent model to the tracked image so it follows the card
                spawned = modelSpawner.SpawnOnTrackedImage(modelPrefab, trackedImage, payload.Rotation, payload.Scale);
            } else {
                // Fallback: world-space placement
                spawned = modelSpawner.Spawn(modelPrefab, position, payload.Rotation, payload.Scale);
            }

            _spawnedModels[imageId] = spawned;

            // Register with combo manager if available
            comboManager?.RegisterTrackedImage(trackedImage, spawned);

            RNEventEmitter.Instance.SendEvent("onObjectPlaced", new {
                qrId = payload.QrId,
                worldX = position.x,
                worldY = position.y,
                worldZ = position.z
            });

            RNEventEmitter.Instance.SendEvent("onModelLoaded", new {
                modelUrl = payload.ModelUrl,
                modelName = modelPrefab.name
            });

            if (animationController != null) {
                animationController.DiscoverClips();
                animationController.PlayAnimation(payload.AnimationType);
            }

            if (audioPlayer != null && !string.IsNullOrEmpty(payload.AudioUrl)) {
                await audioPlayer.PlayAudio(payload.AudioUrl);
            }
        } catch (Exception ex) {
            UnityEngine.Debug.LogError($"[ARExperienceHandler] SpawnModelAtImage failed: {ex.Message}");
            RNEventEmitter.Instance.SendEvent("onError", new {
                code = "MODEL_LOAD_FAILED",
                message = ex.Message
            });
        }
    }

    private void HandleInteraction(string type, string qrId)
    {
        UnityEngine.Debug.Log($"[ARExperienceHandler] Interaction: {type}");
        RNEventEmitter.Instance.SendEvent("onInteraction", new { type, qrId });
    }

    /// <summary>
    /// Initializes the AR session.
    /// </summary>
    public void InitSession()
    {
        sessionManager?.InitSession();
    }

    /// <summary>
    /// Pauses the AR session.
    /// </summary>
    public void PauseSession()
    {
        sessionManager?.PauseSession();
    }

    /// <summary>
    /// Enables or disables plane detection at runtime. Wired from
    /// <see cref="RNMessageReceiver"/> via `setPlaneDetection`.
    /// </summary>
    public void SetPlaneDetection(bool enabled)
    {
        UnityEngine.Debug.Log($"[ARExperienceHandler] SetPlaneDetection({enabled})");
        planeDetection?.SetEnabled(enabled);
    }

    /// <summary>
    /// Resumes the AR session.
    /// </summary>
    public void ResumeSession()
    {
        sessionManager?.ResumeSession();
    }

    /// <summary>
    /// Destroys the session and cleans up.
    /// </summary>
    public void DestroySession()
    {
        UnityEngine.Debug.Log("[ARExperienceHandler] DestroySession");
        modelSpawner?.Clear();
        glbLoader?.CancelLoad();
        sessionManager?.StopSession();
        _currentPayload = null;
        _trackedImages.Clear();
        _spawnedModels.Clear();
    }
}
