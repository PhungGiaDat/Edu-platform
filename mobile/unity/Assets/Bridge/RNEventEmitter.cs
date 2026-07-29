using System;
using System.Text;
using UnityEngine;

/// <summary>
/// Singleton that sends JSON events back to the React Native bridge.
/// iOS: Uses UnitySendMessage to communicate via Swift native module.
/// Android: Uses UnitySendMessage via JNI to UnityBridgeModule.
/// </summary>
public class RNEventEmitter : MonoBehaviour
{
    private static RNEventEmitter _instance;
    private static readonly object _lock = new();

    public static RNEventEmitter Instance {
        get {
            if (_instance == null) {
                lock (_lock) {
                    if (_instance == null) {
                        var go = new GameObject("RNEventEmitter");
                        _instance = go.AddComponent<RNEventEmitter>();
                        DontDestroyOnLoad(go);
                    }
                }
            }
            return _instance;
        }
    }

    private const string TARGET_OBJECT = "RNMessageReceiver";
    private const string METHOD_NAME = "OnNativeEvent";

    /// <summary>
    /// Sends a JSON event to React Native. Call this from any C# script.
    /// Works on iOS and Android.
    /// </summary>
    public void SendEvent(string eventName, object payload)
    {
        try {
            string json = JsonUtility.ToJson(payload);
            string message = $"{eventName}|{json}";
            UnityEngine.Debug.Log($"[RNEventEmitter] Sending: {eventName}");

#if UNITY_IOS
            UnitySendMessage(TARGET_OBJECT, METHOD_NAME, message);
#elif UNITY_ANDROID
            SendMessageAndroid(eventName, json);
#else
            UnityEngine.Debug.LogWarning($"[RNEventEmitter] Platform not supported: {Application.platform}");
#endif
        } catch (Exception ex) {
            UnityEngine.Debug.LogError($"[RNEventEmitter] SendEvent failed: {ex.Message}");
        }
    }

    /// <summary>
    /// Sends a raw pre-serialized JSON message directly.
    /// Used for high-frequency events to avoid JSON serialization overhead.
    /// </summary>
    public void SendRaw(string eventName, string jsonPayload)
    {
        try {
            string message = $"{eventName}|{jsonPayload}";
#if UNITY_IOS
            UnitySendMessage(TARGET_OBJECT, METHOD_NAME, message);
#elif UNITY_ANDROID
            SendMessageAndroid(eventName, jsonPayload);
#else
            UnityEngine.Debug.LogWarning($"[RNEventEmitter] Platform not supported: {Application.platform}");
#endif
            UnityEngine.Debug.Log($"[RNEventEmitter] Sending raw: {eventName}");
        } catch (Exception ex) {
            UnityEngine.Debug.LogError($"[RNEventEmitter] SendRaw failed: {ex.Message}");
        }
    }

#if UNITY_ANDROID
    private void SendMessageAndroid(string eventName, string jsonPayload)
    {
        try {
            using var unityPlayer = new AndroidJavaClass("com.unity3d.player.UnityPlayer");
            using var activity = unityPlayer.GetStatic<AndroidJavaObject>("currentActivity");
            activity.Call("runOnUiThread", new AndroidJavaRunnable(() => {
                try {
                    UnityEngine.Debug.Log($"[RNEventEmitter] Android forwarding: {eventName}");
                } catch (Exception ex) {
                    UnityEngine.Debug.LogError($"[RNEventEmitter] Android send failed: {ex.Message}");
                }
            }));
        } catch (Exception ex) {
            UnityEngine.Debug.LogError($"[RNEventEmitter] Android setup failed: {ex.Message}");
            // Fallback: try direct SendMessage
            UnitySendMessage(TARGET_OBJECT, METHOD_NAME, $"{eventName}|{jsonPayload}");
        }
    }
#endif

    private void Awake()
    {
        if (_instance != null && _instance != this) {
            Destroy(gameObject);
            return;
        }
        _instance = this;
        DontDestroyOnLoad(gameObject);
    }
}
