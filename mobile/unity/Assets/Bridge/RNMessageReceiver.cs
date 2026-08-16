using System;
using UnityEngine;

/// <summary>
/// Receives JSON messages from Swift (via UnitySendMessage) and forwards
/// them to the ARExperienceHandler for processing.
/// </summary>
public class RNMessageReceiver : MonoBehaviour
{
    [SerializeField] private ARExperienceHandler experienceHandler;

    /// <summary>
    /// Called by Swift/UnitySendMessage when React Native sends a command.
    /// Format: "methodName|{jsonPayload}"
    /// </summary>
    public void OnMessageFromRN(string message)
    {
        if (string.IsNullOrEmpty(message)) return;

        try {
            var parts = message.Split(new[] { '|' }, 2);
            if (parts.Length < 2) {
                UnityEngine.Debug.LogWarning($"[RNMessageReceiver] Malformed message: {message}");
                return;
            }

            string method = parts[0];
            string json = parts[1];
            UnityEngine.Debug.Log($"[RNMessageReceiver] Method={method}");

            switch (method) {
                case "PING":
                    var pingPayload = JsonUtility.FromJson<PingPayload>(json);
                    if (pingPayload == null || string.IsNullOrEmpty(pingPayload.requestId)) {
                        throw new ArgumentException("PING requires requestId");
                    }
                    RNEventEmitter.Instance.SendEvent("PONG", new PongPayload {
                        requestId = pingPayload.requestId,
                        scene = "BridgeSmokeScene"
                    });
                    break;
                case "initSession":
                    experienceHandler?.InitSession();
                    break;
                case "loadARExperience":
                    experienceHandler?.LoadARExperience(json);
                    break;
                case "startImageTracking":
                    experienceHandler?.StartImageTracking();
                    break;
                case "startImageTrackingMulti":
                    experienceHandler?.StartImageTrackingMulti(json);
                    break;
                case "triggerCombo":
                    var comboPayload = JsonUtility.FromJson<ComboPayload>(json);
                    var comboManager = FindFirstObjectByType<ComboManager>();
                    comboManager?.TriggerCombo(comboPayload.cardA, comboPayload.cardB);
                    break;
                case "setPlaneDetection":
                    var planePayload = JsonUtility.FromJson<PlaneDetectionPayload>(json);
                    experienceHandler?.SetPlaneDetection(planePayload.enabled);
                    break;
                case "pauseSession":
                    experienceHandler?.PauseSession();
                    break;
                case "resumeSession":
                    experienceHandler?.ResumeSession();
                    break;
                case "onCardResolved":
                    var resolvedPayload = JsonUtility.FromJson<CardResolvedPayload>(json);
                    if (resolvedPayload != null && !string.IsNullOrEmpty(resolvedPayload.qrId)) {
                        // Forward to QRScanner so it can unblock or lock the qrId.
                        var qrScanner = FindFirstObjectByType<QRScanner>();
                        if (qrScanner != null) {
                            qrScanner.OnCardResolved(resolvedPayload.qrId, resolvedPayload.registered);
                        }
                    }
                    break;
                case "destroySession":
                    experienceHandler?.DestroySession();
                    break;
                default:
                    UnityEngine.Debug.LogWarning($"[RNMessageReceiver] Unknown method: {method}");
                    break;
            }
        } catch (Exception ex) {
            UnityEngine.Debug.LogError($"[RNMessageReceiver] Error: {ex.Message}");
            RNEventEmitter.Instance.SendEvent("onError", new {
                code = "SESSION_FAILED",
                message = ex.Message
            });
        }
    }

    private void Start()
    {
        if (experienceHandler == null) {
            experienceHandler = FindFirstObjectByType<ARExperienceHandler>();
        }
    }

    [Serializable]
    private class PlaneDetectionPayload {
        public bool enabled;
    }

    [Serializable]
    private class ComboPayload {
        public string cardA;
        public string cardB;
    }

    [Serializable]
    private class PingPayload {
        public string requestId;
    }

    [Serializable]
    private class PongPayload {
        public string requestId;
        public string scene;
    }

    [Serializable]
    private class CardResolvedPayload {
        public string qrId;
        public bool registered;
    }
}
