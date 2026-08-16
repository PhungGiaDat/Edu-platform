# XR Simulation — Editor Testing

> Use this when you need to test image-tracking features in the Unity
> Editor without a real AR device.

## Why XR Simulation

Two reasons:

1. **No device on every developer's desk.** Image tracking requires
   ARKit (iOS) or ARCore (Android) to actually recognise an image. Most
   CI environments have neither.
2. **Test seam discipline.** Real AR sessions produce non-deterministic
   events (lighting, occlusion, jitter). Tests need deterministic input.

XR Simulation answers both: a mock subsystem that runs in the Editor
and accepts scripted image-tracking events.

## Setup

### Install dependencies

Required packages (already shipped with AR Foundation):

- `com.unity.xr.arfoundation`
- `com.unity.xr.core-utils`
- `com.unity.xr.management`

The XR Simulation runtime settings asset ships with AR Foundation; no
extra install step needed.

### Enable XR Simulation in XR Plug-in Management

1. `Edit → Project Settings → XR Plug-in Management`
2. Switch to the **Editor** tab.
3. Enable **XR Simulation**.

### Open the XR Simulation view

`Window → XR → XR Simulation`

This window lets you load simulation scenes, drive the camera, and feed
mock images. Most projects leave it closed during normal development
and open it only during testing.

## Mock image detector (scripted event injection)

For unit tests and PlayMode tests that don't need the simulation view:

```csharp
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.XR.ARFoundation;

public static class MockImageDetector
{
    public static ARTrackablesChangedEventArgs<ARTrackedImage> BuildAddedEvent(
        ARTrackedImage image)
    {
        // ARTrackablesChangedEventArgs is internal; use the testable factory
        // pattern: directly invoke the public trackablesChanged event with
        // a synthetic event by calling the manager's internal Add method.
        // For most test setups, an interface boundary is cleaner — see
        // "Testable boundary" below.
        return default;  // placeholder; use the testable-boundary pattern
    }
}
```

The `ARTrackablesChangedEventArgs<ARTrackedImage>` type is internal in
AR Foundation 6.x. You cannot construct it directly from user code.
This means **you cannot fire a fake `trackablesChanged` event from a
test.**

The two real options:

### Option A: Testable boundary

Wrap the manager in an interface:

```csharp
public interface IImageTracker
{
    event Action<ARTrackedImage> Added;
    event Action<ARTrackedImage> Updated;
    event Action<ARTrackedImage> Removed;
    XRReferenceImageLibrary Library { get; set; }
    bool Enabled { get; set; }
}

public class ARFoundationImageTracker : IImageTracker
{
    private readonly ARTrackedImageManager _manager;
    private UnityAction<ARTrackablesChangedEventArgs<ARTrackedImage>> _handler;

    public ARFoundationImageTracker(ARTrackedImageManager manager)
    {
        _manager = manager;
        _handler = args =>
        {
            foreach (var img in args.added) Added?.Invoke(img);
            foreach (var img in args.updated) Updated?.Invoke(img);
            foreach (var kvp in args.removed) Removed?.Invoke(kvp.Value);
        };
    }

    public event Action<ARTrackedImage> Added;
    public event Action<ARTrackedImage> Updated;
    public event Action<ARTrackedImage> Removed;

    public XRReferenceImageLibrary Library
    {
        get => _manager.referenceLibrary;
        set => _manager.referenceLibrary = value;
    }

    public bool Enabled
    {
        get => _manager.enabled;
        set => _manager.enabled = value;
    }

    public void Attach()    => _manager.trackablesChanged.AddListener(_handler);
    public void Detach()    => _manager.trackablesChanged.RemoveListener(_handler);
}

public class MockImageTracker : IImageTracker
{
    public event Action<ARTrackedImage> Added;
    public event Action<ARTrackedImage> Updated;
    public event Action<ARTrackedImage> Removed;
    public XRReferenceImageLibrary Library { get; set; }
    public bool Enabled { get; set; }

    public void FireAdded(ARTrackedImage img)    => Added?.Invoke(img);
    public void FireUpdated(ARTrackedImage img)  => Updated?.Invoke(img);
    public void FireRemoved(ARTrackedImage img)  => Removed?.Invoke(img);
}
```

Production code consumes `IImageTracker`. Tests use `MockImageTracker`.
This boundary is the single most important testability decision in an
AR image-tracking module.

### Option B: Real XR Simulation session

If you need to exercise the full AR Foundation pipeline (including
subsystem state transitions), use the actual XR Simulation session:

