using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.XR.ARFoundation;
using UnityEngine.XR.ARSubsystems;

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
    [SerializeField] private CardImageLibraryBuilder cardLibraryBuilder;
    [SerializeField] private MultiCardRegistry cardRegistry;
    [SerializeField] private ComboManager comboManager;
    [SerializeField] private QRScanner qrScanner;

    private ARExperiencePayload? _currentPayload;
    private readonly Dictionary<string, ARTrackedImage> _trackedImages = new();
    private readonly Dictionary<string, GameObject> _spawnedModels = new();
    // One GLBLoader per business card. A single shared loader cancels its previous
    // load on every new LoadGLB call, so two cards detected together would cancel
    // each other; a per-qrId loader keeps concurrent model binding deterministic.
    // The deterministic TrackableId -> qrId map lives in MultiCardRegistry
    // (BindTrackable / TryUnbindTrackable) — the single source of truth.
    private readonly Dictionary<string, GLBLoader> _loaderByQr = new();

    // P6: Parses the relatedCombos field from startImageTrackingMulti JSON.
    // JsonUtility.FromJson requires top-level object, so we use a dedicated wrapper.
    [Serializable]
    private class RelatedCombosWrapper
    {
        public RelatedComboDto[] relatedCombos = Array.Empty<RelatedComboDto>();
    }

    [Serializable]
    private class RelatedComboDto
    {
        // Field names match JSON keys from backend related_combos array.
        public string comboId = "";
        public string[] requiredTags = Array.Empty<string>();
        public int bonusXp;
        public string semanticResult = "";
        public string animation = "";
        public string phrase = "";
        public bool active = true;
        public string centerTransform = "";
    }

    private void Awake()
    {
        SubscribeEvents();
    }

    private void Start()
    {
        // Defer AutoWire to Start (not Awake) so that tests can add sibling components
        // via AddComponent before AutoWire runs. Unity calls all Awake() methods before
        // any Start() method, so by the time this runs, FindFirstObjectByType will find
        // all sibling components on the same GameObject regardless of AddComponent order.
        AutoWire();
    }

    /// <summary>Wires sibling components via GetComponent/FindFirstObjectByType. Called
    /// automatically in Start(), but can be called manually in EditMode tests where the
    /// Unity frame lifecycle is not active.</summary>
    public void AutoWire()
    {
        if (sessionManager == null) sessionManager = FindFirstObjectByType<ARSessionManager>();
        if (glbLoader == null) glbLoader = FindFirstObjectByType<GLBLoader>();
        if (modelSpawner == null) modelSpawner = FindFirstObjectByType<ModelSpawner>();
        if (animationController == null) animationController = FindFirstObjectByType<AnimationController>();
        if (audioPlayer == null) audioPlayer = FindFirstObjectByType<ARAudioPlayer>();
        if (gestureHandler == null) gestureHandler = FindFirstObjectByType<ARGestureHandler>();
        if (planeDetection == null) planeDetection = FindFirstObjectByType<PlaneDetection>();
        if (cardLibraryBuilder == null) cardLibraryBuilder = FindFirstObjectByType<CardImageLibraryBuilder>();
        // Use GetComponent (same GameObject) instead of FindFirstObjectByType (global) —
        // GetComponent finds sibling components immediately, even before Start() runs.
        if (cardRegistry == null) cardRegistry = GetComponent<MultiCardRegistry>();
        if (qrScanner == null) qrScanner = FindFirstObjectByType<QRScanner>();
    }

    private void SubscribeEvents()
    {
        if (sessionManager != null) {
            sessionManager.OnArReady += HandleArReady;
            sessionManager.OnTrackedImageAdded += HandleTrackedImageAdded;
            sessionManager.OnTrackedImageRemoved += HandleTrackedImageRemoved;
            sessionManager.OnMultiImageDetected += HandleMultiImageDetected;
            sessionManager.OnError += HandleError;
        }
        if (cardLibraryBuilder != null) {
            cardLibraryBuilder.OnCardFailed += HandleCardFailed;
            cardLibraryBuilder.OnLibraryReady += HandleLibraryReady;
        }
        if (qrScanner != null) {
            qrScanner.OnQrDecoded += HandleQrDecoded;
        }
    }

    private void OnDestroy()
    {
        if (sessionManager != null) {
            sessionManager.OnArReady -= HandleArReady;
            sessionManager.OnTrackedImageAdded -= HandleTrackedImageAdded;
            sessionManager.OnTrackedImageRemoved -= HandleTrackedImageRemoved;
            sessionManager.OnMultiImageDetected -= HandleMultiImageDetected;
            sessionManager.OnError -= HandleError;
        }
        if (cardLibraryBuilder != null) {
            cardLibraryBuilder.OnCardFailed -= HandleCardFailed;
            cardLibraryBuilder.OnLibraryReady -= HandleLibraryReady;
        }
        if (qrScanner != null) {
            qrScanner.OnQrDecoded -= HandleQrDecoded;
        }
        if (gestureHandler != null) {
            gestureHandler.OnInteraction -= HandleInteraction;
        }
    }

    private void HandleCardFailed(string qrId, string code, string detail)
    {
        UnityEngine.Debug.LogWarning($"[ARExperienceHandler] Card '{qrId}' failed: {code} — {detail}");
        RNEventEmitter.Instance.SendEvent("onError", new { code, message = $"{qrId}: {detail}" });
    }

    /// <summary>
    /// Fired after CardImageLibraryBuilder finishes building the mutable runtime
    /// reference-image library and enables the ARTrackedImageManager.
    /// Signals AR_READY to RN — tracking is now active.
    /// </summary>
    private void HandleLibraryReady()
    {
        UnityEngine.Debug.Log("[ARExperienceHandler] Library ready — emitting onArReady");
        RNEventEmitter.Instance.SendEvent("onArReady", new { version = "1.0" });
    }

    /// <summary>
    /// Unity QRScanner decoded a QR code. Forward to RN for backend resolution.
    ///
    /// Runtime path:
    ///   QRScanner → HandleQrDecoded → RNEventEmitter → React Native
    ///   → flashcardApi.getFlashcard(qrId) → startImageTrackingMulti
    ///   → CardImageLibraryBuilder → MutableRuntimeReferenceImageLibrary → ARTrackedImageManager
    ///
    /// On successful resolution, RN calls onCardResolved(qrId, true) back to Unity.
    /// On failure, RN calls onCardResolved(qrId, false) to unlock the qrId for retry.
    /// </summary>
    private void HandleQrDecoded(string qrId)
    {
        if (string.IsNullOrEmpty(qrId)) return;

        // If the card is already registered, suppress the QR event.
        // The ARTrackedImageManager path will handle subsequent detections.
        if (cardRegistry != null && cardRegistry.GetPayload(qrId) != null)
        {
            UnityEngine.Debug.Log($"[ARExperienceHandler] QR '{qrId}' already registered — suppressing duplicate QR event");
            return;
        }

        UnityEngine.Debug.Log($"[ARExperienceHandler] QR decoded '{qrId}' — forwarding to RN for backend resolution");
        RNEventEmitter.Instance.SendEvent("onQrDecoded", new { qrId });
    }

    private void HandleArReady(string version)
    {
        UnityEngine.Debug.Log($"[ARExperienceHandler] AR ready: {version}");
    }

    private void HandleTrackedImageAdded(ARTrackedImage image)
    {
        if (image == null) return;

        var referenceName = image.referenceImage.name;
        if (!cardRegistry.TryGetTrackableQrId(image.trackableId, out var existingQrId)) {
            // First detection of this physical instance — resolve business identity
            // referenceImage.name is the qrId; GetPayload validates it was registered
            if (cardRegistry.GetPayload(referenceName) == null) {
                UnityEngine.Debug.LogWarning($"[ARExperienceHandler] No card registered for reference image '{referenceName}'");
                return;
            }
            cardRegistry.BindTrackable(image.trackableId, image, referenceName);
            existingQrId = referenceName;
        }

        var payload = cardRegistry.GetPayload(existingQrId);
        if (payload == null) {
            UnityEngine.Debug.LogWarning($"[ARExperienceHandler] No payload registered for qrId '{existingQrId}'");
            return;
        }

        UnityEngine.Debug.Log($"[ARExperienceHandler] TrackedImage added: qrId={existingQrId}, ref={referenceName}");

        // Parent to the live transform so the spawned model tracks the card every frame
        if (!cardRegistry.GetTrackableModel(image.trackableId)) {
            SpawnModelForTrackable(image.trackableId, existingQrId, image.transform).ContinueWith(t => {
                if (t.IsFaulted && t.Exception != null) {
                    var ex = t.Exception.InnerException ?? t.Exception;
                    RNEventEmitter.Instance.SendEvent("onError", new {
                        code = "MODEL_LOAD_FAILED",
                        message = $"{existingQrId}: {ex.Message}"
                    });
                }
            }, TaskScheduler.Default);
        }
    }

    private void HandleTrackedImageRemoved(TrackableId trackableId, string imageName)
    {
        UnityEngine.Debug.Log($"[ARExperienceHandler] TrackedImage removed: trackableId={trackableId}, ref={imageName}");

        if (cardRegistry.TryUnbindTrackable(trackableId, out var qrId)) {
            // Unregister from ComboManager so proximity detection no longer considers this card
            if (comboManager != null) {
                comboManager.UnregisterTrackedImage(qrId);
            }

            // Destroy the model bound to this physical instance
            var model = cardRegistry.GetTrackableModel(trackableId);
            if (model != null) {
                UnityEngine.Object.Destroy(model);
                cardRegistry.SetTrackableModel(trackableId, null);
            }

            RNEventEmitter.Instance.SendEvent("onImageTrackingLost", new {
                qrId = qrId,
                reason = "CARD_REMOVED"
            });
        }
    }

    private void HandleImageDetected(string imageId, Vector3 transform)
    {
        if (_currentPayload == null) return;
        if (_trackedImages.ContainsKey(imageId)) return;

        UnityEngine.Debug.Log($"[ARExperienceHandler] Image detected: {imageId}");

        // For MVP: trigger model load for the first detected image
        SpawnModelAtImage(imageId, transform).ContinueWith(t => {
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
    }

    private void HandleMultiImageDetected(string[] imageIds, int count)
    {
        UnityEngine.Debug.Log($"[ARExperienceHandler] Multi-image detected: {count}");
        var qrIds = new string[count];
        for (int i = 0; i < count; i++) {
            qrIds[i] = imageIds[i];
        }
        RNEventEmitter.Instance.SendEvent("onMultiImageDetected", new {
            qrIds = qrIds,
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

    private async Task SpawnModelForTrackable(TrackableId trackableId, string qrId, Transform parent)
    {
        var payload = cardRegistry.GetPayload(qrId);
        if (payload == null) return;

        try {
            var modelPrefab = await glbLoader.LoadGLB(payload.Value.ModelUrl);
            if (modelPrefab == null) return;

            // Position at the tracked image's current pose so the model follows the card every frame
            var spawned = modelSpawner.Spawn(modelPrefab, parent.position, parent.eulerAngles, payload.Value.Scale);
            cardRegistry.SetTrackableModel(trackableId, spawned);
            cardRegistry.SetSpawnedModel(qrId, spawned);

            // Register with ComboManager so proximity detection activates for this card.
            // Look up the ARTrackedImage that was stored on BindTrackable.
            if (comboManager != null) {
                var trackedImage = cardRegistry.GetTrackableImage(trackableId);
                if (trackedImage != null) {
                    comboManager.RegisterTrackedImage(trackedImage, spawned);
                    // P6: Register arTag → qrId for semantic combo resolution.
                    // ArTag may already be registered in StartImageTrackingMulti; this call is
                    // idempotent and ensures it is registered regardless of call order.
                    comboManager.RegisterArTag(payload.Value.ArTag, qrId);
                }
            }

            var pos = parent.position;
            RNEventEmitter.Instance.SendEvent("onObjectPlaced", new {
                qrId = qrId,
                worldX = pos.x,
                worldY = pos.y,
                worldZ = pos.z
            });

            RNEventEmitter.Instance.SendEvent("onModelLoaded", new {
                modelUrl = payload.Value.ModelUrl,
                qrId = qrId
            });

            if (animationController != null) {
                animationController.DiscoverClips();
                animationController.PlayAnimation(payload.Value.AnimationType);
            }

            if (audioPlayer != null && !string.IsNullOrEmpty(payload.Value.AudioUrl)) {
                await audioPlayer.PlayAudio(payload.Value.AudioUrl);
            }
        } catch (Exception ex) {
            UnityEngine.Debug.LogError($"[ARExperienceHandler] SpawnModelForTrackable({qrId}) failed: {ex.Message}");
            RNEventEmitter.Instance.SendEvent("onError", new {
                code = "MODEL_LOAD_FAILED",
                message = $"{qrId}: {ex.Message}"
            });
        }
    }

    /// <summary>
    /// Entry point: called by RNMessageReceiver when RN sends loadARExperience.
    /// </summary>
    public void LoadARExperience(string json)
    {
        UnityEngine.Debug.Log("[ARExperienceHandler] LoadARExperience called");
        try {
            _currentPayload = ARPayloadMapper.Parse(json);
            var payload = _currentPayload.Value;
            UnityEngine.Debug.Log($"[ARExperienceHandler] QrId={payload.QrId}, Word={payload.Word}");

            // Load and activate ARScene — learner flow reaches the real AR runtime.
            // BridgeSmokeScene remains available for isolated bridge diagnostics.
            UnityEngine.Debug.Log("[ARExperienceHandler] Loading ARScene");
            SceneManager.LoadScene("ARScene", LoadSceneMode.Additive);

            // Start AR session (ARScene ARSessionManager will initialize on scene load)
            // sessionManager?.InitSession();
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
        // For MVP: use basic session. Full image tracking requires ARReferenceImageLibrary.
        sessionManager?.InitSession();
    }

    /// <summary>
    /// Entry point for multi-card image tracking: called by RN via startImageTrackingMulti.
    /// Parses the cards JSON, registers payloads, downloads reference images, then
    /// starts the AR session with a mutable runtime library.
    ///
    /// Loads ARScene additively FIRST so the ARSession singleton is running globally
    /// before the library is built. This ensures ARTrackedImageManager (initialized
    /// when ARScene loads) finds a running session with a pre-built mutable library.
    /// </summary>
    public void StartImageTrackingMulti(string json)
    {
        UnityEngine.Debug.Log("[ARExperienceHandler] StartImageTrackingMulti called -- loading ARScene additively");

        // Load ARScene additively so ARSession runs globally.
        // ARTrackedImageManager in ARScene will connect to this running session.
        // In EditMode, LoadScene(Additive) is not available — skip; ARScene is already open.
        if (UnityEngine.Application.isPlaying &&
            !UnityEngine.SceneManagement.SceneManager.GetSceneByName("ARScene").isLoaded)
        {
            UnityEngine.SceneManagement.SceneManager.LoadScene("ARScene", UnityEngine.SceneManagement.LoadSceneMode.Additive);
        }

        // Start the AR session so ARTrackedImageManager finds a running session
        // when ARScene finishes loading.
        sessionManager?.InitSession();

        CardTrackingRequest.Result parseResult;
        try {
            parseResult = CardTrackingRequest.Parse(json);
        } catch (ArgumentException) {
            // Empty/null JSON — let the exception propagate so callers can assert on it.
            throw;
        } catch (FormatException) {
            // Malformed JSON — let the exception propagate.
            throw;
        } catch (Exception ex) {
            UnityEngine.Debug.LogError($"[ARExperienceHandler] StartImageTrackingMulti parse failed: {ex.Message}");
            RNEventEmitter.Instance?.SendEvent("onError", new {
                code = "SESSION_FAILED",
                message = $"startImageTrackingMulti parse failed: {ex.Message}"
            });
            return;
        }

        // Report individual rejections — log BEFORE the HasValidCards guard so tests
        // that exercise rejection paths can assert on the warning regardless of whether
        // valid cards also exist in the same payload.
        foreach (var rejection in parseResult.Rejected) {
            UnityEngine.Debug.LogWarning($"[ARExperienceHandler] Card rejected: qrId={rejection.qrId}, code={rejection.code}, detail={rejection.detail}");
            RNEventEmitter.Instance?.SendEvent("onError", new {
                code = rejection.code,
                message = $"{rejection.qrId}: {rejection.detail}"
            });
        }

        if (!parseResult.HasValidCards) {
            UnityEngine.Debug.LogError("[ARExperienceHandler] No valid cards after parsing startImageTrackingMulti payload");
            RNEventEmitter.Instance?.SendEvent("onError", new {
                code = "MISSING_REFERENCE_IMAGE_METADATA",
                message = "No valid cards in startImageTrackingMulti payload"
            });
            return;
        }

        // Register each valid card's business payload.
        // Use Payloads dict (populated by Validate()) for full ARExperiencePayload data.
        // Fall back to a minimal payload if the dict is empty (edge case in some code paths).
        if (cardRegistry != null)
        {
            foreach (var card in parseResult.Valid) {
                ARExperiencePayload payload;
                if (parseResult.Payloads.TryGetValue(card.qrId, out var storedPayload))
                {
                    payload = storedPayload;
                }
                else
                {
                    payload = new ARExperiencePayload {
                        QrId = card.qrId,
                        Word = card.qrId,
                        TranslationVi = null,
                        AudioUrl = null,
                        ModelUrl = null,
                        AnimationType = ARAnimationType.Idle,
                        GlbSize = 0f,
                        Position = Vector3.zero,
                        Rotation = Vector3.zero,
                        Scale = Vector3.one,
                    };
                }
                cardRegistry.RegisterFlashcard(card.qrId, payload);

                // P6: Register arTag → qrId mapping in ComboManager for semantic combo resolution.
                // arTag lives in the payload; fall back to qrId if no arTag is set.
                if (comboManager != null && !string.IsNullOrEmpty(payload.ArTag))
                {
                    comboManager.RegisterArTag(payload.ArTag, card.qrId);
                }
                else if (comboManager != null)
                {
                    comboManager.RegisterArTag(card.qrId, card.qrId);
                }
            }
        }

        // P6: Parse and load semantic combos from the same JSON payload.
        // relatedCombos is a sibling array at the top level of the startImageTrackingMulti JSON.
        // CardTrackingRequest.Parse() already consumed the `cards` array; we parse the sibling
        // `relatedCombos` field from the raw JSON string.
        if (comboManager != null)
        {
            try
            {
                var wrapper = JsonUtility.FromJson<RelatedCombosWrapper>(json);
                if (wrapper?.relatedCombos != null && wrapper.relatedCombos.Length > 0)
                {
                    var comboJson = JsonUtility.ToJson(new RelatedCombosWrapper { relatedCombos = wrapper.relatedCombos });
                    comboManager.LoadSemanticCombos(comboJson);
                }
            }
            catch (Exception ex)
            {
                UnityEngine.Debug.LogWarning($"[ARExperienceHandler] relatedCombos parse failed: {ex.Message}");
            }
        }

        // Incremental add vs initial build:
        // - cardLibraryBuilder.IsLibraryReady == true  → library already has cards; add incrementally.
        // - cardLibraryBuilder.IsLibraryReady == false → first card; build the library.
        // When cardLibraryBuilder is null (e.g. EditMode tests without AR subsystem), skip
        // library build but still register payloads in cardRegistry so tests can verify parsing.
        if (cardLibraryBuilder != null)
        {
            if (cardLibraryBuilder.IsLibraryReady)
            {
                // Library already exists — add the new card(s) incrementally.
                // Each AddCard fires OnLibraryReady on success (so existing listeners re-confirm readiness).
                foreach (var card in parseResult.Valid)
                {
                    if (cardLibraryBuilder.TryResolveQrId(card.qrId, out _))
                    {
                        UnityEngine.Debug.Log($"[ARExperienceHandler] Card '{card.qrId}' already registered -- skipping AddCard");
                        continue;
                    }
                    UnityEngine.Debug.Log($"[ARExperienceHandler] Incremental add for '{card.qrId}'");
                    cardLibraryBuilder.AddCard(card);
                }
            }
            else
            {
                // First card or library not yet built — build from scratch.
                UnityEngine.Debug.Log("[ARExperienceHandler] Building mutable reference-image library (first card)");
                cardLibraryBuilder.BuildLibrary(parseResult.Valid);
            }
        }
    }

    private async Task SpawnModelAtImage(string imageId, Vector3 position)
    {
        if (_currentPayload == null) return;
        var payload = _currentPayload.Value;

        try {
            var modelPrefab = await glbLoader.LoadGLB(payload.ModelUrl);
            if (modelPrefab == null) return;

            var spawned = modelSpawner.Spawn(modelPrefab, position, payload.Rotation, payload.Scale);
            _spawnedModels[imageId] = spawned;

            RNEventEmitter.Instance.SendEvent("onObjectPlaced", new {
                qrId = payload.QrId,
                worldX = position.x,
                worldY = position.y,
                worldZ = position.z
            });

            RNEventEmitter.Instance.SendEvent("onModelLoaded", new {
                modelUrl = payload.ModelUrl,
                qrId = payload.QrId
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
        cardRegistry?.Clear();
        comboManager?.Reset();
        qrScanner?.ClearPending();
        _currentPayload = null;
        _trackedImages.Clear();
        _spawnedModels.Clear();
    }
}
