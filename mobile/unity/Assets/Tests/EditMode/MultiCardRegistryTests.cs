using System.Collections.Generic;
using NUnit.Framework;
using UnityEngine;

namespace EduPlatform.EditModeTests
{
    /// <summary>
    /// EditMode tests for MultiCardRegistry — pure C# logic, no AR required.
    /// Verifies the per-card payload store behaves correctly across the
    /// dual-flashcard combo flow.
    /// </summary>
    public class MultiCardRegistryTests
    {
        private GameObject _go;
        private MultiCardRegistry _registry;

        [SetUp]
        public void Setup()
        {
            _go = new GameObject("Test_Registry");
            _registry = _go.AddComponent<MultiCardRegistry>();
        }

        [TearDown]
        public void Teardown()
        {
            if (_go != null) Object.DestroyImmediate(_go);
        }

        [Test]
        public void RegisterFlashcard_AddsEntryAndIncreasesCount()
        {
            var payload = new ARExperiencePayload
            {
                QrId = "flashcard_chicken",
                Word = "chicken",
                ModelUrl = "https://cdn.example.com/chicken.glb"
            };

            _registry.RegisterFlashcard(payload.QrId, payload);

            Assert.AreEqual(1, _registry.Count);
        }

        [Test]
        public void RegisterFlashcard_WithEmptyQrId_DoesNotAdd()
        {
            var payload = new ARExperiencePayload { QrId = "chicken" };
            _registry.RegisterFlashcard("", payload);

            Assert.AreEqual(0, _registry.Count);
        }

        [Test]
        public void RegisterFlashcard_WithNullQrId_DoesNotAdd()
        {
            var payload = new ARExperiencePayload { QrId = "chicken" };
            _registry.RegisterFlashcard(null, payload);

            Assert.AreEqual(0, _registry.Count);
        }

        [Test]
        public void GetPayload_ReturnsRegisteredPayload()
        {
            var payload = new ARExperiencePayload
            {
                QrId = "flashcard_egg",
                Word = "egg",
                ModelUrl = "https://cdn.example.com/egg.glb"
            };
            _registry.RegisterFlashcard("flashcard_egg", payload);

            var fetched = _registry.GetPayload("flashcard_egg");

            Assert.IsTrue(fetched.HasValue);
            Assert.AreEqual("egg", fetched.Value.Word);
            Assert.AreEqual("https://cdn.example.com/egg.glb", fetched.Value.ModelUrl);
        }

        [Test]
        public void GetPayload_ReturnsNullForUnknownQrId()
        {
            var fetched = _registry.GetPayload("never-registered");

            Assert.IsFalse(fetched.HasValue);
        }

        [Test]
        public void UnregisterFlashcard_RemovesEntryAndReturnsTrue()
        {
            var payload = new ARExperiencePayload { QrId = "flashcard_chicken" };
            _registry.RegisterFlashcard("flashcard_chicken", payload);

            var removed = _registry.UnregisterFlashcard("flashcard_chicken");

            Assert.IsTrue(removed);
            Assert.AreEqual(0, _registry.Count);
        }

        [Test]
        public void UnregisterFlashcard_ReturnsFalseForUnknownQrId()
        {
            var removed = _registry.UnregisterFlashcard("not-here");

            Assert.IsFalse(removed);
        }

        [Test]
        public void SetSpawnedModel_StoresAndRetrievesModel()
        {
            var payload = new ARExperiencePayload { QrId = "flashcard_dog" };
            _registry.RegisterFlashcard("flashcard_dog", payload);

            var model = new GameObject("DogModel");
            _registry.SetSpawnedModel("flashcard_dog", model);

            var fetched = _registry.GetSpawnedModel("flashcard_dog");
            Assert.AreSame(model, fetched);

            Object.DestroyImmediate(model);
        }

        [Test]
        public void GetSpawnedModel_ReturnsNullForUnsetEntry()
        {
            var payload = new ARExperiencePayload { QrId = "flashcard_bone" };
            _registry.RegisterFlashcard("flashcard_bone", payload);

            var fetched = _registry.GetSpawnedModel("flashcard_bone");

            Assert.IsNull(fetched);
        }

        [Test]
        public void RegisteredIds_EnumeratesAllCards()
        {
            _registry.RegisterFlashcard("a", new ARExperiencePayload { QrId = "a" });
            _registry.RegisterFlashcard("b", new ARExperiencePayload { QrId = "b" });
            _registry.RegisterFlashcard("c", new ARExperiencePayload { QrId = "c" });

            var ids = new List<string>(_registry.RegisteredIds);

            Assert.AreEqual(3, ids.Count);
            CollectionAssert.Contains(ids, "a");
            CollectionAssert.Contains(ids, "b");
            CollectionAssert.Contains(ids, "c");
        }

        [Test]
        public void ComboFlow_RegisterTwoCardsAndResolveEach()
        {
            var chicken = new ARExperiencePayload
            {
                QrId = "flashcard_chicken",
                Word = "chicken",
                ModelUrl = "https://cdn.example.com/chicken.glb"
            };
            var egg = new ARExperiencePayload
            {
                QrId = "flashcard_egg",
                Word = "egg",
                ModelUrl = "https://cdn.example.com/egg.glb"
            };

            _registry.RegisterFlashcard(chicken.QrId, chicken);
            _registry.RegisterFlashcard(egg.QrId, egg);

            Assert.AreEqual(2, _registry.Count);

            var chickenPayload = _registry.GetPayload("flashcard_chicken");
            var eggPayload = _registry.GetPayload("flashcard_egg");

            Assert.IsTrue(chickenPayload.HasValue);
            Assert.IsTrue(eggPayload.HasValue);
            Assert.AreEqual("chicken", chickenPayload.Value.Word);
            Assert.AreEqual("egg", eggPayload.Value.Word);
        }
    }
}
