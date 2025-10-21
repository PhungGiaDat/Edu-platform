import { BrowserQRCodeReader } from '@zxing/library';

/**
 * Service for local QR code detection using @zxing/library
 * v3.0: Canvas-based detection to avoid video.play() conflicts
 * Provides fast, client-side QR decoding without server requests
 */
export class DetectQRService {
  private reader: BrowserQRCodeReader;
  private isDecoding: boolean = false;
  private canvas: HTMLCanvasElement | null = null;

  constructor() {
    this.reader = new BrowserQRCodeReader();
    this.canvas = document.createElement('canvas');
  }

  /**
   * Decode QR code from video element using canvas capture
   * ✅ FIX: Uses actual display size instead of videoWidth/videoHeight for better QR detection
   * @param video - HTML video element from camera stream
   * @returns Promise<string | null> - QR code content or null if no QR found
   */
  async decodeFromVideo(video: HTMLVideoElement): Promise<string | null> {
    // ✅ DEBUG: Add detailed logging
    const displayWidth = video.clientWidth || video.offsetWidth;
    const displayHeight = video.clientHeight || video.offsetHeight;
    
    console.log('🔍 DecodeFromVideo called:', {
      isDecoding: this.isDecoding,
      videoWidth: video.videoWidth,
      videoHeight: video.videoHeight,
      displayWidth,
      displayHeight,
      paused: video.paused,
      ended: video.ended,
      readyState: video.readyState,
      currentTime: video.currentTime
    });

    // Guard: Prevent concurrent decoding
    if (this.isDecoding) {
      console.log('⏸️ Already decoding, skipping...');
      return null;
    }

    // ✅ FIX: Check both video dimensions AND display dimensions
    if (!video.videoWidth || !video.videoHeight) {
      console.log('❌ Video has no intrinsic dimensions');
      return null;
    }

    if (!displayWidth || !displayHeight) {
      console.log('❌ Video has no display dimensions');
      return null;
    }

    // Guard: Check video is playing
    if (video.paused || video.ended || video.readyState < 2) {
      console.log('❌ Video not ready:', {
        paused: video.paused,
        ended: video.ended,
        readyState: video.readyState
      });
      return null;
    }

    console.log('✅ Starting QR decode process...');
    this.isDecoding = true;

    try {
      // Ensure canvas exists
      if (!this.canvas) {
        this.canvas = document.createElement('canvas');
      }

      // ✅ FIX: Use larger dimensions for better QR detection
      // Use display size but ensure minimum resolution for QR detection
      const targetWidth = Math.max(displayWidth, video.videoWidth, 640);
      const targetHeight = Math.max(displayHeight, video.videoHeight, 480);

      this.canvas.width = targetWidth;
      this.canvas.height = targetHeight;

      // Get canvas context with optimized settings
      const ctx = this.canvas.getContext('2d', { 
        willReadFrequently: true,
        alpha: false 
      });

      if (!ctx) {
        console.log('❌ Cannot get canvas context');
        return null;
      }

      // ✅ FIX: Scale video to fill canvas for better quality
      ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
      console.log(`📸 Frame captured to canvas: ${targetWidth}x${targetHeight}`);

      // Decode from canvas
      const result = await this.decodeFromCanvas(this.canvas);
      
      if (result) {
        console.log('🎯 QR Code found:', result);
      } else {
        console.log('🔍 No QR code detected in this frame');
      }
      
      return result;
    } catch (error) {
      console.log('❌ Decode error:', error);
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
    // ✅ REMOVE this check - it's already handled in decodeFromVideo
    // if (this.isDecoding) {
    //   return null;
    // }

    // ✅ REMOVE this - already set in decodeFromVideo
    // this.isDecoding = true;

    try {
      // Convert canvas to data URL and create an image element
      const dataUrl = canvas.toDataURL('image/png');
      const img = new Image();
      
      return new Promise<string | null>((resolve) => {
        img.onload = async () => {
          try {
            const result = await this.reader.decodeFromImageElement(img);
            resolve(result?.getText() ?? null);
          } catch (error) {
            resolve(null);
          }
          // ✅ REMOVE this - isDecoding is managed by decodeFromVideo
          // finally {
          //   this.isDecoding = false;
          // }
        };
        
        img.onerror = () => {
          // ✅ REMOVE this - isDecoding is managed by decodeFromVideo
          // this.isDecoding = false;
          resolve(null);
        };
        
        img.src = dataUrl;
      });
    } catch (error) {
      // ✅ REMOVE this - isDecoding is managed by decodeFromVideo
      // this.isDecoding = false;
      return null;
    }
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
    if (this.canvas) {
      this.canvas.remove();
      this.canvas = null;
    }
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

// ============================================================================
// NEW API: Verify QR code with backend
// ============================================================================

const BASE_URL = import.meta.env.VITE_BACKEND_API;

/**
 * Verify QR code with backend
 * @param qrId - QR code ID to verify
 * @returns Promise with verification result
 */
export const verifyQRCode = async (qrId: string) => {
  try {
    const res = await fetch(`${BASE_URL}/api/verify_qr`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ qr_id: qrId }),
    });

    if (!res.ok) {
      throw new Error(`Verification failed: ${res.status}`);
    }

    return await res.json();
  } catch (error) {
    console.error("❌ QR verification error:", error);
    throw error;
  }
};

/**
 * Fetch AR data for a QR code
 * @param qrId - QR code ID
 * @returns Promise with AR data (targets, combo, etc.)
 */
export const fetchARData = async (qrId: string) => {
  try {
    const res = await fetch(`${BASE_URL}/api/ar_data/${qrId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch AR data: ${res.status}`);
    }

    return await res.json();
  } catch (error) {
    console.error("❌ AR data fetch error:", error);
    throw error;
  }
};

// ============================================================================
// DEPRECATED: Legacy API (kept for backward compatibility)
// ============================================================================

/**
 * @deprecated Use verifyQRCode instead
 * Legacy function that detects QR from image blob
 */
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