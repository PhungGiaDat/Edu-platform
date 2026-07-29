using UnityEngine;
using Unity.XR.CoreUtils;
using UnityEngine.XR.ARFoundation;

/// <summary>
/// Builds the entire AR rig in code so the POC does not depend on a hand-authored
/// .unity scene or Editor-generated .meta GUIDs (this project is a scaffold without them).
///
/// Attach this to a single empty GameObject in a scene, OR let it auto-bootstrap on load.
/// It creates:
///   - ARSession (+ ARInputManager)
///   - XROrigin with an AR Camera (ARCameraManager + ARCameraBackground)
///   - ARTrackedImageManager + RuntimeImageTrackingPOC
///
/// NOTE: XR Plug-in Management with the ARKit provider must still be enabled in
/// ProjectSettings (only the Unity Editor can generate that). See CODEMAGIC-SETUP.md.
/// </summary>
public static class POCBootstrap
{
    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
    private static void Bootstrap()
    {
        // Avoid double-bootstrapping if a scene already wired an ARSession.
        if (Object.FindFirstObjectByType<ARSession>() != null) return;

        // AR session.
        var sessionGo = new GameObject("AR Session");
        sessionGo.AddComponent<ARSession>();
        sessionGo.AddComponent<ARInputManager>();
        Object.DontDestroyOnLoad(sessionGo);

        // XR Origin + AR camera.
        var originGo = new GameObject("XR Origin");
        var origin = originGo.AddComponent<XROrigin>();

        var cameraOffsetGo = new GameObject("Camera Offset");
        cameraOffsetGo.transform.SetParent(originGo.transform, false);

        var cameraGo = new GameObject("AR Camera");
        cameraGo.transform.SetParent(cameraOffsetGo.transform, false);
        var cam = cameraGo.AddComponent<Camera>();
        cam.clearFlags = CameraClearFlags.SolidColor;
        cam.backgroundColor = Color.black;
        cam.nearClipPlane = 0.1f;
        cam.farClipPlane = 20f;
        cameraGo.tag = "MainCamera";
        cameraGo.AddComponent<ARCameraManager>();
        cameraGo.AddComponent<ARCameraBackground>();

        origin.Camera = cam;
        origin.CameraFloorOffsetObject = cameraOffsetGo;

        // Tracked image manager + POC controller (RequireComponent adds the manager).
        originGo.AddComponent<RuntimeImageTrackingPOC>();

        Object.DontDestroyOnLoad(originGo);

        UnityEngine.Debug.Log("[POCBootstrap] AR rig created at runtime.");
    }
}
