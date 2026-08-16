using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.XR.ARFoundation;
using UnityEngine.XR.ARSubsystems;

/// <summary>
/// Manages ARKit/ARCore image tracking session.
/// Emits onArReady, onImageDetected, onImageTrackingLost, onMultiImageDetected events.
/// </summary>
public class ARSessionManager : MonoBehaviour
{
    [SerializeField] private CardImageLibraryBuilder cardLibraryBuilder;

    private ARSession _session;
    private ARTrackedImageManager _imageManager;
    private ARSessionState _state;
    private XRReferenceImageLibrary _referenceImageLibrary;
    private readonly List<ARTrackedImage> _activeImages = new();
    private UnityEngine.Events.UnityAction<ARTrackablesChangedEventArgs<ARTrackedImage>> _trackablesChangedHandler;

    public event Action<string> OnArReady;
    public event Action<string, Vector3> OnImageDetected;
    public event Action<string> OnImageTrackingLost;
    public event Action<string[], int> OnMultiImageDetected;
    public event Action<string> OnError;

    /// <summary>
    /// Fired with the raw ARTrackedImage on first detection, in addition to
    /// <see cref="OnImageDetected"/>. Lets subscribers (e.g. model spawning)
    /// parent to the actual tracked transform instead of a one-shot position,
    /// so the spawned model follows the card every frame.
    /// </summary>
    public event Action<ARTrackedImage> OnTrackedImageAdded;

    /// <summary>Fired when a previously-active trackable is removed (per-instance cleanup key).</summary>
    public event Action<TrackableId, string> OnTrackedImageRemoved;

    private void Awake()
    {
        _session = FindFirstObjectByType<ARSession>();
        if (_session == null) {
            _session = gameObject.AddComponent<ARSession>();
        }
        _imageManager = FindFirstObjectByType<ARTrackedImageManager>();
        if (_imageManager == null) {
            _imageManager = gameObject.AddComponent<ARTrackedImageManager>();
        }
        if (cardLibraryBuilder == null) {
            cardLibraryBuilder = FindFirstObjectByType<CardImageLibraryBuilder>();
        }
        _trackablesChangedHandler = HandleTrackedImagesChangedInternal;
    }

    private void OnEnable()
    {
        ARSession.stateChanged += HandleStateChanged;
        if (_imageManager != null && _trackablesChangedHandler != null) {
            _imageManager.trackablesChanged.AddListener(_trackablesChangedHandler);
        }
    }

    private void OnDisable()
    {
        ARSession.stateChanged -= HandleStateChanged;
        if (_imageManager != null && _trackablesChangedHandler != null) {
            _imageManager.trackablesChanged.RemoveListener(_trackablesChangedHandler);
        }
    }

    private void HandleStateChanged(ARSessionStateChangedEventArgs args)
    {
        _state = args.state;
        UnityEngine.Debug.Log($"[ARSessionManager] State: {_state}");

        if (_state == ARSessionState.Ready) {
            UnityEngine.Debug.Log("[ARSessionManager] AR Ready!");
            OnArReady?.Invoke("1.0");
            RNEventEmitter.Instance.SendEvent("onArReady", new { version = "1.0" });
        }

        if (_state == ARSessionState.Unsupported) {
            var errorMsg = "AR is not supported on this device";
            UnityEngine.Debug.LogError($"[ARSessionManager] {errorMsg}");
            OnError?.Invoke(errorMsg);
            RNEventEmitter.Instance.SendEvent("onError", new {
                code = "SESSION_FAILED",
                message = errorMsg
            });
        }
    }

