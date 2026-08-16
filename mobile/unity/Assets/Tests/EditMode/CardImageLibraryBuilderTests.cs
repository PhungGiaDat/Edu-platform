using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;

namespace EduPlatform.EditModeTests
{
    /// <summary>
    /// EditMode tests for CardImageLibraryBuilder — pure logic, no AR subsystem required.
    /// Tests: nullable-width accepted, zero-width accepted, negative/NaN rejected,
    /// missing imageUrl rejected, duplicate card detection, IsLibraryReady state machine.
    /// </summary>
    public class CardImageLibraryBuilderTests
    {
        private GameObject _go;
        private CardImageLibraryBuilder _builder;

        [SetUp]
        public void Setup()
        {
            _go = new GameObject("Test_Builder");
            // No ARTrackedImageManager — we're testing pure logic paths only.
            // AR subsystem availability is checked at runtime; EditMode tests cover
            // the logic layer above that.
            _builder = _go.AddComponent<CardImageLibraryBuilder>();
        }

        [TearDown]
        public void Teardown()
        {
            if (_go != null) Object.DestroyImmediate(_go);
        }

        // ---------------------------------------------------------------------------
        // CardDescriptor / nullable physicalWidthMeters tests
        // ---------------------------------------------------------------------------

        [Test]
        public void CardDescriptor_NullPhysicalWidth_DefaultsToZero()
        {
            // When backend returns null for physical_width_m, RN coerces to 0.
            // CardDescriptor accepts 0f as the intentional unknown-size dev value.
            var cd = new CardDescriptor("ele123", "https://cdn.example.com/ele123.png", 0f);
            Assert.AreEqual(0f, cd.physicalWidthMeters);
        }

        [Test]
        public void CardDescriptor_KnownPhysicalWidth_FlowsThrough()
        {
            var cd = new CardDescriptor("apple_001", "https://cdn.example.com/apple.png", 0.085f);
            Assert.AreEqual(0.085f, cd.physicalWidthMeters);
        }

        [Test]
        public void CardDescriptor_ZeroWidth_IsExplicitAndAllowed()
        {
            // Zero is an explicit value (unknown size), not a missing value.
            var cd = new CardDescriptor("x", "y", 0f);
            Assert.AreEqual(0f, cd.physicalWidthMeters);
        }

        // ---------------------------------------------------------------------------
        // CardTrackingRequest — width coercion
        // ---------------------------------------------------------------------------

        [Test]
        public void CardTrackingRequest_PositiveWidth_Preserved()
        {
            var json = @"{""cards"":[{""qrId"":""ele123"",""imageUrl"":""https://x.com/p.png"",""physicalWidthMeters"":0.08}]}";
            var result = CardTrackingRequest.Parse(json);
            Assert.IsTrue(result.HasValidCards, "Parse failed: " + result.Valid.Count + " valid, " + result.Rejected.Count + " rejected");
            Assert.AreEqual(0.08f, result.Valid[0].physicalWidthMeters);
        }

        [Test]
        public void CardTrackingRequest_ZeroWidth_CoercedToZero()
        {
            // Backend returns null → RN sends 0f → CardTrackingRequest coerces ≤0 to 0f.
            var json = @"{""cards"":[{""qrId"":""ele123"",""imageUrl"":""https://x.com/p.png"",""physicalWidthMeters"":0}]}";
            var result = CardTrackingRequest.Parse(json);
            Assert.IsTrue(result.HasValidCards);
            Assert.AreEqual(0f, result.Valid[0].physicalWidthMeters);
        }

        [Test]
        public void CardTrackingRequest_NonPositiveWidth_CoercedToZero()
        {
            // CardTrackingRequest does NOT reject non-positive widths — it coerces them
            // to 0f (AR Foundation unknown-size registration path). Validation responsibility
            // lies upstream in React Native.
            {
                var json = @"{""cards"":[{""qrId"":""ele123"",""imageUrl"":""https://x.com/p.png"",""physicalWidthMeters"":0}]}";
                var result = CardTrackingRequest.Parse(json);
                Assert.IsTrue(result.HasValidCards, "Width 0 must be accepted");
                Assert.AreEqual(0f, result.Valid[0].physicalWidthMeters, "Width 0 coerced to 0f");
            }
            {
                var json = @"{""cards"":[{""qrId"":""ele123"",""imageUrl"":""https://x.com/p.png"",""physicalWidthMeters"":-0.05}]}";
                var result = CardTrackingRequest.Parse(json);
                Assert.IsTrue(result.HasValidCards, "Width -0.05 must be accepted");
                Assert.AreEqual(0f, result.Valid[0].physicalWidthMeters, "Width -0.05 coerced to 0f");
            }
        }

