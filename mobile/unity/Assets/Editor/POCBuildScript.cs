using System;
using System.Linq;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEngine;

/// <summary>
/// Headless build entry points for CI (Codemagic).
/// Invoked via: Unity -batchmode -quit -executeMethod POCBuildScript.BuildIOS
/// Produces an Xcode project at ./build/ios which Codemagic then archives + signs into an IPA.
/// </summary>
public static class POCBuildScript
{
    private const string OutputPath = "build/ios";

    public static void BuildIOS()
    {
        try
        {
            PlayerSettings.SetScriptingBackend(BuildTargetGroup.iOS, ScriptingImplementation.IL2CPP);
            PlayerSettings.iOS.targetOSVersionString = "14.0";
            PlayerSettings.iOS.cameraUsageDescription =
                "This app uses the camera for augmented reality image tracking.";
            // AR apps require the device to declare ARKit; and no simulator SDK.
            PlayerSettings.iOS.sdkVersion = iOSSdkVersion.DeviceSDK;

            var scenes = EditorBuildSettings.scenes
                .Where(s => s.enabled)
                .Select(s => s.path)
                .ToArray();

            var options = new BuildPlayerOptions
            {
                scenes = scenes,
                locationPathName = OutputPath,
                target = BuildTarget.iOS,
                options = BuildOptions.None,
            };

            var report = BuildPipeline.BuildPlayer(options);
            var summary = report.summary;

            if (summary.result == BuildResult.Succeeded)
            {
                Console.WriteLine($"[POCBuildScript] Build succeeded: {summary.totalSize} bytes");
                EditorApplication.Exit(0);
            }
            else
            {
                Console.WriteLine($"[POCBuildScript] Build FAILED: {summary.result}");
                EditorApplication.Exit(1);
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[POCBuildScript] Build threw: {ex}");
            EditorApplication.Exit(2);
        }
    }
}