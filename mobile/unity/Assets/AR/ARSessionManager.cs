using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Events;
using UnityEngine.XR.ARFoundation;
using UnityEngine.XR.ARSubsystems;

/// <summary>
/// Manages ARKit/ARCore image tracking session.
/// Emits onArReady, onImageDetected, onImageTrackingLost, onMultiImageDetected events.
/// </summary>
public class ARSessionManager : MonoBehaviour
{
    private ARSession _session;
    private ARTrackedImageManager _imageManager;
    private ARSessionState _state;
    private XRReferenceImageLibrary _referenceImageLibrary;
    private readonly List<ARTrackedImage> _activeImages = new();
    private readonly Dictionary<string, ARTrackedImage> _trackedImageByName = new();
    private UnityAction<ARTrackablesChangedEventArgs<ARTrackedImage>> _trackablesChangedHandler;

    public event Action<string> OnArReady;
    public event Action<string, Vector3> OnImageDetected;
    public event Action<string> OnImageTrackingLost;
    public event Action<string[], int> OnMultiImageDetected;
    public event Action<string> OnError;

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
                _trackedImageByName[image.referenceImage.name] = image;
                var pos = image.transform.position;
                UnityEngine.Debug.Log($"[ARSessionManager] Image detected: {image.referenceImage.name}");
                OnImageDetected?.Invoke(image.referenceImage.name, pos);
                RNEventEmitter.Instance.SendEvent("onImageDetected", new {
                    imageId = image.referenceImage.name,
                    imageName = image.referenceImage.name,
                    transform = new { x = pos.x, y = pos.y, z = pos.z }
                });
            }
        }

        // Image updated
        foreach (var image in args.updated) {
            if (_activeImages.Contains(image)) {
                // Only emit tracking-lost on tracking state change to limited/stopped
                if (image.trackingState == ARTrackingState.Limited || image.trackingState == ARTrackingState.None) {
                    RNEventEmitter.Instance.SendEvent("onImageTrackingLost", new {
                        imageId = image.referenceImage.name
                    });
                }
            }
        }

        // Image removed (now a KeyValuePair list in AR Foundation 6.0+)
        foreach (var removed in args.removed) {
            var image = removed.Value;
            if (_activeImages.Contains(image)) {
                _activeImages.Remove(image);
                _trackedImageByName.Remove(image.referenceImage.name);
                UnityEngine.Debug.Log($"[ARSessionManager] Image tracking lost: {image.referenceImage.name}");
                OnImageTrackingLost?.Invoke(image.referenceImage.name);
                RNEventEmitter.Instance.SendEvent("onImageTrackingLost", new {
                    imageId = image.referenceImage.name
                });
            }
        }

        // Multi-image detection
        if (_activeImages.Count >= 2) {
            var imageNames = new string[_activeImages.Count];
            for (int i = 0; i < _activeImages.Count; i++) {
                imageNames[i] = _activeImages[i].referenceImage.name;
            }
            OnMultiImageDetected?.Invoke(imageNames, _activeImages.Count);
            RNEventEmitter.Instance.SendEvent("onMultiImageDetected", new {
                imageIds = imageNames,
                count = _activeImages.Count
            });
        }
    }

    /// <summary>
    /// Gets the active ARTrackedImage by its reference image name.
    /// Returns null if the image is not currently being tracked.
    /// </summary>
    public ARTrackedImage GetTrackedImage(string imageName)
    {
        return _trackedImageByName.TryGetValue(imageName, out var image) ? image : null;
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