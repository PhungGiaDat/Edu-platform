using System;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using UnityEngine.XR.ARFoundation;

/// <summary>
/// Tracks tracked images, detects proximity between card pairs, and orchestrates combo animations.
/// Detects when 2+ flashcards are close together and triggers reward spawning.
///
/// <para><b>Semantic combo path (P6):</b></para>
/// Backend sends <c>related_combos</c> via <c>LoadSemanticCombos()</c>. Each combo
/// carries a list of <c>requiredTags</c> (arTag values). Unity resolves arTag → qrId via
/// <c>MultiCardRegistry</c> and matches against currently tracked cards. This path does NOT
/// depend on qrId naming conventions.
///
/// <para><b>Hardcoded fallback (P6A pending):</b></para>
/// <c>InitComboTable()</c> provides legacy pairs as a fallback during the transition period.
/// After P6A verification, the hardcoded table is removed entirely.
/// </summary>
public class ComboManager : MonoBehaviour
{
    [SerializeField] private float proximityThreshold = 0.5f; // world units (~50cm)
    [SerializeField] private float proximityHoldTime = 1.0f; // seconds
    [SerializeField] private Transform[] rewardSpawnPoints;

    public event Action<string, string, float> OnProximityNear;
#pragma warning disable CS0067 // Event is part of public API; subscribed externally.
    public event Action<string, string, string> OnComboTriggered;
#pragma warning restore CS0067
    public event Action<string, int> OnComboComplete;

    private readonly Dictionary<string, TrackedImageState> _trackedImages = new();
    private readonly Dictionary<(string, string), ComboDefinition> _comboTable = new();
    // P6: Dynamic combo definitions from backend related_combos.
    // Key = comboId, Value = semantic combo definition.
    private readonly Dictionary<string, SemanticComboDefinition> _semanticCombos = new();
    // P6: In-memory registry for arTag → qrId resolution.
    // Populated when ARExperienceHandler calls RegisterArTagForQrId().
    private readonly Dictionary<string, string> _arTagToQrId = new();
    private readonly HashSet<string> _pendingCombos = new();

    private void Awake()
    {
        InitComboTable();
    }

    /// <summary>
    /// Loads semantic combo definitions from a JSON array of <c>related_combos</c>.
    /// Called by <c>ARExperienceHandler</c> after parsing the RN payload.
    /// Clears any previously loaded semantic combos.
    /// </summary>
    /// <param name="json">JSON array of combo objects with comboId, requiredTags, bonusXp, etc.</param>
    public void LoadSemanticCombos(string json)
    {
        if (string.IsNullOrEmpty(json))
        {
            UnityEngine.Debug.Log("[ComboManager] LoadSemanticCombos: empty json — clearing combos");
            _semanticCombos.Clear();
            return;
        }

        try
        {
            var wrapper = JsonUtility.FromJson<SemanticCombosWrapper>(json);
            _semanticCombos.Clear();
            if (wrapper?.combos != null)
            {
                foreach (var combo in wrapper.combos)
                {
                    if (string.IsNullOrEmpty(combo.comboId)) continue;
                    _semanticCombos[combo.comboId] = combo;
                }
                UnityEngine.Debug.Log($"[ComboManager] LoadSemanticCombos: loaded {_semanticCombos.Count} combo(s)");
            }
        }
        catch (Exception ex)
        {
            UnityEngine.Debug.LogError($"[ComboManager] LoadSemanticCombos parse failed: {ex.Message}");
        }
    }

    /// <summary>
    /// Registers an arTag → qrId mapping for semantic combo resolution.
    /// Called by ARExperienceHandler when a card is registered with a payload that
    /// carries an arTag. Cards with no arTag are skipped.
    /// </summary>
    public void RegisterArTag(string arTag, string qrId)
    {
        if (string.IsNullOrEmpty(arTag) || string.IsNullOrEmpty(qrId)) return;
        _arTagToQrId[arTag] = qrId;
        UnityEngine.Debug.Log($"[ComboManager] RegisterArTag: arTag='{arTag}' → qrId='{qrId}'");
    }

    /// <summary>
    /// Clears all semantic combo state. Called on session reset.
    /// </summary>
    public void ClearSemanticState()
    {
        _semanticCombos.Clear();
        _arTagToQrId.Clear();
    }

