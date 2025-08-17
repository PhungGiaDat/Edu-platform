import { useEffect, useRef, useState } from 'react';
import ARSceneMindAR from '../components/ARSceneMindAR';
import type { ARObjectData } from '../components/ARSceneMindAR';
import { detectQRService } from '../services/DetectQrService';
import { captureFrame } from '../services/RealtimeQRServices';
import { VerifySocket } from '../services/WebSocketQRServices';
import type { VerifyResult } from '../services/WebSocketQRServices';

/**
 * Types for API response
 */
type FlashcardResponse = {
  qr_id: string;
  word: string;
  image_url: string;
  audio_url?: string;
  translation: Record<string, string>;
  ar_object: {
    tag: string;
    mind_file_url: string;
    model_3d_url: string;
    position: string;
    rotation: string;
    scale: string;
  };
};

/**
 * Environment configuration with proper URL construction
 */
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';
const WS_BASE = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';

/**
 * Main AR Learning Page Component
 * Implements the new flow: Local QR decode → Fetch metadata → Render immediately → Verify periodically
 */
export default function LearnAR() {
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const verifySocketRef = useRef<VerifySocket>();
  const verifyTimerRef = useRef<number>();
  const qrScanTimerRef = useRef<number>();
  const cameraInitialized = useRef(false); // << THÊM DÒNG NÀY để tránh lỗi camera AbortError

  // State
  const [currentQrId, setCurrentQrId] = useState<string | null>(null);
  const [flashcardData, setFlashcardData] = useState<FlashcardResponse | null>(null);
  const [arObjects, setARObjects] = useState<ARObjectData[]>([]);
  const [isARVisible, setIsARVisible] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [lastQrScanTime, setLastQrScanTime] = useState<number>(0);
  
  // State MỚI: để giữ tham chiếu đến video của MindAR cho việc xác thực
  const [arVideo, setArVideo] = useState<HTMLVideoElement | null>(null);

  // Constants
  const QR_SCAN_INTERVAL = 1000; // 1 second
  const VERIFY_INTERVAL = 8000; // 8 seconds
  const MIN_QR_SCAN_COOLDOWN = 2000; // 2 seconds between QR changes

  /**
   * Initialize camera stream
   */
  useEffect(() => {
    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          console.log('📷 Camera initialized successfully');
        }
      } catch (error) {
        console.error('❌ Camera initialization failed:', error);
        setCameraError('Cannot access camera. Please check permissions.');
      }
    };

    // THÊM ĐIỀU KIỆN KIỂM TRA NÀY để tránh lỗi camera AbortError
    if (!cameraInitialized.current) {
      initCamera();
      cameraInitialized.current = true;
    }

    // Cleanup camera on unmount
    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []); // Dependency array rỗng là đúng

  /**
   * Fetch flashcard data from API
   */
  const fetchFlashcardData = async (qrId: string): Promise<FlashcardResponse | null> => {
    try {
      console.log(`🔍 Fetching data for QR ID: ${qrId}`);
      
      const response = await fetch(`${API_BASE}/api/flashcard/${qrId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          console.warn(`⚠️ QR ID ${qrId} not found`);
          return null;
        }
        throw new Error(`API error: ${response.status}`);
      }

      const data: FlashcardResponse = await response.json();
      console.log('✅ Flashcard data fetched:', data);
      
      return data;
    } catch (error) {
      console.error('❌ Failed to fetch flashcard data:', error);
      return null;
    }
  };

  /**
   * Handle new QR code detection - SỬA ĐỔI QUAN TRỌNG
   */
  const handleQRDetected = async (qrId: string) => {
    const now = Date.now();
    
    // Prevent rapid QR switching
    if (qrId === currentQrId || (now - lastQrScanTime) < MIN_QR_SCAN_COOLDOWN) {
      return;
    }

    setLastQrScanTime(now);
    console.log(`🎯 New QR detected: ${qrId}`);

    // Fetch new flashcard data
    const data = await fetchFlashcardData(qrId);
    
    if (data) {
      // BƯỚC 1: Giải phóng camera mà LearnAR đang giữ
      console.log('🔄 Releasing camera from QR scanner...');
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null; // Quan trọng
      }

      setCurrentQrId(qrId);
      setFlashcardData(data);
      
      // Convert to AR object format
      const arObjectData: ARObjectData = {
        mind_file_url: `${API_BASE}${data.ar_object.mind_file_url}`,
        model_3d_url: `${API_BASE}${data.ar_object.model_3d_url}`,
        position: data.ar_object.position,
        rotation: data.ar_object.rotation,
        scale: data.ar_object.scale
      };
      
      setARObjects([arObjectData]);

      // BƯỚC 2: Bật AR Scene. Bây giờ MindAR có thể truy cập camera
      setIsARVisible(true);
      
      console.log('🎨 AR scene updated and will be visible');
    } else {
      // Reset if no valid data
      setCurrentQrId(null);
      setFlashcardData(null);
      setARObjects([]);
      setIsARVisible(false);
    }
  };

  /**
   * Start continuous QR scanning
   */
  useEffect(() => {
    if (!videoRef.current) return;

    const startQRScanning = () => {
      const scanLoop = async () => {
        if (!videoRef.current) return;

        try {
          const qrCode = await detectQRService.decodeFromVideo(videoRef.current);
          if (qrCode) {
            await handleQRDetected(qrCode);
          }
        } catch (error) {
          // Silent fail for QR scanning
        }
      };

      scanLoop(); // Initial scan
      qrScanTimerRef.current = window.setInterval(scanLoop, QR_SCAN_INTERVAL);
    };

    // Start scanning when video is ready
    if (videoRef.current.readyState >= 2) {
      startQRScanning();
    } else {
      videoRef.current.addEventListener('loadeddata', startQRScanning);
    }

    return () => {
      if (qrScanTimerRef.current) {
        clearInterval(qrScanTimerRef.current);
      }
    };
  }, []);

  /**
   * Initialize verification WebSocket - SỬA ĐỔI QUAN TRỌNG
   */
  useEffect(() => {
    // Chỉ chạy khi có QR ID và video của MindAR đã sẵn sàng
    if (!currentQrId || !arVideo) return; 

    const initVerificationSocket = async () => {
      try {
        console.log('🔗 Initializing WebSocket with base URL:', WS_BASE);
        
        // Create verification socket with proper URL construction
        const socket = new VerifySocket(
          WS_BASE, // Just pass the base URL, service will append /ws/verify
          (result: VerifyResult) => {
            console.log('📨 Verification result:', result);
            
            if (result.qr_id === currentQrId && !result.valid) {
              console.warn('⚠️ Verification failed - hiding AR model');
              setIsARVisible(false);
              setFlashcardData(null);
              setCurrentQrId(null);
              setARObjects([]);
            }
          },
          (error) => {
            console.error('❌ WebSocket error:', error);
            setWsConnected(false);
          },
          () => {
            console.log('🔗 Verification WebSocket connected');
            setWsConnected(true);
          },
          () => {
            console.log('🔌 Verification WebSocket disconnected');
            setWsConnected(false);
          }
        );

        await socket.connect();
        verifySocketRef.current = socket;

        // Sửa đổi phần startVerification để dùng video từ MindAR
        const startVerification = async () => {
          if (!arVideo || !socket.connected) return; // DÙNG arVideo

          try {
            const frameBlob = await captureFrame(arVideo, 'image/jpeg', 0.92); // DÙNG arVideo
            socket.sendFrame(currentQrId, frameBlob);
            console.log('📤 Sent frame for verification from AR video');
          } catch (error) {
            console.warn('Frame capture failed:', error);
          }
        };

        // Initial verification after 2 seconds
        setTimeout(startVerification, 2000);
        
        // Periodic verification
        verifyTimerRef.current = window.setInterval(startVerification, VERIFY_INTERVAL);

      } catch (error) {
        console.error('❌ Failed to initialize verification:', error);
      }
    };

    initVerificationSocket();

    // Cleanup
    return () => {
      if (verifyTimerRef.current) {
        clearInterval(verifyTimerRef.current);
      }
      if (verifySocketRef.current) {
        verifySocketRef.current.close();
      }
    };
  }, [currentQrId, arVideo]); // Thêm arVideo vào dependency array

  /**
   * Handle AR scene events
   */
  const handleARReady = () => {
    console.log('🚀 AR scene ready');
  };

  const handleARFound = (targetIndex: number) => {
    console.log(`🎯 AR target ${targetIndex} found`);
  };

  const handleARLost = (targetIndex: number) => {
    console.log(`🎯 AR target ${targetIndex} lost`);
  };

  const handleARError = (error: Error) => {
    console.error('❌ AR scene error:', error);
  };

  return (
    <div className="w-screen h-screen relative bg-black overflow-hidden">
      {/* 1. Camera Video (dùng cho QR scan ban đầu) */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        playsInline
        muted
        autoPlay
        style={{ visibility: isARVisible ? 'hidden' : 'visible' }}
      />

      {/* 2. Lớp AR Scene (hiển thị khi có AR) */}
      {isARVisible && arObjects.length > 0 && (
        <ARSceneMindAR
          arObjects={arObjects}
          isVisible={isARVisible}
          onVideoReady={(video) => setArVideo(video)}
          onReady={handleARReady}
          onFound={handleARFound}
          onLost={handleARLost}
          onError={handleARError}
          maxTrack={1}
          className="absolute inset-0 w-full h-full"
        />
      )}

      {/* 3. Toàn bộ thông tin debug và status đã được comment out */}
      {/* --- BẮT ĐẦU KHỐI DEBUG UI ĐÃ ẨN --- */}
      {/* <div className="absolute top-4 left-4 right-4 z-20 flex flex-col gap-2">

        // Phần hiển thị status kết nối và thông tin thẻ
        <div className="flex items-center gap-2">
           <div className={`w-3 h-3 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`} />
           <span className="text-white text-sm font-medium">
             {wsConnected ? 'Connected' : 'Disconnected'}
           </span>
         </div>
         {flashcardData && (
           <div className="bg-black bg-opacity-60 rounded-lg p-3 text-white">
             <div className="text-lg font-bold">{flashcardData.word}</div>
             <div className="text-sm opacity-80">
               {Object.entries(flashcardData.translation).map(([lang, translation]) => (
                 <div key={lang}>
                   <span className="uppercase font-medium">{lang}:</span> {translation}
                 </div>
               ))}
             </div>
           </div>
         )}

        // Phần hiển thị lỗi camera 
         {cameraError && (
           <div className="bg-red-500 bg-opacity-90 rounded-lg p-3 text-white text-sm">
             <div className="font-medium">Camera Error</div>
             <div>{cameraError}</div>
           </div>
         )}
        
        // Phần hiển thị thông tin debug chi tiết
        <div className="bg-blue-500 bg-opacity-60 rounded-lg p-2 text-white text-xs">
           <div>WS Base: {WS_BASE}</div>
           <div>Status: {wsConnected ? 'Connected' : 'Disconnected'}</div>
           <div>AR Video: {arVideo ? 'Ready' : 'Not ready'}</div>
           <div>QR Scan Video: {videoRef.current?.srcObject ? 'Active' : 'Inactive'}</div>
        </div>

      </div> 
      */}

      {/* // Phần hướng dẫn ở cuối màn hình
      <div className="absolute bottom-4 left-4 right-4 z-20">
         <div className="bg-black bg-opacity-60 rounded-lg p-3 text-white text-sm text-center">
           {!currentQrId ? (
             "Point camera at a flashcard QR code to start AR experience"
           ) : isARVisible ? (
             "AR model active - point camera at flashcard to see 3D object"
           ) : (
             "Loading AR content..."
           )}
         </div>
      </div> 
      */}
      {/* --- KẾT THÚC KHỐI DEBUG UI ĐÃ ẨN --- */}

    </div>
  );
}