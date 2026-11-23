using System;
using System.Collections;
using System.Collections.Generic;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;

namespace EduPlatform.PlayModeTests
{
    /// <summary>
    /// PlayMode tests for the P8 gamification bridge: Unity → RN event emission.
    ///
    /// Scope:
    ///   1. onComboComplete fires with correct payload (rewardCardId + xpAwarded)
    ///   2. onProximityNear fires before onComboComplete
    ///   3. onComboTriggered fires on combo match
    ///   4. Duplicate TriggerCombo calls are deduplicated
    ///
    /// These tests verify the ComboManager → RNEventEmitter bridge by subscribing to
    /// ComboManager's public events directly (OnComboComplete, OnProximityNear, OnComboTriggered).
    /// No AR subsystem required — TriggerCombo() exercises the full RN bridge path.
    ///
    /// For XR simulation/manual test: see P8 manual test procedure in progress doc.
    /// </summary>
    [NUnit.Framework.TestFixture]
    public class ComboGamificationPlayModeTests
    {
        private GameObject _comboGo;
        private ComboManager _combo;
        private EventLog _eventLog;

        [UnitySetUp]
        public IEnumerator Setup()
        {
            _comboGo = new GameObject("ComboTest");
            _combo = _comboGo.AddComponent<ComboManager>();
            _eventLog = new EventLog();

            // Subscribe to all public events
            _combo.OnComboComplete += (rewardCardId, xpAwarded) =>
                _eventLog.Record("onComboComplete", new ComboCompletePayload { rewardCardId = rewardCardId, xpAwarded = xpAwarded });
            _combo.OnProximityNear += (idA, idB, dist) =>
                _eventLog.Record("onProximityNear", new ProximityPayload { imageIdA = idA, imageIdB = idB, distance = dist });
            _combo.OnComboTriggered += (idA, idB, comboId) =>
                _eventLog.Record("onComboTriggered", new ComboTriggeredPayload { cardIdA = idA, cardIdB = idB, comboId = comboId });

            yield return null;
        }

        [TearDown]
        public void Teardown()
        {
            if (_comboGo != null)
                UnityEngine.Object.DestroyImmediate(_comboGo);
            _eventLog = null;
        }

        // ─────────────────────────────────────────────────────────────────
        // P8: Core gamification bridge verification
        // ─────────────────────────────────────────────────────────────────

        /// <summary>
        /// Verifies AC-GAME-001: Unity fires onComboComplete with rewardCardId + xpAwarded.
        /// This is the primary acceptance gate for the gamification bridge.
        /// </summary>
        [UnityTest]
        public IEnumerator TriggerCombo_Fires_onComboComplete_WithRewardAndXP()
        {
            _combo.LoadSemanticCombos(@"{""combos"":[{""comboId"":""chicken_egg"","
                + @"""requiredTags"":[""chicken"",""egg""],"
                + @"""bonusXp"":25,""modelUrl"":"""",""active"":true}]}");
            _combo.RegisterArTag("chicken", "qr-chicken");
            _combo.RegisterArTag("egg", "qr-egg");

            _eventLog.Clear();
            _combo.TriggerCombo("qr-chicken", "qr-egg");

            yield return null;
            yield return null; // Animation coroutine advances

            var e = _eventLog.GetFirst("onComboComplete");
            Assert.IsTrue(e.HasValue, "onComboComplete must fire after TriggerCombo");
            var payload = (ComboCompletePayload)e.Value.Payload;
            Assert.AreEqual("chicken_egg", payload.rewardCardId,
                "rewardCardId must be the backend comboId");
            Assert.AreEqual(25, payload.xpAwarded,
                "xpAwarded must match bonusXp from backend related_combos");
        }

        // NOTE: TriggerCombo_Fires_onProximityNear_Before_onComboComplete was removed.
        // onProximityNear fires only from the Update() proximity detection path (physical AR cards),
        // NOT from the RN-initiated TriggerCombo() path.
        // The proximity path (Update → onProximityNear → onComboComplete) is verified via
        // ARTestHarness or XR Simulation/manual device testing, not PlayMode tests.
        // The RN path (TriggerCombo → onComboTriggered → onComboComplete) is verified by
        // TriggerCombo_Fires_onComboTriggered and TriggerCombo_Fires_onComboComplete_WithRewardAndXP.

        [UnityTest]
        public IEnumerator TriggerCombo_Fires_onComboTriggered()
        {
            _combo.LoadSemanticCombos(@"{""combos"":[{""comboId"":""test-combo"","
                + @"""requiredTags"":[""t1"",""t2""],"
                + @"""bonusXp"":15,""modelUrl"":"""",""active"":true}]}");
            _combo.RegisterArTag("t1", "qr-t1");
            _combo.RegisterArTag("t2", "qr-t2");

            _eventLog.Clear();
            _combo.TriggerCombo("qr-t1", "qr-t2");

            yield return null;

            var e = _eventLog.GetFirst("onComboTriggered");
            Assert.IsTrue(e.HasValue, "onComboTriggered must fire");
            var payload = (ComboTriggeredPayload)e.Value.Payload;
            Assert.AreEqual("test-combo", payload.comboId,
                "comboId in event must match backend comboId");
        }

