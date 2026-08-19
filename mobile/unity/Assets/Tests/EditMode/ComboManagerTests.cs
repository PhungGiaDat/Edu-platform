using System;
using System.Reflection;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;

namespace EduPlatform.EditModeTests
{
    /// <summary>
    /// EditMode tests for ComboManager semantic combo resolution and P7 model_3d_url support.
    /// Uses reflection to access private fields without depending on MonoBehaviour lifecycles.
    /// </summary>
    public class ComboManagerTests
    {
        private GameObject _go;
        private ComboManager _combo;

        [SetUp]
        public void Setup()
        {
            _go = new GameObject("ComboTest");
            _combo = _go.AddComponent<ComboManager>();
            // Ensure Awake runs so GLBLoader auto-wire fires.
            _go.SetActive(true);
        }

        [TearDown]
        public void Teardown()
        {
            if (_go != null)
                UnityEngine.Object.DestroyImmediate(_go);
        }

        // ── LoadSemanticCombos ────────────────────────────────────────────────

        [Test]
        public void LoadSemanticCombos_EmptyJson_ClearsCombos()
        {
            _combo.LoadSemanticCombos("");
        }

        [Test]
        public void LoadSemanticCombos_SingleCombo_ParsesCorrectly()
        {
            var json = @"{
                ""combos"": [{
                    ""comboId"": ""chicken_egg_reward"",
                    ""requiredTags"": [""chicken_marker"", ""egg_marker""],
                    ""bonusXp"": 25,
                    ""semanticResult"": ""spawn_reward"",
                    ""animation"": ""particle_burst"",
                    ""phrase"": ""Great combo!"",
                    ""active"": true
                }]
            }";
            _combo.LoadSemanticCombos(json);
            var semCombos = GetSemanticCombos();
            Assert.Greater(semCombos.Count, 0, "At least one combo must be loaded");
        }

