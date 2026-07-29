using System;
using UnityEngine;
using UnityEngine.Events;
using UnityEngine.XR.ARFoundation;

/// <summary>
/// Handles horizontal plane detection using ARFoundation's XRPlaneManager.
/// Emits onPlaneDetected when a horizontal plane is first found.
/// </summary>
public class PlaneDetection : MonoBehaviour
{
    [SerializeField] private ARPlaneManager planeManager;

    private bool _hasDetectedPlane;
    private UnityAction<ARTrackablesChangedEventArgs<ARPlane>> _trackablesChangedHandler;

    public event Action<string, Vector2> OnPlaneDetected;

    private void Awake() {
        if (planeManager == null) {
            planeManager = FindFirstObjectByType<ARPlaneManager>();
        }
        _trackablesChangedHandler = HandlePlanesChanged;
    }

    private void OnEnable() {
        if (planeManager != null && _trackablesChangedHandler != null) {
            planeManager.trackablesChanged.AddListener(_trackablesChangedHandler);
        }
    }

    private void OnDisable() {
        if (planeManager != null && _trackablesChangedHandler != null) {
            planeManager.trackablesChanged.RemoveListener(_trackablesChangedHandler);
        }
    }

    private void HandlePlanesChanged(ARTrackablesChangedEventArgs<ARPlane> args) {
        if (_hasDetectedPlane) return;

        try {
            foreach (var plane in args.added) {
                // AR Foundation 6.x split the old `Horizontal` into `HorizontalUp` (floor) and
                // `HorizontalDown` (ceiling). Treat both as horizontal.
                var alignment = plane.alignment;
                if (alignment == UnityEngine.XR.ARSubsystems.PlaneAlignment.HorizontalUp ||
                    alignment == UnityEngine.XR.ARSubsystems.PlaneAlignment.HorizontalDown) {
                    _hasDetectedPlane = true;
                    var bounds = plane.center;
                    UnityEngine.Debug.Log($"[PlaneDetection] Plane detected: {plane.trackableId}");
                    OnPlaneDetected?.Invoke(plane.trackableId.ToString(), bounds);

                    var payload = new {
                        planeId = plane.trackableId.ToString(),
                        bounds = new { x = bounds.x, y = bounds.y }
                    };
                    RNEventEmitter.Instance.SendEvent("onPlaneDetected", payload);
                    break;
                }
            }
        } catch (Exception ex) {
            UnityEngine.Debug.LogError($"[PlaneDetection] HandlePlanesChanged failed: {ex.Message}");
            RNEventEmitter.Instance.SendEvent("onError", new {
                code = "PLANE_DETECTION_ERROR",
                message = ex.Message
            });
        }
    }

    /// <summary>
    /// Enables or disables plane detection.
    /// </summary>
    public void SetEnabled(bool enabled) {
        UnityEngine.Debug.Log($"[PlaneDetection] SetEnabled({enabled})");
        if (planeManager != null) {
            planeManager.enabled = enabled;
            // Disable all existing planes when disabled
            if (!enabled) {
                foreach (var plane in planeManager.trackables) {
                    plane.gameObject.SetActive(false);
                }
            }
        }
    }
}
