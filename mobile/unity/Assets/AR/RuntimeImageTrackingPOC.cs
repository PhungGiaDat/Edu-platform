using System;
using System.Collections;
using UnityEngine;
using UnityEngine.Networking;
using UnityEngine.XR.ARFoundation;
using UnityEngine.XR.ARSubsystems;

/// <summary>
/// Standalone Unity-only POC that proves the runtime image library architecture:
///   1. Download a reference image from a hardcoded URL (stands in for the API/flashcard imageUrl).
///   2. Create a MutableRuntimeReferenceImageLibrary at runtime.
///   3. Add the downloaded image via ScheduleAddImageWithValidationJob.
///   4. Track the physical printout of that image with ARTrackedImageManager.
///   5. Spawn a marker cube anchored to the tracked image.
///
/// No React Native, no API, no GLB. Just the risky part: runtime image tracking.
/// An on-screen OnGUI overlay reports each step so the POC is self-verifying on-device.
///
/// AR Foundation 6.x managed pattern (NOT the legacy ARSession.Run(ARImageTrackingConfiguration) API).
/// </summary>
[RequireComponent(typeof(ARTrackedImageManager))]
public class RuntimeImageTrackingPOC : MonoBehaviour
{
    [Header("Reference image (hardcoded for POC)")]
    [Tooltip("URL of the reference image to download and track. Print this image on paper to test.")]
    [SerializeField] private string imageUrl = "https://raw.githubusercontent.com/Unity-Technologies/arfoundation-samples/main/Assets/Scenes/ImageTracking/Images/QRCode.png";

    [Tooltip("Physical printed width of the image, in meters. Measure your printout and set this accurately.")]
    [SerializeField] private float physicalWidthMeters = 0.1f;

    [Header("Marker spawned on detection")]
    [SerializeField] private float markerSizeMeters = 0.05f;

    private ARTrackedImageManager _manager;
    private MutableRuntimeReferenceImageLibrary _mutableLibrary;
    private Texture2D _downloadedTexture;
    private GameObject _marker;

    // On-screen status for on-device verification.
    private string _status = "Starting...";
    private string _capabilityLine = "";
    private string _trackingLine = "";
    private bool _hadError;

    private void Awake()
    {
        _manager = GetComponent<ARTrackedImageManager>();
        // Don't run the manager until we've built and assigned a runtime library.
        _manager.enabled = false;
    }

    private void OnEnable()
    {
        // AF6: trackablesChanged replaces the obsolete trackedImagesChanged.
        _manager.trackablesChanged.AddListener(OnTrackablesChanged);
    }

    private void OnDisable()
    {
        _manager.trackablesChanged.RemoveListener(OnTrackablesChanged);
    }

    private IEnumerator Start()
    {
        SetStatus("Waiting for AR session to initialize...");

        // Give the subsystem a moment to come up so the capability descriptor is valid.
        yield return new WaitForSeconds(1f);

        if (_manager.subsystem == null || _manager.descriptor == null)
        {
            Fail("ARTrackedImageManager subsystem/descriptor is null. Image tracking not available on this device.");
            yield break;
        }

        // STEP: capability guard (Unity's recommended check before assuming mutable support).
        bool supportsMutable = _manager.descriptor.supportsMutableLibrary;
        _capabilityLine = $"supportsMutableLibrary = {supportsMutable}";
        if (!supportsMutable)
        {
            Fail("This provider does not support MutableRuntimeReferenceImageLibrary. Cannot add images at runtime.");
            yield break;
        }

        // STEP 1: download the reference image.
        SetStatus("Downloading reference image...");
        yield return DownloadImage(imageUrl);
        if (_hadError) yield break;

        // STEP 2: create a runtime library.
        SetStatus("Creating runtime image library...");
        var runtimeLibrary = _manager.CreateRuntimeLibrary();
        _mutableLibrary = runtimeLibrary as MutableRuntimeReferenceImageLibrary;
        if (_mutableLibrary == null)
        {
            Fail("CreateRuntimeLibrary() did not return a MutableRuntimeReferenceImageLibrary.");
            yield break;
        }

        // STEP 3: add the downloaded image to the library (validation job).
        SetStatus("Adding image to library (validation job)...");
        yield return AddImageJob();
        if (_hadError) yield break;

        // STEP 4: assign the library and enable tracking.
        _manager.referenceLibrary = _mutableLibrary;
        _manager.enabled = true;

        SetStatus("READY. Point the camera at the printed image.");
    }

