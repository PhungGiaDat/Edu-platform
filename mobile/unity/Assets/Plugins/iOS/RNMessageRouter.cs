using UnityEngine;

/// <summary>
/// RNMessageRouter — iOS bridge entry point.
///
/// On iOS, Unity sends messages to RN via this MonoBehaviour attached to a
/// dedicated GameObject in ARScene. Unity calls:
///   UnityFramework.GetInstance().SendMessage("RNMessageRouter", "OnMessageFromUnity", json)
/// where json = "{ "event": "onArReady", "payload": {...} }"
///
/// This class dispatches to RNEventEmitter so the existing RNEventEmitter.cs
/// singleton is the single source of truth for sending events to React Native.
///
/// Attach this script to a GameObject named "RNMessageRouter" in ARScene.
/// </summary>
public class RNMessageRouter : MonoBehaviour
{
    [SerializeField] private string targetObject = "RNMessageRouter";
    [SerializeField] private string targetMethod = "OnMessageFromUnity";

    public static RNMessageRouter Instance { get; private set; }

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
    /// Called by Unity's UnityFramework.SendMessage() on the RNMessageRouter GameObject.
    /// message format: "{ "event": "onArReady", "payload": {...} }"
    /// This method is invoked from native iOS code.
    /// </summary>
    public void OnMessageFromUnity(string json)
    {
        if (string.IsNullOrEmpty(json)) return;

        RNEventEmitter.Instance.SendJsonEvent(json);
    }

#if UNITY_IOS && !UNITY_EDITOR
    /// <summary>
    /// iOS-only: send a message back to Unity framework.
    /// On iOS, the UnityFramework is compiled into the app; we call it directly.
    /// </summary>
    public static void SendToUnity(string methodName, string jsonPayload)
    {
        var message = $"{methodName}|{jsonPayload}";
        // UnityFramework.iOS.SendMessage is invoked via plugin;
        // here we relay through RNMessageReceiver which already handles the method dispatch
        RNMessageReceiver.Instance?.ReceiveMessage(methodName, jsonPayload);
    }
#else
    public static void SendToUnity(string methodName, string jsonPayload)
    {
        // Stub for non-iOS builds
        Debug.Log($"[RNMessageRouter] SendToUnity stub: {methodName}");
    }
#endif
}