    private void InitComboTable()
    {
        // MVP: Hardcoded combo pairs (fallback during P6 → P6A transition).
        // These use qrId names that match the current arTag conventions.
        _comboTable[("flashcard_chicken", "flashcard_egg")] = new ComboDefinition {
            ComboId = "chicken_egg_reward",
            CardA = "flashcard_chicken",
            CardB = "flashcard_egg",
            ArTag = "",
            RewardCardId = "reward_baby_chicken",
            XpReward = 25
        };
        _comboTable[("flashcard_dog", "flashcard_bone")] = new ComboDefinition {
            ComboId = "dog_bone_reward",
            CardA = "flashcard_dog",
            CardB = "flashcard_bone",
            ArTag = "",
            RewardCardId = "reward_happy_dog",
            XpReward = 20
        };
        _comboTable[("flashcard_apple", "flashcard_worm")] = new ComboDefinition {
            ComboId = "apple_worm_reward",
            CardA = "flashcard_apple",
            CardB = "flashcard_worm",
            ArTag = "",
            RewardCardId = "reward_apple_tree",
            XpReward = 30
        };
        // Add reverse pairs
        _comboTable[("flashcard_egg", "flashcard_chicken")] = _comboTable[("flashcard_chicken", "flashcard_egg")];
        _comboTable[("flashcard_bone", "flashcard_dog")] = _comboTable[("flashcard_dog", "flashcard_bone")];
        _comboTable[("flashcard_worm", "flashcard_apple")] = _comboTable[("flashcard_apple", "flashcard_worm")];
    }

    private void Update()
    {
        // Pairwise proximity detection
        var images = new List<TrackedImageState>(_trackedImages.Values);
        for (int i = 0; i < images.Count; i++) {
            for (int j = i + 1; j < images.Count; j++) {
                var imgA = images[i];
                var imgB = images[j];

                if (imgA.Image == null || imgB.Image == null) continue;

                float dist = Vector3.Distance(imgA.Image.transform.position, imgB.Image.transform.position);
                if (dist < proximityThreshold) {
                    if (imgA.NearStartTime < 0) imgA.NearStartTime = Time.time;
                    if (imgB.NearStartTime < 0) imgB.NearStartTime = Time.time;

                    if (Time.time - imgA.NearStartTime > proximityHoldTime) {
                        var pairKey = (imgA.ImageId, imgB.ImageId);
                        var reverseKey = (pairKey.Item2, pairKey.Item1);
                        string pendingKey = $"{pairKey.Item1}|{pairKey.Item2}";
                        string reversePendingKey = $"{reverseKey.Item1}|{reverseKey.Item2}";
                        if (_pendingCombos.Contains(pendingKey) || _pendingCombos.Contains(reversePendingKey)) {
                            continue;
                        }

                        // P6: Try semantic combo resolution first (from backend related_combos).
                        var semanticCombo = ResolveSemanticCombo(imgA.ImageId, imgB.ImageId);
                        if (semanticCombo != null) {
                            _pendingCombos.Add(pendingKey);
                            OnProximityNear?.Invoke(imgA.ImageId, imgB.ImageId, dist);
                            RNEventEmitter.Instance.SendEvent("onProximityNear", new {
                                imageIdA = imgA.ImageId,
                                imageIdB = imgB.ImageId,
                                arTag = semanticCombo.semanticResult,
                                comboId = semanticCombo.comboId,
                                distance = dist
                            });
                            // Fire OnComboTriggered for semantic combo.
                            OnComboTriggered?.Invoke(imgA.ImageId, imgB.ImageId, semanticCombo.comboId);
                            TriggerSemanticCombo(semanticCombo, imgA.ImageId, imgB.ImageId);
                            continue;
                        }

                        // Fallback: hardcoded table (P6A pending removal).
                        var combo = _comboTable.TryGetValue(pairKey, out var c) ? c
                            : _comboTable.TryGetValue(reverseKey, out var rc) ? rc
                            : null;
                        if (combo != null) {
                            _pendingCombos.Add(pendingKey);
                            OnProximityNear?.Invoke(imgA.ImageId, imgB.ImageId, dist);
                            RNEventEmitter.Instance.SendEvent("onProximityNear", new {
                                imageIdA = imgA.ImageId,
                                imageIdB = imgB.ImageId,
                                arTag = combo.ArTag ?? "",
                                distance = dist
                            });
                        }
                    }
                } else {
                    imgA.NearStartTime = -1;
                    imgB.NearStartTime = -1;
                }
            }
        }
    }

