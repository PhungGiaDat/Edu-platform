// src/runtime/RuntimeBridge.ts - REFACTORED FOR IFRAME AR Isolation
import { eventBus } from './EventBus';
import { markerStateManager } from './MarkerStateManager';
import { arSceneManager } from './ARSceneManager';
import { getARSceneController } from './ARSceneController';
import { MultiFlashcardTracker } from './MultiFlashcardTracker';
import type { IRuntimeBridge } from '@/core/interfaces/IRuntimeBridge';
import { AREvent } from '@/core/types/AREvents';

class RuntimeBridge implements IRuntimeBridge {
  public readonly eventBus = eventBus;
  public readonly markerStateManager = markerStateManager;
  public readonly arSceneManager = arSceneManager;
  // Note: qrService is removed as detection is now in the Iframe

  private controller: ReturnType<typeof getARSceneController>;
  private multiFlashcardTracker: MultiFlashcardTracker;
  private initialized: boolean = false;

  constructor() {
    console.log('🏗️ RuntimeBridge: Constructing...');

    this.controller = getARSceneController(this.eventBus, this.markerStateManager);
    this.multiFlashcardTracker = new MultiFlashcardTracker(
      this.eventBus,
      this.markerStateManager
    );

    console.log('✅ RuntimeBridge: Services injected');
  }

  init(): void {
    if (this.initialized) {
      console.warn('⚠️ RuntimeBridge: Already initialized');
      return;
    }

    console.log('🚀 RuntimeBridge: Initializing...');

    this.markerStateManager.setEventBus(this.eventBus);
    this.arSceneManager.setEventBus(this.eventBus);
    this.controller.init(this.eventBus, this.markerStateManager);

    // Note: We no longer auto-start QR scanning here.
    // The ARContainer (Iframe) will emit VIDEO_READY and MARKER_FOUND events.

    this.initialized = true;
    console.log('✅ RuntimeBridge: Initialized (QR detection offloaded to Iframe)');

    // We still emit SCENE_READY to signal that the bridge is ready
    this.eventBus.emit(AREvent.SCENE_READY, { scene: null } as any);
  }

  cleanup(): void {
    if (!this.initialized) {
      console.warn('⚠️ RuntimeBridge: Not initialized');
      return;
    }

    console.log('🧹 RuntimeBridge: Cleaning up...');

    this.multiFlashcardTracker.stop();
    this.markerStateManager.reset();
    this.arSceneManager.destroy();

    this.initialized = false;
    console.log('✅ RuntimeBridge: Cleaned up');
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  // These methods are now mostly shells or proxies as the iframe handles the hardware
  startQRScanning(): void {
    console.log('🔍 RuntimeBridge: QR Scanning is managed by the AR Iframe');
  }

  stopQRScanning(): void {
    console.log('🛑 RuntimeBridge: QR Scanning is managed by the AR Iframe');
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
      qrScanning: true, // Always true if AR is active in iframe
      markersFound: this.markerStateManager.getFoundMarkers().size,
      comboActive: this.markerStateManager.isComboActive(),
      combo: this.markerStateManager.getCombo()?.combo_id || null,
      multiFlashcardActive: this.multiFlashcardTracker.isTracking(),
    };
  }
}

export const runtimeBridge = new RuntimeBridge();
export type { RuntimeBridge };
