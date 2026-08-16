using System;
using UnityEngine;

/// <summary>
/// Provides communication bridge between React Native and Unity.
/// Compatibility facade for Editor/iOS callers. Android RN traffic enters
/// RNMessageReceiver directly through UnityPlayer.UnitySendMessage.
/// </summary>
public class UnityBridge : MonoBehaviour
{
    private const string TARGET_OBJECT = "RNMessageReceiver";
    private const string METHOD_NAME = "OnMessageFromRN";
    private static UnityBridge _instance;
    private static readonly object _lock = new();

    public static UnityBridge Instance
    {
        get
        {
            if (_instance == null)
            {
                lock (_lock)
                {
                    if (_instance == null)
                    {
                        var go = new GameObject("UnityBridge");
                        _instance = go.AddComponent<UnityBridge>();
                        DontDestroyOnLoad(go);
                    }
                }
            }
            return _instance;
        }
    }

    /// <summary>
    /// Called by RN native module to send a command to Unity.
    /// Format: "methodName|{jsonPayload}"
    /// </summary>
    public void SendToUnity(string methodName, string jsonPayload)
    {
        try
        {
            string message = $"{methodName}|{jsonPayload}";
            UnityEngine.Debug.Log($"[UnityBridge] SendToUnity: {methodName}");

#if UNITY_IOS && !UNITY_EDITOR
            UnitySendMessage(TARGET_OBJECT, METHOD_NAME, message);
#else
            var receiver = FindFirstObjectByType<RNMessageReceiver>();
            receiver?.OnMessageFromRN(message);
#endif
        }
        catch (Exception ex)
        {
            UnityEngine.Debug.LogError($"[UnityBridge] SendToUnity failed: {ex.Message}");
        }
    }

    private void Awake()
    {
        if (_instance != null && _instance != this)
        {
            Destroy(gameObject);
            return;
        }
        _instance = this;
        DontDestroyOnLoad(gameObject);
        UnityEngine.Debug.Log("[UnityBridge] Initialized - direct in-process transport");
    }
}