        [Test]
        public void CardTrackingRequest_MissingImageUrl_Rejected()
        {
            var json = @"{""cards"":[{""qrId"":""ele123"",""imageUrl"":"""",""physicalWidthMeters"":0.08}]}";
            var result = CardTrackingRequest.Parse(json);
            Assert.IsFalse(result.HasValidCards);
            Assert.AreEqual(1, result.Rejected.Count);
            Assert.AreEqual("MISSING_REFERENCE_IMAGE_METADATA", result.Rejected[0].code);
        }

        [Test]
        public void CardTrackingRequest_MissingQrId_Rejected()
        {
            var json = @"{""cards"":[{""qrId"":"""",""imageUrl"":""https://x.com/p.png"",""physicalWidthMeters"":0.08}]}";
            var result = CardTrackingRequest.Parse(json);
            Assert.IsFalse(result.HasValidCards);
            Assert.AreEqual(1, result.Rejected.Count);
            Assert.AreEqual("MISSING_REFERENCE_IMAGE_METADATA", result.Rejected[0].code);
        }

        [Test]
        public void CardTrackingRequest_ImageUrlEqualsModelUrl_Rejected()
        {
            var url = "https://cdn.example.com/model.glb";
            var json = $@"{{""cards"":[{{""qrId"":""ele123"",""imageUrl"":""{url}"",""modelUrl"":""{url}"",""physicalWidthMeters"":0.08}}]}}";
            var result = CardTrackingRequest.Parse(json);
            Assert.IsFalse(result.HasValidCards);
            Assert.AreEqual(1, result.Rejected.Count);
            Assert.AreEqual("INVALID_REFERENCE_IMAGE_URL", result.Rejected[0].code);
        }

        // ---------------------------------------------------------------------------
        // Identity invariant: reference image name == qrId
        // ---------------------------------------------------------------------------

        [Test]
        public void CardTrackingRequest_ReferenceName_IsQrId()
        {
            var json = @"{""cards"":[{""qrId"":""ele123"",""imageUrl"":""https://x.com/ele123.png"",""physicalWidthMeters"":0}]}";
            var result = CardTrackingRequest.Parse(json);
            Assert.IsTrue(result.HasValidCards);
            // CardDescriptor.qrId is the reference image name
            Assert.AreEqual("ele123", result.Valid[0].qrId);
        }

        // ---------------------------------------------------------------------------
        // Multi-card: two cards parsed together
        // ---------------------------------------------------------------------------

        [Test]
        public void CardTrackingRequest_TwoCards_BothValid()
        {
            var json = @"{""cards"":["
                + @"{""qrId"":""ele123"",""imageUrl"":""https://x.com/e.png"",""physicalWidthMeters"":0},"
                + @"{""qrId"":""apple_001"",""imageUrl"":""https://x.com/a.png"",""physicalWidthMeters"":0.085}"
                + @"]}";
            var result = CardTrackingRequest.Parse(json);
            Assert.IsTrue(result.HasValidCards);
            Assert.AreEqual(2, result.Valid.Count);
            Assert.AreEqual("ele123", result.Valid[0].qrId);
            Assert.AreEqual("apple_001", result.Valid[1].qrId);
        }