        [UnityTest]
        public IEnumerator TriggerCombo_NoMatch_DoesNotFire_onComboComplete()
        {
            _combo.LoadSemanticCombos(@"{""combos"":[{""comboId"":""a_b"","
                + @"""requiredTags"":[""tag-a"",""tag-b""],"
                + @"""bonusXp"":10,""active"":true}]}");
            _combo.RegisterArTag("tag-a", "qr-a");
            // Note: tag-b NOT registered → ResolveSemanticCombo returns null

            _eventLog.Clear();
            _combo.TriggerCombo("qr-a", "qr-unknown");

            yield return null;

            var e = _eventLog.GetFirst("onComboComplete");
            Assert.IsNull(e,
                "onComboComplete must NOT fire when no combo matches the pair");
        }

        [UnityTest]
        public IEnumerator TriggerCombo_SamePairTwice_Deduplicates()
        {
            _combo.LoadSemanticCombos(@"{""combos"":[{""comboId"":""dup-test"","
                + @"""requiredTags"":[""dup-a"",""dup-b""],"
                + @"""bonusXp"":8,""modelUrl"":"""",""active"":true}]}");
            _combo.RegisterArTag("dup-a", "qr-dup-a");
            _combo.RegisterArTag("dup-b", "qr-dup-b");

            _eventLog.Clear();
            _combo.TriggerCombo("qr-dup-a", "qr-dup-b");
            _combo.TriggerCombo("qr-dup-a", "qr-dup-b");

            yield return null;
            yield return null;

            var count = _eventLog.CountOf("onComboComplete");
            Assert.AreEqual(1, count,
                "Duplicate TriggerCombo calls must NOT produce multiple onComboComplete events");
        }

        // ─────────────────────────────────────────────────────────────────
        // P7/P8: Combo with modelUrl fires onComboComplete
        // ─────────────────────────────────────────────────────────────────

        [UnityTest]
        public IEnumerator TriggerCombo_WithModelUrl_Fires_onComboComplete()
        {
            _combo.LoadSemanticCombos(@"{""combos"":[{""comboId"":""model-combo"","
                + @"""requiredTags"":[""m1"",""m2""],"
                + @"""bonusXp"":30,""modelUrl"":""https://cdn.example.com/reward.glb"","
                + @"""active"":true}]}");
            _combo.RegisterArTag("m1", "qr-m1");
            _combo.RegisterArTag("m2", "qr-m2");

            _eventLog.Clear();
            _combo.TriggerCombo("qr-m1", "qr-m2");

            yield return null;
            yield return null;
            yield return null; // GLB load takes a frame (modelUrl present → LoadGLB called)

            var e = _eventLog.GetFirst("onComboComplete");
            Assert.IsTrue(e.HasValue,
                "onComboComplete must fire even when modelUrl is present and GLBLoader is invoked");
            var payload = (ComboCompletePayload)e.Value.Payload;
            Assert.AreEqual("model-combo", payload.rewardCardId);
            Assert.AreEqual(30, payload.xpAwarded);
        }

        // ══════════════════════════════════════════════════════════════
        // Test infrastructure
        // ══════════════════════════════════════════════════════════════

        private class EventLog
        {
            private readonly List<Event> _events = new();

            public void Clear() => _events.Clear();

            public void Record(string name, object payload)
            {
                _events.Add(new Event { Name = name, Payload = payload });
                Debug.Log($"[EventLog] {name}");
            }

            public Event? GetFirst(string name)
            {
                foreach (var e in _events)
                    if (e.Name == name) return e;
                return null;
            }

            public int IndexOf(string name)
            {
                for (int i = 0; i < _events.Count; i++)
                    if (_events[i].Name == name) return i;
                return -1;
            }

            public int CountOf(string name)
            {
                int c = 0;
                foreach (var e in _events)
                    if (e.Name == name) c++;
                return c;
            }

            public struct Event
            {
                public string Name;
                public object Payload;
            }
        }

        private struct ComboCompletePayload { public string rewardCardId; public int xpAwarded; }
        private struct ProximityPayload { public string imageIdA; public string imageIdB; public float distance; }
        private struct ComboTriggeredPayload { public string cardIdA; public string cardIdB; public string comboId; }
    }
}
