using UnityEngine;

/// <summary>
/// Marks a GameObject as a test runner target. EditorMockImageDetector and any
/// other test helpers use this tag to find the rig without relying on
/// hardcoded scene references.
///
/// Why: scenes built by code (POCBootstrap, FullARBootstrap) are runtime-only.
/// For an editor-side test scene we want a permanent GameObject we can attach
/// behaviours to via Inspector without spawning it at runtime.
/// </summary>
public class ARTestRunner : MonoBehaviour
{
    [Header("Test execution")]
    [SerializeField] private bool runMockTestOnStart = false;
    [SerializeField] private float delayBeforeDetection = 2f;

    private void Start()
    {
        Debug.Log("[ARTestRunner] Test rig ready. Listening for hotkeys (see EditorMockImageDetector).");
        if (runMockTestOnStart)
        {
            Invoke(nameof(TriggerAutoDetection), delayBeforeDetection);
        }
    }

    public void TriggerAutoDetection()
    {
        var mock = FindFirstObjectByType<EditorMockImageDetector>();
        if (mock != null)
        {
            Debug.Log("[ARTestRunner] Triggering auto-detection");
            mock.SimulateDetection();
        }
        else
        {
            Debug.LogError("[ARTestRunner] EditorMockImageDetector not found in scene");
        }
    }
}