```csharp
[UnityTest]
public IEnumerator Tracking_Fires_OnDetectedImage()
{
    yield return new WaitForSeconds(1.0f);  // subsystem init

    var manager = Object.FindFirstObjectByType<ARTrackedImageManager>();
    manager.enabled = true;

    var detected = new TaskCompletionSource<ARTrackedImage>();
    void OnChanged(ARTrackablesChangedEventArgs<ARTrackedImage> args)
    {
        foreach (var img in args.added)
        {
            detected.TrySetResult(img);
            return;
        }
    }
    manager.trackablesChanged.AddListener(new UnityAction<ARTrackablesChangedEventArgs<ARTrackedImage>>(OnChanged));

    // Drive XR Simulation: load a scene with a known reference image
    var sim = XRSimulationSubsystemHelpers.Subsystem();
    sim.LoadScene("TestCardScene");

    yield return new WaitUntil(() => detected.Task.IsCompleted);

    Assert.NotNull(detected.Task.Result);
    Assert.Equal("card_001", detected.Task.Result.referenceImage.name);
}
```

This requires the XR Simulation scene to contain an `XRReferenceImageLibrary`
asset with the test card images.

## PlayMode test recipe

```text
1. Place test in Assets/Tests/PlayMode/
2. Reference the .asmdef that defines the test runner
3. Use NUnit + Unity Test Framework
4. Test runs require PlayMode context — switch the Test Runner to PlayMode
5. For mock-based tests, inject MockImageTracker via the IImageTracker boundary
6. For real-pipeline tests, use XR Simulation scene
```

A complete PlayMode test:

```csharp
using NUnit.Framework;
using System.Collections;
using UnityEngine;
using UnityEngine.TestTools;
using UnityEngine.XR.ARFoundation;

public class RuntimeImageTrackerTests
{
    private GameObject _go;
    private MockImageTracker _mock;
    private RuntimeImageTracker _subject;

    [SetUp]
    public void Setup()
    {
        _go = new GameObject("Subject");
        _mock = new MockImageTracker();
        _subject = _go.AddComponent<RuntimeImageTracker>();
        // Inject mock via setter or factory
        _subject.Bind(_mock);
    }

    [TearDown]
    public void Teardown()
    {
        Object.Destroy(_go);
    }

    [UnityTest]
    public IEnumerator AddedEvent_TriggersContentSpawn()
    {
        var fakeImage = MakeFakeImage("card_001");
        _mock.FireAdded(fakeImage);
        yield return null;
        Assert.NotNull(_subject.LookupByCardId("card_001"));
    }

    [UnityTest]
    public IEnumerator RemovedEvent_DoesNotImmediatelyDestroy()
    {
        var fakeImage = MakeFakeImage("card_002");
        _mock.FireAdded(fakeImage);
        yield return null;

        _mock.FireRemoved(fakeImage);
        yield return null;

        // Still in registry (grace period)
        Assert.NotNull(_subject.LookupByCardId("card_002"));

        // Wait past the grace period
        yield return new WaitForSeconds(1.0f);
        Assert.Null(_subject.LookupByCardId("card_002"));
    }
}
```

## Common failure modes

| Symptom | Root cause | Fix |
|---|---|---|
| `imageManager.subsystem == null` in Editor | XR Simulation not enabled | Enable in XR Plug-in Management → Editor tab |
| `trackablesChanged` never fires | Mock not injected | Use the `IImageTracker` boundary pattern |
| Test hangs on subsystem wait | Subsystem takes > 5s to initialise | Increase wait timeout; check XR Simulation settings |
| `args.removed` shape mismatch | Using older AR Foundation code | AR Foundation 6.x uses `KeyValuePair<TrackableId, ARTrackedImage>` |
| Mock fires but app doesn't react | Listener not subscribed | Verify `OnEnable` runs and `imageManager.trackablesChanged.AddListener` is called |

## Editor-only safety

Production code paths that depend on real device sensors should guard:

```csharp
if (!Application.isEditor || !XRSimulationSubsystemHelpers.IsActive)
{
    // Real device path
}
else
{
    // Test path — usually the same code, but be aware of timing differences
}
```

Most code does not need this guard; XR Simulation is API-compatible
with ARKit/ARCore at the Unity level. The exceptions are:

- Any code that touches `Screen.orientation` (different on simulation)
- Any code that opens the platform camera (no camera in simulation)
- Any code that depends on `Application.platform == RuntimePlatform.IPhonePlayer`

## See also

- `references/image-tracking.md` — `ARTrackedImageManager` lifecycle
- `references/runtime-library.md` — building a library at runtime
- `references/project-patterns.md` — testable registry patterns
