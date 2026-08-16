using System;
using UnityEngine;

/// <summary>
/// Marks a touchable region on a model and resolves to a registered
/// <see cref="ModelInteractionDefinition"/>.
///
/// Attach to a child GameObject with a collider (trigger enabled) that
/// represents the interactive area. The collider is used by
/// <see cref="InteractionRaycaster"/> to perform hit-testing.
///
/// This component does NOT play audio, award XP, or call backend APIs.
/// It only holds the interaction ID that the raycaster resolves and
/// forwards to <see cref="ModelInteractionHandler"/>.
/// </summary>
public class ModelInteractionHotspot : MonoBehaviour
{
    [Tooltip("Interaction ID that maps to a registered ModelInteractionDefinition")]
    public string interactionId;

    [Tooltip("Optional semantic label for editor/debugging (e.g. 'head', 'body', 'tail')")]
    public string semanticLabel;

    [Tooltip("Layer mask used by InteractionRaycaster to filter these hotspots. Defaults to 'Interaction' layer.")]
    public LayerMask interactionLayer = ~0;

    private void Awake()
    {
        // Ensure the collider on this GameObject is a trigger so it receives
        // raycast hits without blocking other physics.
        var col = GetComponent<Collider>();
        if (col != null && !col.isTrigger)
        {
            col.isTrigger = true;
        }
    }

    private void OnValidate()
    {
        if (string.IsNullOrEmpty(interactionId))
        {
            Debug.LogWarning($"[ModelInteractionHotspot] InteractionId is empty on {name}. "
                + "This hotspot will not resolve to any interaction.");
        }
    }

    /// <summary>
    /// Returns the resolved interaction ID string. Used by the raycaster
    /// to look up the full <see cref="ModelInteractionDefinition"/>.
    /// </summary>
    public string GetInteractionId() => interactionId;

    /// <summary>
    /// Returns the semantic hotspot label for logging/debugging.
    /// </summary>
    public string GetSemanticLabel() => semanticLabel;
}