    // P6: Resolve semantic combo — checks backend-loaded related_combos.
    // requiredTags from combo → arTag values → _arTagToQrId[arTag] → qrId values →
    // match against the two currently proximate tracked card qrIds.
    private SemanticComboDefinition ResolveSemanticCombo(string qrIdA, string qrIdB)
    {
        if (_semanticCombos.Count == 0) return null;

        foreach (var combo in _semanticCombos.Values)
        {
            if (!combo.active) continue;

            // Build the set of qrIds required for this combo.
            var requiredQrIds = new HashSet<string>();
            foreach (var tag in combo.requiredTags)
            {
                if (_arTagToQrId.TryGetValue(tag, out var resolvedQrId))
                {
                    requiredQrIds.Add(resolvedQrId);
                }
            }

            // Check if the two proximate cards cover all required participants.
            var present = new HashSet<string> { qrIdA, qrIdB };
            // All required qrIds must be currently present AND the proximate pair must be a
            // subset of the required set (avoids firing with extra, unrelated cards).
            if (present.IsSubsetOf(requiredQrIds) && requiredQrIds.Count <= 2)
            {
                return combo;
            }
        }
        return null;
    }

    private void TriggerSemanticCombo(SemanticComboDefinition combo, string qrIdA, string qrIdB)
    {
        UnityEngine.Debug.Log($"[ComboManager] Semantic combo fired: {combo.comboId} (xp={combo.bonusXp})");
        RNEventEmitter.Instance.SendEvent("onComboComplete", new {
            rewardCardId = combo.comboId,
            xpAwarded = combo.bonusXp,
            semanticResult = combo.semanticResult,
            animation = combo.animation
        });
        OnComboComplete?.Invoke(combo.comboId, combo.bonusXp);
    }

    /// <summary>
    /// Registers a newly tracked image with the combo system.
    /// </summary>
    public void RegisterTrackedImage(ARTrackedImage image, GameObject model)
    {
        var imageId = image.referenceImage.name;
        _trackedImages[imageId] = new TrackedImageState {
            Image = image,
            ImageId = imageId,
            Model = model,
            FirstDetectedTime = Time.time,
            NearStartTime = -1
        };
    }

    /// <summary>
    /// Unregisters a tracked image when tracking is lost.
    /// </summary>
    public void UnregisterTrackedImage(string imageId)
    {
        _trackedImages.Remove(imageId);
    }

    /// <summary>
    /// Resets the combo system for a new session. Clears all tracked images and
    /// pending combo states. Safe to call at runtime.
    /// </summary>
    public void Reset()
    {
        _trackedImages.Clear();
        _pendingCombos.Clear();
        ClearSemanticState();
    }

    /// <summary>
    /// Triggers a combo from RN (user taps COMBO button).
    /// </summary>
    public void TriggerCombo(string cardA, string cardB)
    {
        var key = (cardA, cardB);
        var reverseKey = (cardB, cardA);
        if (!_comboTable.TryGetValue(key, out var combo)
            && !_comboTable.TryGetValue(reverseKey, out combo)) {
            UnityEngine.Debug.LogWarning($"[ComboManager] No combo defined for: {cardA} + {cardB}");
            return;
        }

        UnityEngine.Debug.Log($"[ComboManager] Triggering combo: {cardA} + {cardB}");
        RNEventEmitter.Instance.SendEvent("onComboTriggered", new {
            cardIdA = cardA,
            cardIdB = cardB,
            arTag = combo.ArTag,
            comboId = combo.ComboId
        });

        PlayComboAnimation(cardA, cardB, combo);
    }

    private void PlayComboAnimation(string cardA, string cardB, ComboDefinition combo)
    {
        // Phase 2 MVP: Simplified animation
        StartCoroutine(ComboAnimationSequence(cardA, cardB, combo));
    }

