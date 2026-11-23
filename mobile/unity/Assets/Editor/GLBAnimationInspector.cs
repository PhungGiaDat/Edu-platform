using System;
using System.IO;
using GLTFast;
using GLTFast.Logging;
using UnityEngine;
using UnityEditor;

namespace EduPlatform.Editor
{
    /// <summary>
    /// Editor-only diagnostic: reads the cached elephant.glb directly via GLTFast
    /// (no PlayMode needed) to determine if animations are accessible at all.
    /// </summary>
    public static class GLBAnimationInspector
    {
        [MenuItem("Tools/Elephant/Inspect GLB Animation Clips (GLTFast)")]
        public static void InspectCachedGLB()
        {
            string[] cachePaths = new[]
            {
                Path.Combine(Application.temporaryCachePath, "GLBCache", "elephant.glb"),
                "C:\\Users\\LENOVO\\AppData\\Local\\Temp\\DefaultCompany\\unity\\GLBCache\\elephant.glb"
            };

            string foundPath = null;
            foreach (var p in cachePaths)
            {
                if (File.Exists(p)) { foundPath = p; break; }
            }

            if (foundPath == null)
            {
                Debug.LogError("[GLBAnimInspector] elephant.glb not found in any cache location. Run PlayMode once first.");
                return;
            }

            Debug.Log($"[GLBAnimInspector] Loading {foundPath}...");
            var logger = new ConsoleLogger();
            // GltfImport constructor: (IDownloadProvider, IDeferAgent, IMaterialGenerator, ICodeLogger)
            var gltf = new GltfImport(null, null, null, logger);

            try
            {
                // Synchronous load via LoadFile (Editor only)
                bool loaded = gltf.LoadFile(foundPath).GetAwaiter().GetResult();
                Debug.Log($"[GLBAnimInspector] gltf.LoadFile() returned: {loaded}");

                // Log loading status via the logger
                Debug.Log($"[GLBAnimInspector] LoadingDone: {gltf.LoadingDone}, LoadingError: {gltf.LoadingError}");
                if (!gltf.LoadingDone || gltf.LoadingError)
                {
                    Debug.LogError("[GLBAnimInspector] Load failed - cannot continue.");
                    return;
                }

                // Try the synchronous instantiation method (if available)
                var go = new GameObject("GLBTest");
                bool inst = false;
                try
                {
                    inst = gltf.InstantiateMainSceneAsync(go.transform).GetAwaiter().GetResult();
                    Debug.Log($"[GLBAnimInspector] InstantiateMainSceneAsync() returned: {inst}");
                }
                catch (Exception ex)
                {
                    Debug.LogError($"[GLBAnimInspector] InstantiateMainSceneAsync threw: {ex.Message}");
                }

                // Enumerate Animators
                var animators = go.GetComponentsInChildren<Animator>(true);
                Debug.Log($"[GLBAnimInspector] Animators in scene: {animators.Length}");
                foreach (var a in animators)
                {
                    var rc = a.runtimeAnimatorController;
                    Debug.Log($"[GLBAnimInspector]   Animator on '{a.gameObject.name}': " +
                        $"runtimeAnimatorController={(rc != null ? rc.name : "null")}");
                    if (rc != null)
                    {
                        foreach (var clip in rc.animationClips)
                        {
                            Debug.Log($"[GLBAnimInspector]     clip: {clip.name}");
                        }
                    }
                }

#if UNITY_ANIMATION
                Debug.Log("[GLBAnimInspector] UNITY_ANIMATION is DEFINED in this Editor context.");
                var clips = gltf.GetAnimationClips();
                Debug.Log($"[GLBAnimInspector] GetAnimationClips() returned: {(clips == null ? "null" : clips.Length.ToString())}");
                if (clips != null)
                {
                    foreach (var c in clips)
                    {
                        Debug.Log($"[GLBAnimInspector]   clip: {c?.name ?? "(null)"}");
                    }
                }
#else
                Debug.LogWarning("[GLBAnimInspector] UNITY_ANIMATION is NOT defined in this Editor context! " +
                    "This means the #if UNITY_ANIMATION block in GLBLoader never executes at runtime.");
#endif

                UnityEngine.Object.DestroyImmediate(go);
            }
            catch (Exception ex)
            {
                Debug.LogException(ex);
            }
        }

        [MenuItem("Tools/Elephant/Show ARRuntime Scripting Defines")]
        public static void ShowDefines()
        {
            var assemblies = UnityEditor.Compilation.CompilationPipeline.GetAssemblies();
            foreach (var asm in assemblies)
            {
                if (asm.name == "ARRuntime")
                {
                    Debug.Log($"[Defines] ARRuntime defines: {string.Join(", ", asm.defines)}");
                    return;
                }
            }
            Debug.Log("[Defines] ARRuntime assembly not found.");
        }
    }
}
