using System.Collections.Generic;
using NUnit.Framework;
using Unity.XR.CoreUtils.Collections;
using UnityEngine;
using UnityEngine.XR.ARFoundation;
using UnityEngine.XR.ARSubsystems;

namespace EduPlatform.EditModeTests
{
    /// <summary>
    /// Regression tests for bug #9: HandleTrackedImagesChanged's args.updated loop
    /// was emitting onImageTrackingLost on every frame after initial detection.
    /// Post-fix, it emits onImagePoseUpdated via RNEventEmitter and the C#
    /// OnImageTrackingLost event is only invoked from the args.removed path.
    /// </summary>
    public class ARSessionManagerRegressionTests
    {
        private GameObject _hostGo;
        private ARSessionManager _sessionManager;
        private int _trackingLostCount;
        private string _lastTrackingLostImageId;

        [SetUp]
        public void SetUp()
        {
            _hostGo = new GameObject("ARSessionManagerTestHost");
            _sessionManager = _hostGo.AddComponent<ARSessionManager>();
            _trackingLostCount = 0;
            _lastTrackingLostImageId = null;
            _sessionManager.OnImageTrackingLost += OnTrackingLost;
        }

        [TearDown]
        public void TearDown()
        {
            if (_sessionManager != null) {
                _sessionManager.OnImageTrackingLost -= OnTrackingLost;
            }
            if (_hostGo != null) {
                Object.DestroyImmediate(_hostGo);
            }
        }

        private void OnTrackingLost(string imageId)
        {
            _trackingLostCount++;
            _lastTrackingLostImageId = imageId;
        }

        /// <summary>
        /// Builds a real ARTrackedImage MonoBehaviour attached to the host, gives
        /// it a referenceImage with a known name, and returns it.
        /// </summary>
        private ARTrackedImage BuildTrackedImage(string imageName, out GameObject imgGo)
        {
            imgGo = new GameObject(imageName);
            imgGo.transform.SetParent(_hostGo.transform);
            var tracked = imgGo.AddComponent<ARTrackedImage>();
            // referenceImage has an internal setter; we go through reflection so
            // the test asmdef stays in its own assembly.
            var prop = typeof(ARTrackedImage).GetProperty(
                "referenceImage",
                System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Instance);
            // XRReferenceImage(SerializableGuid, SerializableGuid, Vector2?, string, Texture2D)
            // — only the name is consulted by HandleTrackedImagesChanged.
            var referenceImage = new XRReferenceImage(
                guid: default,
                textureGuid: default,
                size: new Vector2(0.1f, 0.1f),
                name: imageName,
                texture: null);
            prop.SetValue(tracked, referenceImage);
            return tracked;
        }

        /// <summary>
        /// Regression test: HandleTrackedImagesChanged(args.updated=[X]) must NOT
        /// invoke OnImageTrackingLost. Pre-fix code did so on every update tick.
        /// </summary>
        [Test]
        public void UpdateDoesNotEmitTrackingLost()
        {
            var tracked = BuildTrackedImage("card_a", out _);

            // Add it to _activeImages by emitting an "added" event first.
            var addedArgs = new ARTrackablesChangedEventArgs<ARTrackedImage>(
                added: new ReadOnlyList<ARTrackedImage>(new List<ARTrackedImage> { tracked }),
                updated: new ReadOnlyList<ARTrackedImage>(new List<ARTrackedImage>()),
                removed: new ReadOnlyList<KeyValuePair<TrackableId, ARTrackedImage>>(
                    new List<KeyValuePair<TrackableId, ARTrackedImage>>()));
            _sessionManager.HandleTrackedImagesChanged(addedArgs);
            Assert.AreEqual(0, _trackingLostCount,
                "OnImageTrackingLost must not fire on the 'added' path.");

            // Now fire an "updated" event — this is the path that was broken.
            var updatedArgs = new ARTrackablesChangedEventArgs<ARTrackedImage>(
                added: new ReadOnlyList<ARTrackedImage>(new List<ARTrackedImage>()),
                updated: new ReadOnlyList<ARTrackedImage>(new List<ARTrackedImage> { tracked }),
                removed: new ReadOnlyList<KeyValuePair<TrackableId, ARTrackedImage>>(
                    new List<KeyValuePair<TrackableId, ARTrackedImage>>()));
            _sessionManager.HandleTrackedImagesChanged(updatedArgs);

            Assert.AreEqual(0, _trackingLostCount,
                "REGRESSION: OnImageTrackingLost fired on the 'updated' path. " +
                "Pre-fix bug #9: args.updated emitted tracking-lost every frame.");
            Assert.IsNull(_lastTrackingLostImageId);
        }

