using System.Collections.Generic;
using UnityEngine;
using UnityEngine.XR.ARFoundation;
using UnityEngine.XR.ARSubsystems;

/// <summary>
/// Per-card payload + spawned-model registry.
///
/// With 2+ flashcards tracked simultaneously, a single ARExperiencePayload is no
/// longer enough. RN calls <see cref="RegisterFlashcard"/> per card before the
/// AR camera sees it; ARExperienceHandler reads the matching payload via
/// <see cref="GetPayload"/> when HandleImageDetected fires.
/// </summary>
public class MultiCardRegistry : MonoBehaviour
{
    private readonly Dictionary<string, FlashcardEntry> _entries = new();
    // Deterministic per-physical-instance identity: which TrackableId currently
    // represents a given qrId. Distinct from _entries (business identity) so that
    // removing ONE physical trackable never destroys another card's state.
    private readonly Dictionary<TrackableId, string> _qrIdByTrackable = new();
    private readonly Dictionary<TrackableId, GameObject> _modelByTrackable = new();
    // Store ARTrackedImage reference so ComboManager can access the Transform for
    // proximity detection (via GetTrackableImage). Lazily resolved on bind.
    private readonly Dictionary<TrackableId, ARTrackedImage> _trackedImageByTrackable = new();

    /// <summary>Number of cards currently registered.</summary>
    public int Count => _entries.Count;

    /// <summary>Number of physical tracked instances currently bound.</summary>
    public int ActiveTrackableCount => _qrIdByTrackable.Count;

    /// <summary>All registered qrIds (order matches insertion order in modern .NET).</summary>
    public IEnumerable<string> RegisteredIds => _entries.Keys;

    /// <summary>Register a flashcard with its full experience payload.</summary>
    public void RegisterFlashcard(string qrId, ARExperiencePayload payload)
    {
        if (string.IsNullOrEmpty(qrId))
        {
            // Don't log here — CardTrackingRequest already logged "Card rejected" for this card.
            // Logging again would duplicate and complicate test assertions.
            return;
        }

        _entries[qrId] = new FlashcardEntry {
            QrId = qrId,
            Payload = payload,
            SpawnedModel = null
        };
        UnityEngine.Debug.Log($"[MultiCardRegistry] Registered {qrId} (total={_entries.Count})");
    }

    /// <summary>Remove a flashcard registration. Destroys its spawned model, if any. Returns true if anything was removed.</summary>
    public bool UnregisterFlashcard(string qrId)
    {
        if (string.IsNullOrEmpty(qrId)) return false;
        if (_entries.TryGetValue(qrId, out var entry) && entry.SpawnedModel != null)
        {
            Destroy(entry.SpawnedModel);
        }
        var removed = _entries.Remove(qrId);
        if (removed)
        {
            UnityEngine.Debug.Log($"[MultiCardRegistry] Unregistered {qrId} (total={_entries.Count})");
        }
        return removed;
    }

    /// <summary>
    /// Records that a specific physical trackable (TrackableId) currently represents
    /// this qrId. Called on first detection. This is the deterministic identity
    /// mapping used on removal — never detection order, array index, or a global
    /// "current target".
    /// </summary>
    public void BindTrackable(TrackableId trackableId, ARTrackedImage trackedImage, string qrId)
    {
        if (string.IsNullOrEmpty(qrId)) return;
        _qrIdByTrackable[trackableId] = qrId;
        if (trackedImage != null) _trackedImageByTrackable[trackableId] = trackedImage;
    }

    /// <summary>
    /// Resolves which qrId a specific physical trackable belongs to, and removes
    /// the binding. Called on removal so cleanup targets exactly that instance.
    /// </summary>
    public bool TryUnbindTrackable(TrackableId trackableId, out string qrId)
    {
        if (_qrIdByTrackable.TryGetValue(trackableId, out qrId))
        {
            _qrIdByTrackable.Remove(trackableId);
            _modelByTrackable.Remove(trackableId);
            _trackedImageByTrackable.Remove(trackableId);
            return true;
        }
        qrId = null;
        return false;
    }

    /// <summary>Returns the ARTrackedImage reference for a trackable, or null.</summary>
    public ARTrackedImage GetTrackableImage(TrackableId trackableId)
    {
        return _trackedImageByTrackable.TryGetValue(trackableId, out var img) ? img : null;
    }

    /// <summary>Resolves the qrId currently bound to a physical trackable, without unbinding it.</summary>
    public bool TryGetTrackableQrId(TrackableId trackableId, out string qrId)
    {
        return _qrIdByTrackable.TryGetValue(trackableId, out qrId);
    }

    /// <summary>
    /// Records the model instance spawned for a specific physical trackable. Distinct
    /// from <see cref="SetSpawnedModel"/> (business/qrId-scoped) because two physical
    /// instances of the SAME qrId could theoretically coexist; per-trackable binding
    /// keeps cleanup scoped to exactly the TrackableId that was removed.
    /// </summary>
    public void SetTrackableModel(TrackableId trackableId, GameObject model)
    {
        _modelByTrackable[trackableId] = model;
    }

    /// <summary>Gets the model instance bound to a specific physical trackable, or null.</summary>
    public GameObject GetTrackableModel(TrackableId trackableId)
    {
        return _modelByTrackable.TryGetValue(trackableId, out var model) ? model : null;
    }

    /// <summary>Look up the payload that was registered for a given imageId/qrId.</summary>
    public ARExperiencePayload? GetPayload(string imageId)
    {
        if (string.IsNullOrEmpty(imageId)) return null;
        if (_entries.TryGetValue(imageId, out var entry))
        {
            return entry.Payload;
        }
        return null;
    }

    /// <summary>Record the spawned model GameObject for a card. Used by combo cleanup.</summary>
    public void SetSpawnedModel(string qrId, GameObject model)
    {
        if (string.IsNullOrEmpty(qrId)) return;
        if (_entries.TryGetValue(qrId, out var entry))
        {
            entry.SpawnedModel = model;
        }
    }

    /// <summary>Get the spawned model for a card, or null.</summary>
    public GameObject GetSpawnedModel(string qrId)
    {
        if (string.IsNullOrEmpty(qrId)) return null;
        return _entries.TryGetValue(qrId, out var entry) ? entry.SpawnedModel : null;
    }

    /// <summary>Clear all registrations and destroy any spawned models. Called on DestroySession.</summary>
    public void Clear()
    {
        foreach (var kv in _entries)
        {
            if (kv.Value.SpawnedModel != null)
            {
                Destroy(kv.Value.SpawnedModel);
            }
        }
        _entries.Clear();
        _qrIdByTrackable.Clear();
        _modelByTrackable.Clear();
        _trackedImageByTrackable.Clear();
        UnityEngine.Debug.Log("[MultiCardRegistry] Cleared");
    }

    private class FlashcardEntry
    {
        public string QrId;
        public ARExperiencePayload Payload;
        public GameObject SpawnedModel;
    }
}
