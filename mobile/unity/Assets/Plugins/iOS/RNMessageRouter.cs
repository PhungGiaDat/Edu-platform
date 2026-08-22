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
    [System.Serializable]
    private class UnityEventWrapper
    {
        public string Event;
        public string Payload;
    }

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

        try
        {
            var wrapper = JsonUtility.FromJson<UnityEventWrapper>(json);
            if (wrapper != null && !string.IsNullOrEmpty(wrapper.Event))
            {
                RNEventEmitter.Instance.SendJsonEvent(wrapper.Event, wrapper.Payload ?? "{}");
                Debug.Log($"[RNMessageRouter] Forwarded event: {wrapper.Event}");
            }
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[RNMessageRouter] Failed to parse event JSON: {ex.Message}");
        }
    }

    // RN → Unity: handled by Swift calling UnityFramework.SendMessage("RNMessageReceiver", ...).
    // RNMessageRouter.SendToUnity is not used in the current architecture.
    // Kept as a no-op stub to avoid unused-variable warnings.
    public static void SendToUnity(string methodName, string jsonPayload)
    {
#if UNITY_IOS && !UNITY_EDITOR
        Debug.Log($"[RNMessageRouter] SendToUnity (unused path): {methodName}");
#else
        Debug.Log($"[RNMessageRouter] SendToUnity stub: {methodName}");
#endif
    }
}
