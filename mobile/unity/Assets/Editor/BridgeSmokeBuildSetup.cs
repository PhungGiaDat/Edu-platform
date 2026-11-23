using System;
using System.IO;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;

public static class BridgeSmokeBuildSetup
{
    private const string ScenePath = "Assets/Scenes/BridgeSmokeScene.unity";
    private const string ExportPath = "Builds/Android";

    [MenuItem("EduPlatform/Bridge/Create Smoke Scene")]
    public static void CreateSmokeScene()
    {
        var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);

        var cameraObject = new GameObject("Main Camera");
        cameraObject.tag = "MainCamera";
        var camera = cameraObject.AddComponent<Camera>();
        camera.clearFlags = CameraClearFlags.SolidColor;
        camera.backgroundColor = new Color(0.04f, 0.08f, 0.18f, 1f);
        cameraObject.transform.position = new Vector3(0f, 0f, -5f);

        var lightObject = new GameObject("Directional Light");
        var light = lightObject.AddComponent<Light>();
        light.type = LightType.Directional;
        light.intensity = 1.2f;
        lightObject.transform.rotation = Quaternion.Euler(35f, -30f, 0f);

        var primitive = GameObject.CreatePrimitive(PrimitiveType.Cube);
        primitive.name = "Bridge Smoke Cube";
        primitive.transform.rotation = Quaternion.Euler(20f, 35f, 0f);
        primitive.GetComponent<Renderer>().sharedMaterial.color = new Color(0.15f, 0.75f, 1f, 1f);

        new GameObject("RNMessageReceiver").AddComponent<RNMessageReceiver>();
        new GameObject("BridgeBootstrap").AddComponent<BridgeSmokeBootstrap>();

        EditorSceneManager.SaveScene(scene, ScenePath);
        EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(ScenePath, true) };
        AssetDatabase.SaveAssets();
    }

    [MenuItem("EduPlatform/Bridge/Export Android ARMv7")]
    public static void ExportAndroidArmv7()
    {
        CreateSmokeScene();
        PlayerSettings.Android.targetArchitectures = AndroidArchitecture.ARMv7;
        EditorUserBuildSettings.exportAsGoogleAndroidProject = true;

        // Unity's Gradle export is incremental and otherwise leaves native
        // libraries from a previous ABI in place. The smoke export must be a
        // self-contained ARMv7 artifact, so remove only this generated output.
        string absoluteExportPath = Path.GetFullPath(ExportPath);
        string projectRoot = Path.GetFullPath(Path.Combine(Application.dataPath, ".."));
        if (!absoluteExportPath.StartsWith(projectRoot + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase)) {
            throw new InvalidOperationException($"Refusing to clean export outside the Unity project: {absoluteExportPath}");
        }
        if (Directory.Exists(absoluteExportPath)) {
            Directory.Delete(absoluteExportPath, true);
        }

        var options = new BuildPlayerOptions {
            scenes = new[] { ScenePath },
            locationPathName = ExportPath,
            target = BuildTarget.Android,
            targetGroup = BuildTargetGroup.Android,
            options = BuildOptions.Development
        };

        BuildReport report = BuildPipeline.BuildPlayer(options);
        if (report.summary.result != BuildResult.Succeeded) {
            throw new InvalidOperationException($"ARMv7 export failed: {report.summary.result}");
        }

        string manifestPath = Path.Combine(ExportPath, "unityLibrary", "src", "main", "AndroidManifest.xml");
        string manifest = File.ReadAllText(manifestPath);
        manifest = manifest.Replace(
            "com.unity3d.player.UnityPlayerGameActivity",
            "com.unity3d.player.RNUnityPlayerActivity");
        // Unity is embedded in RN and must not register a second launcher icon.
        // RN launches this Activity explicitly via UnityBridgeModule.launchUnity().
        manifest = System.Text.RegularExpressions.Regex.Replace(
            manifest,
            @"\s*<intent-filter>\s*<category android:name=""android.intent.category.LAUNCHER"" />\s*<action android:name=""android.intent.action.MAIN"" />\s*</intent-filter>",
            string.Empty);
        File.WriteAllText(manifestPath, manifest);

        Debug.Log($"[BridgeSmokeBuildSetup] ARMv7 export complete: {Path.GetFullPath(ExportPath)}");
    }
}
