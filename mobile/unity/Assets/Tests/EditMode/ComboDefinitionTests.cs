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
}
