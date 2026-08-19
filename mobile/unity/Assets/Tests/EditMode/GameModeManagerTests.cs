using System;
using NUnit.Framework;
using UnityEngine;

namespace EduPlatform.EditModeTests
{
    /// <summary>
    /// EditMode tests for TBD: In-AR Game Mode Foundation.
    /// Tests pure GameModeManager logic — no Play Mode required.
    /// </summary>
    [TestFixture]
    public class GameModeManagerTests
    {
        private GameObject _go;
        private GameModeManager _manager;

        [SetUp]
        public void SetUp()
        {
            _go = new GameObject("GameModeTest");
            _manager = _go.AddComponent<GameModeManager>();
            // Manually initialize without Start() (EditMode-safe)
            _manager.AutoWireForTest();
        }

        [TearDown]
        public void TearDown()
        {
            if (_go != null)
                UnityEngine.Object.DestroyImmediate(_go);
        }

        // ─── TBD.1: Initial state ───────────────────────────────────────

        [Test]
        public void InitialState_IsArScan()
        {
            Assert.AreEqual(GameModeManager.STATE_AR_SCAN, _manager.CurrentState);
            Assert.IsFalse(_manager.IsGameActive);
        }

        // ─── TBD.2: EnterGame transitions to GAME_ACTIVE ──────────────────

        [Test]
        public void EnterGame_SetsStateToGameActive()
        {
            _manager.EnterGame();
            Assert.AreEqual(GameModeManager.STATE_GAME_ACTIVE, _manager.CurrentState);
            Assert.IsTrue(_manager.IsGameActive);
        }

        // ─── TBD.3: ExitGame transitions to AR_SCAN ───────────────────────

        [Test]
        public void ExitGame_SetsStateToArScan()
        {
            _manager.EnterGame();
            _manager.ExitGame();
            Assert.AreEqual(GameModeManager.STATE_AR_SCAN, _manager.CurrentState);
            Assert.IsFalse(_manager.IsGameActive);
        }

        // ─── TBD.4: EnterGame fires onGameEntered ─────────────────────────

        [Test]
        public void EnterGame_FiresOnGameEntered()
        {
            string firedType = null;
            string firedId = null;
            _manager.OnGameEntered += (type, id) => {
                firedType = type;
                firedId = id;
            };

            _manager.EnterGame("combo", "chicken_egg_reward");

            Assert.AreEqual("combo", firedType);
            Assert.AreEqual("chicken_egg_reward", firedId);
        }

        // ─── TBD.5: ExitGame fires onGameExited ───────────────────────────

        [Test]
        public void ExitGame_FiresOnGameExited()
        {
            _manager.EnterGame();
            string firedType = null;
            string firedStatus = null;
            _manager.OnGameExited += (type, status) => {
                firedType = type;
                firedStatus = status;
            };

            _manager.ExitGame("completed");

            Assert.AreEqual("default", firedType);
            Assert.AreEqual("completed", firedStatus);
        }

        // ─── TBD.6: OnStateChanged fires on transitions ───────────────────

        [Test]
        public void EnterGame_FiresOnStateChanged()
        {
            string from = null;
            string to = null;
            _manager.OnStateChanged += (f, t) => { from = f; to = t; };

            _manager.EnterGame();

            Assert.AreEqual(GameModeManager.STATE_AR_SCAN, from);
            Assert.AreEqual(GameModeManager.STATE_GAME_ACTIVE, to);
        }

        [Test]
        public void ExitGame_FiresOnStateChanged()
        {
            _manager.EnterGame();
            string from = null;
            string to = null;
            _manager.OnStateChanged += (f, t) => { from = f; to = t; };

            _manager.ExitGame("completed");

            Assert.AreEqual(GameModeManager.STATE_GAME_ACTIVE, from);
            Assert.AreEqual(GameModeManager.STATE_AR_SCAN, to);
        }

        // ─── TBD.7: TriggerGameFromCombo ───────────────────────────────────

        [Test]
        public void TriggerGameFromCombo_EntersGameMode()
        {
            _manager.TriggerGameFromCombo("chicken_egg_reward");
            Assert.AreEqual(GameModeManager.STATE_GAME_ACTIVE, _manager.CurrentState);
            Assert.IsTrue(_manager.IsGameActive);
        }

        // ─── TBD.8: Idempotency ──────────────────────────────────────────

        [Test]
        public void EnterGame_Idempotent_NoDoubleFire()
        {
            int enterCount = 0;
            _manager.OnGameEntered += (_, _) => enterCount++;

            _manager.EnterGame("combo", "test");
            _manager.EnterGame("combo", "test");

            Assert.AreEqual(1, enterCount);
        }

        [Test]
        public void ExitGame_Idempotent_NoOpWhenArScan()
        {
            int exitCount = 0;
            _manager.OnGameExited += (_, _) => exitCount++;

            _manager.ExitGame("abandoned");

            Assert.AreEqual(0, exitCount);
            Assert.AreEqual(GameModeManager.STATE_AR_SCAN, _manager.CurrentState);
        }

        // ─── TBD.9: State constants ───────────────────────────────────────

        [Test]
        public void StateConstants_AreDefined()
        {
            Assert.AreEqual("AR_SCAN", GameModeManager.STATE_AR_SCAN);
            Assert.AreEqual("GAME_ACTIVE", GameModeManager.STATE_GAME_ACTIVE);
        }

        // ─── TBD.10: Events not null (API contract) ───────────────────────

        [Test]
        public void Events_AreNotNull()
        {
            Assert.IsNotNull(_manager.OnStateChanged);
            Assert.IsNotNull(_manager.OnGameEntered);
            Assert.IsNotNull(_manager.OnGameExited);
        }
    }
}
