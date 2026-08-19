using System;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;

namespace EduPlatform.PlayModeTests
{
    /// <summary>
    /// PlayMode tests for TBD: In-AR Game Mode Foundation.
    ///
    /// Scope:
    ///   1. GameModeManager.EnterGame() transitions state to GAME_ACTIVE
    ///   2. GameModeManager.ExitGame() transitions state to AR_SCAN
    ///   3. EnterGame fires onGameEntered event
    ///   4. ExitGame fires onGameExited event
    ///   5. OnStateChanged fires on transitions
    ///   6. TriggerGameFromCombo calls EnterGame with comboId
    ///   7. IsGameActive reflects current state
    ///   8. EnterGame is idempotent (calling twice does not double-fire)
    ///   9. ExitGame is idempotent (no-op when not in game mode)
    /// </summary>
    [NUnit.Framework.TestFixture]
    public class GameModeManagerPlayModeTests
    {
        private GameObject _go;
        private GameModeManager _manager;

        [SetUp]
        public void SetUp()
        {
            _go = new GameObject("GameModeTest");
            _manager = _go.AddComponent<GameModeManager>();
            // GameModeManager.AutoWire + SetupListeners run in Start(),
            // so we call it manually in tests.
            _manager.AutoWireForTest();
            _manager.SetupListenersForTest();
        }

        [TearDown]
        public void TearDown()
        {
            if (_go != null)
                UnityEngine.Object.DestroyImmediate(_go);
        }

        // ─────────────────────────────────────────────────────────────────
        // TBD.1: EnterGame transitions to GAME_ACTIVE
        // ─────────────────────────────────────────────────────────────────

        [UnityTest]
        public IEnumerator EnterGame_SetsStateToGameActive()
        {
            Assert.AreEqual(GameModeManager.STATE_AR_SCAN, _manager.CurrentState,
                "State must start at AR_SCAN");

            _manager.EnterGame();

            Assert.AreEqual(GameModeManager.STATE_GAME_ACTIVE, _manager.CurrentState,
                "EnterGame must set state to GAME_ACTIVE");
            Assert.IsTrue(_manager.IsGameActive,
                "IsGameActive must be true after EnterGame");
            yield return null;
        }

        // ─────────────────────────────────────────────────────────────────
        // TBD.2: ExitGame transitions to AR_SCAN
        // ─────────────────────────────────────────────────────────────────

        [UnityTest]
        public IEnumerator ExitGame_SetsStateToArScan()
        {
            _manager.EnterGame();
            Assert.AreEqual(GameModeManager.STATE_GAME_ACTIVE, _manager.CurrentState);

            _manager.ExitGame();

            Assert.AreEqual(GameModeManager.STATE_AR_SCAN, _manager.CurrentState,
                "ExitGame must restore AR_SCAN state");
            Assert.IsFalse(_manager.IsGameActive,
                "IsGameActive must be false after ExitGame");
            yield return null;
        }

        // ─────────────────────────────────────────────────────────────────
        // TBD.3: EnterGame fires onGameEntered
        // ─────────────────────────────────────────────────────────────────

        [UnityTest]
        public IEnumerator EnterGame_FiresOnGameEntered()
        {
            string firedGameType = null;
            string firedGameId = null;
            _manager.OnGameEntered += (type, id) => {
                firedGameType = type;
                firedGameId = id;
            };

            _manager.EnterGame("combo", "chicken_egg_reward");

            Assert.AreEqual("combo", firedGameType, "onGameEntered must receive gameType");
            Assert.AreEqual("chicken_egg_reward", firedGameId, "onGameEntered must receive gameId");
            yield return null;
        }

        // ─────────────────────────────────────────────────────────────────
        // TBD.4: ExitGame fires onGameExited
        // ─────────────────────────────────────────────────────────────────

        [UnityTest]
        public IEnumerator ExitGame_FiresOnGameExited()
        {
            _manager.EnterGame();

            string firedGameType = null;
            string firedStatus = null;
            _manager.OnGameExited += (type, status) => {
                firedGameType = type;
                firedStatus = status;
            };

            _manager.ExitGame("completed");

            Assert.AreEqual("default", firedGameType, "onGameExited must receive gameType");
            Assert.AreEqual("completed", firedStatus, "onGameExited must receive completionStatus");
            yield return null;
        }

        // ─────────────────────────────────────────────────────────────────
        // TBD.5: OnStateChanged fires on transitions
        // ─────────────────────────────────────────────────────────────────

        [UnityTest]
        public IEnumerator StateChanges_FireOnStateChanged()
        {
            string fromState = null;
            string toState = null;
            int callCount = 0;
            _manager.OnStateChanged += (from, to) => {
                fromState = from;
                toState = to;
                callCount++;
            };

            _manager.EnterGame();

            Assert.AreEqual(1, callCount, "OnStateChanged must fire once on EnterGame");
            Assert.AreEqual(GameModeManager.STATE_AR_SCAN, fromState);
            Assert.AreEqual(GameModeManager.STATE_GAME_ACTIVE, toState);

            _manager.ExitGame();

            Assert.AreEqual(2, callCount, "OnStateChanged must fire twice after full cycle");
            Assert.AreEqual(GameModeManager.STATE_GAME_ACTIVE, fromState);
            Assert.AreEqual(GameModeManager.STATE_AR_SCAN, toState);
            yield return null;
        }

        // ─────────────────────────────────────────────────────────────────
        // TBD.6: TriggerGameFromCombo calls EnterGame
        // ─────────────────────────────────────────────────────────────────

        [UnityTest]
        public IEnumerator TriggerGameFromCombo_EntersGameMode()
        {
            Assert.AreEqual(GameModeManager.STATE_AR_SCAN, _manager.CurrentState);

            _manager.TriggerGameFromCombo("chicken_egg_reward");

            Assert.AreEqual(GameModeManager.STATE_GAME_ACTIVE, _manager.CurrentState,
                "TriggerGameFromCombo must enter game mode");
            Assert.IsTrue(_manager.IsGameActive);
            yield return null;
        }

        // ─────────────────────────────────────────────────────────────────
        // TBD.7: EnterGame is idempotent
        // ─────────────────────────────────────────────────────────────────

        [UnityTest]
        public IEnumerator EnterGame_Idempotent_NoDoubleFire()
        {
            int enterCount = 0;
            _manager.OnGameEntered += (_, _) => enterCount++;

            _manager.EnterGame("combo", "test");
            _manager.EnterGame("combo", "test"); // second call — should be no-op

            Assert.AreEqual(1, enterCount,
                "EnterGame must not fire twice when called twice");
            yield return null;
        }

        // ─────────────────────────────────────────────────────────────────
        // TBD.8: ExitGame is idempotent
        // ─────────────────────────────────────────────────────────────────

        [UnityTest]
        public IEnumerator ExitGame_Idempotent_NoOpWhenArScan()
        {
            // Already in AR_SCAN state
            int exitCount = 0;
            _manager.OnGameExited += (_, _) => exitCount++;

            _manager.ExitGame("abandoned");

            Assert.AreEqual(0, exitCount,
                "ExitGame must not fire when already in AR_SCAN");
            yield return null;
        }
    }
}
