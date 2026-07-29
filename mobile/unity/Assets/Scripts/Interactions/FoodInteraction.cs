using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.XR.ARFoundation;

/// <summary>
/// Makes food models draggable via Unity's EventSystem, constrained to XZ plane.
/// Auto-triggers feed when food enters pet proximity.
/// </summary>
public class FoodInteraction : MonoBehaviour, IDragHandler
{
    [SerializeField] private PetController petController;
    [SerializeField] private float petProximityRadius = 0.3f;

    private Vector3 _originalPosition;
    private bool _isDragging;

    private void Awake()
    {
        _originalPosition = transform.position;
    }

    public void OnBeginDrag(PointerEventData eventData)
    {
        _isDragging = true;
        _originalPosition = transform.position;

        RNEventEmitter.Instance.SendEvent("onFoodDragging", new {
            foodModelId = gameObject.name
        });

        petController?.OnFoodDragging(gameObject.name, transform.position);
    }

    public void OnDrag(PointerEventData eventData)
    {
        if (!_isDragging) return;

        // Raycast to AR plane
        Ray ray = Camera.main.ScreenPointToRay(eventData.position);
        if (Physics.Raycast(ray, out RaycastHit hit, 100f)) {
            var newPos = hit.point;
            newPos.y = _originalPosition.y; // Constrain to XZ plane
            transform.position = newPos;

            petController?.OnFoodDragging(gameObject.name, newPos);

            // Check pet proximity
            if (petController != null) {
                float dist = Vector3.Distance(transform.position, petController.transform.position);
                if (dist < petProximityRadius) {
                    petController.OnFoodFed(gameObject.name);
                }
            }
        }
    }

    public void OnEndDrag(PointerEventData eventData)
    {
        _isDragging = false;

        // Return to original position if dropped far from pet
        if (transform.position.y < _originalPosition.y - 0.5f) {
            transform.position = _originalPosition;
        }
    }
}