    private System.Collections.IEnumerator ComboAnimationSequence(string cardA, string cardB, ComboDefinition combo)
    {
        // Get models
        var modelA = _trackedImages.TryGetValue(cardA, out var stateA) ? stateA.Model : null;
        var modelB = _trackedImages.TryGetValue(cardB, out var stateB) ? stateB.Model : null;

        if (modelA == null || modelB == null) {
            yield break;
        }

        // Fly to midpoint
        Vector3 midpoint = (modelA.transform.position + modelB.transform.position) / 2f;
        float elapsed = 0f;
        float duration = 0.8f;
        var startPosA = modelA.transform.position;
        var startPosB = modelB.transform.position;

        while (elapsed < duration) {
            elapsed += Time.deltaTime;
            float t = elapsed / duration;
            float ease = Mathf.SmoothStep(0, 1, t);
            modelA.transform.position = Vector3.Lerp(startPosA, midpoint, ease);
            modelB.transform.position = Vector3.Lerp(startPosB, midpoint, ease);
            yield return null;
        }

        // Hide originals
        modelA.SetActive(false);
        modelB.SetActive(false);

        // Spawn reward
        var reward = GameObject.CreatePrimitive(PrimitiveType.Sphere);
        reward.transform.position = midpoint;
        reward.transform.localScale = Vector3.zero;

        // Scale up with bounce
        elapsed = 0f;
        duration = 0.4f;
        while (elapsed < duration) {
            elapsed += Time.deltaTime;
            float t = elapsed / duration;
            float bounce = 1f + Mathf.Sin(t * Mathf.PI) * 0.3f;
            reward.transform.localScale = Vector3.one * bounce;
            yield return null;
        }
        reward.transform.localScale = Vector3.one;

        // Emit combo complete
        OnComboComplete?.Invoke(combo.RewardCardId, combo.XpReward);
        RNEventEmitter.Instance.SendEvent("onComboComplete", new {
            rewardCardId = combo.RewardCardId,
            xpAwarded = combo.XpReward
        });
    }

    private class TrackedImageState
    {
        public ARTrackedImage Image;
        public string ImageId;
        public GameObject Model;
        public float FirstDetectedTime;
        public float NearStartTime = -1;
    }

    private class ComboDefinition
    {
        public string ComboId;
        public string CardA;
        public string CardB;
        public string ComboModelUrl;
        public string ArTag;
        public string RewardCardId;
        public int XpReward;
    }

    /// <summary>
    /// Semantic combo definition loaded from backend <c>related_combos</c>.
    /// JSON shape matches the backend <c>ARCombination</c> schema.
    /// Field names use <c>lowerCamelCase</c> to match the JSON contract keys.
    /// </summary>
    [Serializable]
    private class SemanticComboDefinition
    {
        // lowerCamelCase to match JSON: { "comboId": "...", "requiredTags": [...] }
        public string comboId = "";
        /// <summary>List of arTag values — NOT qrId values. Each is resolved via _arTagToQrId.</summary>
        public string[] requiredTags = Array.Empty<string>();
        public int bonusXp;
        public string semanticResult = "";
        public string animation = "";
        public string phrase = "";
        public bool active = true;
        public string centerTransform = "";
    }

    /// <summary>
    /// JSON wrapper for deserializing a <c>related_combos</c> array.
    /// </summary>
    [Serializable]
    private class SemanticCombosWrapper
    {
        public SemanticComboDefinition[] combos = Array.Empty<SemanticComboDefinition>();
    }

#if UNITY_EDITOR
    /// <summary>
    /// Editor-only setter for proximityThreshold.
    /// </summary>
    public void SetProximityThreshold(float m)
    {
        proximityThreshold = m;
    }

    /// <summary>
    /// Editor-only setter for proximityHoldTime.
    /// </summary>
    public void SetProximityHoldTime(float s)
    {
        proximityHoldTime = s;
    }

    /// <summary>
    /// Editor-only: clears all tracked images.
    /// </summary>
    public void UnregisterAll()
    {
        _trackedImages.Clear();
        _pendingCombos.Clear();
    }
#endif
}
