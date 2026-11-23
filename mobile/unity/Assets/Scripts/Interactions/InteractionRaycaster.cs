using System;
using UnityEngine;

/// <summary>
/// Handles screen-touch raycasting against registered interaction hotspots.
///
/// Conceptual flow:
///   Input.GetTouch(0) → Camera.ScreenPointToRay → Physics.Raycast
///   → ModelInteractionHotspot → InteractionHandler
///
/// One deliberate tap produces at most one interaction event.
/// Touching outside registered hotspots is a silent no-op.
/// </summary>
public class InteractionRaycaster : MonoBehaviour
{
    public event Action<string /* interactionId */, Vector3 /* worldPosition */> OnHotspotTapped;

    [Tooltip("Camera used for raycasting. Defaults to Camera.main.")]
    [SerializeField] private Camera raycastCamera;

    [Tooltip("Layer mask that InteractionRaycaster checks against. Should include the 'Interaction' layer.")]
    [SerializeField] private LayerMask hitLayers = ~0;

    [Tooltip("Maximum raycast distance in world units.")]
    [SerializeField] private float maxDistance = 50f;

    private int _tapFrame = -1;

    private void Awake()
    {
        if (raycastCamera == null) raycastCamera = Camera.main;
    }

    private void Update()
    {
        // Respond to the first frame of a tap, not every frame the finger is held down.
        if (Input.touchCount > 0)
        {
            var touch = Input.GetTouch(0);
            if (touch.phase == TouchPhase.Began && _tapFrame != Time.frameCount)
            {
                _tapFrame = Time.frameCount;
                HandleTap(touch.position);
            }
        }

        // Editor / PlayMode mouse support for quick testing without a device.
        // Only fires when the left mouse button goes down.
#if UNITY_EDITOR || UNITY_STANDALONE
        if (Input.GetMouseButtonDown(0) && _tapFrame != Time.frameCount)
        {
            _tapFrame = Time.frameCount;
            HandleTap(Input.mousePosition);
        }
#endif
    }

    private void HandleTap(Vector2 screenPosition)
    {
        if (raycastCamera == null)
        {
            Debug.LogWarning("[InteractionRaycaster] No camera set. Cannot raycast.");
            return;
        }

        var ray = raycastCamera.ScreenPointToRay(screenPosition);

        if (Physics.Raycast(ray, out RaycastHit hit, maxDistance, hitLayers))
        {
            if (hit.collider.TryGetComponent(out ModelInteractionHotspot hotspot))
            {
                var interactionId = hotspot.GetInteractionId();
                if (!string.IsNullOrEmpty(interactionId))
                {
                    Debug.Log($"[InteractionRaycaster] Hotspot tapped: {interactionId} (semantic={hotspot.GetSemanticLabel()}) at {hit.point}");
                    OnHotspotTapped?.Invoke(interactionId, hit.point);
                }
                else
                {
                    Debug.LogWarning($"[InteractionRaycaster] Hotspot has no interactionId at {hit.point}");
                }
            }
        }
        // else: tapped outside any hotspot — silent no-op, as specified.
    }
}
