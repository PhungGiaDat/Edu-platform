
#if UNITY_EDITOR
using System.Collections;
using UnityEngine;
using UnityEngine.XR.ARFoundation;
using UnityEngine.XR.ARSubsystems;

/// <summary>
/// Standalone PlayMode test that creates the full combo test rig without any
/// AR provider. Run this in Play Mode to verify:
///   1. ARSessionManager HandleTrackedImagesChanged wiring works
///   2. ComboManager proximity detection fires (two mock images close together)
///   3. ModelSpawner multi-card coexistence (two models simultaneously visible)
///   4. Combo animation + OnComboComplete event fires correctly
///
/// Controls:
///   SPACE = spawn 2 cards at threshold distance
///   C     = move cards close together (triggers combo after hold time)
///   X     = move cards apart
///   R     = reset
///   G     = force combo immediately
///   ESC   = quit
///
/// Attach to any GameObject in the scene, then press Play. No AR hardware needed.
/// </summary>
public class ComboEditorPlayTest : MonoBehaviour
{
    [Header("Mock card A")]
    [SerializeField] private string cardAName = "flashcard_chicken";
    [SerializeField] private Vector3 cardAPos = new Vector3(-0.3f, 0f, 0.5f);

    [Header("Mock card B")]
    [SerializeField] private string cardBName = "flashcard_egg";
    [SerializeField] private Vector3 cardBPos = new Vector3(0.3f, 0f, 0.5f);
    [SerializeField] private Vector3 cardBNearPos = new Vector3(-0.05f, 0f, 0.5f);

    [Header("Combo")]
    [SerializeField] private float proximityThreshold = 0.5f;
    [SerializeField] private float holdSeconds = 1f;

    private ARSessionManager _sessionManager;
    private ComboManager _comboManager;
    private ModelSpawner _modelSpawner;
    private ARTrackedImageManager _imageManager;
    private GameObject _cardA;
    private GameObject _cardB;
    private ARTrackedImage _trackedA;
    private ARTrackedImage _trackedB;
    private bool _cardASpawned;
    private bool _cardBSpawned;
    private float _lastProximityLogTime = -999f;

    private string _status = "SPACE = spawn 2 cards\nC = move close (combo!)\nX = move apart\nR = reset\nG = force combo\nESC = quit";

    private void Awake()
    {
        BuildRig();
    }

    private void BuildRig()
    {
        // Editor camera so the Game view shows something
        var camGo = new GameObject("Main Camera");
        camGo.transform.SetParent(transform);
        camGo.transform.position = new Vector3(0f, 0f, 0f);
        var cam = camGo.AddComponent<Camera>();
        cam.backgroundColor = new Color(0.05f, 0.05f, 0.1f);
        camGo.tag = "MainCamera";

        // ARSessionManager
        var arm = new GameObject("ARSessionManager");
        arm.transform.SetParent(transform);
        _sessionManager = arm.AddComponent<ARSessionManager>();

        // ARTrackedImageManager (ARFoundation needs this to subscribe _trackablesChangedHandler)
        var imgManagerGo = new GameObject("ARTrackedImageManager");
        imgManagerGo.transform.SetParent(arm.transform);
        _imageManager = imgManagerGo.AddComponent<ARTrackedImageManager>();

        // ModelSpawner
        var spawnerGo = new GameObject("ModelSpawner");
        spawnerGo.transform.SetParent(transform);
        _modelSpawner = spawnerGo.AddComponent<ModelSpawner>();

        // ComboManager
        var comboGo = new GameObject("ComboManager");
        comboGo.transform.SetParent(transform);
        _comboManager = comboGo.AddComponent<ComboManager>();
#if UNITY_EDITOR
        _comboManager.SetProximityThreshold(proximityThreshold);
        _comboManager.SetProximityHoldTime(holdSeconds);
#endif

        // Subscribe to combo events so we can see them fire
        _comboManager.OnProximityNear += (a, b, dist) => {
            Debug.Log($"[COMBO EVENT] OnProximityNear: {a} + {b} @ {dist:F3}m");
            _status = $"PROXIMITY NEAR!\n{a} + {b}\nDistance: {dist:F3}m\nHolding {holdSeconds}s...";
        };

        _comboManager.OnComboComplete += (rewardId, xp) => {
            Debug.Log($"[COMBO EVENT] OnComboComplete: reward={rewardId}, xp={xp}");
            _status = $"COMBO COMPLETE!\nReward: {rewardId}\nXP: {xp}";
        };

        Debug.Log("[ComboEditorPlayTest] Rig built.");
        Debug.Log($"  Proximity threshold: {proximityThreshold}m, hold time: {holdSeconds}s");
        Debug.Log("  SPACE to spawn cards.");
    }