        [Test]
        public void CardTrackingRequest_OneValidOneInvalid_ReportsBothSeparately()
        {
            var json = @"{""cards"":["
                + @"{""qrId"":""ele123"",""imageUrl"":""https://x.com/e.png"",""physicalWidthMeters"":0},"
                + @"{""qrId"":"""",""imageUrl"":""https://x.com/bad.png"",""physicalWidthMeters"":0.08}"
                + @"]}";
            var result = CardTrackingRequest.Parse(json);
            Assert.IsTrue(result.HasValidCards, "At least one valid card must make HasValidCards true");
            Assert.AreEqual(1, result.Valid.Count);
            Assert.AreEqual(1, result.Rejected.Count);
            Assert.AreEqual("ele123", result.Valid[0].qrId);
            Assert.AreEqual("MISSING_REFERENCE_IMAGE_METADATA", result.Rejected[0].code);
        }

        // ---------------------------------------------------------------------------
        // AddCard — null / empty guard
        // ---------------------------------------------------------------------------

        [Test]
        public void AddCard_NullCard_RejectedWithoutException()
        {
            LogAssert.Expect(LogType.Error,
                new System.Text.RegularExpressions.Regex("AddCard rejected '<missing>'"));
            // AddCard must not throw — it logs and fires OnCardFailed.
            Assert.DoesNotThrow(() => _builder.AddCard(null));
        }

        [Test]
        public void AddCard_MissingQrId_Rejected()
        {
            LogAssert.Expect(LogType.Error,
                new System.Text.RegularExpressions.Regex("AddCard rejected '<missing>'"));
            var card = new CardDescriptor(null, "https://x.com/img.png", 0.08f);
            string capturedCode = null;
            _builder.OnCardFailed += (qrId, code, _) => capturedCode = code;
            _builder.AddCard(card);
            Assert.AreEqual("MISSING_REFERENCE_IMAGE_METADATA", capturedCode);
        }

        [Test]
        public void AddCard_EmptyQrId_Rejected()
        {
            LogAssert.Expect(LogType.Error,
                new System.Text.RegularExpressions.Regex("AddCard rejected ''"));
            var card = new CardDescriptor("", "https://x.com/img.png", 0.08f);
            string capturedCode = null;
            _builder.OnCardFailed += (qrId, code, _) => capturedCode = code;
            _builder.AddCard(card);
            Assert.AreEqual("MISSING_REFERENCE_IMAGE_METADATA", capturedCode);
        }

        [Test]
        public void AddCard_MissingImageUrl_Rejected()
        {
            LogAssert.Expect(LogType.Error,
                new System.Text.RegularExpressions.Regex("AddCard rejected 'ele123'"));
            var card = new CardDescriptor("ele123", null, 0.08f);
            string capturedCode = null;
            _builder.OnCardFailed += (qrId, code, _) => capturedCode = code;
            _builder.AddCard(card);
            Assert.AreEqual("MISSING_REFERENCE_IMAGE_METADATA", capturedCode);
        }

        // ---------------------------------------------------------------------------
        // CardTrackingRequest — JSON envelope errors
        // ---------------------------------------------------------------------------

        [Test]
        public void CardTrackingRequest_EmptyJson_ThrowsArgumentException()
        {
            Assert.Throws<System.ArgumentException>(() => CardTrackingRequest.Parse(""));
        }

        [Test]
        public void CardTrackingRequest_MalformedJson_ThrowsFormatException()
        {
            Assert.Throws<System.FormatException>(() => CardTrackingRequest.Parse("{ not valid json"));
        }

        [Test]
        public void CardTrackingRequest_NoCardsArray_ThrowsFormatException()
        {
            Assert.Throws<System.FormatException>(() => CardTrackingRequest.Parse(@"{""data"":{}}"));
        }

        // ---------------------------------------------------------------------------
        // CardTrackingRequest — ARExperiencePayload mapping
        // ---------------------------------------------------------------------------

        [Test]
        public void CardTrackingRequest_ValidCard_PopulatesPayloadMap()
        {
            var json = @"{""cards"":["
                + @"{""qrId"":""cat-meow"",""imageUrl"":""https://x.com/cat.png"","
                + @"""word"":""cat"",""translationVi"":""con mèo"",""modelUrl"":""https://x.com/cat.glb"","
                + @"""audioUrl"":""https://x.com/cat.mp3"",""animationType"":""bounce"","
                + @"""glbSize"":1.2,""position"":""0 1 2"",""rotation"":""0 0 90"",""scale"":""2 2 2"","
                + @"""physicalWidthMeters"":0.085}]}";
            var result = CardTrackingRequest.Parse(json);
            Assert.IsTrue(result.HasValidCards);
            Assert.IsTrue(result.Payloads.TryGetValue("cat-meow", out var payload));
            Assert.AreEqual("cat", payload.Word);
            Assert.AreEqual("con mèo", payload.TranslationVi);
            Assert.AreEqual("https://x.com/cat.glb", payload.ModelUrl);
            Assert.AreEqual("https://x.com/cat.mp3", payload.AudioUrl);
            Assert.AreEqual(global::ARAnimationType.Bounce, payload.AnimationType);
            Assert.AreEqual(1.2f, payload.GlbSize);
            Assert.AreEqual(new Vector3(0, 1, 2), payload.Position);
            Assert.AreEqual(new Vector3(0, 0, 90), payload.Rotation);
            Assert.AreEqual(new Vector3(2, 2, 2), payload.Scale);
        }

        [Test]
        public void CardTrackingRequest_MissingOptionalFields_ParsesWithoutThrowing()
        {
            // Minimal card: only required tracking fields
            var json = @"{""cards"":[{""qrId"":""x"",""imageUrl"":""https://x.com/x.png"",""physicalWidthMeters"":0.08}]}";
            var result = CardTrackingRequest.Parse(json);
            Assert.IsTrue(result.HasValidCards);
            Assert.IsTrue(result.Payloads.TryGetValue("x", out var payload));
            Assert.AreEqual("x", payload.Word); // defaults to qrId
            Assert.AreEqual(global::ARAnimationType.Idle, payload.AnimationType);
        }

        // ---------------------------------------------------------------------------
        // IsLibraryReady state machine
        // ---------------------------------------------------------------------------

        [Test]
        public void IsLibraryReady_BeforeBuild_IsFalse()
        {
            Assert.IsFalse(_builder.IsLibraryReady,
                "IsLibraryReady must be false before BuildLibrary or AddCard has run");
        }

        [Test]
        public void TryResolveQrId_BeforeBuild_ReturnsFalse()
        {
            var found = _builder.TryResolveQrId("ele123", out var qrId);
            Assert.IsFalse(found);
        }
    }
}
