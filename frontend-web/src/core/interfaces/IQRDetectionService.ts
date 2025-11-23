// src/core/interfaces/IQRDetectionService.ts
/**
 * QR Detection Service Interface
 * Continuous QR scanning service
 */
export interface IQRDetectionService {
  /**
   * Start QR detection loop
   */
  start(video: HTMLVideoElement): void;
  
  /**
   * Stop QR detection loop
   */
  stop(): void;
  
  /**
   * Check if service is running
   */
  isRunning(): boolean;
  
  /**
   * Set scan interval (milliseconds)
   */
  setScanInterval(interval: number): void;

  /**
   * Get last detected QR code
   */
  getLastDetected(): string | null;
}