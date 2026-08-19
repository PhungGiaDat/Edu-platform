using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.XR.ARFoundation;

/// <summary>
/// Tracks tracked images, detects proximity between card pairs, and orchestrates combo animations.
/// Detects when 2+ flashcards are close together and triggers reward spawning.
///
/// Backend sends <c>related_combos</c> via <c>LoadSemanticCombos()</c>. Each combo
/// carries a list of <c>requiredTags</c> (arTag values). Unity resolves arTag → qrId via
/// <c>MultiCardRegistry</c> and matches against currently tracked cards. This path does NOT
/// depend on qrId naming conventions.
///
/// Semantic combo resolution (P6+):
///   proximity → ResolveSemanticCombo(qrIdA, qrIdB) → arTag→qrId→requiredTags match
///   RN trigger → TriggerCombo(cardA, cardB) → qrId→arTag reverse lookup → same path
/// </summary>
public class ComboManager : MonoBehaviour
{
    [SerializeField] private float proximityThreshold = 0.5f; // world units (~50cm)
    [SerializeField] private float proximityHoldTime = 1.0f; // seconds
    [SerializeField] private Transform[] rewardSpawnPoints;
    // P7: Shared GLBLoader for loading combo reward models from backend model_3d_url.
    // Set via Inspector or Awake auto-detection.
    [SerializeField] private GLBLoader glbLoader;

    public event Action<string, string, float> OnProximityNear;
#pragma warning disable CS0067 // Event is part of public API; subscribed externally.
    public event Action<string, string, string> OnComboTriggered;
#pragma warning restore CS0067
    public event Action<string, int> OnComboComplete;

    private readonly Dictionary<string, TrackedImageState> _trackedImages = new();
    // P6: Dynamic combo definitions from backend related_combos.
    // Key = comboId, Value = semantic combo definition.
    private readonly Dictionary<string, SemanticComboDefinition> _semanticCombos = new();
    // P6: In-memory registry for arTag → qrId resolution.
    // Populated when ARExperienceHandler calls RegisterArTag().
    private readonly Dictionary<string, string> _arTagToQrId = new();
    // P6A: Reverse lookup qrId → arTag for TriggerCombo (RN passes qrIds, not arTags).
    private readonly Dictionary<string, string> _qrIdToArTag = new();
    private readonly HashSet<string> _pendingCombos = new();

