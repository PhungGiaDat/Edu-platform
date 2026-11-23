using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.XR.ARFoundation;

/// <summary>
/// Spawns a loaded GLB model at a specified anchor with correct position,
/// rotation, and scale applied from the AR experience payload.
/// </summary>
public class ModelSpawner : MonoBehaviour
{
    private GameObject _currentModel;
    private readonly Dictionary<string, GameObject> _spawnedModels = new();

    /// <summary>
    /// Destroys a GameObject using the appropriate method for the current
    /// context: DestroyImmediate in EditMode (EditMode tests), Destroy otherwise.
    /// Safe to call with null — is a no-op.
    /// </summary>
    private void DestroyGo(GameObject go)
    {
        if (go == null) return;
        if (!Application.isPlaying) {
            DestroyImmediate(go);
        } else {
            Destroy(go);
        }
    }

    /// <summary>
    /// Spawns the given model GameObject at the specified pose with the given scale.
    /// If <paramref name="id"/> is non-null, the spawned instance is stored in a per-id
    /// registry so subsequent calls with different ids do not destroy each other.
    /// If <paramref name="id"/> is null, falls back to the single-model behaviour
    /// (replacing _currentModel on each spawn) for backwards compatibility.
    /// Returns the spawned model instance.
    /// </summary>
    public GameObject Spawn(GameObject modelPrefab, Vector3 position,
        Vector3 rotation, Vector3 scale, string id = null) {
        if (modelPrefab == null) {
            UnityEngine.Debug.LogError("[ModelSpawner] Prefab is null");
            return null;
        }

        try {
            if (id != null) {
                if (_spawnedModels.TryGetValue(id, out var existing) && existing != null) {
                    DestroyGo(existing);
                    _spawnedModels.Remove(id);
                }
            } else if (_currentModel != null) {
                DestroyGo(_currentModel);
            }

            var spawned = Instantiate(modelPrefab, position, Quaternion.Euler(rotation));
            spawned.transform.localScale = scale;
            spawned.SetActive(true);

            if (id != null) {
                _spawnedModels[id] = spawned;
            } else {
                _currentModel = spawned;
            }

            UnityEngine.Debug.Log($"[ModelSpawner] Spawned (id={id ?? "<none>"}) at {position}, scale={scale}");
            return spawned;
        } catch (Exception ex) {
            UnityEngine.Debug.LogError($"[ModelSpawner] Spawn failed: {ex.Message}");
            RNEventEmitter.Instance.SendEvent("onError", new {
                code = "MODEL_LOAD_FAILED",
                message = $"Model spawn failed: {ex.Message}"
            });
            return null;
        }
    }

    /// <summary>
    /// Spawns the model as a child of the given ARTrackedImage so it tracks
    /// the physical card in world space. Returns the spawned model instance.
    /// </summary>
    public GameObject SpawnOnTrackedImage(GameObject modelPrefab, ARTrackedImage trackedImage,
        Vector3 rotation, Vector3 scale) {
        if (modelPrefab == null) {
            UnityEngine.Debug.LogError("[ModelSpawner] Prefab is null");
            return null;
        }
        if (trackedImage == null) {
            UnityEngine.Debug.LogError("[ModelSpawner] TrackedImage is null");
            return null;
        }

        try {
            var id = trackedImage.referenceImage.name;
            if (_spawnedModels.TryGetValue(id, out var existing) && existing != null) {
                DestroyGo(existing);
                _spawnedModels.Remove(id);
            }

            var spawned = Instantiate(modelPrefab, trackedImage.transform);
            spawned.transform.localPosition = Vector3.zero;
            spawned.transform.localRotation = Quaternion.Euler(rotation);
            spawned.transform.localScale = scale;
            spawned.SetActive(true);

            _spawnedModels[id] = spawned;
            UnityEngine.Debug.Log($"[ModelSpawner] SpawnOnTrackedImage (id={id}) at tracked image");
            return spawned;
        } catch (Exception ex) {
            UnityEngine.Debug.LogError($"[ModelSpawner] SpawnOnTrackedImage failed: {ex.Message}");
            return null;
        }
    }

    /// <summary>
    /// Updates the scale of the currently spawned model.
    /// </summary>
    public void SetScale(Vector3 scale) {
        if (_currentModel != null) {
            _currentModel.transform.localScale = scale;
        }
    }

    /// <summary>
    /// Updates the rotation of the currently spawned model.
    /// </summary>
    public void SetRotation(Vector3 euler) {
        if (_currentModel != null) {
            _currentModel.transform.rotation = Quaternion.Euler(euler);
        }
    }

    /// <summary>
    /// Destroys all spawned models (both the single-model slot and the id-keyed registry).
    /// </summary>
    public void Clear() {
        if (_currentModel != null) {
            DestroyGo(_currentModel);
            _currentModel = null;
        }
        foreach (var kv in _spawnedModels) {
            if (kv.Value != null) DestroyGo(kv.Value);
        }
        _spawnedModels.Clear();
    }

    /// <summary>
    /// Destroys a single spawned model by id. Returns true if a model was found and destroyed.
    /// </summary>
    public bool ClearById(string id) {
        if (id == null) return false;
        if (_spawnedModels.TryGetValue(id, out var go) && go != null) {
            DestroyGo(go);
            _spawnedModels.Remove(id);
            return true;
        }
        return false;
    }
}