    private void Update()
    {
        if (Input.GetKeyDown(KeyCode.Space)) SpawnBothCards();
        else if (Input.GetKeyDown(KeyCode.C)) MoveClose();
        else if (Input.GetKeyDown(KeyCode.X)) MoveApart();
        else if (Input.GetKeyDown(KeyCode.R)) Reset();
        else if (Input.GetKeyDown(KeyCode.G)) ForceCombo();
        else if (Input.GetKeyDown(KeyCode.Escape)) UnityEditor.EditorApplication.isPlaying = false;

        // Log distance every second while close
        if (_cardASpawned && _cardBSpawned && Time.time - _lastProximityLogTime > 1f)
        {
            float dist = Vector3.Distance(_cardA.transform.position, _cardB.transform.position);
            bool isNear = dist < proximityThreshold;
            if (isNear) {
                Debug.Log($"[ComboEditorPlayTest] Current distance: {dist:F3}m (near={isNear})");
                _lastProximityLogTime = Time.time;
            }
        }
    }

    private void SpawnBothCards()
    {
        if (_cardASpawned || _cardBSpawned)
        {
            Debug.LogWarning("[ComboEditorPlayTest] Cards already spawned. Press R first.");
            return;
        }

        // Spawn card A
        _cardA = CreateMockImage(cardAName, cardAPos);
        _trackedA = _cardA.GetComponent<ARTrackedImage>();
        var modelA = _modelSpawner.Spawn(
            GameObject.CreatePrimitive(PrimitiveType.Cube),
            _cardA.transform.position, Vector3.zero, Vector3.one * 0.05f, id: cardAName);
        modelA.name = "Model_Chicken";
        modelA.transform.SetParent(_cardA.transform);

        // Register with ComboManager
        _comboManager.RegisterTrackedImage(_trackedA, modelA);

        // Fire added event so ARSessionManager sees it
        FireAdded(_trackedA);

        // Spawn card B
        _cardB = CreateMockImage(cardBName, cardBPos);
        _trackedB = _cardB.GetComponent<ARTrackedImage>();
        var modelB = _modelSpawner.Spawn(
            GameObject.CreatePrimitive(PrimitiveType.Sphere),
            _cardB.transform.position, Vector3.zero, Vector3.one * 0.05f, id: cardBName);
        modelB.name = "Model_Egg";
        modelB.transform.SetParent(_cardB.transform);

        // Register with ComboManager
        _comboManager.RegisterTrackedImage(_trackedB, modelB);

        // Fire added event
        FireAdded(_trackedB);

        _cardASpawned = true;
        _cardBSpawned = true;

        float dist = Vector3.Distance(_cardA.transform.position, _cardB.transform.position);
        _status = $"Cards spawned!\nDistance: {dist:F2}m\n(Cards are NOT near threshold)\n\nC = move close (combo!)\nX = move apart\nR = reset";
        Debug.Log($"[ComboEditorPlayTest] Both cards spawned. Distance={dist:F2}m (near={dist < proximityThreshold})");
    }

    private void MoveClose()
    {
        if (!_cardASpawned || !_cardBSpawned) return;
        _cardB.transform.position = cardBNearPos;
        FireUpdated(_trackedB);

        float dist = Vector3.Distance(_cardA.transform.position, _cardB.transform.position);
        _status = $"Cards CLOSE!\nDistance: {dist:F3}m\nThreshold: {proximityThreshold}m\nHold {holdSeconds}s for combo...";
        Debug.Log($"[ComboEditorPlayTest] Cards moved close. Distance={dist:F3}m — waiting {holdSeconds}s for combo...");
    }

    private void MoveApart()
    {
        if (!_cardASpawned || !_cardBSpawned) return;
        _cardB.transform.position = cardBPos;
        FireUpdated(_trackedB);

        float dist = Vector3.Distance(_cardA.transform.position, _cardB.transform.position);
        _status = $"Cards apart.\nDistance: {dist:F2}m\n\nC = move close\nR = reset";
        Debug.Log($"[ComboEditorPlayTest] Cards apart. Distance={dist:F2}m");
    }

    private void ForceCombo()
    {
        if (!_cardASpawned || !_cardBSpawned) return;
        Debug.Log($"[ComboEditorPlayTest] Force combo: {cardAName} + {cardBName}");
        _comboManager.TriggerCombo(cardAName, cardBName);
    }

