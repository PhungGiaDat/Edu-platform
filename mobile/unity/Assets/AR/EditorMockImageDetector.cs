using System;
using System.Collections.Generic;
using Unity.XR.CoreUtils.Collections;
using UnityEngine;
using UnityEngine.XR.ARFoundation;
using UnityEngine.XR.ARSubsystems;

#if UNITY_EDITOR
using UnityEditor;
#endif

/// <summary>
/// Mock image detector that fakes ARTrackedImage events inside the Unity Editor
/// using keyboard input. This lets us test the entire AR pipeline (image tracking
/// → model spawn → animation) WITHOUT a real device or ARKit/ARCore provider.
///
/// Why: Windows dev environment cannot run ARKit, and ARCore requires a physical
/// Android device + USB debugging. The Editor's XR Simulation loader exists but
/// requires complex setup; this is a faster path for logic verification.
///
/// Behavior:
///   - On startup, prints controls to the Console.
///   - Press Space → simulates "image detected" with a configurable name + pose.
///   - Press T → simulates "tracking lost".
///   - Press R → respawns the model (re-enters "image detected").
///
/// What it does NOT do: render real AR background. Camera will show scene background.
/// Suitable for unit-testing scripts that subscribe to `trackables.changed`.
/// </summary>
public class EditorMockImageDetector : MonoBehaviour
{
    [Header("Wiring")]
    [SerializeField] private ARTrackedImageManager trackedImageManager;

    [Header("Mock settings")]
    [Tooltip("Image name to emit on Space press. Must match what the backend sends.")]
    [SerializeField] private string mockImageName = "poc-reference";

    [Tooltip("World position where the fake tracked image should appear.")]
    [SerializeField] private Vector3 mockPosition = new Vector3(0f, 0f, 0.5f);

    [Tooltip("World rotation (Euler) of the fake tracked image.")]
    [SerializeField] private Vector3 mockRotationEuler = Vector3.zero;

#pragma warning disable CS0414 // field assigned but value not used (kept for inspector visibility)
    [SerializeField] private float mockPhysicalWidthMeters = 0.1f;
    [Header("Hotkeys (Editor only)")]
    [SerializeField] private KeyCode detectKey = KeyCode.Space;
    [SerializeField] private KeyCode lostKey = KeyCode.T;
    [SerializeField] private KeyCode respawnKey = KeyCode.R;
    [SerializeField] private KeyCode quitKey = KeyCode.Escape;
#pragma warning restore CS0414

    private readonly Dictionary<string, ARTrackedImage> _mockTrackedImages = new();
    private bool _isDetected;

    private void Awake()
    {
        if (trackedImageManager == null)
            trackedImageManager = FindFirstObjectByType<ARTrackedImageManager>();
    }

    private void Start()
    {
        PrintControls();
    }

    private void PrintControls()
    {
        Debug.Log(
            "[EditorMockImageDetector] === MOCK AR ACTIVE ===\n" +
            $"  [{detectKey}] → Simulate IMAGE DETECTED ('{mockImageName}')\n" +
            $"  [{respawnKey}] → Re-spawn (force re-detect)\n" +
            $"  [{lostKey}] → Simulate TRACKING LOST\n" +
            $"  [{quitKey}] → Quit (Editor only)\n" +
            "Listener: ARTrackedImageManager.trackablesChanged"
        );
    }

    private void Update()
    {
#if UNITY_EDITOR
        if (Input.GetKeyDown(detectKey))
        {
            Debug.Log("[EditorMockImageDetector] Simulating IMAGE DETECTED");
            SimulateDetection();
        }
        else if (Input.GetKeyDown(respawnKey))
        {
            Debug.Log("[EditorMockImageDetector] Simulating RESPAWN (lost + detected)");
            SimulateTrackingLost();
            SimulateDetection();
        }
        else if (Input.GetKeyDown(lostKey))
        {
            Debug.Log("[EditorMockImageDetector] Simulating TRACKING LOST");
            SimulateTrackingLost();
        }
        else if (Input.GetKeyDown(quitKey))
        {
            EditorApplication.isPlaying = false;
        }
#endif
    }

    /// <summary>
    /// Fires a fake "added" event by calling ARSessionManager's test seam directly
    /// (ARFoundation 6.x removed the TrackablesChanged event broadcast from the
    /// private OnTrackablesChanged, making reflection unreliable). If no
    /// ARSessionManager is found, falls back to the old reflection approach.
    /// </summary>
    public void SimulateDetection()
    {
        if (_isDetected)
        {
            Debug.Log("[EditorMockImageDetector] Already detected; press R to respawn");
            return;
        }

        // Build ARTrackablesChangedEventArgs<ARTrackedImage> using the public constructor.
        var added = new List<ARTrackedImage>();
        var updated = new List<ARTrackedImage>();
        var removed = new List<KeyValuePair<TrackableId, ARTrackedImage>>();

        var go = new GameObject($"ARTrackedImage[{mockImageName}]");
        go.transform.position = mockPosition;
        go.transform.rotation = Quaternion.Euler(mockRotationEuler);
        var img = go.AddComponent<ARTrackedImage>();
        SetReferenceImage(img, mockImageName);
        _mockTrackedImages[mockImageName] = img;
        added.Add(img);

        // Fast path: call ARSessionManager's internal seam directly (ARFoundation 6.x compatible).
        var sessionManager = FindFirstObjectByType<ARSessionManager>();
        if (sessionManager != null)
        {
            var args = new ARTrackablesChangedEventArgs<ARTrackedImage>(
                added: new ReadOnlyList<ARTrackedImage>(added),
                updated: new ReadOnlyList<ARTrackedImage>(updated),
                removed: new ReadOnlyList<KeyValuePair<TrackableId, ARTrackedImage>>(removed));
            sessionManager.HandleTrackedImagesChanged(args);
            _isDetected = true;
            Debug.Log($"[EditorMockImageDetector] Fired via ARSessionManager for '{mockImageName}' at {mockPosition}");
            return;
        }

        // Fallback: old reflection path (kept for compatibility if ARSessionManager is absent).
        var argsType = typeof(ARTrackablesChangedEventArgs<>).MakeGenericType(typeof(ARTrackedImage));
        var eventArgs = CreateEventArgs(argsType, added, updated, removed);
        var method = typeof(ARTrackedImageManager).GetMethod(
            "OnTrackablesChanged",
            System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.NonPublic);
        if (method != null)
        {
            method.Invoke(trackedImageManager, new object[] { eventArgs });
            _isDetected = true;
            Debug.Log($"[EditorMockImageDetector] Fired via reflection for '{mockImageName}' at {mockPosition}");
        }
        else
        {
            Debug.LogError("[EditorMockImageDetector] ARTrackedImageManager.OnTrackablesChanged not found via reflection — add ARSessionManager to the scene.");
        }
    }