    private void HandleTrackedImagesChangedInternal(ARTrackablesChangedEventArgs<ARTrackedImage> args)
    {
        // Image added
        foreach (var image in args.added) {
            if (!_activeImages.Contains(image)) {
                _activeImages.Add(image);
                var pos = image.transform.position;
                var refName = image.referenceImage.name;
                UnityEngine.Debug.Log($"[ARSessionManager] Image detected: {refName}");

                // Resolve qrId from CardImageLibraryBuilder's registry
                var qrId = cardLibraryBuilder != null && cardLibraryBuilder.TryResolveQrId(refName, out var resolvedQrId)
                    ? resolvedQrId
                    : refName;

                OnImageDetected?.Invoke(refName, pos);
                OnTrackedImageAdded?.Invoke(image);
                RNEventEmitter.Instance.SendEvent("onImageDetected", new {
                    imageId = refName,
                    imageName = refName,
                    qrId = qrId,
                    trackableId = image.trackableId.ToString(),
                    trackingState = image.trackingState.ToString(),
                    transform = new { x = pos.x, y = pos.y, z = pos.z }
                });
            }
        }

        // Image updated: this is the normal per-frame pose / tracking-quality stream,
        // NOT a loss. Emit a pose update; NEVER emit tracking-lost here — removal is the
        // args.removed path only. TrackingState.None/Limited is a quality change, not
        // trackable removal (bug #9 regression: the updated path used to spam tracking-lost).
        foreach (var image in args.updated) {
            if (!_activeImages.Contains(image)) continue;
            var pos = image.transform.position;
            RNEventEmitter.Instance.SendEvent("onImagePoseUpdated", new {
                imageId = image.referenceImage.name,
                trackableId = image.trackableId.ToString(),
                trackingState = image.trackingState.ToString(),
                transform = new { x = pos.x, y = pos.y, z = pos.z }
            });
        }

        // Image removed (now a KeyValuePair list in AR Foundation 6.0+).
        // Removal targets exactly the trackable instance the provider dropped.
        foreach (var removed in args.removed) {
            var image = removed.Value;
            if (_activeImages.Contains(image)) {
                _activeImages.Remove(image);
                var refName = image.referenceImage.name;
                UnityEngine.Debug.Log($"[ARSessionManager] Image tracking lost: {refName}");

                // Resolve qrId for the event
                var qrId = cardLibraryBuilder != null && cardLibraryBuilder.TryResolveQrId(refName, out var resolvedQrId)
                    ? resolvedQrId
                    : refName;

                OnImageTrackingLost?.Invoke(refName);
                OnTrackedImageRemoved?.Invoke(removed.Key, refName);
                RNEventEmitter.Instance.SendEvent("onImageTrackingLost", new {
                    qrId = qrId,
                    reason = "CARD_REMOVED"
                });
            }
        }

        // Multi-image detection
        if (_activeImages.Count >= 2) {
            var imageNames = new string[_activeImages.Count];
            var qrIds = new string[_activeImages.Count];
            for (int i = 0; i < _activeImages.Count; i++) {
                var img = _activeImages[i];
                imageNames[i] = img.referenceImage.name;
                qrIds[i] = cardLibraryBuilder != null && cardLibraryBuilder.TryResolveQrId(img.referenceImage.name, out var resolved)
                    ? resolved
                    : img.referenceImage.name;
            }
            OnMultiImageDetected?.Invoke(imageNames, _activeImages.Count);
            RNEventEmitter.Instance.SendEvent("onMultiImageDetected", new {
                qrIds = qrIds,
                imageIds = imageNames,
                count = _activeImages.Count
            });
        }
    }

    /// <summary>
    /// Initializes image tracking session with the given reference image library.
    /// </summary>
    public void InitImageTrackingSession(XRReferenceImageLibrary library)
    {
        UnityEngine.Debug.Log("[ARSessionManager] InitImageTrackingSession called");
        try {
            _referenceImageLibrary = library;
            if (_session == null) {
                _session = FindFirstObjectByType<ARSession>();
                if (_session == null) _session = gameObject.AddComponent<ARSession>();
            }

            if (library == null) {
                throw new InvalidOperationException("Reference image library is null. Assign one in the Inspector or via ARTrackedImageManager.");
            }

            _imageManager.referenceLibrary = library;
            // Note: AR Foundation 6.x removed the maxNumberOfTrackedImages property.
            // The maximum number of concurrently tracked images is now controlled by the
            // AR subsystem provider (and by the library itself, via its count).

            _session.enabled = true;
            UnityEngine.Debug.Log("[ARSessionManager] Image tracking session started");
        } catch (Exception ex) {
            var msg = $"InitImageTrackingSession failed: {ex.Message}";
            UnityEngine.Debug.LogError($"[ARSessionManager] {msg}");
            OnError?.Invoke(msg);
            RNEventEmitter.Instance.SendEvent("onError", new {
                code = "SESSION_FAILED",
                message = msg
            });
        }
    }

    /// <summary>
    /// Initializes a basic AR session (fallback for devices without image tracking).
    /// </summary>
    public void InitSession()
    {
        UnityEngine.Debug.Log("[ARSessionManager] InitSession called (basic mode)");
        try {
            if (_session == null) {
                _session = FindFirstObjectByType<ARSession>();
                if (_session == null) _session = gameObject.AddComponent<ARSession>();
            }
            _session.enabled = true;
            UnityEngine.Debug.Log("[ARSessionManager] ARSession started");
        } catch (Exception ex) {
            var msg = $"InitSession failed: {ex.Message}";
            UnityEngine.Debug.LogError($"[ARSessionManager] {msg}");
            OnError?.Invoke(msg);
            RNEventEmitter.Instance.SendEvent("onError", new {
                code = "SESSION_FAILED",
                message = msg
            });
        }
    }

    /// <summary>
    /// Pauses the AR session.
    /// </summary>
    public void PauseSession()
    {
        UnityEngine.Debug.Log("[ARSessionManager] PauseSession called");
        if (_session != null) _session.enabled = false;
    }

    /// <summary>
    /// Resumes the AR session.
    /// </summary>
    public void ResumeSession()
    {
        UnityEngine.Debug.Log("[ARSessionManager] ResumeSession called");
        if (_session != null) _session.enabled = true;
    }

    /// <summary>
    /// Test seam: fires the tracked-images changed handler with custom args.
    /// Used by EditorMockImageDetector and PlayMode tests to inject mock ARTrackedImages.
    /// </summary>
    public void HandleTrackedImagesChanged(ARTrackablesChangedEventArgs<ARTrackedImage> args)
    {
        HandleTrackedImagesChangedInternal(args);
    }

    /// <summary>
    /// Stops and tears down the AR session.
    /// </summary>
    public void StopSession()
    {
        UnityEngine.Debug.Log("[ARSessionManager] StopSession called");
        _activeImages.Clear();
        if (_session != null) _session.enabled = false;
    }
}