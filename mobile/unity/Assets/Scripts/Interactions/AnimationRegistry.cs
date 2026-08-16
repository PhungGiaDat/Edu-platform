using System;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;

/// <summary>
/// Scans the animation clips exposed by a model and exposes a name-based
/// lookup so interaction definitions can reference clips by their exported
/// Action name without hard-coding clip names in the trigger logic.
///
/// Uses the same Animator + RuntimeAnimatorController pattern as the existing
/// <see cref="AnimationController"/>, but exposes the discovered clip map
/// independently so any component can query it.
/// </summary>
public class AnimationRegistry : MonoBehaviour
{
    private readonly Dictionary<string, int> _clipHashes = new();

    /// <summary>
    /// All animation clip names discovered during the last Discover call,
    /// in the order they were found.
    /// </summary>
    public IReadOnlyList<string> DiscoveredClipNames => _clipHashes.Keys.ToList();

    /// <summary>
    /// Scans all animation clips in the Animator's RuntimeAnimatorController
    /// and registers their names (lowercased) for fast hash-based lookup.
    /// Safe to call multiple times — clears and re-scans each call.
    /// </summary>
    public void Discover(Animator animator)
    {
        _clipHashes.Clear();
        if (animator == null) return;

        var controller = animator.runtimeAnimatorController;
        if (controller == null)
        {
            Debug.LogWarning("[AnimationRegistry] Animator has no RuntimeAnimatorController.");
            return;
        }

        foreach (var clip in controller.animationClips)
        {
            var key = clip.name.ToLowerInvariant();
            _clipHashes[key] = Animator.StringToHash(clip.name);
            Debug.Log($"[AnimationRegistry] Discovered clip: {clip.name}");
        }
    }

    /// <summary>
    /// Test seam: inserts a clip directly into the registry without going
    /// through Discover. Used by EditMode tests to verify lookup logic
    /// without a real GLB+Animator.
    /// </summary>
    protected virtual void TestSetClip(string clipName, int hash)
    {
        if (!string.IsNullOrEmpty(clipName) && hash != 0)
        {
            _clipHashes[clipName.ToLowerInvariant()] = hash;
        }
    }

    /// <summary>
    /// Returns true if the given clip name (case-insensitive) is registered.
    /// </summary>
    public bool HasClip(string clipName)
    {
        return !string.IsNullOrEmpty(clipName) && _clipHashes.ContainsKey(clipName.ToLowerInvariant());
    }

    /// <summary>
    /// Resolves a clip name to its Animator hash.
    /// Returns 0 if the clip is not registered.
    /// </summary>
    public int ResolveHash(string clipName)
    {
        if (string.IsNullOrEmpty(clipName)) return 0;
        return _clipHashes.TryGetValue(clipName.ToLowerInvariant(), out int hash) ? hash : 0;
    }
}
