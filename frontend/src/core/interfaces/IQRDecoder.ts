// src/core/interfaces/IQRDecoder.ts
/**
 * QR Decoder Interface
 * Contract for QR code decoding implementations
 */

export interface IQRDecoder {
  /**
   * Decode QR code from video element
   * @param video - HTML video element containing camera feed
   * @returns Promise resolving to QR code string or null if not found
   */
  decodeFromVideo(video: HTMLVideoElement): Promise<string | null>;
}