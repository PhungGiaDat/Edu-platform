import { useRef, useEffect, useState } from "react";
import { detectQR } from "../services/DetectQrService";

const CameraCapture = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [cameraReady, setCameraReady] = useState(false);

  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });

        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          video.setAttribute("playsinline", "");
          video.setAttribute("autoplay", "");
          video.setAttribute("muted", "");

          video.onloadedmetadata = () => {
            video.play().then(() => {
              setCameraReady(true);
              alert("📸 Camera đã sẵn sàng!");
            }).catch((err) => {
              alert("⚠️ Không thể auto play video: " + err.message);
            });
          };
        }
      } catch (err) {
        alert("🚫 Không thể mở camera: " + (err as any).message);
      }
    };

    startCamera();
  }, []);

  const handleScan = async () => {
    alert("🟢 Bắt đầu quét QR...");

    if (!videoRef.current || !canvasRef.current || !cameraReady) {
      alert("⚠️ Video chưa sẵn sàng hoặc lỗi DOM");
      return;
    }

    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    const video = videoRef.current;

    const vw = video.videoWidth;
    const vh = video.videoHeight;

    if (vw === 0 || vh === 0) {
      alert("⚠️ Video chưa load xong");
      return;
    }

    canvas.width = vw;
    canvas.height = vh;
    context?.drawImage(video, 0, 0, vw, vh);

    alert("🧠 Đã vẽ xong frame lên canvas");

    canvas.toBlob(async (blob) => {
      if (!blob) {
        alert("❌ Không tạo được blob từ ảnh");
        return;
      }

      alert("📤 Đang gửi ảnh lên server...");

      setScanning(true);
      try {
        const data = await detectQR(blob);
        setResult(data);
        alert("✅ Server trả về: " + JSON.stringify(data));
      } catch (err) {
        setResult(null);
        alert("❌ Không tìm thấy mã QR hoặc server lỗi");
      } finally {
        setScanning(false);
      }
    }, "image/jpeg");
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Camera Preview Card */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Video Container */}
        <div className="relative aspect-video bg-gray-900 rounded-t-2xl overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
          />
          
          {/* Overlay for better UI feedback */}
          <div className="absolute inset-0 border-4 border-dashed border-white border-opacity-30 m-4 rounded-lg flex items-center justify-center">
            {!cameraReady && (
              <div className="text-white text-center">
                <div className="animate-spin text-4xl mb-2">📷</div>
                <p className="text-sm">Starting camera...</p>
              </div>
            )}
          </div>
        </div>

        {/* Controls Section */}
        <div className="p-6 space-y-4">
          <button
            onClick={handleScan}
            onTouchStart={handleScan}
            disabled={scanning || !cameraReady}
            className={`w-full py-4 px-6 rounded-xl font-semibold text-white text-lg shadow-lg transition-all duration-200 transform ${
              !cameraReady 
                ? "bg-gray-400 cursor-not-allowed" 
                : scanning
                ? "bg-yellow-500 animate-pulse"
                : "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 active:scale-95 hover:shadow-xl"
            }`}
          >
            {scanning
              ? "🔍 Scanning QR Code..."
              : cameraReady
              ? "📸 Scan QR Code"
              : "📷 Waiting for camera..."}
          </button>

          {/* Status indicator */}
          <div className="text-center text-sm text-gray-600">
            {cameraReady ? (
              <span className="text-green-600">✅ Camera ready - Point at QR code and tap scan</span>
            ) : (
              <span className="text-yellow-600">⏳ Initializing camera...</span>
            )}
          </div>
        </div>
      </div>

      {/* Results Section */}
      {result && (
        <div className="mt-6 bg-white rounded-2xl shadow-xl p-6">
          <div className="text-center">
            <div className="text-4xl mb-3">🎯</div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">QR Code Detected!</h3>
            
            <div className="bg-gray-50 rounded-xl p-4 text-left space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 font-medium">QR ID:</span>
                <span className="text-gray-900 font-mono text-sm bg-white px-2 py-1 rounded">{result.qr_id}</span>
              </div>
              
              {result.ar_object && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 font-medium">AR Object:</span>
                    <span className="text-green-600 font-semibold">{result.ar_object.tag}</span>
                  </div>
                  
                  {result.ar_object.model_url && (
                    <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-green-800 text-sm font-medium mb-2">🎉 AR Model Ready!</p>
                      <p className="text-green-700 text-xs">
                        Model URL: <span className="font-mono text-xs break-all">{result.ar_object.model_url}</span>
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Action Button */}
            <div className="mt-6">
              <a 
                href="/ar" 
                className="inline-block bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg transition-all duration-200 transform hover:scale-105"
              >
                🔮 View in AR
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Hidden canvas for image processing */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default CameraCapture;
