using System;
using System.Collections;
using UnityEngine;

/// <summary>
/// Simple clay sphere pet character with state machine for food interactions.
/// Eyes follow food position, chomp animation on feed, heart particles on satisfied.
/// </summary>
public class PetController : MonoBehaviour
{
    public enum PetState { Idle, Anticipating, Eating, Satisfied }

#pragma warning disable CS0414 // Serialized field; configured in the Inspector.
    [SerializeField] private float feedProximityRadius = 0.3f;
#pragma warning restore CS0414
    [SerializeField] private Transform foodTarget;
    [SerializeField] private GameObject[] heartsParticles;

    public PetState CurrentState { get; private set; } = PetState.Idle;
    public event Action<PetState> OnStateChanged;

    private Transform _eyeLeft;
    private Transform _eyeRight;
    private int _streakCount;
    private GameObject _currentFood;

    private void Awake()
    {
        // Create googly eyes as child objects
        CreateEyes();
    }

    private void CreateEyes()
    {
        var eyes = new GameObject("Eyes");
        eyes.transform.SetParent(transform);

        _eyeLeft = CreateEye(eyes.transform, new Vector3(-0.15f, 0.1f, 0.4f));
        _eyeRight = CreateEye(eyes.transform, new Vector3(0.15f, 0.1f, 0.4f));
    }

    private Transform CreateEye(Transform parent, Vector3 localPos)
    {
        var eye = GameObject.CreatePrimitive(PrimitiveType.Sphere);
        eye.transform.SetParent(parent);
        eye.transform.localPosition = localPos;
        eye.transform.localScale = new Vector3(0.08f, 0.08f, 0.08f);

        var renderer = eye.GetComponent<Renderer>();
        if (renderer != null) {
            var mat = new Material(Shader.Find("Standard"));
            mat.color = Color.white;
            renderer.material = mat;
        }

        return eye.transform;
    }

    /// <summary>
    /// Called when food starts being dragged. Eyes follow food position.
    /// </summary>
    public void OnFoodDragging(string foodModelId, Vector3 foodPosition)
    {
        if (CurrentState == PetState.Idle) {
            TransitionTo(PetState.Anticipating);
        }

        // Eyes look at food
        if (_eyeLeft != null && _eyeRight != null) {
            Vector3 dir = (foodPosition - transform.position).normalized;
            _eyeLeft.localPosition = new Vector3(-0.15f + dir.x * 0.05f, 0.1f + dir.y * 0.05f, 0.4f);
            _eyeRight.localPosition = new Vector3(0.15f + dir.x * 0.05f, 0.1f + dir.y * 0.05f, 0.4f);
        }
    }

    /// <summary>
    /// Called when food enters pet proximity. Triggers feeding sequence.
    /// </summary>
    public void OnFoodFed(string foodModelId)
    {
        if (CurrentState == PetState.Satisfied) return;

        TransitionTo(PetState.Eating);
        StartCoroutine(FeedSequence());
    }

    private IEnumerator FeedSequence()
    {
        yield return new WaitForSeconds(0.3f); // chomp duration

        _streakCount++;

        TransitionTo(PetState.Satisfied);

        RNEventEmitter.Instance.SendEvent("onFoodFed", new {
            foodModelId = _currentFood?.name ?? "",
            xpAwarded = 10,
            streakCount = _streakCount
        });

        // Spawn hearts
        if (heartsParticles != null) {
            foreach (var heart in heartsParticles) {
                heart.SetActive(true);
                yield return new WaitForSeconds(0.3f);
                heart.SetActive(false);
            }
        }

        yield return new WaitForSeconds(2.0f); // satisfied duration
        TransitionTo(PetState.Idle);
    }

    private void TransitionTo(PetState newState)
    {
        CurrentState = newState;
        UnityEngine.Debug.Log($"[PetController] State: {newState}");
        OnStateChanged?.Invoke(newState);

        RNEventEmitter.Instance.SendEvent("onPetStateChanged", new {
            state = newState.ToString().ToLowerInvariant()
        });
    }
}
