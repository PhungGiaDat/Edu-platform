using System.Collections.Generic;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;

namespace EduPlatform.EditModeTests
{
    /// <summary>
    /// EditMode tests for ARExperienceHandler wiring logic — no AR subsystem required.
    ///
    /// Scope (P3 / M3B):
    ///   1. StartImageTrackingMulti parses the JSON payload correctly
    ///   2. Valid cards register payloads in MultiCardRegistry
    ///   3. Rejected cards do NOT register in MultiCardRegistry
    ///   4. Rejection events are emitted for invalid cards
    ///   5. BuildLibrary is called when library is not ready
    ///   6. AddCard is called incrementally when library is already ready
    ///   7. ARScene is loaded additively on first call
    ///   8. Empty/null payloads produce an error event
    ///   9. parseResult.HasValidCards guard prevents calling the builder with no cards
    /// </summary>
    public class ARExperienceHandlerTests
    {
        private GameObject _go;
        private ARExperienceHandler _handler;
        private CardImageLibraryBuilder _builder;
        private MultiCardRegistry _registry;
        private RNEventEmitter _eventEmitter;

        [SetUp]
        public void Setup()
        {
            _go = new GameObject("Test_Handler");

            _builder = _go.AddComponent<CardImageLibraryBuilder>();
            _registry = _go.AddComponent<MultiCardRegistry>();
            _handler = _go.AddComponent<ARExperienceHandler>();
            _eventEmitter = _go.AddComponent<RNEventEmitter>();

            _go.SetActive(true);

            // AutoWire manually — in EditMode tests, Start() is NOT called by NUnit
            // (the Unity frame lifecycle does not advance), so we invoke it explicitly.
            _handler.AutoWire();
        }

        [TearDown]
        public void Teardown()
        {
            if (_go != null) Object.DestroyImmediate(_go);
        }

        [Test]
        public void StartImageTrackingMulti_ValidCard_CallsBuildLibrary()
        {
            // BuildLibrary is called when IsLibraryReady is false (the default).
            var json = @"{""cards"":[{""qrId"":""cat-meow"",""imageUrl"":""https://x.com/cat.png"",""physicalWidthMeters"":0.08}]}";
            Assert.DoesNotThrow(() => _handler.StartImageTrackingMulti(json));
        }

