using UnityEditor;
using UnityEngine;
using System.IO;

public static class iOSBuild
{
    private const string XcodeExportDir = "../UnityXcodeExport";

    [MenuItem("Build/Export Xcode Project")]
    public static void ExportXcodeProject()
    {
        var scenes = EditorBuildSettings.scenes;
        var scenePaths = new string[scenes.Length];
        for (int i = 0; i < scenes.Length; i++)
        {
            scenePaths[i] = scenes[i].path;
        }

        if (scenePaths.Length == 0)
        {
            Debug.LogError("[iOSBuild] No scenes in Build Settings!");
            return;
        }

        var exportPath = Path.GetFullPath(XcodeExportDir);

        if (Directory.Exists(exportPath))
            Directory.Delete(exportPath, true);
        Directory.CreateDirectory(exportPath);

        Debug.Log($"[iOSBuild] Exporting to: {exportPath}");

        BuildPlayerOptions buildOptions = new BuildPlayerOptions
        {
            scenes = scenePaths,
            locationPathName = exportPath,
            target = BuildTarget.iOS,
            options = BuildOptions.None
        };

        var report = BuildPipeline.BuildPlayer(buildOptions);
        var success = report.summary.result == UnityEditor.Build.Reporting.BuildResult.Succeeded;

        if (success)
        {
            Debug.Log("[iOSBuild] ✅ Export succeeded!");
            Debug.Log($"[iOSBuild] Output: {exportPath}");
        }
        else
        {
            Debug.LogError($"[iOSBuild] ❌ Export failed: {report.summary.result}");
        }

        EditorApplication.Exit(success ? 0 : 1);
    }
}
