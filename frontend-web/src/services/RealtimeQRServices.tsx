/**
 * Service for real-time frame capture from video stream
 * Provides utilities to capture frames for verification purposes
 */

export type FrameFormat = 'image/jpeg' | 'image/png' | 'image/webp';

/**
 * Capture a single frame from video element as Blob
 * @param video - HTML video element from camera stream
 * @param format - Image format (default: 'image/jpeg')
 * @param quality - Image quality for JPEG (0-1, default: 0.92)
 * @returns Promise<Blob> - Frame as image blob
 */
export function captureFrame(
  video: HTMLVideoElement, 
  format: FrameFormat = 'image/jpeg',
  quality: number = 0.92
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Cannot get canvas context'));
        return;
      }
      
      // Draw current video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert canvas to blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to capture frame'));
          }
        }, 
        format, 
        quality
      );
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Capture frame as base64 data URL
 * @param video - HTML video element from camera stream
 * @param format - Image format (default: 'image/jpeg')
 * @param quality - Image quality for JPEG (0-1, default: 0.92)
 * @returns string - Frame as base64 data URL
 */
export function captureFrameAsDataURL(
  video: HTMLVideoElement,
  format: FrameFormat = 'image/jpeg',
  quality: number = 0.92
): string {
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Cannot get canvas context');
  }
  
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL(format, quality);
}

/**
 * Capture frame as Canvas element for further processing
 * @param video - HTML video element from camera stream
 * @returns HTMLCanvasElement - Frame as canvas element
 */
export function captureFrameAsCanvas(video: HTMLVideoElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Cannot get canvas context');
  }
  
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/**
 * Frame capture service class for managing periodic captures
 */
export class FrameCaptureService {
  private timerId?: ReturnType<typeof setTimeout>;
  private isCapturing: boolean = false;

  /**
   * Start periodic frame capture
   * @param video - HTML video element
   * @param callback - Function to call with captured frames
   * @param interval - Capture interval in milliseconds
   * @param format - Image format
   * @param quality - Image quality (for JPEG)
   */
  startPeriodicCapture(
    video: HTMLVideoElement,
    callback: (blob: Blob) => void,
    interval: number = 8000,
    format: FrameFormat = 'image/jpeg',
    quality: number = 0.92
  ): void {
    this.stopCapture();
    this.isCapturing = true;

    const capture = async () => {
      if (!this.isCapturing) return;

      try {
        const blob = await captureFrame(video, format, quality);
        callback(blob);
      } catch (error) {
        console.warn('Frame capture failed:', error);
      }

      if (this.isCapturing) {
        this.timerId = setTimeout(capture, interval);
      }
    };

    // Start first capture
    capture();
  }

  /**
   * Stop periodic capture
   */
  stopCapture(): void {
    this.isCapturing = false;
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = undefined;
    }
  }

  /**
   * Check if currently capturing
   */
  get capturing(): boolean {
    return this.isCapturing;
  }
}

/**
 * Utility function to resize frame for better performance
 * @param canvas - Source canvas
 * @param maxWidth - Maximum width (default: 640)
 * @param maxHeight - Maximum height (default: 480)
 * @returns HTMLCanvasElement - Resized canvas
 */
export function resizeFrame(
  canvas: HTMLCanvasElement, 
  maxWidth: number = 640, 
  maxHeight: number = 480
): HTMLCanvasElement {
  const { width, height } = canvas;
  
  // Calculate new dimensions maintaining aspect ratio
  let newWidth = width;
  let newHeight = height;
  
  if (width > maxWidth || height > maxHeight) {
    const aspectRatio = width / height;
    
    if (width > height) {
      newWidth = maxWidth;
      newHeight = maxWidth / aspectRatio;
    } else {
      newHeight = maxHeight;
      newWidth = maxHeight * aspectRatio;
    }
  }
  
  const resizedCanvas = document.createElement('canvas');
  resizedCanvas.width = newWidth;
  resizedCanvas.height = newHeight;
  
  const ctx = resizedCanvas.getContext('2d');
  if (!ctx) {
    throw new Error('Cannot get canvas context for resize');
  }
  
  ctx.drawImage(canvas, 0, 0, newWidth, newHeight);
  return resizedCanvas;
}