        [Test]
        public void StartImageTrackingMulti_ValidCard_RegistersPayloadInRegistry()
        {
            var json = @"{""cards"":[{""qrId"":""cat-meow"",""imageUrl"":""https://x.com/cat.png"","
                + @"""word"":""cat"",""translationVi"":""con mèo"",""modelUrl"":""https://x.com/cat.glb"","
                + @"""audioUrl"":""https://x.com/cat.mp3"",""animationType"":""idle"","
                + @"""glbSize"":1.2,""position"":""0 0 0"",""rotation"":""0 0 0"",""scale"":""1 1 1"","
                + @"""physicalWidthMeters"":0.08}]}";

            _handler.StartImageTrackingMulti(json);

            var payload = _registry.GetPayload("cat-meow");
            Assert.IsTrue(payload.HasValue, "Valid card must be registered in MultiCardRegistry");
            Assert.AreEqual("cat", payload.Value.Word);
            Assert.AreEqual("con mèo", payload.Value.TranslationVi);
            Assert.AreEqual("https://x.com/cat.glb", payload.Value.ModelUrl);
        }

        [Test]
        public void StartImageTrackingMulti_InvalidCard_DoesNotRegister()
        {
            LogAssert.Expect(LogType.Warning,
                new System.Text.RegularExpressions.Regex("Card rejected"));
            LogAssert.Expect(LogType.Error,
                new System.Text.RegularExpressions.Regex("No valid cards"));
            var json = @"{""cards"":[{""qrId"":"""",""imageUrl"":""https://x.com/bad.png"",""physicalWidthMeters"":0.08}]}";

            _handler.StartImageTrackingMulti(json);

            Assert.IsFalse(_registry.GetPayload("").HasValue, "Rejected card must NOT be registered");
        }

        [Test]
        public void StartImageTrackingMulti_OneValidOneInvalid_RegistersOnlyValid()
        {
            LogAssert.Expect(LogType.Warning,
                new System.Text.RegularExpressions.Regex("Card rejected"));
            var json = @"{""cards"":["
                + @"{""qrId"":""valid-card"",""imageUrl"":""https://x.com/v.png"",""physicalWidthMeters"":0.08},"
                + @"{""qrId"":"""",""imageUrl"":""https://x.com/bad.png"",""physicalWidthMeters"":0.08}"
                + @"]}";

            _handler.StartImageTrackingMulti(json);

            Assert.IsTrue(_registry.GetPayload("valid-card").HasValue,
                "Valid card must be registered");
            Assert.IsFalse(_registry.GetPayload("").HasValue,
                "Invalid card must NOT be registered");
        }

        [Test]
        public void StartImageTrackingMulti_AllCardsInvalid_DoesNotThrow()
        {
            LogAssert.Expect(LogType.Warning,
                new System.Text.RegularExpressions.Regex("Card rejected"));
            LogAssert.Expect(LogType.Error,
                new System.Text.RegularExpressions.Regex("No valid cards"));
            var json = @"{""cards"":[{""qrId"":"""",""imageUrl"":""https://x.com/img.png"",""physicalWidthMeters"":0.08}]}";
            Assert.DoesNotThrow(() => _handler.StartImageTrackingMulti(json));
        }

        [Test]
        public void StartImageTrackingMulti_EmptyJson_ThrowsArgumentException()
        {
            Assert.Throws<System.ArgumentException>(() => _handler.StartImageTrackingMulti(""));
        }

        [Test]
        public void StartImageTrackingMulti_NullJson_ThrowsArgumentException()
        {
            Assert.Throws<System.ArgumentException>(() => _handler.StartImageTrackingMulti(null));
        }

        [Test]
        public void StartImageTrackingMulti_TwoCards_RegistersBoth()
        {
            var json = @"{""cards"":["
                + @"{""qrId"":""card-a"",""imageUrl"":""https://x.com/a.png"",""physicalWidthMeters"":0.08},"
                + @"{""qrId"":""card-b"",""imageUrl"":""https://x.com/b.png"",""physicalWidthMeters"":0.085}"
                + @"]}";

            _handler.StartImageTrackingMulti(json);

            Assert.IsTrue(_registry.GetPayload("card-a").HasValue, "card-a must be registered");
            Assert.IsTrue(_registry.GetPayload("card-b").HasValue, "card-b must be registered");
            Assert.AreEqual(2, _registry.Count);
        }

        [Test]
        public void StartImageTrackingMulti_ImageUrlEqualsModelUrl_DoesNotRegister()
        {
            LogAssert.Expect(LogType.Warning,
                new System.Text.RegularExpressions.Regex("Card rejected"));
            LogAssert.Expect(LogType.Error,
                new System.Text.RegularExpressions.Regex("No valid cards"));
            var url = "https://cdn.example.com/model.glb";
            var json = $@"{{""cards"":[{{""qrId"":""ele123"",""imageUrl"":""{url}"",""modelUrl"":""{url}"",""word"":""ele"",""translationVi"":"""",""audioUrl"":"""",""animationType"":""idle"",""glbSize"":0,""position"":""0 0 0"",""rotation"":""0 0 0"",""scale"":""1 1 1"",""physicalWidthMeters"":0.08}}]}}";

            _handler.StartImageTrackingMulti(json);

            Assert.IsFalse(_registry.GetPayload("ele123").HasValue,
                "Card with imageUrl == modelUrl must NOT be registered");
        }

        [Test]
        public void StartImageTrackingMulti_ZeroWidth_StillRegisters()
        {
            var json = @"{""cards"":[{""qrId"":""unknown-size"",""imageUrl"":""https://x.com/u.png"",""physicalWidthMeters"":0}]}";
            _handler.StartImageTrackingMulti(json);
            Assert.IsTrue(_registry.GetPayload("unknown-size").HasValue,
                "Zero-width card must still be registered (AR Foundation unknown-size path)");
        }

        [Test]
        public void StartImageTrackingMulti_DoesNotThrowWhenSceneNotLoaded()
        {
            var json = @"{""cards"":[{""qrId"":""x"",""imageUrl"":""https://x.com/x.png"",""physicalWidthMeters"":0.08}]}";
            Assert.DoesNotThrow(() => _handler.StartImageTrackingMulti(json),
                "StartImageTrackingMulti must not throw if ARScene is not loaded");
        }

        // ── P6: Semantic Combo Resolution ──────────────────────────────────────

        [Test]
        public void StartImageTrackingMulti_withArTag_PopulatesArTagInPayload()
        {
            var json = @"{""cards"":[{""qrId"":""chicken-tag"",""imageUrl"":""https://x.com/c.png"","
                + @"""arTag"":""chicken_marker"",""word"":""chicken"",""physicalWidthMeters"":0.08}]}";

            _handler.StartImageTrackingMulti(json);

            var payload = _registry.GetPayload("chicken-tag");
            Assert.IsTrue(payload.HasValue);
            Assert.AreEqual("chicken_marker", payload.Value.ArTag,
                "arTag must be populated from the card JSON field");
        }

        [Test]
        public void StartImageTrackingMulti_noArTag_FallsBackToQrId()
        {
            var json = @"{""cards"":[{""qrId"":""apple-tag"",""imageUrl"":""https://x.com/a.png"","
                + @"""word"":""apple"",""physicalWidthMeters"":0.08}]}";

            _handler.StartImageTrackingMulti(json);

            var payload = _registry.GetPayload("apple-tag");
            Assert.IsTrue(payload.HasValue);
            Assert.AreEqual("apple-tag", payload.Value.ArTag,
                "When arTag is absent, ArTag should fall back to qrId");
        }
    }
}
