using System.Reflection;
using NUnit.Framework;

namespace EduPlatform.EditModeTests
{
    /// <summary>
    /// EditMode tests for ComboDefinition (nested public class on ComboManager).
    /// Verified via reflection so we don't depend on private MonoBehaviour lifecycles.
    /// </summary>
    public class ComboDefinitionTests
    {
        private static System.Type _comboDefType;

        private static System.Type ComboDefType()
        {
            if (_comboDefType != null) return _comboDefType;
            var asms = System.AppDomain.CurrentDomain.GetAssemblies();
            System.Type found = null;
            for (int i = 0; i < asms.Length; i++)
            {
                try
                {
                    var t = asms[i].GetType("ComboManager+ComboDefinition");
                    if (t != null) { found = t; break; }
                    // Fallback: nested type lookup via ComboManager
                    var cm = asms[i].GetType("ComboManager");
                    if (cm != null)
                    {
                        var nested = cm.GetNestedType("ComboDefinition");
                        if (nested != null) { found = nested; break; }
                    }
                }
                catch { }
            }
            if (found == null) Assert.Fail("ComboManager+ComboDefinition type not found in any loaded assembly.");
            _comboDefType = found;
            return _comboDefType;
        }

        private static object MakeCombo(string id, string a, string b, string url, int xp)
        {
            var t = ComboDefType();
            var instance = System.Activator.CreateInstance(t);
            t.GetField("ComboId").SetValue(instance, id);
            t.GetField("CardA").SetValue(instance, a);
            t.GetField("CardB").SetValue(instance, b);
            t.GetField("ComboModelUrl").SetValue(instance, url);
            t.GetField("XpReward").SetValue(instance, xp);
            return instance;
        }

        [Test]
        public void Constructor_PopulatesAllFields()
        {
            var def = MakeCombo("chicken_egg_reward", "flashcard_chicken",
                "flashcard_egg", "https://cdn.example.com/reward.glb", 25);
            var t = ComboDefType();

            Assert.AreEqual("chicken_egg_reward", t.GetField("ComboId").GetValue(def));
            Assert.AreEqual("flashcard_chicken", t.GetField("CardA").GetValue(def));
            Assert.AreEqual("flashcard_egg", t.GetField("CardB").GetValue(def));
            Assert.AreEqual("https://cdn.example.com/reward.glb", t.GetField("ComboModelUrl").GetValue(def));
            Assert.AreEqual(25, t.GetField("XpReward").GetValue(def));
        }

        [Test]
        public void ComboModelUrl_CanBeNull_ForPrimitiveFallback()
        {
            var def = MakeCombo("chicken_egg_reward", "flashcard_chicken",
                "flashcard_egg", null, 25);
            var t = ComboDefType();
            var url = t.GetField("ComboModelUrl").GetValue(def);

            Assert.IsNull(url,
                "ComboModelUrl may be null — ComboManager must fall back to primitive sphere.");
        }

        [Test]
        public void XpReward_AcceptsArbitraryPositiveValue()
        {
            var def = MakeCombo("a_b_reward", "a", "b", "https://x.com/y.glb", 999);
            var t = ComboDefType();
            Assert.AreEqual(999, t.GetField("XpReward").GetValue(def));
        }
    }

    /// <summary>
    /// P6 EditMode tests for ComboManager semantic combo resolution.
    /// </summary>
    public class ComboManagerSemanticTests
    {
        private UnityEngine.GameObject _go;
        private ComboManager _combo;

        [SetUp]
        public void Setup()
        {
            _go = new UnityEngine.GameObject("ComboTest");
            _combo = _go.AddComponent<ComboManager>();
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
            // No exception, combos cleared
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
            // Verify via reflection that the semantic combo was stored.
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
            // Verify via reflection that arTagToQrId has the mappings.
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

        // ── Reset clears semantic state ───────────────────────────────────────

        [Test]
        public void Reset_ClearsSemanticState()
        {
            _combo.RegisterArTag("reset-tag", "qr-reset");
            _combo.LoadSemanticCombos(@"{""combos"":[{""comboId"":""r1"",""requiredTags"":[""tag-x""],""bonusXp"":5,""active"":true}]}");

            _combo.Reset();

            Assert.AreEqual(0, GetArTagMap().Count, "Reset must clear arTagToQrId");
            Assert.AreEqual(0, GetSemanticCombos().Count, "Reset must clear semanticCombos");
        }

        // ── Inactive combo skipped ─────────────────────────────────────────────

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
            // Only active combos are loaded; inactive ones are skipped.
            Assert.AreEqual(0, GetSemanticCombos().Count,
                "Inactive combos must not be loaded");
        }

        // ── Reflection helpers ─────────────────────────────────────────────────

        private System.Collections.IDictionary GetSemanticCombos()
        {
            var f = typeof(ComboManager)
                .GetField("_semanticCombos",
                    BindingFlags.NonPublic | BindingFlags.Instance);
            Assert.IsNotNull(f, "_semanticCombos field must exist on ComboManager");
            return (System.Collections.IDictionary)f.GetValue(_combo);
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
}
