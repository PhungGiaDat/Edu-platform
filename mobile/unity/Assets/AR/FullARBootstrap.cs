using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.XR.ARFoundation;

// Editor-time test rigs disable the runtime bootstrap so the test scene's own
// ARSession + ARTrackedImageManager (wired in the Inspector) take over.
// On device we always want the auto-bootstrap; on Mac Day it gives us a working
// .ipa with zero scene authoring.
#if !UNITY_EDITOR
/// <summary>
/// Builds the full AR Experience rig at runtime (camera session, AR Experience Handler,
/// GLB loader, model spawner, animation, audio, gesture handler, plane detection).
/// This avoids hand-authoring AR components into the scene with hardcoded script GUIDs,
/// which is fragile in a scaffold without the .meta files Unity normally generates.
///
/// Why runtime-only: every script gets a fresh .meta GUID when Unity imports it, so any
/// scene that references those GUIDs will break the moment a different machine opens the
/// project. Building the rig from code keeps the scene portable.
///
/// Disable POCBootstrap (or remove it from the scene) before adding this bootstrap,
/// otherwise the two will fight over who owns the ARSession.
/// </summary>
public static class FullARBootstrap
{
    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
    private static void Bootstrap()
    {
        // Gate A is an embedded-runtime/bridge smoke test and must not create
        // any AR Foundation subsystems on non-ARCore hardware.
        if (SceneManager.GetActiveScene().name == "BridgeSmokeScene") return;

        // Skip if a session is already created (e.g., POCBootstrap ran first).
        if (Object.FindFirstObjectByType<ARSession>() != null) return;

        // === AR Session ===
        var sessionGo = new GameObject("AR Session");
        sessionGo.AddComponent<ARSession>();
        sessionGo.AddComponent<ARInputManager>();
        Object.DontDestroyOnLoad(sessionGo);

        // === XR Origin + Camera ===
        var originGo = new GameObject("XR Origin");
        var origin = originGo.AddComponent<Unity.XR.CoreUtils.XROrigin>();

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

        // === Image tracking manager ===
        var imageManagerGo = new GameObject("AR Tracked Image Manager");
        imageManagerGo.transform.SetParent(originGo.transform, false);
        imageManagerGo.AddComponent<ARTrackedImageManager>();

        // === Plane detection ===
        var planeGo = new GameObject("Plane Detection");
        planeGo.transform.SetParent(originGo.transform, false);
        planeGo.AddComponent<ARPlaneManager>();
        planeGo.AddComponent<PlaneDetection>();

        // === Anchor manager ===
        var anchorGo = new GameObject("Anchor Manager");
        anchorGo.transform.SetParent(originGo.transform, false);
        anchorGo.AddComponent<ARRaycastManager>();
        anchorGo.AddComponent<ARAnchorManager>();
        anchorGo.AddComponent<AnchorManager>();

        // === Models subsystem ===
        var modelsGo = new GameObject("Models");
        modelsGo.transform.SetParent(originGo.transform, false);
        modelsGo.AddComponent<GLBLoader>();
        modelsGo.AddComponent<ModelSpawner>();

        // === Audio + animation (need their own GameObjects because AudioSource + Animator
        // attach to the GameObject they live on) ===
        var audioGo = new GameObject("AR Audio Player");
        audioGo.transform.SetParent(modelsGo.transform, false);
        audioGo.AddComponent<AudioSource>();
        audioGo.AddComponent<ARAudioPlayer>();

        var animGo = new GameObject("Animation Controller");
        animGo.transform.SetParent(modelsGo.transform, false);
        animGo.AddComponent<Animator>();
        animGo.AddComponent<AnimationController>();

        // === Gestures ===
        var gestureGo = new GameObject("Gesture Handler");
        gestureGo.transform.SetParent(originGo.transform, false);
        gestureGo.AddComponent<ARGestureHandler>();

        // === Session + experience orchestrator ===
        var sessionMgrGo = new GameObject("AR Session Manager");
        sessionMgrGo.transform.SetParent(originGo.transform, false);
        sessionMgrGo.AddComponent<ARSessionManager>();

        var experienceGo = new GameObject("AR Experience Handler");
        experienceGo.transform.SetParent(originGo.transform, false);
        experienceGo.AddComponent<ARExperienceHandler>();

        // === Bridge receivers ===
        var bridgeGo = new GameObject("Bridge");
        bridgeGo.transform.SetParent(originGo.transform, false);
        bridgeGo.AddComponent<RNMessageReceiver>();
        // RNEventEmitter is a singleton that creates its own GameObject on first access.

        Object.DontDestroyOnLoad(originGo);

        UnityEngine.Debug.Log("[FullARBootstrap] Full AR rig created at runtime.");
    }
}
#endif
