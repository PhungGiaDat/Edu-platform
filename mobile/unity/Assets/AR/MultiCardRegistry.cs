using System.Collections.Generic;
using UnityEngine;

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

    /// <summary>Number of cards currently registered.</summary>
    public int Count => _entries.Count;

    /// <summary>All registered qrIds (order matches insertion order in modern .NET).</summary>
    public IEnumerable<string> RegisteredIds => _entries.Keys;

    /// <summary>Register a flashcard with its full experience payload.</summary>
    public void RegisterFlashcard(string qrId, ARExperiencePayload payload)
    {
        if (string.IsNullOrEmpty(qrId))
        {
            UnityEngine.Debug.LogWarning("[MultiCardRegistry] RegisterFlashcard called with empty qrId");
            return;
        }

        _entries[qrId] = new FlashcardEntry {
            QrId = qrId,
            Payload = payload,
            SpawnedModel = null
        };
        UnityEngine.Debug.Log($"[MultiCardRegistry] Registered {qrId} (total={_entries.Count})");
    }

    /// <summary>Remove a flashcard registration. Returns true if anything was removed.</summary>
    public bool UnregisterFlashcard(string qrId)
    {
        if (string.IsNullOrEmpty(qrId)) return false;
        var removed = _entries.Remove(qrId);
        if (removed)
        {
            UnityEngine.Debug.Log($"[MultiCardRegistry] Unregistered {qrId} (total={_entries.Count})");
        }
        return removed;
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
        UnityEngine.Debug.Log("[MultiCardRegistry] Cleared");
    }

    private class FlashcardEntry
    {
        public string QrId;
        public ARExperiencePayload Payload;
        public GameObject SpawnedModel;
    }
}
