// src/runtime/RuntimeBridge.ts - WITH AUTO-START QR ON VIDEO_READY
import { eventBus } from './EventBus';
import { markerStateManager } from './MarkerStateManager';
import { arSceneManager } from './ARSceneManager';
import { getARSceneController } from './ARSceneController';
import { QRDetectionService } from './QRDetectionService';
import { ZxingQRDecoder } from '@/adapters/ZxingQRDecoder';
import { MultiFlashcardTracker } from './MultiFlashcardTracker';
import type { IRuntimeBridge } from '@/core/interfaces/IRuntimeBridge';
import { AREvent } from '@/core/types/AREvents';

class RuntimeBridge implements IRuntimeBridge {
  public readonly eventBus = eventBus;
  public readonly markerStateManager = markerStateManager;
  public readonly arSceneManager = arSceneManager;
  public readonly qrService: QRDetectionService;

  private controller: ReturnType<typeof getARSceneController>;
  private multiFlashcardTracker: MultiFlashcardTracker;
  private initialized: boolean = false;
  private videoReadyHandler?: (payload: { video: HTMLVideoElement }) => void;

  constructor() {
    console.log('🏗️ RuntimeBridge: Constructing...');

    const qrDecoder = new ZxingQRDecoder();
    this.qrService = new QRDetectionService(qrDecoder, this.eventBus);
    this.controller = getARSceneController(this.eventBus, this.markerStateManager);
    this.multiFlashcardTracker = new MultiFlashcardTracker(
      this.eventBus,
      this.markerStateManager
    );

    console.log('✅ RuntimeBridge: Services injected');
  }

  init(video?: HTMLVideoElement): void {
    if (this.initialized) {
      console.warn('⚠️ RuntimeBridge: Already initialized');
      return;
    }

    console.log('🚀 RuntimeBridge: Initializing...');

    this.markerStateManager.setEventBus(this.eventBus);
    this.arSceneManager.setEventBus(this.eventBus);
    this.controller.init(this.eventBus, this.markerStateManager);

    // ✅ AUTO-START: Listen to VIDEO_READY event and automatically start QR scanning
    this.videoReadyHandler = (payload: { video: HTMLVideoElement }) => {
      console.log('🎥 RuntimeBridge: VIDEO_READY received, auto-starting QR scanning');
      
      // Wait a bit for AR.js to fully initialize video stream
      setTimeout(() => {
        if (payload.video.readyState >= payload.video.HAVE_CURRENT_DATA) {
          console.log('✅ RuntimeBridge: Video readyState OK, starting QR service');
          this.startQRScanning(payload.video);
        } else {
          console.warn('⚠️ RuntimeBridge: Video not ready yet, readyState:', payload.video.readyState);
          
          // Retry with interval if not ready
          const checkInterval = setInterval(() => {
            if (payload.video.readyState >= payload.video.HAVE_CURRENT_DATA) {
              console.log('✅ RuntimeBridge: Video now ready, starting QR service');
              this.startQRScanning(payload.video);
              clearInterval(checkInterval);
            }
          }, 100);
          
          // Timeout after 5 seconds
          setTimeout(() => {
            clearInterval(checkInterval);
            if (!this.qrService.isRunning()) {
              console.error('❌ RuntimeBridge: Video readyState timeout after 5s');
            }
          }, 5000);
        }
      }, 500); // Wait 500ms for AR.js initialization
    };
    
    this.eventBus.on('VIDEO_READY', this.videoReadyHandler as any);
    console.log('📡 RuntimeBridge: VIDEO_READY listener registered for auto-start');

    // Manual start if video provided directly
    if (video) {
      this.startQRScanning(video);
    }

    this.initialized = true;
    console.log('✅ RuntimeBridge: Initialized with VIDEO_READY auto-start enabled');

    this.eventBus.emit(AREvent.SCENE_READY, { scene: null });
  }

  cleanup(): void {
    if (!this.initialized) {
      console.warn('⚠️ RuntimeBridge: Not initialized');
      return;
    }

    console.log('🧹 RuntimeBridge: Cleaning up...');

    // ✅ Cleanup VIDEO_READY listener
    if (this.videoReadyHandler) {
      this.eventBus.off('VIDEO_READY', this.videoReadyHandler as any);
      this.videoReadyHandler = undefined;
      console.log('🧹 RuntimeBridge: VIDEO_READY listener removed');
    }

    this.qrService.stop();
    this.multiFlashcardTracker.stop();
    this.markerStateManager.reset();
    this.arSceneManager.destroy();

    this.initialized = false;
    console.log('✅ RuntimeBridge: Cleaned up');
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  startQRScanning(video: HTMLVideoElement): void {
    if (!video) {
      console.error('❌ RuntimeBridge: Cannot start QR scanning - no video');
      return;
    }

    // Prevent double-start
    if (this.qrService.isRunning()) {
      console.log('⏭️ RuntimeBridge: QR scanning already running');
      return;
    }

    console.log('🔍 RuntimeBridge: Starting QR scanning');
    this.qrService.start(video);
  }

  stopQRScanning(): void {
    console.log('🛑 RuntimeBridge: Stopping QR scanning');
    this.qrService.stop();
  }

  resetMarkers(): void {
    console.log('🔄 RuntimeBridge: Resetting markers');
    this.markerStateManager.reset();
  }

  markMarkerFound(markerId: string): void {
    console.log('✅ RuntimeBridge: Manually marking marker found:', markerId);
    this.markerStateManager.markFound(markerId);
  }

  markMarkerLost(markerId: string): void {
    console.log('❌ RuntimeBridge: Manually marking marker lost:', markerId);
    this.markerStateManager.markLost(markerId);
  }

  startMultiFlashcardTracking(requiredTags: string[], timeout?: number): void {
    console.log('🎯 RuntimeBridge: Starting multi-flashcard tracking', {
      requiredTags,
      timeout,
    });

    this.multiFlashcardTracker.start({
      requiredTags,
      timeout: timeout || 30000,
      allowPartialMatch: false,
    });
  }

  stopMultiFlashcardTracking(): void {
    console.log('🛑 RuntimeBridge: Stopping multi-flashcard tracking');
    this.multiFlashcardTracker.stop();
  }

  getMultiFlashcardProgress() {
    return this.multiFlashcardTracker.getProgress();
  }

  getStatus() {
    return {
      initialized: this.initialized,
      qrScanning: this.qrService.isRunning(),
      markersFound: this.markerStateManager.getFoundMarkers().size,
      comboActive: this.markerStateManager.isComboActive(),
      combo: this.markerStateManager.getCombo()?.combo_id || null,
      multiFlashcardActive: this.multiFlashcardTracker.isTracking(),
    };
  }
}

export const runtimeBridge = new RuntimeBridge();
export type { RuntimeBridge };