    public void SimulateTrackingLost()
    {
        if (!_isDetected)
        {
            Debug.Log("[EditorMockImageDetector] Nothing to lose");
            return;
        }

        var added = new List<ARTrackedImage>();
        var updated = new List<ARTrackedImage>();
        var removed = new List<KeyValuePair<TrackableId, ARTrackedImage>>();

        if (_mockTrackedImages.TryGetValue(mockImageName, out var img))
        {
            removed.Add(new KeyValuePair<TrackableId, ARTrackedImage>(img.trackableId, img));
            Destroy(img.gameObject);
        }

        var args = new ARTrackablesChangedEventArgs<ARTrackedImage>(
            added: new ReadOnlyList<ARTrackedImage>(added),
            updated: new ReadOnlyList<ARTrackedImage>(updated),
            removed: new ReadOnlyList<KeyValuePair<TrackableId, ARTrackedImage>>(removed));

        var sessionManager = FindFirstObjectByType<ARSessionManager>();
        if (sessionManager != null)
        {
            sessionManager.HandleTrackedImagesChanged(args);
            _isDetected = false;
            Debug.Log("[EditorMockImageDetector] Tracking-lost via ARSessionManager");
            return;
        }

        // Fallback: old reflection path.
        var argsType = typeof(ARTrackablesChangedEventArgs<>).MakeGenericType(typeof(ARTrackedImage));
        var eventArgs = CreateEventArgs(argsType, added, updated, removed);
        var method = typeof(ARTrackedImageManager).GetMethod(
            "OnTrackablesChanged",
            System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.NonPublic);
        if (method != null)
        {
            method.Invoke(trackedImageManager, new object[] { eventArgs });
            _isDetected = false;
            Debug.Log("[EditorMockImageDetector] Tracking-lost via reflection");
        }
    }

    /// <summary>
    /// Creates an ARTrackablesChangedEventArgs instance via reflection (the public
    /// constructors are not API-stable across ARFoundation versions).
    /// </summary>
    private static object CreateEventArgs(
        System.Type argsType,
        IList<ARTrackedImage> added,
        IList<ARTrackedImage> updated,
        IList<KeyValuePair<TrackableId, ARTrackedImage>> removed)
    {
        // Look for a constructor whose parameter order matches.
        foreach (var ctor in argsType.GetConstructors())
        {
            var ps = ctor.GetParameters();
            if (ps.Length == 3)
            {
                try
                {
                    object[] paramValues = InferParameters(ps, added, updated, removed);
                    return ctor.Invoke(paramValues);
                }
                catch
                {
                    // Try the next constructor.
                }
            }
        }
        return null;
    }

    private static object[] InferParameters(
        System.Reflection.ParameterInfo[] ps,
        IList<ARTrackedImage> added,
        IList<ARTrackedImage> updated,
        IList<KeyValuePair<TrackableId, ARTrackedImage>> removed)
    {
        // Heuristic: assume the parameter naming convention used by ARFoundation
        // (added, updated, removed). Fall back to type matching.
        var values = new object[ps.Length];
        for (int i = 0; i < ps.Length; i++)
        {
            var pType = ps[i].ParameterType;
            if (pType.IsAssignableFrom(added.GetType()))
                values[i] = added;
            else if (pType.IsAssignableFrom(updated.GetType()))
                values[i] = updated;
            else if (pType.IsAssignableFrom(removed.GetType()))
                values[i] = removed;
            else
                values[i] = pType.IsValueType ? Activator.CreateInstance(pType) : null;
        }
        return values;
    }

    /// <summary>
    /// Sets the internal referenceImage property on an ARTrackedImage so that
    /// downstream handlers (which read image.referenceImage.name) see the mock name.
    /// </summary>
    private static void SetReferenceImage(ARTrackedImage img, string name)
    {
        var prop = typeof(ARTrackedImage).GetProperty(
            "referenceImage",
            System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Instance);
        var referenceImage = new XRReferenceImage(
            guid: default,
            textureGuid: default,
            size: new Vector2(0.1f, 0.1f),
            name: name,
            texture: null);
        prop?.SetValue(img, referenceImage);
    }

    private void OnDestroy()
    {
        foreach (var img in _mockTrackedImages.Values)
        {
            if (img != null && img.gameObject != null)
                Destroy(img.gameObject);
        }
        _mockTrackedImages.Clear();
    }
}
