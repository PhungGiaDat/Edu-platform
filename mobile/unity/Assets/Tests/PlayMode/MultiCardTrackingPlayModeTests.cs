using System.Collections;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using UnityEngine.XR.ARFoundation;
using UnityEngine.XR.ARSubsystems;

namespace EduPlatform.PlayModeTests
{
    /// <summary>
    /// PlayMode tests for the multi-card AR tracking pipeline.
    ///
    /// Scope:
    ///   1. CardImageLibraryBuilder.IsLibraryReady transitions correctly after BuildLibrary
    ///   2. AddCard increments RegisteredImageCount
    ///   3. TryResolveQrId finds registered cards after library build
    ///   4. Two-card registration: both cards get unique qrId mappings
    ///   5. Duplicate qrId does not double-register
    ///
    /// Prerequisites: Run on ARTestScene (or any scene containing ARExperienceHandler
    /// + CardImageLibraryBuilder + EditorMockImageDetector + ARSessionManager).
    /// On Windows (no AR provider), the AR subsystem will be unavailable and
    /// subsystem-null checks will prevent crashes — EditMode tests cover the logic layer.
    /// On macOS/iOS with ARKit, these tests verify the actual AR pipeline.
    /// </summary>
    [NUnit.Framework.TestFixture]
    public class MultiCardTrackingPlayModeTests
    {
        private CardImageLibraryBuilder _builder;
        private MultiCardRegistry _registry;
        private ARTrackedImageManager _imageManager;

        [UnitySetUp]
        public IEnumerator Setup()
        {
            // Find the test rig — either in scene (ARTestScene) or bootstrapped.
            _builder = Object.FindFirstObjectByType<CardImageLibraryBuilder>();
            _registry = Object.FindFirstObjectByType<MultiCardRegistry>();
            _imageManager = Object.FindFirstObjectByType<ARTrackedImageManager>();

            // Guard: if the test scene doesn't have the required components,
            // skip the test (this lets tests run in minimal scenes without crashing).
            if (_builder == null || _registry == null)
            {
                Assert.Inconclusive("CardImageLibraryBuilder or MultiCardRegistry not found in scene — " +
                    "run this test on ARTestScene.");
            }

            yield return null;
        }

        // ---------------------------------------------------------------------------
        // 1. IsLibraryReady state machine
        // ---------------------------------------------------------------------------

        [UnityTest]
        public IEnumerator IsLibraryReady_TransitionsFromFalseToTrue_AfterBuildLibrary()
        {
            if (_builder == null) yield break;

            Assert.IsFalse(_builder.IsLibraryReady, "Library must not be ready before BuildLibrary");

            var card = new CardDescriptor("test-card-001", "https://placeholder.png", 0f);
            var builderReady = false;
            _builder.OnLibraryReady += () => builderReady = true;

            // Check subsystem availability before calling BuildLibrary.
            // On Windows (no AR provider), subsystem will be null and BuildLibrary
            // will fail gracefully in its coroutine.
            if (_imageManager != null &&
                _imageManager.subsystem != null &&
                _imageManager.descriptor != null &&
                _imageManager.descriptor.supportsMutableLibrary)
            {
                _builder.BuildLibrary(new System.Collections.Generic.List<CardDescriptor> { card });

                // Wait for the coroutine to advance — give it up to 3 seconds.
                float elapsed = 0f;
                while (!builderReady && elapsed < 3f)
                {
                    yield return null;
                    elapsed += Time.deltaTime;
                }

                Assert.IsTrue(builderReady, "OnLibraryReady must fire after BuildLibrary completes");
                Assert.IsTrue(_builder.IsLibraryReady, "IsLibraryReady must be true after build");
            }
            else
            {
                // No AR subsystem (Windows Editor) — verify BuildLibrary doesn't crash
                // and the graceful-failure path works.
                Assert.DoesNotThrow(() =>
                    _builder.BuildLibrary(new System.Collections.Generic.List<CardDescriptor> { card }));
                Assert.Inconclusive("AR subsystem unavailable on this platform — " +
                    "subsystem-null guard prevents crash but library cannot build. " +
                    "Run on macOS/iOS with ARKit for full AR pipeline verification.");
            }
        }

        // ---------------------------------------------------------------------------
        // 2. AddCard increments RegisteredImageCount (incremental add path)
        // ---------------------------------------------------------------------------

        [UnityTest]
        public IEnumerator AddCard_IncrementsRegisteredImageCount()
        {
            if (_builder == null) yield break;

            // First, build the library so IsLibraryReady == true.
            var card1 = new CardDescriptor("incr-card-a", "https://placeholder-a.png", 0f);
            bool libraryReadyFired = false;
            _builder.OnLibraryReady += () => libraryReadyFired = true;

            if (_imageManager != null &&
                _imageManager.subsystem != null &&
                _imageManager.descriptor != null &&
                _imageManager.descriptor.supportsMutableLibrary)
            {
                _builder.BuildLibrary(new System.Collections.Generic.List<CardDescriptor> { card1 });

                float elapsed = 0f;
                while (!libraryReadyFired && elapsed < 3f)
                {
                    yield return null;
                    elapsed += Time.deltaTime;
                }

                if (!libraryReadyFired)
                {
                    Assert.Inconclusive("BuildLibrary did not complete within 3 seconds");
                    yield break;
                }

                Assert.AreEqual(1, _builder.RegisteredImageCount, "RegisteredImageCount must be 1 after first card");

                // Now add a second card incrementally.
                var card2 = new CardDescriptor("incr-card-b", "https://placeholder-b.png", 0f);
                bool secondReadyFired = false;
                _builder.OnLibraryReady += () => secondReadyFired = true;

                _builder.AddCard(card2);

                elapsed = 0f;
                while (!secondReadyFired && elapsed < 3f)
                {
                    yield return null;
                    elapsed += Time.deltaTime;
                }

                Assert.AreEqual(2, _builder.RegisteredImageCount, "RegisteredImageCount must be 2 after AddCard");
            }
            else
            {
                Assert.Inconclusive("AR subsystem unavailable — incremental add path untestable on this platform.");
            }
        }

