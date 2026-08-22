using UnityEditor;
using UnityEngine;
using System.IO;

/// <summary>
/// CLI build script for iOS. Run via:
///   Unity -batchmode -projectPath . -executeMethod iOSBuild.Build
/// </summary>
public static class iOSBuild
{
    private const string BuildOutputDir = "../UnityBuild";

    [MenuItem("Build/iOS Player")]
    public static void Build()
    {
        var scenes = new[]
        {
            "Assets/Scenes/ARScene.unity"
        };

        var buildPath = Path.GetFullPath(BuildOutputDir);

        // Clean output
        if (Directory.Exists(buildPath))
            Directory.Delete(buildPath, true);
        Directory.CreateDirectory(buildPath);

        var buildOptions = new BuildPlayerOptions
        {
            scenes = scenes,
            locationPathName = Path.Combine(buildPath, "UnityFramework"),
            target = BuildTarget.iOS,
            options = BuildOptions.ShowBuiltPlayer
        };

        Debug.Log($"[iOSBuild] Starting iOS build to {buildPath}");
        var report = BuildPipeline.BuildPlayer(buildOptions);
        var success = report.summary.result == UnityEditor.Build.Reporting.BuildResult.Succeeded;

        if (success)
        {
            Debug.Log("[iOSBuild] ✅ Build succeeded");

            // Unity outputs to Build/iOS by default when using target=iOS
            // The framework and Data/ should be at the locationPathName
            var expectedFramework = Path.Combine(buildPath, "UnityFramework.framework");
            var expectedData = Path.Combine(buildPath, "Data");

            if (Directory.Exists(expectedFramework))
                Debug.Log($"[iOSBuild] Found: {expectedFramework}");
            if (Directory.Exists(expectedData))
                Debug.Log($"[iOSBuild] Found: {expectedData}");

            // Also check default Unity iOS output path
            var defaultPath = Path.Combine(Application.dataPath, "..", "Builds", "iOS");
            if (Directory.Exists(defaultPath) && defaultPath != buildPath)
            {
                Debug.Log($"[iOSBuild] Also found default output: {defaultPath}");
            }
        }
        else
        {
            Debug.LogError($"[iOSBuild] ❌ Build failed: {report.summary.result}");
            Debug.LogError($"  Total errors: {report.summary.totalErrors}");
            Debug.LogError($"  Total warnings: {report.summary.totalWarnings}");
        }

        EditorApplication.Exit(success ? 0 : 1);
    }
}
