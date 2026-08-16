using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using UnityEngine;

/// <summary>
/// Orchestrates model touch interactions.
///
/// Receives interaction IDs from <see cref="InteractionRaycaster"/>, resolves
/// them to registered <see cref="ModelInteractionDefinition"/> entries, enforces
/// cooldown/repeat policy, triggers animation via <see cref="AnimationRegistry"/>,
/// optionally plays model-local audio, and emits one typed
/// <c>MODEL_INTERACTION</c> event through <see cref="RNEventEmitter"/>.
///
/// This component does NOT award XP, persist to MongoDB, or call Supabase.
///
/// TEST_FIXTURE: Cat acceptance slice uses a hard-coded local interaction list
/// until the backend runtime config contract exists.
/// </summary>
public class ModelInteractionHandler : MonoBehaviour
{
    [Header("Components (auto-wired)")]
    [SerializeField] private AnimationRegistry animationRegistry;
    [SerializeField] private ARAudioPlayer audioPlayer;

    [Header("Interaction Definitions (TEST_FIXTURE for Cat acceptance)")]
    [Tooltip("Temporary local interaction definitions. Replace with backend-driven config when contract exists.")]
    [SerializeField] private List<ModelInteractionDefinition> interactionDefinitions = new();

    /// <summary>
    /// Cached lookup: interactionId → ModelInteractionDefinition.
    /// Populated on Start from interactionDefinitions.
    /// </summary>
    private Dictionary<string, ModelInteractionDefinition> _lookup = new();

    /// <summary>
    /// Tracks when each interactionId was last triggered, for cooldown enforcement.
    /// </summary>
    private Dictionary<string, float> _cooldowns = new();

    public event Action<ModelInteractionEventArgs> OnInteractionTriggered;

    private void Awake()
    {
        AutoWire();
        BuildLookup();
    }

    private void AutoWire()
    {
        if (animationRegistry == null) animationRegistry = FindFirstObjectByType<AnimationRegistry>();
        if (audioPlayer == null) audioPlayer = FindFirstObjectByType<ARAudioPlayer>();
    }

    private void Start()
    {
        var raycaster = FindFirstObjectByType<InteractionRaycaster>();
        if (raycaster != null)
        {
            raycaster.OnHotspotTapped += HandleHotspotTapped;
        }
        else
        {
            Debug.LogWarning("[ModelInteractionHandler] InteractionRaycaster not found. Touch interaction will not work.");
        }
    }

    private void OnDestroy()
    {
        var raycaster = FindFirstObjectByType<InteractionRaycaster>();
        if (raycaster != null)
        {
            raycaster.OnHotspotTapped -= HandleHotspotTapped;
        }
    }

    /// <summary>
    /// Builds the interactionId → definition lookup dictionary from the serialized list.
    /// </summary>
    private void BuildLookup()
    {
        _lookup.Clear();
        foreach (var def in interactionDefinitions)
        {
            if (string.IsNullOrEmpty(def.interactionId))
            {
                Debug.LogWarning("[ModelInteractionHandler] Skipping definition with empty interactionId.");
                continue;
            }
            if (_lookup.ContainsKey(def.interactionId))
            {
                Debug.LogWarning($"[ModelInteractionHandler] Duplicate interactionId '{def.interactionId}'. Overwriting earlier entry.");
            }
            _lookup[def.interactionId] = def;
        }
    }

    private void HandleHotspotTapped(string interactionId, Vector3 worldPosition)
    {
        if (!_lookup.TryGetValue(interactionId, out var def))
        {
            Debug.LogWarning($"[ModelInteractionHandler] No interaction registered for id '{interactionId}'.");
            RNEventEmitter.Instance.SendEvent("onError", new
            {
                code = "MISSING_INTERACTION_CONFIG",
                message = $"Interaction '{interactionId}' is not configured."
            });
            return;
        }

        TryTrigger(def, worldPosition);
    }

    private void TryTrigger(ModelInteractionDefinition def, Vector3 worldPosition)
    {
        if (!EvaluateCooldown(def)) return;

        if (!animationRegistry.HasClip(def.animationAction))
        {
            Debug.LogError($"[ModelInteractionHandler] CONFIGURED_ANIMATION_NOT_FOUND: "
                + $"'{def.animationAction}' (interactionId={def.interactionId}). "
                + "Check that the GLB exports this Action and that the Animator is registered.");
            RNEventEmitter.Instance.SendEvent("onError", new
            {
                code = "CONFIGURED_ANIMATION_NOT_FOUND",
                message = $"Animation '{def.animationAction}' not found for interaction '{def.interactionId}'."
            });
            return;
        }

        TriggerInteraction(def, worldPosition);
    }

    private bool EvaluateCooldown(ModelInteractionDefinition def)
    {
        if (def.cooldownSeconds <= 0f) return true;

        if (!_cooldowns.TryGetValue(def.interactionId, out float lastTriggered))
        {
            return true;
        }

        bool cooled = (Time.time - lastTriggered) >= def.cooldownSeconds;

        if (!cooled && def.repeatPolicy == InteractionRepeatPolicy.Ignore)
        {
            Debug.Log($"[ModelInteractionHandler] Cooldown active for '{def.interactionId}'. Tap ignored (Ignore policy).");
            return false;
        }

        if (!cooled && def.repeatPolicy == InteractionRepeatPolicy.Restart)
        {
            Debug.Log($"[ModelInteractionHandler] Cooldown active for '{def.interactionId}'. Restarting animation (Restart policy).");
        }

        return true;
    }

