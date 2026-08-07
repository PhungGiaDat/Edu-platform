using System;
using System.Collections;
using System.Collections.Generic;
using System.Threading;
using UnityEngine;
using UnityEngine.Networking;
using UnityEngine.XR.ARFoundation;
using UnityEngine.XR.ARSubsystems;

/// <summary>
/// Downloads N reference images in parallel, adds them all to one
/// MutableRuntimeReferenceImageLibrary, then enables the ARTrackedImageManager.
///
/// Use this when flashcards arrive dynamically (not a single hardcoded image).
/// It replaces the need for pre-defined Reference Image Library assets.
///
/// AR Foundation 6.x managed pattern (uses MutableRuntimeReferenceImageLibrary).
/// </summary>
public class CardImageLibraryBuilder : MonoBehaviour
{
    [SerializeField] private ARTrackedImageManager imageManager;

    public event Action OnLibraryReady;
    public event Action<string> OnError;

    private MutableRuntimeReferenceImageLibrary _mutableLibrary;
    private bool _isBuilding;

    private void Awake()
    {
        if (imageManager == null)
            imageManager = GetComponent<ARTrackedImageManager>();
    }

    /// <summary>
    /// Adds images from a list of card descriptors and starts the AR session.
    /// Call this after RN has sent all the flashcard definitions.
    /// </summary>
    /// <param name="cards">List of card descriptors (qrId, imageUrl, physicalWidthMeters).</param>
    public void BuildLibrary(List<CardDescriptor> cards)
    {
        if (_isBuilding)
        {
            UnityEngine.Debug.LogWarning("[CardImageLibraryBuilder] Already building — ignoring duplicate call.");
            return;
        }
        if (cards == null || cards.Count == 0)
        {
            UnityEngine.Debug.LogWarning("[CardImageLibraryBuilder] No cards provided.");
            OnError?.Invoke("No cards provided");
            return;
        }

        StartCoroutine(BuildLibraryCoroutine(cards));
    }

