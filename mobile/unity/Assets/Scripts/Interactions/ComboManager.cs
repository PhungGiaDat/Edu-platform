using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.XR.ARFoundation;

/// <summary>
/// Tracks tracked images, detects proximity between card pairs, and orchestrates combo animations.
/// Detects when 2+ flashcards are close together and triggers reward spawning.
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
    private readonly HashSet<string> _pendingCombos = new();

    private void Awake()
    {
        InitComboTable();
    }

    private void InitComboTable()
    {
        // MVP: Hardcoded combo pairs
        _comboTable[("flashcard_chicken", "flashcard_egg")] = new ComboDefinition {
            ComboId = "chicken_egg_reward",
            RewardCardId = "reward_baby_chicken",
            XpReward = 25
        };
        _comboTable[("flashcard_dog", "flashcard_bone")] = new ComboDefinition {
            ComboId = "dog_bone_reward",
            RewardCardId = "reward_happy_dog",
            XpReward = 20
        };
        _comboTable[("flashcard_apple", "flashcard_worm")] = new ComboDefinition {
            ComboId = "apple_worm_reward",
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
                        if (!_pendingCombos.Contains($"{pairKey.Item1}|{pairKey.Item2}")) {
                            _pendingCombos.Add($"{pairKey.Item1}|{pairKey.Item2}");
                            OnProximityNear?.Invoke(imgA.ImageId, imgB.ImageId, dist);
                            RNEventEmitter.Instance.SendEvent("onProximityNear", new {
                                imageIdA = imgA.ImageId,
                                imageIdB = imgB.ImageId,
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
    /// Triggers a combo from RN (user taps COMBO button).
    /// </summary>
    public void TriggerCombo(string cardA, string cardB)
    {
        var key = (cardA, cardB);
        if (!_comboTable.TryGetValue(key, out var combo)) {
            UnityEngine.Debug.LogWarning($"[ComboManager] No combo defined for: {cardA} + {cardB}");
            return;
        }

        UnityEngine.Debug.Log($"[ComboManager] Triggering combo: {cardA} + {cardB}");
        RNEventEmitter.Instance.SendEvent("onComboTriggered", new {
            cardIdA = cardA,
            cardIdB = cardB,
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
        public string RewardCardId;
        public int XpReward;
    }
}
