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
        public void DefaultConstructor_SetsReasonableDefaults()
        {
            var cd = new CardDescriptor();

            Assert.IsNull(cd.qrId);
            Assert.IsNull(cd.imageUrl);
            Assert.AreEqual(0.08f, cd.physicalWidthMeters, 0.0001f,
                "Default physicalWidthMeters should match the printed card default (8cm).");
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
        public void PhysicalWidthMeter_AcceptsZeroForStubData()
        {
            var cd = new CardDescriptor("x", "y", 0f);
            Assert.AreEqual(0f, cd.physicalWidthMeters);
        }
    }
}