    private void Awake()
    {
        // P7: Auto-wire GLBLoader if not set in Inspector.
        if (glbLoader == null) {
            glbLoader = GetComponent<GLBLoader>();
        }
        if (glbLoader == null) {
            glbLoader = FindAnyObjectByType<GLBLoader>();
        }
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
                    // Only load active combos; inactive combos are filtered here.
                    if (!combo.active) continue;
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
    /// Populates both _arTagToQrId (for ResolveSemanticCombo) and _qrIdToArTag
    /// (for TriggerCombo RN path).
    /// </summary>
    public void RegisterArTag(string arTag, string qrId)
    {
        if (string.IsNullOrEmpty(arTag) || string.IsNullOrEmpty(qrId)) return;
        _arTagToQrId[arTag] = qrId;
        _qrIdToArTag[qrId] = arTag;
        UnityEngine.Debug.Log($"[ComboManager] RegisterArTag: arTag='{arTag}' → qrId='{qrId}'");
    }

    /// <summary>
    /// Clears all semantic combo state. Called on session reset.
    /// </summary>
    public void ClearSemanticState()
    {
        _semanticCombos.Clear();
        _arTagToQrId.Clear();
        _qrIdToArTag.Clear();
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

                        // Try semantic combo resolution (from backend related_combos).
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
                            OnComboTriggered?.Invoke(imgA.ImageId, imgB.ImageId, semanticCombo.comboId);
                            TriggerSemanticCombo(semanticCombo, imgA.ImageId, imgB.ImageId);
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
    /// Uses semantic resolution: qrId → arTag → ResolveSemanticCombo.
    /// Dedupes repeated triggers of the same pair so XP is awarded once.
    /// </summary>
    public void TriggerCombo(string cardA, string cardB)
    {
        // Normalize pair key — order-independent to mirror proximity detector.
        string pendingKey = string.CompareOrdinal(cardA, cardB) <= 0
            ? $"{cardA}|{cardB}"
            : $"{cardB}|{cardA}";

        // Reverse lookup qrId → arTag
        var arTagA = _qrIdToArTag.TryGetValue(cardA, out var a) ? a : null;
        var arTagB = _qrIdToArTag.TryGetValue(cardB, out var b) ? b : null;

        SemanticComboDefinition combo = null;
        if (!string.IsNullOrEmpty(arTagA) && !string.IsNullOrEmpty(arTagB)) {
            combo = ResolveSemanticCombo(cardA, cardB);
        }

        if (combo == null) {
            UnityEngine.Debug.LogWarning($"[ComboManager] No combo defined for: {cardA} + {cardB}");
            return;
        }

        // Dedup: skip if this pair already pending (proximity or RN).
        if (_pendingCombos.Contains(pendingKey)) {
            UnityEngine.Debug.Log($"[ComboManager] Combo {combo.comboId} already pending — skipping duplicate trigger");
            return;
        }
        _pendingCombos.Add(pendingKey);

        UnityEngine.Debug.Log($"[ComboManager] Triggering combo: {cardA} + {cardB} (semantic)");
        OnComboTriggered?.Invoke(cardA, cardB, combo.comboId);
        RNEventEmitter.Instance.SendEvent("onComboTriggered", new {
            cardIdA = cardA,
            cardIdB = cardB,
            arTag = combo.semanticResult,
            comboId = combo.comboId
        });

        // P8: Fire OnComboComplete immediately so XP is awarded even if
        // PlayComboAnimation yields early (no AR-tracked models registered).
        TriggerSemanticCombo(combo, cardA, cardB);

        PlayComboAnimation(cardA, cardB, combo);
    }

    private void PlayComboAnimation(string cardA, string cardB, SemanticComboDefinition combo)
    {
        StartCoroutine(ComboAnimationSequence(cardA, cardB, combo));
    }

    private System.Collections.IEnumerator ComboAnimationSequence(string cardA, string cardB, SemanticComboDefinition combo)
    {
        var modelA = _trackedImages.TryGetValue(cardA, out var stateA) ? stateA.Model : null;
        var modelB = _trackedImages.TryGetValue(cardB, out var stateB) ? stateB.Model : null;

        if (modelA == null || modelB == null) {
            yield break;
        }

        Vector3 midpoint = (modelA.transform.position + modelB.transform.position) / 2f;
        float elapsed = 0f;
        float duration = 0.8f;
        var startPosA = modelA.transform.position;
        var startPosB = modelB.transform.position;

        // Fly both models to midpoint
        while (elapsed < duration) {
            elapsed += Time.deltaTime;
            float t = elapsed / duration;
            float ease = Mathf.SmoothStep(0, 1, t);
            modelA.transform.position = Vector3.Lerp(startPosA, midpoint, ease);
            modelB.transform.position = Vector3.Lerp(startPosB, midpoint, ease);
            yield return null;
        }

        modelA.SetActive(false);
        modelB.SetActive(false);

        // P7: Load reward model from backend model_3d_url, or fall back to primitive sphere.
        // In coroutines, yield-returning a Task waits for it to complete and returns the result.
        GameObject reward = null;
        bool modelLoaded = false;

        if (glbLoader != null && !string.IsNullOrEmpty(combo.modelUrl)) {
            var loadTask = glbLoader.LoadGLB(combo.modelUrl);
            yield return loadTask;
            var loaded = loadTask.Result;
            if (loaded != null) {
                reward = loaded;
                reward.transform.position = midpoint;
                reward.transform.localScale = Vector3.zero;
                modelLoaded = true;
            }
        }

        if (!modelLoaded) {
            // Fallback: primitive sphere reward
            reward = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            reward.transform.position = midpoint;
            reward.transform.localScale = Vector3.zero;
        }

        // Scale up reward with bounce
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

        // If a real model was loaded, wire its animations (P7).
        if (modelLoaded) {
            var animCtrl = reward.GetComponentInChildren<AnimationController>();
            if (animCtrl != null) {
                animCtrl.DiscoverClips();
                if (!string.IsNullOrEmpty(combo.animation) && animCtrl.PlayClipByName(combo.animation)) {
                    // Animation started — onAnimationComplete fires inside AnimationController.
                } else {
                    animCtrl.PlayAnimation(ARAnimationType.Idle);
                }
            }
        }

        OnComboComplete?.Invoke(combo.comboId, combo.bonusXp);
        RNEventEmitter.Instance.SendEvent("onComboComplete", new {
            rewardCardId = combo.comboId,
            xpAwarded = combo.bonusXp
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
        /// <summary>P7: Optional 3D model URL for the combo reward. If empty, falls back to primitive sphere.</summary>
        public string modelUrl = "";

        // P7: Expose modelUrl via a public property for testability.
        public string ModelUrl => modelUrl;
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
