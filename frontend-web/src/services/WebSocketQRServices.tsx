const BASE_WS_URL = import.meta.env.VITE_BACKEND_WS_URL || "ws://localhost:8000";

export interface MindARTarget {
  targetId: number;
  model_url: string;
  scale: string;
  position: string;
  rotation: string;
  tag: string;
  description: string;
}

export interface QRDetectionResult {
  success: boolean;
  qr_id?: string;
  mind_file_url?: string;
  targets?: MindARTarget[];
  message?: string;
  error?: string;
}

// WebSocket-based QR scanning service for MindAR
export class RealtimeQRService {
  private ws: WebSocket | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private canvasElement: HTMLCanvasElement | null = null;
  private intervalId: number | null = null;
  private onDetection: (result: QRDetectionResult) => void;
  private onError: (error: Error) => void;
  private onConnectionChange: (connected: boolean) => void;
  private scanInterval: number;
  private isConnected: boolean = false;

  constructor(
    onDetection: (result: QRDetectionResult) => void,
    onError: (error: Error) => void,
    onConnectionChange: (connected: boolean) => void,
    scanInterval: number = 10000 // 10 seconds default
  ) {
    this.onDetection = onDetection;
    this.onError = onError;
    this.onConnectionChange = onConnectionChange;
    this.scanInterval = scanInterval;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = `${BASE_WS_URL}/api/wss/detect_qr`;
        console.log("🔌 Connecting to WebSocket:", wsUrl);
        
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log("✅ WebSocket connected");
          this.isConnected = true;
          this.onConnectionChange(true);
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const result: QRDetectionResult = JSON.parse(event.data);
            console.log("📨 Received WebSocket message:", result);
            
            if (result.success && result.qr_id && result.targets) {
              this.onDetection(result);
            } else if (result.error) {
              console.warn("⚠️ WebSocket error response:", result.error);
            }
            // Ignore "No QR code detected" messages - they're normal
          } catch (error) {
            console.error("❌ Error parsing WebSocket message:", error);
          }
        };

        this.ws.onerror = (error) => {
          console.error("❌ WebSocket error:", error);
          this.isConnected = false;
          this.onConnectionChange(false);
          this.onError(new Error("WebSocket connection error"));
        };

        this.ws.onclose = () => {
          console.log("🔌 WebSocket disconnected");
          this.isConnected = false;
          this.onConnectionChange(false);
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  initialize(videoElement: HTMLVideoElement) {
    this.videoElement = videoElement;
    
    // Create hidden canvas for frame capture
    this.canvasElement = document.createElement('canvas');
    this.canvasElement.style.display = 'none';
    document.body.appendChild(this.canvasElement);
  }

  startScanning() {
    if (!this.videoElement || !this.canvasElement || !this.isConnected) {
      this.onError(new Error("Video, canvas, or WebSocket not ready"));
      return;
    }

    this.intervalId = window.setInterval(() => {
      this.captureAndSend();
    }, this.scanInterval);

    console.log(`🔍 Started WebSocket QR scanning every ${this.scanInterval}ms`);
  }

  stopScanning() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log("⏹️ Stopped QR scanning");
    }
  }

  private async captureAndSend() {
    if (!this.videoElement || !this.canvasElement || !this.ws || !this.isConnected) {
      return;
    }

    try {
      const video = this.videoElement;
      const canvas = this.canvasElement;
      const context = canvas.getContext('2d');

      if (!context || video.videoWidth === 0 || video.videoHeight === 0) {
        return; // Video not ready yet
      }

      // Set canvas size to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw current frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert to base64
      const imageBase64 = canvas.toDataURL('image/jpeg', 0.8);

      // Send via WebSocket
      const message = {
        imageBase64: imageBase64
      };

      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(message));
        console.log("📤 Sent frame via WebSocket");
      }

    } catch (error) {
      console.error("❌ Error capturing and sending frame:", error);
      this.onError(error as Error);
    }
  }

  disconnect() {
    this.stopScanning();
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    if (this.canvasElement && this.canvasElement.parentNode) {
      this.canvasElement.parentNode.removeChild(this.canvasElement);
    }

    this.isConnected = false;
    this.onConnectionChange(false);
    console.log("🔌 Disconnected from WebSocket");
  }
}