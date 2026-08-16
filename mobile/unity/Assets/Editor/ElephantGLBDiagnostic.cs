using System;
using System.IO;
using System.Text;
using UnityEditor;
using UnityEngine;

#if UNITY_EDITOR
namespace EduPlatform.Editor
{
    /// <summary>
    /// EditMode diagnostic to inspect the elephant GLB file structure.
    /// glTF is a binary container — first 4 bytes are magic "glTF", version uint32, then JSON chunk.
    /// Reading the JSON header reveals all animation nodes and clip names.
    /// No PlayMode required.
    /// </summary>
    public static class ElephantGLBDiagnostic
    {
        private const string CACHE_PATH_KEY = "ElephantGLB_CachePath";

        [MenuItem("Tools/Elephant/Inspect GLB File (Read Header)")]
        public static void InspectGLBFile()
        {
            string cacheDir = Path.Combine(Application.temporaryCachePath, "GLBCache");
            string[] candidates;
            try
            {
                candidates = Directory.Exists(cacheDir)
                    ? Directory.GetFiles(cacheDir, "*.glb")
                    : Array.Empty<string>();
            }
            catch (Exception ex)
            {
                Debug.LogError($"[ElephantGLBDiag] Cannot list cache dir: {ex.Message}");
                return;
            }

            if (candidates.Length == 0)
            {
                Debug.LogError($"[ElephantGLBDiag] No GLB found in cache: {cacheDir}. " +
                    "PlayMode once so GLBLoader downloads the elephant, then re-run this menu item.");
                return;
            }

            foreach (var file in candidates)
            {
                InspectSingleGLB(file);
            }
        }

        private static void InspectSingleGLB(string path)
        {
            Debug.Log($"[ElephantGLBDiag] === Inspecting: {path} ===");
            try
            {
                var bytes = File.ReadAllBytes(path);
                Debug.Log($"[ElephantGLBDiag] File size: {bytes.Length / 1024} KB ({bytes.Length} bytes)");

                // glTF binary header
                // 0..3: magic "glTF"
                // 4..7: version (uint32, should be 2)
                // 8..11: length (uint32, total file size)
                // 12..15: chunk0Length (uint32, JSON chunk length)
                // 16..19: chunk0Type (uint32, should be "JSON" = 0x4E4F534A)
                // 20..: chunk0Data (JSON text)

                string magic = Encoding.ASCII.GetString(bytes, 0, 4);
                Debug.Log($"[ElephantGLBDiag] Magic: '{magic}' (expected 'glTF')");

                uint version = BitConverter.ToUInt32(bytes, 4);
                Debug.Log($"[ElephantGLBDiag] Version: {version} (expected 2)");

                uint totalLength = BitConverter.ToUInt32(bytes, 8);
                Debug.Log($"[ElephantGLBDiag] Total length (header): {totalLength} bytes");

                uint chunk0Length = BitConverter.ToUInt32(bytes, 12);
                Debug.Log($"[ElephantGLBDiag] JSON chunk length: {chunk0Length} bytes");

                uint chunk0Type = BitConverter.ToUInt32(bytes, 16);
                Debug.Log($"[ElephantGLBDiag] Chunk 0 type: 0x{chunk0Type:X8} (expected 0x4E4F534A = JSON)");

                string json = Encoding.UTF8.GetString(bytes, 20, (int)chunk0Length);
                Debug.Log($"[ElephantGLBDiag] === JSON header ===");
                Debug.Log($"[ElephantGLBDiag] {json}");
                Debug.Log($"[ElephantGLBDiag] === End JSON ===");

                // Quick scan for animation keywords
                bool hasAnimations = json.Contains("\"animations\"");
                int animsCount = 0;
                if (hasAnimations)
                {
                    int idx = json.IndexOf("\"animations\":", StringComparison.Ordinal);
                    int start = json.IndexOf('[', idx);
                    int end = json.IndexOf(']', start);
                    string animsArr = json.Substring(start, end - start);
                    animsCount = CountTopLevelObjects(animsArr);
                }
                Debug.Log($"[ElephantGLBDiag] === Summary ===");
                Debug.Log($"[ElephantGLBDiag] Has 'animations' key: {hasAnimations}");
                Debug.Log($"[ElephantGLBDiag] Number of animations declared: {animsCount}");

                // List node names
                if (json.Contains("\"nodes\""))
                {
                    Debug.Log($"[ElephantGLBDiag] nodes count present in JSON. Search Console output for full JSON above.");
                }
            }
            catch (Exception ex)
            {
                Debug.LogError($"[ElephantGLBDiag] Failed: {ex.Message}");
            }
        }

        private static int CountTopLevelObjects(string arrayJson)
        {
            int depth = 0;
            int count = 0;
            for (int i = 0; i < arrayJson.Length; i++)
            {
                char c = arrayJson[i];
                if (c == '{' && depth == 0) count++;
                else if (c == '{') depth++;
                else if (c == '}') depth--;
            }
            return count;
        }
    }
}
#endif