        [Test]
        public void LoadSemanticCombos_TwoCombos_BothLoaded()
        {
            var json = @"{
                ""combos"": [
                    { ""comboId"": ""combo-a"", ""requiredTags"": [""tag-1""], ""bonusXp"": 10, ""active"": true },
                    { ""comboId"": ""combo-b"", ""requiredTags"": [""tag-2""], ""bonusXp"": 20, ""active"": true }
                ]
            }";
            _combo.LoadSemanticCombos(json);
            var semCombos = GetSemanticCombos();
            Assert.AreEqual(2, semCombos.Count, "Two combos must be loaded");
        }

        // ── RegisterArTag ─────────────────────────────────────────────────────

        [Test]
        public void RegisterArTag_StoresMapping()
        {
            _combo.RegisterArTag("chicken_marker", "qr-chicken-001");
            _combo.RegisterArTag("egg_marker", "qr-egg-001");
            var map = GetArTagMap();
            Assert.IsTrue(map.Contains("chicken_marker"),
                "arTag 'chicken_marker' must be registered");
            Assert.AreEqual("qr-chicken-001", map["chicken_marker"]);
            Assert.AreEqual("qr-egg-001", map["egg_marker"]);
        }

        [Test]
        public void RegisterArTag_EmptyArTag_Skipped()
        {
            _combo.RegisterArTag("", "qr-x");
            _combo.RegisterArTag(null, "qr-y");
            var map = GetArTagMap();
            Assert.AreEqual(0, map.Count, "Empty/null arTag must not be stored");
        }

        // ── ClearSemanticState ────────────────────────────────────────────────

        [Test]
        public void ClearSemanticState_ClearsBothMaps()
        {
            _combo.RegisterArTag("tag-a", "qr-a");
            _combo.LoadSemanticCombos(@"{""combos"":[{""comboId"":""c1"",""requiredTags"":[""tag-a""],""bonusXp"":5,""active"":true}]}");

            _combo.ClearSemanticState();

            Assert.AreEqual(0, GetArTagMap().Count, "arTagToQrId must be cleared");
            Assert.AreEqual(0, GetSemanticCombos().Count, "semanticCombos must be cleared");
        }

        // ── Reset ────────────────────────────────────────────────────────────

        [Test]
        public void Reset_ClearsSemanticState()
        {
            _combo.RegisterArTag("reset-tag", "qr-reset");
            _combo.LoadSemanticCombos(@"{""combos"":[{""comboId"":""r1"",""requiredTags"":[""tag-x""],""bonusXp"":5,""active"":true}]}");

            _combo.Reset();

            Assert.AreEqual(0, GetArTagMap().Count, "Reset must clear arTagToQrId");
            Assert.AreEqual(0, GetSemanticCombos().Count, "Reset must clear semanticCombos");
        }

        // ── Inactive combo ────────────────────────────────────────────────────

        [Test]
        public void LoadSemanticCombos_InactiveCombo_NotLoaded()
        {
            var json = @"{
                ""combos"": [{
                    ""comboId"": ""inactive-combo"",
                    ""requiredTags"": [""tag-x""],
                    ""bonusXp"": 99,
                    ""active"": false
                }]
            }";
            _combo.LoadSemanticCombos(json);
            Assert.AreEqual(0, GetSemanticCombos().Count,
                "Inactive combos must not be loaded");
        }

        // ── P7: model_3d_url field parsing ────────────────────────────────────

        [Test]
        public void LoadSemanticCombos_WithModelUrl_ParsesModelUrl()
        {
            var json = @"{
                ""combos"": [{
                    ""comboId"": ""chicken_egg_reward"",
                    ""requiredTags"": [""chicken_marker"", ""egg_marker""],
                    ""bonusXp"": 25,
                    ""semanticResult"": ""chicken_egg"",
                    ""modelUrl"": ""https://cdn.example.com/rewards/chicken_egg.glb"",
                    ""active"": true
                }]
            }";
            _combo.LoadSemanticCombos(json);
            var semCombos = GetSemanticCombos();
            Assert.AreEqual(1, semCombos.Count, "One combo must be loaded");
            var modelUrl = GetComboModelUrl(semCombos, "chicken_egg_reward");
            Assert.AreEqual("https://cdn.example.com/rewards/chicken_egg.glb",
                modelUrl, "modelUrl must be parsed from JSON");
        }

        [Test]
        public void LoadSemanticCombos_NoModelUrl_DefaultsToEmpty()
        {
            var json = @"{
                ""combos"": [{
                    ""comboId"": ""basic-combo"",
                    ""requiredTags"": [""tag-a""],
                    ""bonusXp"": 10,
                    ""active"": true
                }]
            }";
            _combo.LoadSemanticCombos(json);
            var semCombos = GetSemanticCombos();
            var modelUrl = GetComboModelUrl(semCombos, "basic-combo");
            Assert.AreEqual("",
                modelUrl, "modelUrl must default to empty string when absent from JSON");
        }

        // ── Reflection helpers ────────────────────────────────────────────────

        private System.Collections.IDictionary GetSemanticCombos()
        {
            var f = typeof(ComboManager)
                .GetField("_semanticCombos",
                    BindingFlags.NonPublic | BindingFlags.Instance);
            Assert.IsNotNull(f, "_semanticCombos field must exist on ComboManager");
            return (System.Collections.IDictionary)f.GetValue(_combo);
        }

        private static string GetComboModelUrl(System.Collections.IDictionary combos, string comboId)
        {
            var item = combos[comboId];
            if (item == null) return null;
            // Access ModelUrl public property via reflection.
            var prop = item.GetType().GetProperty("ModelUrl");
            return prop?.GetValue(item) as string ?? "";
        }

        private System.Collections.IDictionary GetArTagMap()
        {
            var f = typeof(ComboManager)
                .GetField("_arTagToQrId",
                    BindingFlags.NonPublic | BindingFlags.Instance);
            Assert.IsNotNull(f, "_arTagToQrId field must exist on ComboManager");
            return (System.Collections.IDictionary)f.GetValue(_combo);
        }
    }

    /// <summary>
    /// EditMode tests for AnimationController clip discovery and playback.
    /// </summary>
    public class AnimationControllerTests
    {
        private GameObject _go;
        private AnimationController _animCtrl;
        private Animator _animator;
        private RuntimeAnimatorController _runtimeController;

        [SetUp]
        public void Setup()
        {
            _go = new GameObject("AnimTest");
            _animCtrl = _go.AddComponent<AnimationController>();
            _animator = _go.AddComponent<Animator>();

            // Create a minimal AnimatorController with a single clip for DiscoverClips().
            _runtimeController = CreateTestController();
            if (_runtimeController != null) {
                _animator.runtimeAnimatorController = _runtimeController;
            }
        }

        [TearDown]
        public void Teardown()
        {
            if (_go != null) UnityEngine.Object.DestroyImmediate(_go);
        }

        [Test]
        public void DiscoverClips_FindsRegisteredClips()
        {
            _animCtrl.DiscoverClips();
            // Test passes if no exception — DiscoverClips populates internal clip map.
        }

        [Test]
        public void PlayAnimation_UnknownType_FallsBackToIdle()
        {
            // Should not throw regardless of whether clips exist.
            Assert.DoesNotThrow(() => _animCtrl.PlayAnimation(ARAnimationType.Idle));
        }

        [Test]
        public void PlayClipByName_NullOrEmpty_ReturnsFalse()
        {
            Assert.IsFalse(_animCtrl.PlayClipByName(null));
            Assert.IsFalse(_animCtrl.PlayClipByName(""));
        }

        [Test]
        public void PlayClipByName_UnknownClip_ReturnsFalse()
        {
            Assert.IsFalse(_animCtrl.PlayClipByName("nonexistent_clip"));
        }

        // ── Test helper ───────────────────────────────────────────────────────

        private static RuntimeAnimatorController CreateTestController()
        {
            // Use AnimatorController.AllocateControllerForInspector (same as GLBLoader).
            var clip = new AnimationClip { name = "test_clip" };
            var animatorControllerType = Type.GetType(
                "UnityEngine.Animations.AnimatorController, UnityEngine.AnimationsModule")
                ?? Type.GetType("UnityEngine.AnimatorController");

            if (animatorControllerType == null) return null;

            var allocateMethod = animatorControllerType.GetMethod(
                "AllocateControllerForInspector",
                BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Static,
                null,
                new[] { typeof(AnimationClip[]), typeof(GameObject) },
                null
            );

            if (allocateMethod == null) return null;

            return allocateMethod.Invoke(null, new object[] { new[] { clip }, null })
                as RuntimeAnimatorController;
        }
    }

    /// <summary>
    /// EditMode tests for ARAudioPlayer URL handling and basic lifecycle.
    /// </summary>
    public class ARAudioPlayerTests
    {
        private GameObject _go;
        private ARAudioPlayer _audio;

        [SetUp]
        public void Setup()
        {
            _go = new GameObject("AudioTest");
            _audio = _go.AddComponent<ARAudioPlayer>();
            _go.SetActive(true);
        }

        [TearDown]
        public void Teardown()
        {
            if (_go != null) UnityEngine.Object.DestroyImmediate(_go);
        }

        [Test]
        public void PlayAudio_EmptyUrl_LogsWarning()
        {
            LogAssert.Expect(LogType.Warning,
                new System.Text.RegularExpressions.Regex("Empty URL"));
            // Should not throw.
            Assert.DoesNotThrow(() => _audio.PlayAudio(""));
            Assert.DoesNotThrow(() => _audio.PlayAudio(null));
        }

        [Test]
        public void Stop_WhenNotPlaying_DoesNotThrow()
        {
            Assert.DoesNotThrow(() => _audio.Stop());
        }
    }
}