    private void Reset()
    {
        if (_cardA != null) { DestroyImmediate(_cardA); _cardA = null; }
        if (_cardB != null) { DestroyImmediate(_cardB); _cardB = null; }
        _trackedA = null;
        _trackedB = null;
        _cardASpawned = false;
        _cardBSpawned = false;
        _modelSpawner.Clear();
#if UNITY_EDITOR
        _comboManager.UnregisterAll();
#endif
        _status = "Reset.\nSPACE = spawn 2 cards";
        Debug.Log("[ComboEditorPlayTest] Reset.");
    }

    private GameObject CreateMockImage(string name, Vector3 position)
    {
        var go = new GameObject($"MockImage[{name}]");
        go.transform.position = position;
        var img = go.AddComponent<ARTrackedImage>();

        // Set referenceImage via reflection so downstream handlers see the name
        var prop = typeof(ARTrackedImage).GetProperty(
            "referenceImage",
            System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Instance);
        var refImg = new XRReferenceImage(
            guid: default,
            textureGuid: default,
            size: new Vector2(0.1f, 0.1f),
            name: name,
            texture: null);
        prop.SetValue(img, refImg);

        // Visual marker — golden cube for chicken card, white sphere for egg card
        var rend = go.AddComponent<MeshRenderer>();
        rend.sharedMaterial = new Material(Shader.Find("Standard"));
        rend.sharedMaterial.color = name == cardAName
            ? new Color(0.9f, 0.7f, 0.2f)   // golden cube = chicken
            : new Color(1f, 1f, 0.8f);       // white sphere = egg
        var filter = go.AddComponent<MeshFilter>();
        filter.sharedMesh = name == cardAName
            ? Resources.GetBuiltinResource<Mesh>("Cube.fbx")
            : Resources.GetBuiltinResource<Mesh>("Sphere.fbx");
        go.transform.localScale = Vector3.one * 0.08f;

        return go;
    }

    private void FireAdded(ARTrackedImage img)
    {
        var args = new ARTrackablesChangedEventArgs<ARTrackedImage>(
            added: new Unity.XR.CoreUtils.Collections.ReadOnlyList<ARTrackedImage>(
                new System.Collections.Generic.List<ARTrackedImage> { img }),
            updated: new Unity.XR.CoreUtils.Collections.ReadOnlyList<ARTrackedImage>(
                new System.Collections.Generic.List<ARTrackedImage>()),
            removed: new Unity.XR.CoreUtils.Collections.ReadOnlyList<System.Collections.Generic.KeyValuePair<TrackableId, ARTrackedImage>>(
                new System.Collections.Generic.List<System.Collections.Generic.KeyValuePair<TrackableId, ARTrackedImage>>()));
        _sessionManager.HandleTrackedImagesChanged(args);
    }

    private void FireUpdated(ARTrackedImage img)
    {
        var args = new ARTrackablesChangedEventArgs<ARTrackedImage>(
            added: new Unity.XR.CoreUtils.Collections.ReadOnlyList<ARTrackedImage>(
                new System.Collections.Generic.List<ARTrackedImage>()),
            updated: new Unity.XR.CoreUtils.Collections.ReadOnlyList<ARTrackedImage>(
                new System.Collections.Generic.List<ARTrackedImage> { img }),
            removed: new Unity.XR.CoreUtils.Collections.ReadOnlyList<System.Collections.Generic.KeyValuePair<TrackableId, ARTrackedImage>>(
                new System.Collections.Generic.List<System.Collections.Generic.KeyValuePair<TrackableId, ARTrackedImage>>()));
        _sessionManager.HandleTrackedImagesChanged(args);
    }

    private void OnGUI()
    {
        var boxStyle = new GUIStyle(GUI.skin.box) { fontSize = 18, wordWrap = true, alignment = TextAnchor.UpperLeft };
        GUI.Box(new Rect(16, 60, 560, 240), _status, boxStyle);

        var labelStyle = new GUIStyle(GUI.skin.label) { fontSize = 14, wordWrap = true };
        GUI.Label(new Rect(16, 16, 560, 40),
            $"[ComboEditorPlayTest] Proximity: {proximityThreshold}m | Hold: {holdSeconds}s | Pair: {cardAName}+{cardBName}",
            labelStyle);
    }
}
#else
public class ComboEditorPlayTest : UnityEngine.MonoBehaviour { }
#endif
