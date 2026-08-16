using System.Collections;
using UnityEngine;

public sealed class BridgeSmokeBootstrap : MonoBehaviour
{
    private IEnumerator Start()
    {
        yield return null;
        RNEventEmitter.Instance.SendEvent("UNITY_READY", new ReadyPayload {
            scene = "BridgeSmokeScene"
        });
    }

    [System.Serializable]
    private sealed class ReadyPayload
    {
        public string scene;
    }
}
