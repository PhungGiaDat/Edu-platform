## Session
2026-08-18 (continued), agent: claude-code, branch: 10-days-quick-run

## Goal
Implement iOS UnityBridge native module + UnityView native component + fix placeholder for Android.

## Architecture

```
iOS:
┌────────────────────────────────────────────────────────────────┐
│ React Native (TypeScript)                                      │
│  UnityBridgeModule.ts — RCTEventEmitter                        │
│    launchUnity() / sendToUnity() / subscribe()                 │
│  UnityView.tsx                                                 │
│    iOS → NativeUnityView (requireNativeComponent)              │
│    Android → View + AR-active indicator                        │
│    Dev → ClayCard placeholder                                  │
└────────────────────────────────────────────────────────────────┘
                          │
┌────────────────────────────────────────────────────────────────┐
│ iOS Native (Swift/ObjC)                                       │
│  LocalPods/UnityBridge/                                        │
│    UnityBridgeModule.swift   — RCTEventEmitter                 │
│    UnityBridgeModule.m       — RCT_EXTERN_MODULE bridge        │
│    UnityMessageManager.swift — UnityFramework singleton        │
│    UnityViewManager.swift    — RCTViewManager                  │
│    UnityViewManager.m        — RCT_EXTERN_VIEW_MANAGER         │
└────────────────────────────────────────────────────────────────┘
                          │
┌────────────────────────────────────────────────────────────────┐
│ Unity iOS Runtime (compiled into app)                          │
│  UnityFramework (.framework) — compiled Unity player            │
│  UnityMessageManager.shared → UnityFramework.getUnityView()    │
│  UnitySendMessage() to RNMessageReceiver                       │
└────────────────────────────────────────────────────────────────┘

Android:
┌────────────────────────────────────────────────────────────────┐
│ React Native (TypeScript)                                      │
│  UnityBridgeModule.ts — RN bridge                              │
│  UnityView.tsx         — shows black screen + AR-active badge │
└────────────────────────────────────────────────────────────────┘
                          │
┌────────────────────────────────────────────────────────────────┐
│ Android Native (Kotlin)                                       │
│  UnityBridgeModule.kt  — ReactContextBaseJavaModule            │
│  UnityBridgePackage.kt — ReactPackage                          │
│  MainApplication.kt    — add(UnityBridgePackage())            │
└────────────────────────────────────────────────────────────────┘
                          │
┌────────────────────────────────────────────────────────────────┐
│ Unity Android Runtime (same package)                           │
│  RNUnityPlayerActivity extends UnityPlayerGameActivity          │
│  RNUnityBridge.sendMessageToUnity() via UnityPlayer.UnitySend  │
└────────────────────────────────────────────────────────────────┘
```

## iOS Files created

### LocalPods/UnityBridge/

```
UnityBridge.podspec         — CocoaPod spec for local integration
UnityBridgeModule.swift     — RCTEventEmitter, launchUnity/sendToUnity/subscribe
UnityBridgeModule.m         — RCT_EXTERN_MODULE bridge
UnityMessageManager.swift   — UnityFramework singleton, loadUnity/launchUnity/closeUnity
UnityViewManager.swift      — RCTViewManager, UnityViewNative (UIView hosting Unity)
UnityViewManager.m          — RCT_EXTERN_VIEW_MANAGER bridge
```

### Unity/Assets/Plugins/iOS/

```
RNMessageRouter.cs  — MonoBehaviour: receives Unity → RN messages, dispatches to RNEventEmitter
RNEventEmitter.cs   — Updated: SendViaIOSBridge() using RNEventEmitterIOS DllImport
```

## UnityView.tsx — new platform logic

```tsx
// iOS: renders actual Unity view as native subview
if (isIOS && NativeUnityView) {
  return <NativeUnityView style={style} onUnityReady={...} onUnityError={...} />
}

// Android: fills black screen, AR camera visible through RNUnityPlayerActivity
if (isAndroid) {
  return <View style={[root, androidRoot]}><AndroidARActiveIndicator /></View>
}

// Dev fallback: claymorphic placeholder
return <UnityPlaceholder />
```

## RNMessageRouter.cs — new iOS bridge receiver

```csharp
// Called by UnityFramework.SendMessage() on the RNMessageRouter GameObject
public void OnMessageFromUnity(string json) {
    RNEventEmitter.Instance.SendJsonEvent(json);
}
```

## RNEventEmitter.cs — iOS routing

```csharp
// New SendViaIOSBridge() using DllImport to __Internal
internal static class RNEventEmitterIOS {
    [DllImport("__Internal")]
    private static extern void UnitySendMessageToRN(string eventName, string jsonPayload);
    public static void SendEvent(string eventName, string jsonPayload) {
        UnitySendMessageToRN(eventName, jsonPayload);
    }
}
```

## UnityMessageManager.swift — key methods

```swift
func launchUnity() {
    unityView = fw.getUnityView() ?? fw.appController().rootView
    rootVC.view.addSubview(unityView!)
    fw.runApplication()
    unityFramework?.setLaunchScreen(...)
}

func sendToUnity(methodName: String, payload: String) {
    // RN → Unity: "RNMessageReceiver.OnMessageFromRN(\"methodName|payload\")"
    unityFramework?.SendMessage("RNMessageReceiver", method: "OnMessageFromRN", string: message)
}
```

## To integrate in a real iOS project

1. Add `UnityBridge` local pod to `ios/Podfile`:
```ruby
pod 'UnityBridge', :path => './LocalPods/UnityBridge'
```

2. Add UnityFramework.framework to Xcode project linking

3. Build Unity iOS player and copy `UnityFramework.framework` to `ios/UnityFramework/`

4. Add RNMessageRouter GameObject to ARScene in Unity Editor

5. Run `pod install` in `ios/` directory

## Verification
- TypeScript: `npx tsc --noEmit` ✅ 0 errors
- Android: existing Kotlin bridge unchanged ✅
- iOS: Swift files created ✅
- Unity: C# plugins created ✅

## Notes
- iOS requires macOS + Xcode to build Unity player
- `UnityFramework.loadUnityFw()` needs the compiled `.framework` from Unity build
- iOS development on Windows is not possible — Unity iOS requires macOS