    private IEnumerator DownloadImage(string url)
    {
        using var request = UnityWebRequestTexture.GetTexture(url);
        yield return request.SendWebRequest();

        if (request.result != UnityWebRequest.Result.Success)
        {
            Fail($"Image download failed: {request.error}");
            yield break;
        }

        _downloadedTexture = DownloadHandlerTexture.GetContent(request);

        // ScheduleAddImageWithValidationJob requires a readable, uncompressed texture.
        if (!_downloadedTexture.isReadable)
        {
            // GetContent returns a readable texture, but guard anyway for clarity.
            UnityEngine.Debug.LogWarning("[POC] Downloaded texture not readable; attempting to continue.");
        }
        UnityEngine.Debug.Log($"[POC] Image downloaded: {_downloadedTexture.width}x{_downloadedTexture.height}");
    }

    private IEnumerator AddImageJob()
    {
        JobHandleWrapper job;
        try
        {
            var handle = _mutableLibrary.ScheduleAddImageWithValidationJob(
                _downloadedTexture,
                "poc-reference",
                physicalWidthMeters);
            job = new JobHandleWrapper(handle);
        }
        catch (Exception ex)
        {
            Fail($"ScheduleAddImageWithValidationJob threw: {ex.Message}");
            yield break;
        }

        // Wait for the validation/add job to finish.
        while (!job.IsComplete)
        {
            yield return null;
        }

        var statusResult = job.Status;
        if (statusResult == AddReferenceImageJobStatus.ErrorInvalidImage)
        {
            Fail("Validation failed: image is not suitable for tracking (low feature quality).");
            yield break;
        }
        if (statusResult == AddReferenceImageJobStatus.ErrorUnknown)
        {
            Fail("Validation failed: unknown error adding the image.");
            yield break;
        }
        UnityEngine.Debug.Log($"[POC] Add image job status: {statusResult}");
    }

    private void OnTrackablesChanged(ARTrackablesChangedEventArgs<ARTrackedImage> changes)
    {
        foreach (var img in changes.added)
        {
            SpawnOrMoveMarker(img);
            _trackingLine = $"DETECTED: {img.referenceImage.name} ({img.trackingState})";
            UnityEngine.Debug.Log($"[POC] Image detected: {img.referenceImage.name}");
        }
        foreach (var img in changes.updated)
        {
            SpawnOrMoveMarker(img);
            _trackingLine = $"TRACKING: {img.referenceImage.name} ({img.trackingState})";
        }
        foreach (var kvp in changes.removed)
        {
            _trackingLine = "Tracking lost.";
        }
    }

    private void SpawnOrMoveMarker(ARTrackedImage img)
    {
        if (img.trackingState == TrackingState.None) return;

        if (_marker == null)
        {
            _marker = GameObject.CreatePrimitive(PrimitiveType.Cube);
            _marker.transform.localScale = Vector3.one * markerSizeMeters;
        }
        _marker.SetActive(img.trackingState == TrackingState.Tracking);
        _marker.transform.SetPositionAndRotation(img.transform.position, img.transform.rotation);
    }

    private void SetStatus(string s)
    {
        _status = s;
        UnityEngine.Debug.Log($"[POC] {s}");
    }

    private void Fail(string s)
    {
        _hadError = true;
        _status = "ERROR: " + s;
        UnityEngine.Debug.LogError($"[POC] {s}");
    }

    private void OnGUI()
    {
        var style = new GUIStyle(GUI.skin.label)
        {
            fontSize = 34,
            wordWrap = true,
            normal = { textColor = _hadError ? Color.red : Color.white }
        };
        var boxRect = new Rect(20, 60, Screen.width - 40, 320);
        GUI.Box(boxRect, GUIContent.none);
        GUI.Label(new Rect(30, 70, Screen.width - 60, 300),
            $"Runtime Image Tracking POC\n\n{_status}\n\n{_capabilityLine}\n{_trackingLine}",
            style);
    }

    /// <summary>
    /// Small wrapper so we can poll job completion without depending on Unity.Jobs in the coroutine.
    /// AddReferenceImageJobState exposes both a JobHandle and a status.
    /// </summary>
    private readonly struct JobHandleWrapper
    {
        private readonly AddReferenceImageJobState _state;
        public JobHandleWrapper(AddReferenceImageJobState state) { _state = state; }
        public bool IsComplete => _state.jobHandle.IsCompleted;
        public AddReferenceImageJobStatus Status
        {
            get { _state.jobHandle.Complete(); return _state.status; }
        }
    }
}
