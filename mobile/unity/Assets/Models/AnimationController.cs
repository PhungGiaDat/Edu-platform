using System;
using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// Detects animation clips in a GLB model and plays animations
/// (idle, rotate, bounce) on user interaction.
/// </summary>
public class AnimationController : MonoBehaviour
{
    [SerializeField] private Animator animator;

    private readonly Dictionary<string, int> _clipHashes = new();

    private void Awake() {
        if (animator == null) animator = GetComponent<Animator>();
    }

    /// <summary>
    /// Scans all AnimationClips in the Animator's controllers and registers
    /// available clip names by hash for fast lookup.
    /// </summary>
    public void DiscoverClips() {
        if (animator == null) return;
        _clipHashes.Clear();

        var controller = animator.runtimeAnimatorController;
        if (controller == null) return;

        foreach (var clip in controller.animationClips) {
            var hash = Animator.StringToHash(clip.name);
            _clipHashes[clip.name.ToLowerInvariant()] = hash;
            UnityEngine.Debug.Log($"[AnimationController] Found clip: {clip.name}");
        }
    }

    /// <summary>
    /// Plays the animation matching the given type (rotate/bounce/idle).
    /// Falls back gracefully if the clip is not found.
    /// </summary>
    public void PlayAnimation(ARAnimationType type) {
        if (animator == null) return;

        string clipName = type switch {
            ARAnimationType.Rotate => "rotate",
            ARAnimationType.Bounce => "bounce",
            ARAnimationType.Idle => "idle",
            _ => "idle"
        };

        if (_clipHashes.TryGetValue(clipName, out int hash)) {
            animator.CrossFade(hash, 0.25f);
            UnityEngine.Debug.Log($"[AnimationController] Playing: {clipName}");
            RNEventEmitter.Instance.SendEvent("onAnimationComplete", new {
                clip = clipName,
                qrId = ""
            });
        } else {
            UnityEngine.Debug.LogWarning($"[AnimationController] Clip not found: {clipName}");
        }
    }

    /// <summary>
    /// Resets the animation to idle.
    /// </summary>
    public void ResetToIdle() {
        PlayAnimation(ARAnimationType.Idle);
    }

    /// <summary>
    /// Plays the named animation clip by looking it up in the discovered clip set.
    /// Case-insensitive.
    /// Returns true if the clip was found and started; false if the clip is not registered.
    /// Logs a warning if the clip is not found — callers are responsible for
    /// verifying clip availability beforehand via DiscoverClips + a clip-existence check.
    /// </summary>
    public bool PlayClipByName(string clipName)
    {
        if (animator == null) return false;
        if (string.IsNullOrEmpty(clipName)) return false;

        string key = clipName.ToLowerInvariant();
        if (_clipHashes.TryGetValue(key, out int hash))
        {
            animator.CrossFade(hash, 0.25f);
            UnityEngine.Debug.Log($"[AnimationController] PlayClipByName: {clipName}");
            return true;
        }

        UnityEngine.Debug.LogWarning($"[AnimationController] PlayClipByName: clip '{clipName}' not found. "
            + "Ensure DiscoverClips() was called and the clip is exported from the GLB.");
        return false;
    }
}