    private IEnumerator BuildLibraryCoroutine(List<CardDescriptor> cards)
    {
        _isBuilding = true;

        // Guard: check subsystem availability
        yield return new WaitForSeconds(0.5f); // let subsystem initialise

        if (imageManager.subsystem == null || imageManager.descriptor == null)
        {
            var msg = "ARTrackedImageManager subsystem/descriptor is null. Image tracking unavailable on this device.";
            UnityEngine.Debug.LogError("[CardImageLibraryBuilder] " + msg);
            OnError?.Invoke(msg);
            _isBuilding = false;
            yield break;
        }

        if (!imageManager.descriptor.supportsMutableLibrary)
        {
            var msg = "This AR provider does not support MutableRuntimeReferenceImageLibrary.";
            UnityEngine.Debug.LogError("[CardImageLibraryBuilder] " + msg);
            OnError?.Invoke(msg);
            _isBuilding = false;
            yield break;
        }

        // Create mutable library
        var runtimeLibrary = imageManager.CreateRuntimeLibrary();
        _mutableLibrary = runtimeLibrary as MutableRuntimeReferenceImageLibrary;
        if (_mutableLibrary == null)
        {
            var msg = "CreateRuntimeLibrary() did not return a MutableRuntimeReferenceImageLibrary.";
            UnityEngine.Debug.LogError("[CardImageLibraryBuilder] " + msg);
            OnError?.Invoke(msg);
            _isBuilding = false;
            yield break;
        }

        // Disable manager until library is fully populated
        imageManager.enabled = false;
        imageManager.referenceLibrary = _mutableLibrary;

        // Download all textures in parallel using a simple worker list
        var pending = new List<(CardDescriptor card, Texture2D texture, string error)>();
        var downloadCoroutines = new List<Coroutine>();

        foreach (var card in cards)
        {
            var ct = new CancellationTokenSource();
            downloadCoroutines.Add(StartCoroutine(
                DownloadOne(card, pending, ct.Token)));
        }

        // Wait for all downloads to finish
        yield return new WaitUntil(() => downloadCoroutines.Count == 0 ||
            pending.Count + pending.Count >= cards.Count);

        // Wait for all to complete
        while (pending.Count < cards.Count)
        {
            bool allDone = true;
            foreach (var c in downloadCoroutines)
            {
                if (c != null) { allDone = false; break; }
            }
            if (allDone) break;
            yield return null;
        }

        foreach (var c in downloadCoroutines)
        {
            if (c != null) StopCoroutine(c);
        }
        downloadCoroutines.Clear();

        // Add each successful texture to the library
        int addedCount = 0;
        var jobHandles = new List<AddReferenceImageJobState>();

        foreach (var (card, texture, error) in pending)
        {
            if (texture == null)
            {
                UnityEngine.Debug.LogWarning($"[CardImageLibraryBuilder] Skipping '{card.qrId}': {error ?? "download returned null"}");
                continue;
            }

            try
            {
                var handle = _mutableLibrary.ScheduleAddImageWithValidationJob(
                    texture,
                    card.qrId,
                    card.physicalWidthMeters);
                jobHandles.Add(handle);
                addedCount++;
            }
            catch (Exception ex)
            {
                UnityEngine.Debug.LogError($"[CardImageLibraryBuilder] ScheduleAddImageWithValidationJob failed for '{card.qrId}': {ex.Message}");
            }
        }

        if (addedCount == 0)
        {
            var msg = "No images were successfully added to the library.";
            UnityEngine.Debug.LogError("[CardImageLibraryBuilder] " + msg);
            OnError?.Invoke(msg);
            _isBuilding = false;
            yield break;
        }

        UnityEngine.Debug.Log($"[CardImageLibraryBuilder] {addedCount}/{cards.Count} images added, waiting for jobs...");

        // Wait for all jobs
        bool allJobsComplete = false;
        while (!allJobsComplete)
        {
            allJobsComplete = true;
            foreach (var jh in jobHandles)
            {
                if (!jh.jobHandle.IsCompleted)
                {
                    allJobsComplete = false;
                    break;
                }
                jh.jobHandle.Complete();
            }
            if (!allJobsComplete) yield return null;
        }

        // Check job statuses
        foreach (var jh in jobHandles)
        {
            if (jh.status == AddReferenceImageJobStatus.ErrorInvalidImage)
            {
                UnityEngine.Debug.LogWarning("[CardImageLibraryBuilder] Job: ErrorInvalidImage (image not suitable for tracking).");
            }
            else if (jh.status == AddReferenceImageJobStatus.ErrorUnknown)
            {
                UnityEngine.Debug.LogWarning("[CardImageLibraryBuilder] Job: ErrorUnknown.");
            }
        }

        // Assign library and enable tracking
        imageManager.enabled = true;
        _isBuilding = false;

        UnityEngine.Debug.Log($"[CardImageLibraryBuilder] Library ready with {addedCount} images. Tracking enabled.");
        OnLibraryReady?.Invoke();
    }

    private IEnumerator DownloadOne(
        CardDescriptor card,
        List<(CardDescriptor, Texture2D, string)> results,
        CancellationToken ct)
    {
        using var request = UnityWebRequestTexture.GetTexture(card.imageUrl);
        var op = request.SendWebRequest();

        while (!op.isDone && !ct.IsCancellationRequested)
            yield return null;

        if (ct.IsCancellationRequested)
        {
            lock (results)
            {
                results.Add((card, null, "Cancelled"));
            }
            yield break;
        }

        if (request.result != UnityWebRequest.Result.Success)
        {
            lock (results)
            {
                results.Add((card, null, request.error));
            }
            yield break;
        }

        var texture = DownloadHandlerTexture.GetContent(request);
        lock (results)
        {
            results.Add((card, texture, null));
        }
    }

    private void OnDestroy()
    {
        // Clean up downloaded textures
        // Note: actual cleanup of textures managed by Unity GC
    }
}

/// <summary>
/// Descriptor for a single flashcard used by CardImageLibraryBuilder.
/// </summary>
[Serializable]
public class CardDescriptor
{
    /// <summary>Unique QR/image identifier. Must match what RN sends.</summary>
    public string qrId;

    /// <summary>URL of the reference image to track.</summary>
    public string imageUrl;

    /// <summary>Physical width of the printed card, in metres.</summary>
    [Tooltip("Physical width of the printed card, in metres (measure your printout).")]
    public float physicalWidthMeters = 0.08f; // default: 8cm card

    public CardDescriptor() { }

    public CardDescriptor(string qrId, string imageUrl, float physicalWidthMeters = 0.08f)
    {
        this.qrId = qrId;
        this.imageUrl = imageUrl;
        this.physicalWidthMeters = physicalWidthMeters;
    }
}
