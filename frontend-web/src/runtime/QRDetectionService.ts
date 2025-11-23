// src/runtime/QRDetectionService.ts (UPDATE - Add getLastDetected)
import type { IQRDetectionService } from '@/core/interfaces/IQRDetectionService';
import type { IQRDecoder } from '@/core/interfaces/IQRDecoder';
import type { IEventBus } from '@/core/interfaces/IEventBus';
import { AREvent } from '@/core/types/AREvents';

/**
 * QR Detection Service Implementation
 * Continuously scans for QR codes independent of React lifecycle
 */
export class QRDetectionService implements IQRDetectionService {
  running: boolean = false;
  video: HTMLVideoElement | null = null;
  scanInterval: number = 500; // 500ms default
  timeoutId: number | null = null;
  lastDetectedQR: string | null = null;
  decoder: IQRDecoder;
  eventBus: IEventBus;

  constructor(decoder: IQRDecoder, eventBus: IEventBus) {
    this.decoder = decoder;
    this.eventBus = eventBus;
  }

  /**
   * Start QR detection loop
   */
  start(video: HTMLVideoElement): void {
    if (this.running) {
      console.warn('⚠️ QR Detection already running');
      return;
    }

    if (!video) {
      console.error('❌ Cannot start QR detection: No video element');
      return;
    }

    this.video = video;
    this.running = true;
    this.lastDetectedQR = null;
    
    console.log('🔍 QR Detection started', {
      scanInterval: this.scanInterval,
      videoReady: video.readyState
    });
    
    this.scanLoop();
  }

  /**
   * Stop QR detection loop
   */
  stop(): void {
    if (!this.running) {
      return;
    }

    this.running = false;
    this.video = null;
    
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    console.log('🛑 QR Detection stopped');
  }

  /**
   * Check if service is running
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Set scan interval
   */
  setScanInterval(interval: number): void {
    if (interval < 100) {
      console.warn('⚠️ Scan interval too low, setting to 100ms');
      interval = 100;
    }
    
    this.scanInterval = interval;
    console.log('⏱️ QR scan interval set to:', interval, 'ms');
  }

  /**
   * Get last detected QR code
   */
  getLastDetected(): string | null {
    return this.lastDetectedQR;
  }

  /**
   * Scan loop - runs continuously while service is running
   */
  private async scanLoop(): Promise<void> {
    if (!this.running || !this.video) {
      return;
    }

    try {
      // Only scan if video is ready
      if (this.video.readyState >= this.video.HAVE_CURRENT_DATA) {
        const result = await this.decoder.decodeFromVideo(this.video);
        
        if (result && result !== this.lastDetectedQR) {
          console.log('📱 QR Code detected:', result);
          this.lastDetectedQR = result;
          
          // Emit marker found event (QR is treated as marker)
          this.eventBus.emit(AREvent.MARKER_FOUND, {
            markerId: result,
            target: null
          });
        }
      }
    } catch (error) {
      // Ignore decode errors - they happen frequently when no QR is visible
      // Only log unexpected errors
      if (error instanceof Error && !error.message.includes('No QR code found')) {
        console.error('❌ QR Detection error:', error);
      }
    }

    // Schedule next scan
    if (this.running) {
      this.timeoutId = window.setTimeout(() => {
        this.scanLoop();
      }, this.scanInterval);
    }
  }
}