using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// Single-button manual regression runner. Press F9 in Play mode to walk through
/// the entire AR pipeline in sequence:
///   1. Initialize session
///   2. Load AR experience (with empty model URL so GLB fetch is skipped)
///   3. Simulate image detection
///   4. Trigger plane detection toggle
///   5. Trigger combo
///   6. Pause / resume / destroy
///
/// Output: a single multi-line summary in Console with pass/fail per step + any
/// exceptions caught. Designed to be the "go" checklist before Mac Day.
///
/// Pre-requisites in scene:
///   - ARSession + ARTrackedImageManager (from POCBootstrap or Inspector)
///   - EditorMockImageDetector on the same GameObject as ARTrackedImageManager
///   - ARExperienceHandler (auto-wired)
///   - RNMessageReceiver on a "Bridge" GameObject
/// </summary>
[DefaultExecutionOrder(-40)]
public class ManualRegressionRunner : MonoBehaviour
{
    [SerializeField] private KeyCode runKey = KeyCode.F9;
    [SerializeField] private float interStepDelay = 0.4f;

    private readonly List<StepResult> _results = new();

    private void Update()
    {
#if UNITY_EDITOR
        if (Input.GetKeyDown(runKey))
        {
            StartCoroutine(RunAll());
        }
#endif
    }

    private IEnumerator RunAll()
    {
        _results.Clear();
        Debug.Log("═══════════════════════════════════════════════════════");
        Debug.Log("[ManualRegressionRunner] F9 PRESSED — running full AR pipeline");
        Debug.Log("═══════════════════════════════════════════════════════");

        yield return Step("initSession", () =>
        {
            var receiver = FindFirstObjectByType<RNMessageReceiver>();
            receiver?.OnMessageFromRN("initSession|");
        });

        yield return Step("loadARExperience (model URL empty, no real fetch)", () =>
        {
            var receiver = FindFirstObjectByType<RNMessageReceiver>();
            var payload = JsonUtility.ToJson(new ARTestPayloads.ARExperiencePayloadPublic
            {
                qrId = "reg-elephant",
                word = "elephant",
                translationVi = "con voi",
                audioUrl = "",
                modelUrl = "",
                animationType = "idle",
                glbSize = 1f,
                position = "0 0 0.5",
                rotation = "0 0 0",
                scale = "1 1 1",
            });
            receiver?.OnMessageFromRN($"loadARExperience|{payload}");
        });

        yield return Step("image detection (mock)", () =>
        {
            var mock = FindFirstObjectByType<EditorMockImageDetector>();
            mock?.SimulateDetection();
        });

        yield return Step("triggerCombo", () =>
        {
            var receiver = FindFirstObjectByType<RNMessageReceiver>();
            receiver?.OnMessageFromRN("triggerCombo|{\"cardA\":\"elephant\",\"cardB\":\"tree\"}");
        });

        yield return Step("setPlaneDetection(false)", () =>
        {
            var receiver = FindFirstObjectByType<RNMessageReceiver>();
            receiver?.OnMessageFromRN("setPlaneDetection|{\"enabled\":false}");
        });

        yield return Step("pauseSession", () =>
        {
            var receiver = FindFirstObjectByType<RNMessageReceiver>();
            receiver?.OnMessageFromRN("pauseSession|");
        });

        yield return Step("resumeSession", () =>
        {
            var receiver = FindFirstObjectByType<RNMessageReceiver>();
            receiver?.OnMessageFromRN("resumeSession|");
        });

        yield return Step("destroySession", () =>
        {
            var receiver = FindFirstObjectByType<RNMessageReceiver>();
            receiver?.OnMessageFromRN("destroySession|");
        });

        yield return Step("tracking lost (mock)", () =>
        {
            var mock = FindFirstObjectByType<EditorMockImageDetector>();
            mock?.SimulateTrackingLost();
        });

        // === Summary ===
        int pass = 0, fail = 0;
        Debug.Log("─────────────── REGRESSION SUMMARY ───────────────");
        foreach (var r in _results)
        {
            if (r.Success) { pass++; Debug.Log($"  ✓ {r.Name}"); }
            else { fail++; Debug.Log($"  ✗ {r.Name}: {r.Error}"); }
        }
        Debug.Log($"─────────────── TOTAL: {pass} pass / {fail} fail ───────────────");
    }

    private IEnumerator Step(string name, Action body)
    {
        Debug.Log($"\n[ManualRegressionRunner] ▶ {name}");
        StepResult result;
        try
        {
            body();
            result = new StepResult { Name = name, Success = true };
            Debug.Log($"[ManualRegressionRunner]   ✓ {name} dispatched");
        }
        catch (Exception ex)
        {
            result = new StepResult { Name = name, Success = false, Error = ex.Message };
            Debug.LogError($"[ManualRegressionRunner]   ✗ {name}: {ex.Message}");
        }
        _results.Add(result);
        yield return new WaitForSeconds(interStepDelay);
    }

    private struct StepResult
    {
        public string Name;
        public bool Success;
        public string Error;
    }
}
