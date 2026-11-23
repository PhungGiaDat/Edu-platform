using System;
using UnityEngine;

/// <summary>
/// Defines a single interaction that can be triggered on a model hotspot.
///
/// This is a TEST/LOCAL fixture structure for the Cat acceptance slice.
/// Future runtime config will replace this with backend-driven data.
/// </summary>
[Serializable]
public struct ModelInteractionDefinition
{
    [Tooltip("Unique identifier for this interaction, e.g. 'cat_head_pat'")]
    public string interactionId;

    [Tooltip("Human-readable semantic name of the body region, e.g. 'head', 'body', 'tail'")]
    public string hotspotSemantic;

    [Tooltip("Name of the animation Action exported from the GLB (case-insensitive lookup)")]
    public string animationAction;

    [Tooltip("Optional URL of model-local audio to play during this interaction")]
    public string audioActionUrl;

    [Tooltip("Cooldown duration in seconds before the same interaction can trigger again. 0 = no cooldown.")]
    public float cooldownSeconds;

    [Tooltip("How repeated taps behave while cooldown is active")]
    public InteractionRepeatPolicy repeatPolicy;

    [Tooltip("Optional vocabulary ID this interaction is associated with")]
    public string vocabularyId;
}

/// <summary>
/// Controls how the system responds when a user taps a hotspot that is
/// still within its cooldown window.
/// </summary>
public enum InteractionRepeatPolicy
{
    /// <summary>Ignore the tap entirely while cooldown is active.</summary>
    Ignore,

    /// <summary>Restart the animation and audio from the beginning.</summary>
    Restart,

    /// <summary>Queue the interaction to fire again immediately after cooldown expires.</summary>
    Queue
}