    private void TriggerInteraction(ModelInteractionDefinition def, Vector3 worldPosition)
    {
        _cooldowns[def.interactionId] = Time.time;

        PlayAnimation(def);
        PlayAudio(def);
        EmitModelInteractionEvent(def, worldPosition);

        OnInteractionTriggered?.Invoke(new ModelInteractionEventArgs
        {
            InteractionId = def.interactionId,
            HotspotSemantic = def.hotspotSemantic,
            AnimationAction = def.animationAction,
            VocabularyId = def.vocabularyId,
            WorldPosition = worldPosition,
            Timestamp = Time.time
        });
    }

    private void PlayAnimation(ModelInteractionDefinition def)
    {
        if (animationRegistry == null)
        {
            Debug.LogError("[ModelInteractionHandler] AnimationRegistry is null. Cannot play animation.");
            return;
        }

        int hash = animationRegistry.ResolveHash(def.animationAction);
        if (hash == 0)
        {
            Debug.LogError($"[ModelInteractionHandler] ANIMATION_PLAYBACK_FAILED: hash resolution returned 0 for '{def.animationAction}'.");
            return;
        }

        var animator = animationRegistry.GetComponent<Animator>();
        if (animator != null)
        {
            animator.CrossFade(hash, 0.25f);
            Debug.Log($"[ModelInteractionHandler] Playing animation: {def.animationAction}");
        }
        else
        {
            Debug.LogWarning("[ModelInteractionHandler] No Animator found on AnimationRegistry GameObject.");
        }
    }

    private async void PlayAudio(ModelInteractionDefinition def)
    {
        if (audioPlayer == null || string.IsNullOrEmpty(def.audioActionUrl))
        {
            return;
        }

        try
        {
            await audioPlayer.PlayAudio(def.audioActionUrl);
        }
        catch (Exception ex)
        {
            Debug.LogWarning($"[ModelInteractionHandler] AUDIO_ASSET_MISSING/FAILED: {ex.Message}. Interaction still succeeded.");
        }
    }

    private void EmitModelInteractionEvent(ModelInteractionDefinition def, Vector3 worldPosition)
    {
        RNEventEmitter.Instance.SendEvent("onModelInteraction", new ModelInteractionEventPayload
        {
            interactionId = def.interactionId,
            hotspotSemantic = def.hotspotSemantic,
            action = def.animationAction,
            vocabularyId = def.vocabularyId ?? string.Empty,
            worldX = worldPosition.x,
            worldY = worldPosition.y,
            worldZ = worldPosition.z,
            timestamp = Time.time
        });

        Debug.Log($"[ModelInteractionHandler] MODEL_INTERACTION event emitted: id={def.interactionId}, action={def.animationAction}");
    }

    /// <summary>
    /// Registers a new interaction definition at runtime.
    /// Useful when backend-driven config is available.
    /// </summary>
    public void RegisterInteraction(ModelInteractionDefinition def)
    {
        if (string.IsNullOrEmpty(def.interactionId))
        {
            Debug.LogWarning("[ModelInteractionHandler] Cannot register definition with empty interactionId.");
            return;
        }
        _lookup[def.interactionId] = def;
        Debug.Log($"[ModelInteractionHandler] Registered interaction: {def.interactionId}");
    }

    /// <summary>
    /// Clears all registered interactions and cooldowns.
    /// </summary>
    public void ClearAll()
    {
        _lookup.Clear();
        _cooldowns.Clear();
    }

    /// <summary>
    /// Returns the current cooldown remaining for a given interaction ID, or 0 if none.
    /// </summary>
    public float GetCooldownRemaining(string interactionId)
    {
        if (!_cooldowns.TryGetValue(interactionId, out float lastTriggered)) return 0f;
        if (!_lookup.TryGetValue(interactionId, out var def)) return 0f;
        if (def.cooldownSeconds <= 0f) return 0f;
        return Mathf.Max(0f, def.cooldownSeconds - (Time.time - lastTriggered));
    }
}

/// <summary>
/// Event args emitted when an interaction successfully triggers.
/// </summary>
public class ModelInteractionEventArgs : EventArgs
{
    public string InteractionId { get; set; }
    public string HotspotSemantic { get; set; }
    public string AnimationAction { get; set; }
    public string VocabularyId { get; set; }
    public Vector3 WorldPosition { get; set; }
    public float Timestamp { get; set; }
}

/// <summary>
/// Typed payload sent to React Native via RNEventEmitter for the MODEL_INTERACTION event.
/// </summary>
[Serializable]
public struct ModelInteractionEventPayload
{
    public string interactionId;
    public string hotspotSemantic;
    public string action;
    public string vocabularyId;
    public float worldX;
    public float worldY;
    public float worldZ;
    public float timestamp;
}
