using System;
using System.Threading.Tasks;
using UnityEngine;
using UnityEngine.Networking;

/// <summary>
/// Loads and plays audio clips from URLs via UnityWebRequest.
/// </summary>
public class ARAudioPlayer : MonoBehaviour
{
    private AudioSource _audioSource;

    private void Awake() {
        _audioSource = GetComponent<AudioSource>();
        if (_audioSource == null) {
            _audioSource = gameObject.AddComponent<AudioSource>();
        }
    }

    /// <summary>
    /// Downloads and plays an audio clip from the given URL.
    /// Emits onAudioComplete when playback finishes.
    /// </summary>
    public async Task PlayAudio(string url) {
        if (string.IsNullOrEmpty(url)) {
            UnityEngine.Debug.LogWarning("[ARAudioPlayer] Empty URL");
            return;
        }

        UnityEngine.Debug.Log($"[ARAudioPlayer] Playing: {url}");

        try {
            using var request = UnityWebRequestMultimedia.GetAudioClip(url, AudioType.MPEG);
            var operation = request.SendWebRequest();

            while (!operation.isDone) {
                await Task.Delay(100);
            }

            if (request.result != UnityWebRequest.Result.Success) {
                throw new Exception(request.error);
            }

            var clip = DownloadHandlerAudioClip.GetContent(request);
            _audioSource.clip = clip;
            _audioSource.Play();

            UnityEngine.Debug.Log("[ARAudioPlayer] Playback started");

            // Wait for playback to finish before emitting onAudioComplete
            await WaitForPlaybackEnd();

            RNEventEmitter.Instance.SendEvent("onAudioComplete", new { url });
        } catch (Exception ex) {
            var msg = $"Audio play failed: {ex.Message}";
            UnityEngine.Debug.LogError($"[ARAudioPlayer] {msg}");
            RNEventEmitter.Instance.SendEvent("onError", new {
                code = "NETWORK_ERROR",
                message = msg
            });
        }
    }

    private async Task WaitForPlaybackEnd() {
        if (_audioSource == null) return;
        while (_audioSource.isPlaying) {
            await Task.Delay(50);
        }
    }

    /// <summary>
    /// Stops currently playing audio.
    /// </summary>
    public void Stop() {
        if (_audioSource != null && _audioSource.isPlaying) {
            _audioSource.Stop();
        }
    }
}
