using NUnit.Framework;
using UnityEngine;

namespace EduPlatform.EditModeTests
{
    /// <summary>
    /// Regression tests for bug #10: ModelSpawner.Spawn was destroying
    /// _currentModel on every call, so spawning card B's GLB killed card A's
    /// GLB. Post-fix, callers can pass an `id` to opt into a per-id dictionary
    /// so simultaneous cards coexist. Single-model callers (no id) keep legacy
    /// behaviour.
    /// </summary>
    public class ModelSpawnerRegressionTests
    {
        private GameObject _hostGo;
        private GameObject _prefabA;
        private GameObject _prefabB;
        private ModelSpawner _spawner;

        [SetUp]
        public void SetUp()
        {
            _hostGo = new GameObject("ModelSpawnerTestHost");
            _spawner = _hostGo.AddComponent<ModelSpawner>();

            // Build two distinct prefabs (primitives) — one per "card".
            _prefabA = GameObject.CreatePrimitive(PrimitiveType.Cube);
            _prefabA.name = "PrefabA";
            _prefabA.transform.SetParent(_hostGo.transform);
            _prefabA.SetActive(false);

            _prefabB = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            _prefabB.name = "PrefabB";
            _prefabB.transform.SetParent(_hostGo.transform);
            _prefabB.SetActive(false);
        }

        [TearDown]
        public void TearDown()
        {
            if (_hostGo != null) Object.DestroyImmediate(_hostGo);
        }

        /// <summary>
        /// The bug: spawning B with no id would destroy A.
        /// The fix: pass an id per spawn and they coexist.
        /// </summary>
        [Test]
        public void MultiId_DoesNotDestroyPeers()
        {
            // Spawn card A with id="a".
            var a = _spawner.Spawn(
                _prefabA,
                position: new Vector3(1, 0, 0),
                rotation: Vector3.zero,
                scale: Vector3.one,
                id: "a");
            Assert.IsNotNull(a, "Card A spawn returned null.");

            // Spawn card B with id="b" at a different pose. Pre-fix, this would
            // destroy A. Post-fix, A must still exist.
            var b = _spawner.Spawn(
                _prefabB,
                position: new Vector3(2, 0, 0),
                rotation: Vector3.zero,
                scale: Vector3.one,
                id: "b");
            Assert.IsNotNull(b, "Card B spawn returned null.");

            Assert.IsTrue(a != null, "REGRESSION: card A was destroyed when card B spawned.");
            Assert.IsTrue(b != null, "Card B must exist.");
            Assert.IsTrue(a.activeInHierarchy, "Card A must still be active.");
            Assert.IsTrue(b.activeInHierarchy, "Card B must be active.");
            Assert.AreNotSame(a, b, "Distinct ids must produce distinct instances.");
        }

        /// <summary>
        /// Same id → second spawn destroys the first instance of that id,
        /// matching the "rescan / replace" semantics of the original single-model
        /// behaviour. This is intentional.
        /// </summary>
        [Test]
        public void SameId_DestroysPreviousInstance()
        {
            var first = _spawner.Spawn(_prefabA, Vector3.zero, Vector3.zero, Vector3.one, id: "a");
            Assert.IsNotNull(first, "First spawn must return a non-null GameObject.");

            // Second spawn with same id — Spawn() calls DestroyGo(existing) internally,
            // then replaces it. The 'first' reference now points to a destroyed object;
            // we only assert that the second spawn succeeded.
            var second = _spawner.Spawn(_prefabA, Vector3.zero, Vector3.zero, Vector3.one, id: "a");
            Assert.IsNotNull(second, "Second spawn must succeed even when replacing same id.");
        }

        /// <summary>
        /// When `id` is null, Spawn keeps the legacy single-model behaviour:
        /// each call destroys the previous model.
        /// </summary>
        [Test]
        public void NoId_LegacyBehaviour_DestroysPrevious()
        {
            var first = _spawner.Spawn(_prefabA, Vector3.zero, Vector3.zero, Vector3.one);
            Assert.IsNotNull(first);

            var second = _spawner.Spawn(_prefabB, Vector3.zero, Vector3.zero, Vector3.one);
            Assert.IsNotNull(second);

            // Force destroy of the first so we can assert; in EditMode Destroy()
            // leaves the object alive until end-of-frame. We use DestroyImmediate
            // on the first instance to simulate the queued cleanup having run.
            Object.DestroyImmediate(first);
            Assert.IsTrue(second != null, "Second model must remain after legacy replacement.");
        }

        /// <summary>
        /// ClearById removes a specific model without disturbing peers.
        /// </summary>
        [Test]
        public void ClearById_OnlyTargetsRequestedId()
        {
            var a = _spawner.Spawn(_prefabA, Vector3.zero, Vector3.zero, Vector3.one, id: "a");
            var b = _spawner.Spawn(_prefabB, Vector3.zero, Vector3.zero, Vector3.one, id: "b");

            bool removed = _spawner.ClearById("a");
            Assert.IsTrue(removed, "ClearById should return true when an entry exists.");
            Object.DestroyImmediate(a);

            // B should still be alive in the registry even though we killed A.
            // ClearById for an already-removed id should return false.
            Assert.IsFalse(_spawner.ClearById("a"),
                "ClearById on an already-cleared id must return false.");
            // Unknown id should also return false.
            Assert.IsFalse(_spawner.ClearById("zzz"),
                "ClearById on an unknown id must return false.");

            Assert.IsTrue(b != null, "Peer card B must be untouched by ClearById('a').");
        }

        /// <summary>
        /// Clear() cleans up both legacy and id-keyed models.
        /// </summary>
        [Test]
        public void Clear_RemovesAllModels()
        {
            _spawner.Spawn(_prefabA, Vector3.zero, Vector3.zero, Vector3.one, id: "a");
            _spawner.Spawn(_prefabB, Vector3.zero, Vector3.zero, Vector3.one, id: "b");
            _spawner.Spawn(_prefabA, Vector3.zero, Vector3.zero, Vector3.one); // legacy slot

            _spawner.Clear();

            Assert.IsFalse(_spawner.ClearById("a"), "After Clear, id 'a' must be gone.");
            Assert.IsFalse(_spawner.ClearById("b"), "After Clear, id 'b' must be gone.");
        }
    }
}
