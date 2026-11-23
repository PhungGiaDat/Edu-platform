using System;
using UnityEngine;
using UnityEngine.UI;

/// <summary>
/// Manages AR ↔ Game mode transitions.
/// AR camera stays active at all times — Game Mode overlays on top.
/// </summary>
public class GameModeManager : MonoBehaviour
{
    /// <summary>AR scanning state — default, tracking flashcards.</summary>
    public const string STATE_AR_SCAN = "AR_SCAN";
    /// <summary>Game mode active — game canvas/3D root is visible.</summary>
    public const string STATE_GAME_ACTIVE = "GAME_ACTIVE";

    [Header("UI References")]
    [SerializeField] private Canvas hudCanvas;
    [SerializeField] private Canvas gameCanvas;
    [SerializeField] private Button gameButton;
    [SerializeField] private Button closeGameButton;

    [Header("Game Root (3D or Canvas)")]
    [SerializeField] private GameObject gameRoot;

    /// <summary>Fired when state changes: (fromState, toState)</summary>
    public event Action<string, string> OnStateChanged;

    /// <summary>Fired when entering game: (gameType, gameId)</summary>
    public event Action<string, string> OnGameEntered;

    /// <summary>Fired when exiting game: (gameType, completionStatus)</summary>
    public event Action<string, string> OnGameExited;

    public string CurrentState { get; private set; } = STATE_AR_SCAN;

    private void Start()
    {
        // Default: AR scan mode, game canvas hidden
        EnterArScan();
        AutoWire();
        SetupListeners();
    }

    private void Update()
    {
        // Editor shortcut: press Escape to exit game mode
        if (Input.GetKeyDown(KeyCode.Escape) && CurrentState == STATE_GAME_ACTIVE)
        {
            ExitGame();
        }
    }

    private void AutoWire()
    {
        if (hudCanvas == null) hudCanvas = GameObject.Find("HUDCanvas")?.GetComponent<Canvas>();
        if (gameCanvas == null) gameCanvas = GameObject.Find("GameCanvas")?.GetComponent<Canvas>();
        if (gameRoot == null) gameRoot = GameObject.Find("GameRoot");
        if (gameButton == null && hudCanvas != null)
            gameButton = hudCanvas.GetComponentInChildren<Button>(true);
    }

    private void SetupListeners()
    {
        if (gameButton != null)
            gameButton.onClick.AddListener(() => EnterGame("default", "ar_combo_game"));
    }

    /// <summary>
    /// Called by RN to enter game mode programmatically.
    /// </summary>
    public void EnterGame(string gameType = "default", string gameId = "ar_combo_game")
    {
        if (CurrentState == STATE_GAME_ACTIVE) return;

        var previousState = CurrentState;
        CurrentState = STATE_GAME_ACTIVE;

        ApplyGameModeVisibility(true);

        RNEventEmitter.Instance.SendEvent("onGameEntered", new {
            gameType = gameType,
            gameId = gameId,
            state = STATE_GAME_ACTIVE
        });

        OnStateChanged?.Invoke(previousState, STATE_GAME_ACTIVE);
        OnGameEntered?.Invoke(gameType, gameId);

        UnityEngine.Debug.Log($"[GameModeManager] Entered GAME_ACTIVE (gameType={gameType}, gameId={gameId})");
    }

    /// <summary>
    /// Exits game mode and restores AR scan state.
    /// </summary>
    public void ExitGame(string completionStatus = "completed")
    {
        if (CurrentState != STATE_GAME_ACTIVE) return;

        var previousState = CurrentState;
        CurrentState = STATE_AR_SCAN;

        ApplyGameModeVisibility(false);

        RNEventEmitter.Instance.SendEvent("onGameExited", new {
            state = STATE_AR_SCAN,
            completionStatus = completionStatus
        });

        OnStateChanged?.Invoke(previousState, STATE_AR_SCAN);
        OnGameExited?.Invoke("default", completionStatus);

        UnityEngine.Debug.Log($"[GameModeManager] Exited GAME_ACTIVE (status={completionStatus})");
    }

    /// <summary>
    /// Called by RN to trigger a game from a combo trigger.
    /// </summary>
    public void TriggerGameFromCombo(string comboId)
    {
        UnityEngine.Debug.Log($"[GameModeManager] Combo triggered game: {comboId}");
        EnterGame("combo", comboId);
    }

    private void ApplyGameModeVisibility(bool gameActive)
    {
        if (gameCanvas != null)
            gameCanvas.gameObject.SetActive(gameActive);

        if (gameRoot != null)
            gameRoot.SetActive(gameActive);

        // HUD always stays visible (close button accessible)
        if (hudCanvas != null)
            hudCanvas.gameObject.SetActive(true);
    }

    private void EnterArScan()
    {
        ApplyGameModeVisibility(false);
        CurrentState = STATE_AR_SCAN;
    }

    /// <summary>Returns true if currently in game mode.</summary>
    public bool IsGameActive => CurrentState == STATE_GAME_ACTIVE;

#if UNITY_EDITOR
    /// <summary>Editor-only: called by tests to initialize without Start().</summary>
    public void AutoWireForTest()
    {
        AutoWire();
        SetupListeners();
    }

    /// <summary>Editor-only: called by tests to set up button listeners without Start().</summary>
    public void SetupListenersForTest()
    {
        SetupListeners();
    }
#endif
}
