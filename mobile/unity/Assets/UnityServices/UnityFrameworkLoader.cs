using System;
using UnityEngine;

/// <summary>
/// Manages the UnityFramework singleton lifecycle.
/// Used on iOS to initialize the embedded Unity runtime from Swift.
/// </summary>
public class UnityFrameworkLoader : MonoBehaviour
{
    private static UnityFrameworkLoader _instance;
    
    private static readonly object _lock = new();

    public static UnityFrameworkLoader Instance {
        get {
            if (_instance == null) {
                lock (_lock) {
                    if (_instance == null) {
                        var go = new GameObject("UnityFrameworkLoader");
                        _instance = go.AddComponent<UnityFrameworkLoader>();
                        DontDestroyOnLoad(go);
                    }
                }
            }
            return _instance;
        }
    }

    private bool _isInitialized;

    private void Awake() {
        if (_instance != null && _instance != this) {
            Destroy(gameObject);
            return;
        }
        _instance = this;
        DontDestroyOnLoad(gameObject);
    }

    /// <summary>
    /// Initializes the Unity framework. Called from Swift native code.
    /// </summary>
    public void Initialize() {
        if (_isInitialized) return;
        _isInitialized = true;
        UnityEngine.Debug.Log("[UnityFrameworkLoader] Initialized");
    }

    /// <summary>
    /// Returns whether the framework has been initialized.
    /// </summary>
    public bool IsInitialized => _isInitialized;
}
