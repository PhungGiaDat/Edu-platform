using System;
using UnityEngine;
using UnityEngine.EventSystems;

/// <summary>
/// Handles tap, pinch (scale), rotate (Y axis), and double-tap (reset) gestures
/// using Unity's Input System. Emits onInteraction events back to RN.
/// </summary>
public class ARGestureHandler : MonoBehaviour, IPointerClickHandler, IDragHandler, IBeginDragHandler, IEndDragHandler
{
    public event Action<string, string> OnInteraction;

    [SerializeField] private ModelSpawner modelSpawner;

    private Vector3 _initialScale = Vector3.one;
    private Vector3 _initialRotation;
    private Vector2 _lastPointerPos;
    private float _accumulatedRotation;

    private void Start() {
        if (modelSpawner == null) {
            modelSpawner = FindFirstObjectByType<ModelSpawner>();
        }
    }

    public void OnPointerClick(PointerEventData eventData) {
        if (eventData.clickCount == 2) {
            HandleDoubleTap(eventData.position);
        } else {
            HandleTap(eventData.position);
        }
    }

    public void OnBeginDrag(PointerEventData eventData) {
        _lastPointerPos = eventData.position;
        _accumulatedRotation = 0f;
    }

    public void OnDrag(PointerEventData eventData) {
        // Single finger drag = rotate on Y axis
        var delta = eventData.position - _lastPointerPos;
        _accumulatedRotation += delta.x;
        _lastPointerPos = eventData.position;

        var currentRot = _initialRotation + Vector3.up * _accumulatedRotation * 0.5f;
        modelSpawner?.SetRotation(currentRot);

        EmitInteraction("rotate", "");
    }

    public void OnEndDrag(PointerEventData eventData) {
        _initialRotation = _initialRotation + Vector3.up * _accumulatedRotation * 0.5f;
    }

    private void HandleTap(Vector2 screenPos) {
        UnityEngine.Debug.Log($"[ARGestureHandler] Tap at {screenPos}");
        EmitInteraction("tap", "");

        // Raycast to place anchor
        var anchorManager = FindFirstObjectByType<AnchorManager>();
        anchorManager?.TryPlaceAnchorAt(screenPos, (pos, id) => {
            UnityEngine.Debug.Log($"[ARGestureHandler] Anchor placed at {pos}");
        });
    }

    private void HandleDoubleTap(Vector2 screenPos) {
        UnityEngine.Debug.Log($"[ARGestureHandler] Double-tap reset");
        modelSpawner?.SetScale(_initialScale);
        modelSpawner?.SetRotation(_initialRotation);
        EmitInteraction("double_tap", "");
    }

    /// <summary>
    /// Applies a pinch scale gesture. Call this from an external pinch detector.
    /// </summary>
    public void ApplyPinchScale(float scaleFactor) {
        if (modelSpawner == null) return;
        var newScale = _initialScale * scaleFactor;
        modelSpawner.SetScale(newScale);
        EmitInteraction("pinch", "");
    }

    /// <summary>
    /// Stores the initial transform values for reset on double-tap.
    /// </summary>
    public void StoreInitialTransform(Vector3 scale, Vector3 rotation) {
        _initialScale = scale;
        _initialRotation = rotation;
    }

    private void EmitInteraction(string type, string qrId) {
        var payload = new { type, qrId };
        RNEventEmitter.Instance.SendEvent("onInteraction", payload);
        OnInteraction?.Invoke(type, qrId);
    }
}