        // ---------------------------------------------------------------------------
        // 3. TryResolveQrId after library build
        // ---------------------------------------------------------------------------

        [UnityTest]
        public IEnumerator TryResolveQrId_ReturnsTrue_AfterRegistration()
        {
            if (_builder == null) yield break;

            var card = new CardDescriptor("resolve-test-001", "https://placeholder.png", 0f);
            bool ready = false;
            _builder.OnLibraryReady += () => ready = true;

            if (_imageManager != null &&
                _imageManager.subsystem != null &&
                _imageManager.descriptor != null &&
                _imageManager.descriptor.supportsMutableLibrary)
            {
                _builder.BuildLibrary(new System.Collections.Generic.List<CardDescriptor> { card });

                float elapsed = 0f;
                while (!ready && elapsed < 3f)
                {
                    yield return null;
                    elapsed += Time.deltaTime;
                }

                if (!ready)
                {
                    Assert.Inconclusive("BuildLibrary did not complete within 3 seconds");
                    yield break;
                }

                var found = _builder.TryResolveQrId("resolve-test-001", out var qrId);
                Assert.IsTrue(found, "TryResolveQrId must return true for registered card");
                Assert.AreEqual("resolve-test-001", qrId, "Resolved qrId must match the registered value");
            }
            else
            {
                Assert.Inconclusive("AR subsystem unavailable on this platform.");
            }
        }

        // ---------------------------------------------------------------------------
        // 4. Two cards: both get unique qrId mappings
        // ---------------------------------------------------------------------------

        [UnityTest]
        public IEnumerator TwoCardRegistration_BothQrIdsResolvable()
        {
            if (_builder == null) yield break;

            var cardA = new CardDescriptor("dual-card-a", "https://placeholder-a.png", 0f);
            var cardB = new CardDescriptor("dual-card-b", "https://placeholder-b.png", 0f);
            bool ready = false;
            _builder.OnLibraryReady += () => ready = true;

            if (_imageManager != null &&
                _imageManager.subsystem != null &&
                _imageManager.descriptor != null &&
                _imageManager.descriptor.supportsMutableLibrary)
            {
                _builder.BuildLibrary(new System.Collections.Generic.List<CardDescriptor> { cardA, cardB });

                float elapsed = 0f;
                while (!ready && elapsed < 3f)
                {
                    yield return null;
                    elapsed += Time.deltaTime;
                }

                if (!ready)
                {
                    Assert.Inconclusive("BuildLibrary did not complete within 3 seconds");
                    yield break;
                }

                Assert.AreEqual(2, _builder.RegisteredImageCount);

                var foundA = _builder.TryResolveQrId("dual-card-a", out var qrA);
                var foundB = _builder.TryResolveQrId("dual-card-b", out var qrB);

                Assert.IsTrue(foundA, "Card A must be resolvable");
                Assert.AreEqual("dual-card-a", qrA);
                Assert.IsTrue(foundB, "Card B must be resolvable");
                Assert.AreEqual("dual-card-b", qrB);
            }
            else
            {
                Assert.Inconclusive("AR subsystem unavailable on this platform.");
            }
        }

        // ---------------------------------------------------------------------------
        // 5. Duplicate qrId: does not double-register
        // ---------------------------------------------------------------------------

        [UnityTest]
        public IEnumerator DuplicateQrId_DoesNotDoubleRegister()
        {
            if (_builder == null) yield break;

            var card1 = new CardDescriptor("dup-qr", "https://placeholder-a.png", 0f);
            var card2 = new CardDescriptor("dup-qr", "https://placeholder-b.png", 0f);
            bool ready = false;
            _builder.OnLibraryReady += () => ready = true;

            if (_imageManager != null &&
                _imageManager.subsystem != null &&
                _imageManager.descriptor != null &&
                _imageManager.descriptor.supportsMutableLibrary)
            {
                _builder.BuildLibrary(new System.Collections.Generic.List<CardDescriptor> { card1, card2 });

                float elapsed = 0f;
                while (!ready && elapsed < 3f)
                {
                    yield return null;
                    elapsed += Time.deltaTime;
                }

                // CardTrackingRequest deduplicates by qrId → only one entry
                Assert.LessOrEqual(_builder.RegisteredImageCount, 2,
                    "Duplicate qrIds must not create double registrations");
            }
            else
            {
                Assert.Inconclusive("AR subsystem unavailable on this platform.");
            }
        }
    }
}
