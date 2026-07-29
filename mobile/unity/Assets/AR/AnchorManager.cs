using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.XR.ARFoundation;
using UnityEngine.XR.ARSubsystems;

/// <summary>
/// Handles ARAnchor creation at tap positions via ARRaycastManager.
/// Emits onObjectPlaced when an anchor is successfully created.
/// </summary>
public class AnchorManager : MonoBehaviour
{
    [SerializeField] private ARRaycastManager raycastManager;
    [SerializeField] private ARAnchorManager anchorManager;

    private readonly List<ARRaycastHit> _hits = new();
    private Action<Vector3, string> _onAnchorPlaced;

    private void Awake() {
        if (raycastManager == null)
            raycastManager = FindFirstObjectByType<ARRaycastManager>();
        if (anchorManager == null)
            anchorManager = FindFirstObjectByType<ARAnchorManager>();
    }

    /// <summary>
    /// Attempts to place an anchor at the given screen position.
    /// In AR Foundation 6.x, anchors are created asynchronously via TryAddAnchorAsync.
    /// </summary>
    public async void TryPlaceAnchorAt(Vector2 screenPosition, Action<Vector3, string> onPlaced) {
        if (raycastManager == null || anchorManager == null) {
            UnityEngine.Debug.LogError("[AnchorManager] Managers not found");
            return;
        }

        _hits.Clear();
        var trackableTypes = TrackableType.PlaneWithinBounds;
        if (!raycastManager.Raycast(screenPosition, _hits, trackableTypes)) {
            return;
        }

        var hit = _hits[0];
        var pose = hit.pose;

        try {
            var result = await anchorManager.TryAddAnchorAsync(pose);
            if (!result.status.IsSuccess() || result.value == null) {
                UnityEngine.Debug.LogError($"[AnchorManager] TryAddAnchorAsync failed: {result.status}");
                RNEventEmitter.Instance.SendEvent("onError", new {
                    code = "SESSION_FAILED",
                    message = $"Failed to create anchor: {result.status}"
                });
                return;
            }

            var anchor = result.value;
            UnityEngine.Debug.Log($"[AnchorManager] Anchor placed at {pose.position}");
            _onAnchorPlaced?.Invoke(pose.position, anchor.trackableId.ToString());

            var payload = new {
                qrId = "",
                worldX = pose.position.x,
                worldY = pose.position.y,
                worldZ = pose.position.z
            };
            RNEventEmitter.Instance.SendEvent("onObjectPlaced", payload);
        } catch (Exception ex) {
            UnityEngine.Debug.LogError($"[AnchorManager] AddAnchor failed: {ex.Message}");
            RNEventEmitter.Instance.SendEvent("onError", new {
                code = "SESSION_FAILED",
                message = $"Failed to create anchor: {ex.Message}"
            });
        }
    }

    /// <summary>
    /// Removes a specific anchor by its trackable ID using TryRemoveAnchor (AR Foundation 6.x).
    /// </summary>
    public void RemoveAnchor(string anchorId) {
        if (anchorManager == null) return;
        foreach (var anchor in anchorManager.trackables) {
            if (anchor.trackableId.ToString() == anchorId) {
                if (anchorManager.TryRemoveAnchor(anchor)) {
                    UnityEngine.Debug.Log($"[AnchorManager] Anchor removed: {anchorId}");
                }
                break;
            }
        }
    }
}