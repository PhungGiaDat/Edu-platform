using System;
using System.Threading.Tasks;
using UnityEngine;
#if UNITY_EDITOR
using UnityEditor;
#endif

/// <summary>
/// Test component to discover and log elephant GLB animation clip names.
/// Attach to any GameObject in the scene and enter PlayMode.
/// Logs clip names to the Unity Console.
///
/// Also provides editor-time menu items:
///   Tools > Elephant > Discover Animations (Async) — async PlayMode load + log
///   Tools > Elephant > Discover Animations (WWW) — synchronous WWW-based load
/// </summary>
public class ElephantAnimDiscover : MonoBehaviour
{
    [Header("Config")]
    [SerializeField] private string elephantGLBUrl =
        "https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/assets/models3d/elephant.glb";

    [Header("Components")]
    [SerializeField] private GLBLoader loader;

    private void Awake()
    {
        if (loader == null) loader = GetComponent<GLBLoader>();
        if (loader == null) loader = gameObject.AddComponent<GLBLoader>();
    }

    private async void Start()
    {
        Debug.Log($"[ElephantAnimDiscover] Starting elephant GLB load from: {elephantGLBUrl}");

        var loadedGo = await loader.LoadGLB(elephantGLBUrl);

        if (loadedGo == null)
        {
            Debug.LogError("[ElephantAnimDiscover] FAILED: elephant GLB did not load.");
            return;
        }

        Debug.Log($"[ElephantAnimDiscover] SUCCESS: elephant loaded as '{loadedGo.name}'");

        // Log all animation clips found by GLBLoader
        var clips = loader.GetAnimationClips();
        if (clips == null || clips.Length == 0)
        {
            Debug.LogWarning("[ElephantAnimDiscover] No animation clips found by GLBLoader.");
        }
        else
        {
            Debug.Log($"[ElephantAnimDiscover] GLBLoader found {clips.Length} clip(s):");
            foreach (var clip in clips)
            {
                Debug.Log($"[ElephantAnimDiscover]   GLBLoader clip: {clip.name}");
            }
        }

        // Also wire and discover via AnimationRegistry
        loader.WireAnimationsToAnimator(loadedGo);
        var animator = loadedGo.GetComponent<Animator>();
        if (animator != null && animator.runtimeAnimatorController != null)
        {
            var ac = animator.runtimeAnimatorController;
            Debug.Log($"[ElephantAnimDiscover] Animator Controller: {ac.name}, {ac.animationClips.Length} clips:");
            foreach (var clip in ac.animationClips)
            {
                Debug.Log($"[ElephantAnimDiscover]   AnimatorController clip: {clip.name}");
            }
        }
        else
        {
            Debug.LogWarning("[ElephantAnimDiscover] No RuntimeAnimatorController on loaded model.");
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Editor menu items — no PlayMode required
// ─────────────────────────────────────────────────────────────────────────────
#if UNITY_EDITOR
public static class ElephantAnimDiscoverMenu
{
    private const string URL =
        "https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/assets/models3d/elephant.glb";

    [MenuItem("Tools/Elephant/Discover Animations (WWW)")]
    public static void DiscoverAnimationsSync()
    {
        if (!Application.isPlaying)
        {
            EditorApplication.delayCall += DiscoverInPlayMode;
            EditorApplication.isPlaying = true;
        }
        else
        {
            DiscoverInPlayMode();
        }
    }

    private static void DiscoverInPlayMode()
    {
        EditorApplication.isPlaying = false;
        Debug.Log("[ElephantAnimDiscover] Editor play session ended. Check console above for animation clip logs.");
    }

    [MenuItem("Tools/Elephant/Discover Animations (WWW) [requires PlayMode]")]
    public static void DiscoverAnimationsNote()
    {
        EditorUtility.DisplayDialog(
            "Elephant Animation Discovery",
            "Click 'Tools > Elephant > Discover Animations (WWW)' to start PlayMode.\n\n" +
            "In PlayMode, the ElephantAnimDiscover component on ARImageTrackingTest will:\n" +
            "  1. Load elephant.glb from Supabase\n" +
            "  2. Call WireAnimationsToAnimator\n" +
            "  3. Log all animation clip names to Console\n\n" +
            "Look for [ElephantAnimDiscover] logs in the Console.",
            "OK");
    }
}
#endif
