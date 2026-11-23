// src/adapters/ZxingQRDecoder.ts
import { DetectQRService } from '@/services/DetectQrService';
import type { IQRDecoder } from '@/core/interfaces/IQRDecoder';

/**
 * Adapter: Wrap DetectQRService to implement IQRDecoder
 */
export class ZxingQRDecoder implements IQRDecoder {
  private service: DetectQRService;

  constructor() {
    this.service = new DetectQRService();
  }

  async decodeFromVideo(video: HTMLVideoElement): Promise<string | null> {
    return this.service.decodeFromVideo(video);
  }
}