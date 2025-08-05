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
    <div className="flex flex-col items-center gap-4 p-4">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="rounded-xl border w-full max-w-md shadow-lg aspect-video bg-black"
      />

      <canvas ref={canvasRef} className="hidden" />

      <button
        onClick={handleScan}
        onTouchStart={handleScan}
        disabled={scanning || !cameraReady}
        className={`bg-green-500 hover:bg-green-600 text-white font-semibold px-6 py-2 rounded-xl shadow-md transition-transform duration-150 active:scale-95 ${
          !cameraReady ? "opacity-50 cursor-not-allowed" : ""
        }`}
      >
        {scanning
          ? "🔍 Đang quét..."
          : cameraReady
          ? "📸 Scan QR"
          : "📷 Đợi camera..."}
      </button>

      {result && (
        <div className="mt-4 text-center bg-white p-4 rounded-lg shadow-md w-full max-w-md">
          <p className="font-semibold text-gray-800">QR ID: {result.qr_id}</p>
          {result.ar_object && (
            <p className="text-sm text-gray-600">
              AR Object: {result.ar_object.tag}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default CameraCapture;