        /// <summary>
        /// Sanity test: args.removed DOES correctly emit OnImageTrackingLost,
        /// so the regression test above is meaningful (we're not just asserting
        /// the event is broken in general).
        /// </summary>
        [Test]
        public void RemovedDoesEmitTrackingLost()
        {
            var tracked = BuildTrackedImage("card_b", out _);

            // Add then remove.
            var addedArgs = new ARTrackablesChangedEventArgs<ARTrackedImage>(
                added: new ReadOnlyList<ARTrackedImage>(new List<ARTrackedImage> { tracked }),
                updated: new ReadOnlyList<ARTrackedImage>(new List<ARTrackedImage>()),
                removed: new ReadOnlyList<KeyValuePair<TrackableId, ARTrackedImage>>(
                    new List<KeyValuePair<TrackableId, ARTrackedImage>>()));
            _sessionManager.HandleTrackedImagesChanged(addedArgs);
            Assert.AreEqual(0, _trackingLostCount);

            var removedArgs = new ARTrackablesChangedEventArgs<ARTrackedImage>(
                added: new ReadOnlyList<ARTrackedImage>(new List<ARTrackedImage>()),
                updated: new ReadOnlyList<ARTrackedImage>(new List<ARTrackedImage>()),
                removed: new ReadOnlyList<KeyValuePair<TrackableId, ARTrackedImage>>(
                    new List<KeyValuePair<TrackableId, ARTrackedImage>> {
                        new KeyValuePair<TrackableId, ARTrackedImage>(default, tracked)
                    }));
            _sessionManager.HandleTrackedImagesChanged(removedArgs);

            Assert.AreEqual(1, _trackingLostCount);
            Assert.AreEqual("card_b", _lastTrackingLostImageId);
        }

        /// <summary>
        /// Multiple update ticks on the same tracked image must never accumulate
        /// tracking-lost events. Pre-fix this would fire N times for N ticks.
        /// </summary>
        [Test]
        public void RepeatedUpdatesDoNotAccumulateTrackingLost()
        {
            var tracked = BuildTrackedImage("card_c", out _);

            var addedArgs = new ARTrackablesChangedEventArgs<ARTrackedImage>(
                added: new ReadOnlyList<ARTrackedImage>(new List<ARTrackedImage> { tracked }),
                updated: new ReadOnlyList<ARTrackedImage>(new List<ARTrackedImage>()),
                removed: new ReadOnlyList<KeyValuePair<TrackableId, ARTrackedImage>>(
                    new List<KeyValuePair<TrackableId, ARTrackedImage>>()));
            _sessionManager.HandleTrackedImagesChanged(addedArgs);

            for (int i = 0; i < 30; i++) {
                var updatedArgs = new ARTrackablesChangedEventArgs<ARTrackedImage>(
                    added: new ReadOnlyList<ARTrackedImage>(new List<ARTrackedImage>()),
                    updated: new ReadOnlyList<ARTrackedImage>(new List<ARTrackedImage> { tracked }),
                    removed: new ReadOnlyList<KeyValuePair<TrackableId, ARTrackedImage>>(
                        new List<KeyValuePair<TrackableId, ARTrackedImage>>()));
                _sessionManager.HandleTrackedImagesChanged(updatedArgs);
            }

            Assert.AreEqual(0, _trackingLostCount,
                $"REGRESSION: 30 update ticks emitted {_trackingLostCount} tracking-lost events. " +
                "Pre-fix bug #9 fired once per tick.");
        }
    }
}
