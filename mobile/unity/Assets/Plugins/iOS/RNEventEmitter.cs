using UnityEngine;
#if UNITY_IOS
using System.Runtime.InteropServices;
#endif

/// <summary>
/// RNEventEmitter — sends Unity events to React Native via platform bridge.
///
/// On Android: routes through AndroidJavaProxy → UnityBridgeModule.emitFromUnity().
/// On iOS: routes through RNMessageRouter → Swift RNEventEmitter → RCTDeviceEventEmitter.
///
/// This MonoBehaviour singleton is the single source of truth for all
/// Unity → React Native communication. No other component sends events directly.
/// </summary>
public class RNEventEmitter : MonoBehaviour
{
    public static RNEventEmitter Instance { get; private set; }

    [Header("Platform Bridge")]
    [SerializeField] private bool useIOSBridge = false;

    private void Awake()
    {
        if (Instance != null && Instance != this)
        {
            Destroy(gameObject);
            return;
        }
        Instance = this;
        DontDestroyOnLoad(gameObject);
    }

    private void OnDestroy()
    {
        if (Instance == this) Instance = null;
    }

    /// <summary>
    /// Primary event send API. Serializes payload to JSON and routes to platform bridge.
    /// </summary>
    public void SendEvent(string eventName, object payload)
    {
        string json;
        try
        {
            json = JsonUtility.ToJson(payload);
        }
        catch
        {
            Debug.LogWarning($"[RNEventEmitter] Failed to serialize payload for {eventName}");
            json = "{}";
        }

        SendJsonEvent(eventName, json);
    }

    /// <summary>
    /// Sends an event with raw JSON payload.
    /// </summary>
    public void SendJsonEvent(string eventName, string jsonPayload)
    {
        if (Instance == null) return;

        if (useIOSBridge || Application.platform == RuntimePlatform.IPhonePlayer)
        {
            SendViaIOSBridge(eventName, jsonPayload);
        }
        else
        {
            SendViaAndroidBridge(eventName, jsonPayload);
        }
    }

    // ─── Android bridge ────────────────────────────────────────────────────────

    private void SendViaAndroidBridge(string eventName, string jsonPayload)
    {
#if UNITY_ANDROID && !UNITY_EDITOR
        try
        {
            using (var unityBridgeClass = new AndroidJavaClass("com.unity3d.player.UnityBridge"))
            {
                // The Unity side plugin calls this directly via UnityPlayer.UnitySendMessage
                // to com.rn.UnityBridgeModule. Here we call the static facade.
                UnityBridgeAndroid.SendEventToRN(eventName, jsonPayload);
            }
        }
        catch (System.Exception ex)
        {
            Debug.LogWarning($"[RNEventEmitter] Android bridge unavailable: {ex.Message}");
        }
#endif
    }

    // ─── iOS bridge ───────────────────────────────────────────────────────────

    private void SendViaIOSBridge(string eventName, string jsonPayload)
    {
#if UNITY_IOS && !UNITY_EDITOR
        try
        {
            RNEventEmitterIOS.SendEvent(eventName, jsonPayload);
        }
        catch (System.Exception ex)
        {
            Debug.LogWarning($"[RNEventEmitter] iOS bridge unavailable: {ex.Message}");
        }
#endif
    }
}

#if UNITY_IOS && !UNITY_EDITOR
/// <summary>
/// iOS native plugin. Calls into the Swift UnityBridgeModule via UnityFramework.
/// This class mirrors the UnityPlayer.UnitySendMessage pattern for iOS.
/// </summary>
internal static class RNEventEmitterIOS
{
    [DllImport("__Internal")]
    private static extern void UnitySendMessageToRN(string eventName, string jsonPayload);

    public static void SendEvent(string eventName, string jsonPayload)
    {
        UnitySendMessageToRN(eventName, jsonPayload);
    }
}
#endif
