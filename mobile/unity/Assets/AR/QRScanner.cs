using System;
using System.Collections;
using System.Collections.Generic;
using Unity.Collections;
using Unity.XR.CoreUtils;
using UnityEngine;
using UnityEngine.XR.ARFoundation;
using UnityEngine.XR.ARSubsystems;
using ZXing;
using ZXing.Common;
using ZXing.QrCode;

/// <summary>
/// Decodes QR codes from the AR camera feed using ZXing.
///
/// This scanner runs while the ARScene is active. It does NOT replace native
/// image tracking (ARTrackedImageManager); it is the discovery layer that converts
/// a physical QR code into a business qrId, which RN resolves via the backend.
///
/// Ownership: Unity owns QR discovery while ARScene is active.
///
/// Deduplication: once a qrId has been resolved by RN (card is REGISTERED),
/// future detections are suppressed until the card is unregistered.
///
/// The scanner is NOT a fallback for QR-only flows — RN may retain QR scanning
/// for non-AR screens. During active ARScene, Unity owns the camera.
/// </summary>
[RequireComponent(typeof(XROrigin))]
public class QRScanner : MonoBehaviour
{
    [Header("Scan settings")]
    [Tooltip("Minimum seconds between consecutive scan attempts. Conservative throttle prevents over-scanning.")]
    [SerializeField] private float scanIntervalSeconds = 0.5f;

    [Header("Reader settings")]
    [Tooltip("Try harder to decode at the cost of speed. Disable if CPU is a bottleneck.")]
    [SerializeField] private bool tryHarder = true;

    /// <summary>Emitted when a QR code is decoded for the first time (not a duplicate).</summary>
    public event Action<string> OnQrDecoded;

    /// <summary>
    /// Internal state machine: which qrIds have been sent to RN for resolution.
    /// Once registered, a qrId stays in this set until explicitly cleared.
    /// </summary>
    private readonly HashSet<string> _pendingQrIds = new();

    private QRCodeReader _qrReader;
    private float _lastScanTime = float.NegativeInfinity;
    private bool _isScanning;
    private XROrigin _xrOrigin;
    private ARCameraManager _cameraManager;

    private void Awake()
    {
        _qrReader = new QRCodeReader();
    }

    private void OnEnable()
    {
        _xrOrigin = GetComponent<XROrigin>();
        if (_xrOrigin != null && _xrOrigin.Camera != null)
        {
            TrySetupCamera();
        }
        else
        {
            StartCoroutine(WaitForOrigin());
        }
    }

    private void OnDisable()
    {
        _isScanning = false;
        if (_cameraManager != null)
        {
            _cameraManager.frameReceived -= OnCameraFrameReceived;
        }
    }

    private IEnumerator WaitForOrigin()
    {
        while (_xrOrigin == null || _xrOrigin.Camera == null)
        {
            if (!isActiveAndEnabled) yield break;
            yield return null;
        }
        TrySetupCamera();
    }

    private void TrySetupCamera()
    {
        var cam = _xrOrigin?.Camera;
        if (cam == null) return;

        _cameraManager = cam.GetComponent<ARCameraManager>();
        if (_cameraManager == null)
            _cameraManager = cam.gameObject.AddComponent<ARCameraManager>();

        _cameraManager.frameReceived += OnCameraFrameReceived;
        _isScanning = true;
        Debug.Log("[QRScanner] Camera manager ready, scanning enabled");
    }

    private void OnCameraFrameReceived(ARCameraFrameEventArgs frameEventArgs)
    {
        if (!_isScanning) return;
        if (Time.time - _lastScanTime < scanIntervalSeconds) return;

        _lastScanTime = Time.time;

        // TryAcquireLatestCpuImage is on ARCameraManager, not ARCameraFrameEventArgs
        if (_cameraManager.TryAcquireLatestCpuImage(out var image))
        {
            StartCoroutine(ProcessImage(image));
            image.Dispose();
        }
    }

    private IEnumerator ProcessImage(XRCpuImage image)
    {
        var width = image.width;
        var height = image.height;

        if (width < 64 || height < 64) yield break;

        // Use the convenience constructor: ConversionParams(image, format, transformation)
        var convParams = new XRCpuImage.ConversionParams(
            image,
            TextureFormat.RGB24,
            XRCpuImage.Transformation.None);

        var outputSize = image.GetConvertedDataSize(convParams);
        var pixelBuffer = new NativeArray<byte>(outputSize, Allocator.Temp);

        try
        {
            image.Convert(convParams, pixelBuffer);
        }
        catch (Exception ex)
        {
            Debug.LogWarning($"[QRScanner] XRCpuImage.Convert failed: {ex.Message}");
            pixelBuffer.Dispose();
            yield break;
        }

        // Feed RGB24 bytes to ZXing
        var source = new RGBLuminanceSource(pixelBuffer.ToArray(), width, height, RGBLuminanceSource.BitmapFormat.RGB24);
        var binarizer = new HybridBinarizer(source);
        var bitmap = new BinaryBitmap(binarizer);

        Result result = null;
        try
        {
            result = _qrReader.decode(bitmap);
        }
        catch (Exception ex)
        {
            Debug.LogWarning($"[QRScanner] Decode failed: {ex.Message}");
        }

        pixelBuffer.Dispose();

        if (result != null)
        {
            EmitQrDecoded(result.Text);
        }

        yield break;
    }

    private void EmitQrDecoded(string qrId)
    {
        if (string.IsNullOrEmpty(qrId)) return;

        qrId = qrId.Trim();

        if (_pendingQrIds.Contains(qrId))
        {
            Debug.Log($"[QRScanner] Duplicate QR: '{qrId}' — ignored");
            return;
        }

        _pendingQrIds.Add(qrId);
        Debug.Log($"[QRScanner] QR decoded: '{qrId}' — emitting OnQrDecoded");

        OnQrDecoded?.Invoke(qrId);
        RNEventEmitter.Instance.SendEvent("onQrDecoded", new { qrId });
    }

    /// <summary>
    /// Called by RN when the card has been resolved (registered or rejected).
    /// If rejected, the qrId is removed so RN can retry.
    /// </summary>
    public void OnCardResolved(string qrId, bool registered)
    {
        if (string.IsNullOrEmpty(qrId)) return;
        if (!registered)
        {
            _pendingQrIds.Remove(qrId);
            Debug.Log($"[QRScanner] Card '{qrId}' was rejected — unlocked for retry");
        }
    }

    /// <summary>
    /// Called by RN when a card is unregistered (e.g., lesson exited).
    /// Clears the qrId so it can be re-resolved on the next session.
    /// </summary>
    public void UnregisterQrId(string qrId)
    {
        if (string.IsNullOrEmpty(qrId)) return;
        if (_pendingQrIds.Remove(qrId))
        {
            Debug.Log($"[QRScanner] Unregistered qrId: '{qrId}'");
        }
    }

    /// <summary>Clears all pending qrIds. Use on session start.</summary>
    public void ClearPending()
    {
        _pendingQrIds.Clear();
        Debug.Log("[QRScanner] Cleared all pending qrIds");
    }
}
