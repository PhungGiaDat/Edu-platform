using System;
using System.Collections;
using UnityEngine;

/// <summary>
/// Minimal test: press F5 to download + display the elephant GLB model.
/// This verifies GLBLoader + GLTFast work end-to-end WITHOUT needing image tracking.
///
/// Press F5 to load elephant
/// Press F6 to unload
/// Press F7 to toggle spawn position (test multiple spawns)
/// </summary>
public class ElephantModelTest : MonoBehaviour
{
    [SerializeField] private string elephantGlbUrl =
        "https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/pets/models/animal-elephant.glb";

    [SerializeField] private Vector3 spawnPosition = new Vector3(0, 0, 2f);
    [SerializeField] private Vector3 spawnScale = new Vector3(0.5f, 0.5f, 0.5f);

    private GLBLoader _loader;
    private GameObject _elephant;
    private bool _isLoaded;
    private int _positionIdx;
    private string _statusText = "F5 = Load elephant GLB";

    private void Awake()
    {
        _loader = GetComponent<GLBLoader>();
        if (_loader == null) _loader = gameObject.AddComponent<GLBLoader>();
    }

    private void Start()
    {
        Debug.Log("[ElephantModelTest] Ready. F5=Load, F6=Unload, F7=Reposition");
    }

    private void Update()
    {
        if (Input.GetKeyDown(KeyCode.F5)) StartCoroutine(LoadElephant());
        if (Input.GetKeyDown(KeyCode.F6)) UnloadElephant();
        if (Input.GetKeyDown(KeyCode.F7)) ToggleSpawnPosition();
    }

    private IEnumerator LoadElephant()
    {
        if (_isLoaded)
        {
            Debug.Log("[ElephantModelTest] Already loaded. F6 to unload first.");
            yield break;
        }

        var url = elephantGlbUrl;
        Debug.Log("[ElephantModelTest] Loading: " + url);
        _statusText = "Loading elephant...\n" + url;

        var op = _loader.LoadGLB(url);
        yield return new WaitUntil(() => !op.IsCompleted);

        if (op.IsFaulted)
        {
            var ex = op.Exception != null ? op.Exception.InnerException ?? op.Exception : new Exception("Unknown");
            Debug.LogError("[ElephantModelTest] Load failed: " + ex.Message);
            _statusText = "ERROR:\n" + ex.Message;
            yield break;
        }

        var go = op.Result;
        if (go == null)
        {
            Debug.LogError("[ElephantModelTest] Load returned null");
            _statusText = "ERROR:\nLoad returned null";
            yield break;
        }

        go.transform.position = spawnPosition;
        go.transform.localScale = spawnScale;
        go.SetActive(true);

        _elephant = go;
        _isLoaded = true;

        var pos = go.transform.position;
        Debug.Log("[ElephantModelTest] Loaded: " + go.name + " at " + pos);
        _statusText = "SUCCESS:\n" + go.name + "\nposition=" + pos + "\nF6=Unload\nF7=Reposition";
    }

    private void UnloadElephant()
    {
        if (!_isLoaded)
        {
            Debug.Log("[ElephantModelTest] Not loaded.");
            return;
        }
        _loader.Unload();
        _elephant = null;
        _isLoaded = false;
        Debug.Log("[ElephantModelTest] Unloaded.");
        _statusText = "Unloaded.\nF5=Load";
    }

    private void ToggleSpawnPosition()
    {
        Vector3[] positions = new Vector3[] {
            new Vector3(0, 0, 2f),
            new Vector3(1.5f, 0, 1f),
            new Vector3(-1.5f, 0, 1f),
            new Vector3(0, 0, 0.5f),
        };

        _positionIdx = (_positionIdx + 1) % positions.Length;
        spawnPosition = positions[_positionIdx];

        if (_elephant != null)
        {
            _elephant.transform.position = spawnPosition;
            Debug.Log("[ElephantModelTest] Repositioned to " + spawnPosition);
        }
    }

    private void OnGUI()
    {
        var boxStyle = new GUIStyle(GUI.skin.box) { fontSize = 16 };
        var labelStyle = new GUIStyle(GUI.skin.label) { fontSize = 16, wordWrap = true };
        GUI.Box(new Rect(10, 10, 520, 160), "[ElephantModelTest]\n\n" + _statusText, boxStyle);
    }
}
