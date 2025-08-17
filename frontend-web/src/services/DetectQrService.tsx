import { BrowserQRCodeReader } from '@zxing/library';

/**
 * Service for local QR code detection using @zxing/library
 * Provides fast, client-side QR decoding without server requests
 */
export class DetectQRService {
  private reader: BrowserQRCodeReader;
  private isDecoding: boolean = false;

  constructor() {
    this.reader = new BrowserQRCodeReader();
  }

  /**
   * Decode QR code from video element
   * @param video - HTML video element from camera stream
   * @returns Promise<string | null> - QR code content or null if no QR found
   */
  async decodeFromVideo(video: HTMLVideoElement): Promise<string | null> {
    if (this.isDecoding || !video.videoWidth || !video.videoHeight) {
      return null;
    }

    this.isDecoding = true;
    
    try {
      const result = await this.reader.decodeFromVideoElement(video);
      return result?.getText() ?? null;
    } catch (error) {
      // No QR code found or decode error - this is normal
      return null;
    } finally {
      this.isDecoding = false;
    }
  }

  /**
   * Decode QR code from canvas element
   * @param canvas - HTML canvas element containing image data
   * @returns Promise<string | null> - QR code content or null if no QR found
   */
  async decodeFromCanvas(canvas: HTMLCanvasElement): Promise<string | null> {
    if (this.isDecoding) {
      return null;
    }

    this.isDecoding = true;

    try {
      // Convert canvas to data URL and create image element
      const dataUrl = canvas.toDataURL('image/png');
      const img = new Image();
      
      return new Promise((resolve) => {
        img.onload = async () => {
          try {
            const result = await this.reader.decodeFromImage(img);
            resolve(result?.getText() ?? null);
          } catch {
            resolve(null);
          }
        };
        img.onerror = () => resolve(null);
        img.src = dataUrl;
      });
    } catch (error) {
      return null;
    } finally {
      this.isDecoding = false;
    }
  }

  /**
   * Start continuous QR detection from video stream
   * @param video - HTML video element
   * @param callback - Function to call when QR is detected
   * @param interval - Detection interval in milliseconds (default: 500ms)
   * @returns Function to stop detection
   */
  startContinuousDetection(
    video: HTMLVideoElement, 
    callback: (qrCode: string) => void,
    interval: number = 500
  ): () => void {
    let isRunning = true;
    
    const detect = async () => {
      if (!isRunning) return;
      
      const qrCode = await this.decodeFromVideo(video);
      if (qrCode) {
        callback(qrCode);
      }
      
      if (isRunning) {
        setTimeout(detect, interval);
      }
    };

    detect();
    
    return () => {
      isRunning = false;
    };
  }

  /**
   * Reset the QR reader state
   */
  reset(): void {
    this.reader.reset();
    this.isDecoding = false;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.reset();
  }
}

/**
 * Singleton instance for global use
 */
export const detectQRService = new DetectQRService();

/**
 * Helper function for one-time QR detection
 * @param video - HTML video element
 * @returns Promise<string | null> - QR code content or null
 */
export async function decodeFromVideo(video: HTMLVideoElement): Promise<string | null> {
  return detectQRService.decodeFromVideo(video);
}

// Legacy API detection function (keep for backward compatibility if needed)
const BASE_URL = import.meta.env.VITE_BACKEND_API;

export const detectQR = async (imageBlob: Blob) => {
  const formData = new FormData();
  formData.append("file", imageBlob, "frame.jpg");

  try {
    const res = await fetch(`${BASE_URL}/api/detect_qr`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) throw new Error("Lỗi khi gọi API detect_qr");

    return await res.json();
  } catch (error) {
    console.error("❌ QR detection error:", error);
    throw error;
  }
};
