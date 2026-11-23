using NUnit.Framework;

namespace EduPlatform.EditModeTests
{
    /// <summary>
    /// EditMode tests for CardDescriptor — the contract used between
    /// RN payloads and the runtime image library.
    /// </summary>
    public class CardDescriptorTests
    {
        [Test]
        public void DefaultConstructor_DoesNotInventPhysicalWidth()
        {
            var cd = new CardDescriptor();

            Assert.IsNull(cd.qrId);
            Assert.IsNull(cd.imageUrl);
            Assert.AreEqual(0f, cd.physicalWidthMeters, 0.0001f,
                "Physical width must come from validated backend metadata; no production fallback is allowed.");
        }

        [Test]
        public void ParameterizedConstructor_PopulatesAllFields()
        {
            var cd = new CardDescriptor(
                qrId: "flashcard_chicken",
                imageUrl: "https://cdn.example.com/cards/chicken.png",
                physicalWidthMeters: 0.10f);

            Assert.AreEqual("flashcard_chicken", cd.qrId);
            Assert.AreEqual("https://cdn.example.com/cards/chicken.png", cd.imageUrl);
            Assert.AreEqual(0.10f, cd.physicalWidthMeters, 0.0001f);
        }

        [Test]
        public void ParameterizedConstructor_WithoutWidth_DoesNotInventFallback()
        {
            // Constructor now requires all 3 parameters (no default).
            // This test verifies that passing 0 explicitly is allowed.
            var cd = new CardDescriptor(
                qrId: "flashcard_chicken",
                imageUrl: "https://cdn.example.com/cards/chicken.png",
                physicalWidthMeters: 0f);

            Assert.AreEqual(0f, cd.physicalWidthMeters, 0.0001f,
                "Explicit 0 width should be allowed (validation will reject it).");
        }

        [Test]
        public void PhysicalWidthMeter_AcceptsZeroForValidationToReject()
        {
            var cd = new CardDescriptor("x", "y", 0f);
            Assert.AreEqual(0f, cd.physicalWidthMeters);
        }
    }
}
