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
    public event Action<string, string, string> OnCardFailed;

    private readonly Dictionary<string, string> _qrIdByReferenceName = new();
    private MutableRuntimeReferenceImageLibrary _mutableLibrary;
    private bool _isBuilding;

    /// <summary>Number of reference images that completed validation successfully.</summary>
    public int RegisteredImageCount => _qrIdByReferenceName.Count;

    /// <summary>
    /// Resolves the deterministic runtime reference-image name to business qrId.
    /// The builder deliberately registers every runtime image with name = qrId.
    /// </summary>
    public bool TryResolveQrId(string referenceImageName, out string qrId)
    {
        return _qrIdByReferenceName.TryGetValue(referenceImageName, out qrId);
    }

    /// <summary>
    /// Returns whether the mutable library has been created and is ready to accept
    /// incremental card additions.
    /// </summary>
    public bool IsLibraryReady => _mutableLibrary != null && !_isBuilding;

    /// <summary>
    /// Adds a single card to an already-built mutable runtime library.
    /// Used for the second-card and subsequent-card paths where ARScene is already active
    /// and the library already contains registered reference images.
    ///
    /// Downloads the reference image, schedules the add-image job, and waits for
    /// validation. On success, fires OnLibraryReady (so existing listeners know the
    /// library has been extended) and registers the qrId name mapping.
    ///
    /// Does NOT enable/disable the imageManager — it is already enabled from the
    /// initial BuildLibrary call.
    ///
    /// If the library is not yet ready, falls back to BuildLibrary (clears existing
    /// registrations and re-registers all cards). Prefer calling BuildLibrary once
    /// with all known cards where possible.
    /// </summary>
    /// <param name="card">Single card descriptor (qrId, imageUrl, physicalWidthMeters).</param>
    public void AddCard(CardDescriptor card)
    {
        if (card == null || string.IsNullOrEmpty(card.qrId) || string.IsNullOrEmpty(card.imageUrl))
        {
            var qrId = card?.qrId ?? "<missing>";
            var detail = "qrId and imageUrl are required; physicalWidthMeters is optional (0f = unknown size)";
            UnityEngine.Debug.LogError($"[CardImageLibraryBuilder] AddCard rejected '{qrId}': {detail}");
            OnCardFailed?.Invoke(qrId, "MISSING_REFERENCE_IMAGE_METADATA", detail);
            return;
        }

        if (_mutableLibrary == null || _isBuilding)
        {
            // Library not ready yet — fall back to BuildLibrary with just this card.
            // BuildLibrary will clear existing registrations, but this path should
            // only be hit during the initial session startup race.
            UnityEngine.Debug.LogWarning("[CardImageLibraryBuilder] Library not ready — falling back to BuildLibrary");
            BuildLibrary(new List<CardDescriptor> { card });
            return;
        }

        StartCoroutine(AddCardCoroutine(card));
    }

    private IEnumerator AddCardCoroutine(CardDescriptor card)
    {
        UnityEngine.Debug.Log($"[CardImageLibraryBuilder] AddCard: '{card.qrId}' — downloading reference image");
        var pending = new List<(CardDescriptor, Texture2D, string)>();
        var ct = new CancellationTokenSource();

        StartCoroutine(DownloadOne(card, pending, ct.Token));
        yield return new WaitUntil(() => pending.Count >= 1);

        if (pending[0].Item2 == null)
        {
            var msg = $"AddCard '{card.qrId}' download failed: {pending[0].Item3}";
            UnityEngine.Debug.LogWarning("[CardImageLibraryBuilder] " + msg);
            OnCardFailed?.Invoke(card.qrId, "REFERENCE_IMAGE_DOWNLOAD_FAILED", pending[0].Item3);
            yield break;
        }

        var handle = _mutableLibrary.ScheduleAddImageWithValidationJob(
            pending[0].Item2,
            card.qrId,
            card.physicalWidthMeters);

        // Wait for job completion (yield in try-finally, not try-catch, to avoid CS1626)
        try
        {
            while (!handle.jobHandle.IsCompleted)
            {
                yield return null;
            }
            handle.jobHandle.Complete();
        }
        finally
        {
            // AddReferenceImageJobState is a value type — no unmanaged resources to dispose.
            // jobHandle.Complete() has already been called above.
        }

        try
        {
            if (handle.status == AddReferenceImageJobStatus.Success)
            {
                _qrIdByReferenceName[card.qrId] = card.qrId;
                UnityEngine.Debug.Log($"[CardImageLibraryBuilder] AddCard '{card.qrId}' registered successfully. Total: {_qrIdByReferenceName.Count}");
                OnLibraryReady?.Invoke();
            }
            else if (handle.status == AddReferenceImageJobStatus.ErrorInvalidImage)
            {
                UnityEngine.Debug.LogWarning($"[CardImageLibraryBuilder] AddCard '{card.qrId}': ErrorInvalidImage");
                OnCardFailed?.Invoke(card.qrId, "RUNTIME_LIBRARY_ADD_FAILED", "ErrorInvalidImage");
            }
            else
            {
                UnityEngine.Debug.LogWarning($"[CardImageLibraryBuilder] AddCard '{card.qrId}': ErrorUnknown");
                OnCardFailed?.Invoke(card.qrId, "RUNTIME_LIBRARY_ADD_FAILED", "ErrorUnknown");
            }
        }
        catch (Exception ex)
        {
            var msg = $"AddCard '{card.qrId}' add failed: {ex.Message}";
            UnityEngine.Debug.LogError("[CardImageLibraryBuilder] " + msg);
            OnCardFailed?.Invoke(card.qrId, "RUNTIME_LIBRARY_ADD_FAILED", ex.Message);
        }
    }

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
            OnError?.Invoke("MISSING_REFERENCE_IMAGE_METADATA: no cards provided");
            return;
        }

        foreach (var card in cards)
        {
            if (card == null || string.IsNullOrEmpty(card.qrId) ||
                string.IsNullOrEmpty(card.imageUrl))
            {
                var qrId = card?.qrId ?? "<missing>";
                var detail = "qrId and imageUrl are required; physicalWidthMeters is optional (0f = unknown size)";
                UnityEngine.Debug.LogError($"[CardImageLibraryBuilder] MISSING_REFERENCE_IMAGE_METADATA: '{qrId}': {detail}");
                OnCardFailed?.Invoke(qrId, "MISSING_REFERENCE_IMAGE_METADATA", detail);
                OnError?.Invoke($"MISSING_REFERENCE_IMAGE_METADATA: {qrId}");
                return;
            }
        }

        _qrIdByReferenceName.Clear();
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

        // Download all textures in parallel using a simple worker list.
        var pending = new List<(CardDescriptor card, Texture2D texture, string error)>();
        foreach (var card in cards)
        {
            var ct = new CancellationTokenSource();
            StartCoroutine(DownloadOne(card, pending, ct.Token));
        }

        // Wait until every card has reported a result (success or failure).
        yield return new WaitUntil(() => pending.Count >= cards.Count);

        // Schedule add-image jobs for every successful download.
        int scheduledCount = 0;
        var jobHandles = new List<(CardDescriptor card, AddReferenceImageJobState state)>();

        foreach (var (card, texture, error) in pending)
        {
            if (texture == null)
            {
                var msg = $"REFERENCE_IMAGE_DOWNLOAD_FAILED: '{card.qrId}': {error ?? "download returned null"}";
                UnityEngine.Debug.LogWarning("[CardImageLibraryBuilder] " + msg);
                OnCardFailed?.Invoke(card.qrId, "REFERENCE_IMAGE_DOWNLOAD_FAILED", error ?? "download returned null");
                continue;
            }

            try
            {
                var handle = _mutableLibrary.ScheduleAddImageWithValidationJob(
                    texture,
                    card.qrId,
                    card.physicalWidthMeters);
                jobHandles.Add((card, handle));
                scheduledCount++;
            }
            catch (Exception ex)
            {
                var msg = $"RUNTIME_LIBRARY_ADD_FAILED: '{card.qrId}': {ex.Message}";
                UnityEngine.Debug.LogError("[CardImageLibraryBuilder] " + msg);
                OnCardFailed?.Invoke(card.qrId, "RUNTIME_LIBRARY_ADD_FAILED", ex.Message);
            }
        }

        if (scheduledCount == 0)
        {
            var msg = "No images were successfully downloaded/decoded; nothing scheduled.";
            UnityEngine.Debug.LogError("[CardImageLibraryBuilder] " + msg);
            OnError?.Invoke(msg);
            _isBuilding = false;
            yield break;
        }

        UnityEngine.Debug.Log($"[CardImageLibraryBuilder] {scheduledCount}/{cards.Count} images scheduled, waiting for validation jobs...");

        // Wait for all jobs to complete.
        bool allJobsComplete = false;
        while (!allJobsComplete)
        {
            allJobsComplete = true;
            foreach (var (_, state) in jobHandles)
            {
                if (!state.jobHandle.IsCompleted) { allJobsComplete = false; break; }
            }
            if (!allJobsComplete) yield return null;
        }

        // Check job statuses explicitly — a completed job is not necessarily a
        // SUCCESSFUL job. Only images that actually validated count toward readiness.
        int successCount = 0;
        foreach (var (card, state) in jobHandles)
        {
            state.jobHandle.Complete();
            if (state.status == AddReferenceImageJobStatus.Success)
            {
                successCount++;
                _qrIdByReferenceName[card.qrId] = card.qrId; // identity mapping: reference name IS qrId
            }
            else if (state.status == AddReferenceImageJobStatus.ErrorInvalidImage)
            {
                UnityEngine.Debug.LogWarning($"[CardImageLibraryBuilder] '{card.qrId}': ErrorInvalidImage (image not suitable for tracking).");
                OnCardFailed?.Invoke(card.qrId, "RUNTIME_LIBRARY_ADD_FAILED", "ErrorInvalidImage");
            }
            else
            {
                UnityEngine.Debug.LogWarning($"[CardImageLibraryBuilder] '{card.qrId}': ErrorUnknown.");
                OnCardFailed?.Invoke(card.qrId, "RUNTIME_LIBRARY_ADD_FAILED", "ErrorUnknown");
            }
        }

        if (successCount == 0)
        {
            var msg = "All add-image validation jobs failed; no trackable reference images available.";
            UnityEngine.Debug.LogError("[CardImageLibraryBuilder] " + msg);
            OnError?.Invoke(msg);
            _isBuilding = false;
            yield break;
        }

        // Assign library and enable tracking only once at least one image validated.
        imageManager.enabled = true;
        _isBuilding = false;

        UnityEngine.Debug.Log($"[CardImageLibraryBuilder] Library ready with {successCount}/{cards.Count} images validated. Tracking enabled.");
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

    /// <summary>
    /// Physical width of the printed card, in metres.
    /// Convention: 0f means unknown size (AR Foundation uses unknown-size registration).
    /// There is NO approved production default — 0f is the intentional dev-path value.
    /// </summary>
    public float physicalWidthMeters;

    public CardDescriptor() { }

    public CardDescriptor(string qrId, string imageUrl, float physicalWidthMeters)
    {
        this.qrId = qrId;
        this.imageUrl = imageUrl;
        this.physicalWidthMeters = physicalWidthMeters;
    }
}
