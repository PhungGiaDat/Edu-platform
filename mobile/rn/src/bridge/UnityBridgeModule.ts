import { NativeModules, NativeEventEmitter, Platform } from 'react-native';
import type {
  UnityARExperiencePayload,
  CardDescriptorRN,
} from '../types/ar';
import {
  createARMessage,
  type ARMessage,
  type StartImageTrackingMultiPayload,
} from './arMessages';

const { UnityBridge } = NativeModules;

/**
 * UnityBridgeModule — Bridge for communicating with Unity AR runtime.
 * Supports iOS and Android via RNEventEmitter on the Unity side.
 */
class UnityBridgeModule {
  private eventEmitter: NativeEventEmitter | null = null;
  private isAvailable: boolean = false;

  constructor() {
    if (UnityBridge) {
      this.eventEmitter = new NativeEventEmitter(UnityBridge);
      this.isAvailable = true;
    }
  }

  checkAvailability(): boolean {
    return this.isAvailable;
  }

  /**
   * Check if Unity player is running.
   */
  async isUnityRunning(): Promise<boolean> {
    if (!this.isAvailable) return false;

    try {
      return await UnityBridge.isUnityRunning();
    } catch (error) {
      console.error('UnityBridge: isUnityRunning failed', error);
      return false;
    }
  }

  async launchUnity(): Promise<boolean> {
    if (!this.isAvailable) return false;
    return UnityBridge.launchUnity();
  }

  async closeUnity(): Promise<void> {
    if (!this.isAvailable) return;
    await UnityBridge.closeUnity();
  }

  async sendPing(requestId: string): Promise<void> {
    if (!this.isAvailable) {
      throw new Error('UnityBridge native module is unavailable');
    }
    await UnityBridge.sendToUnity('PING', JSON.stringify({ requestId }));
  }

  /**
   * Sends AR experience data to Unity for rendering.
   */
  async loadExperience(payload: UnityARExperiencePayload): Promise<ARMessage> {
    if (!this.isAvailable) {
      console.warn('UnityBridge: Module not available, simulating load');
      return createARMessage('EXPERIENCE_LOADED', payload);
    }

    try {
      const json = JSON.stringify(payload);
      await UnityBridge.sendToUnity('loadARExperience', json);
      const message = createARMessage('LOAD_EXPERIENCE', payload);
      return message;
    } catch (error) {
      return createARMessage('EXPERIENCE_ERROR', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Starts the AR session (image tracking mode).
   */
  async startARSession(): Promise<void> {
    console.log('UnityBridge: Starting AR session');
    if (!this.isAvailable) return;

    try {
      await UnityBridge.sendToUnity('initSession', '{}');
    } catch (error) {
      console.error('UnityBridge: startARSession failed', error);
    }
  }

  /**
   * Starts image tracking.
   */
  async startImageTracking(referenceImageLibraryId?: string): Promise<void> {
    console.log('UnityBridge: Starting image tracking');
    if (!this.isAvailable) return;

    try {
      await UnityBridge.sendToUnity('startImageTracking', '{}');
    } catch (error) {
      console.error('UnityBridge: startImageTracking failed', error);
    }
  }

  /**
   * Starts image tracking with a list of `CardDescriptorRN` (multi-card flow).
   *
   * Per bridge-contract.md §"Multi-Card Bridge Contract" — the Unity side
   * deserializes `{ cards: CardDescriptor[] }` into `CardDescriptorList` and
   * calls `CardImageLibraryBuilder.BuildLibrary(...)`. This stub records the
   * payload but does not invoke the native module (Phase 2 native wiring).
   *
   * Until MQ-1 is resolved, the existing `startImageTracking` (single-card
   * legacy path) is kept alongside this method — RN callers should prefer
   * `startImageTrackingMulti` for new code paths.
   */
  async startImageTrackingMulti(payload: StartImageTrackingMultiPayload): Promise<void> {
    console.log('UnityBridge: Starting multi-card image tracking', payload.cards.length);
    if (!this.isAvailable) return;

    try {
      const json = JSON.stringify(payload);
      await UnityBridge.sendToUnity('startImageTrackingMulti', json);
    } catch (error) {
      console.error('UnityBridge: startImageTrackingMulti failed', error);
    }
  }

  /**
   * Low-level bridge: sends an arbitrary method + JSON payload to Unity.
   * Used for internal lifecycle messages (e.g. card resolution acknowledgement).
   *
   * Prefer typed wrappers (startImageTrackingMulti, triggerCombo, etc.) for
   * named operations. This method bypasses type safety — callers must ensure
   * the method name is understood by RNMessageReceiver.
   */
  async sendToUnity(method: string, jsonPayload: string): Promise<void> {
    if (!this.isAvailable) return;
    try {
      await UnityBridge.sendToUnity(method, jsonPayload);
    } catch (error) {
      console.error(`UnityBridge: sendToUnity(${method}) failed`, error);
    }
  }

  /**
   * Triggers a combo between two cards.
   */
  async triggerCombo(cardA: string, cardB: string): Promise<void> {
    console.log('UnityBridge: Triggering combo', cardA, cardB);
    if (!this.isAvailable) return;

    try {
      const json = JSON.stringify({ cardA, cardB });
      await UnityBridge.sendToUnity('triggerCombo', json);
    } catch (error) {
      console.error('UnityBridge: triggerCombo failed', error);
    }
  }

  /**
   * Pauses the AR session.
   */
  async pauseSession(): Promise<void> {
    console.log('UnityBridge: Pausing session');
    if (!this.isAvailable) return;

    try {
      await UnityBridge.sendToUnity('pauseSession', '{}');
    } catch (error) {
      console.error('UnityBridge: pauseSession failed', error);
    }
  }

  /**
   * Resumes the AR session.
   */
  async resumeSession(): Promise<void> {
    console.log('UnityBridge: Resuming session');
    if (!this.isAvailable) return;

    try {
      await UnityBridge.sendToUnity('resumeSession', '{}');
    } catch (error) {
      console.error('UnityBridge: resumeSession failed', error);
    }
  }

  /**
   * Destroys the AR session.
   */
  async destroySession(): Promise<void> {
    console.log('UnityBridge: Destroying session');
    if (!this.isAvailable) return;

    try {
      await UnityBridge.sendToUnity('destroySession', '{}');
    } catch (error) {
      console.error('UnityBridge: destroySession failed', error);
    }
  }

  /**
   * Request Unity to play audio.
   */
  async playAudio(audioUrl: string): Promise<void> {
    console.log('UnityBridge: Playing audio:', audioUrl);
    if (!this.isAvailable) return;

    try {
      const json = JSON.stringify({ audioUrl });
      await UnityBridge.sendToUnity('playAudio', json);
    } catch (error) {
      console.error('UnityBridge: playAudio failed', error);
    }
  }

  /**
   * Request Unity to close current experience.
   */
  async closeExperience(): Promise<void> {
    console.log('UnityBridge: Closing experience');
    if (!this.isAvailable) return;

    try {
      await UnityBridge.sendToUnity('closeExperience', '{}');
    } catch (error) {
      console.error('UnityBridge: closeExperience failed', error);
    }
  }

  /**
   * Subscribe to Unity events.
   */
  subscribe(
    eventType: string,
    callback: (message: ARMessage) => void
  ): (() => void) | undefined {
    if (!this.eventEmitter) {
      console.warn('UnityBridge: Event emitter not available');
      return undefined;
    }

    const subscription = this.eventEmitter.addListener(eventType, (nativePayload: unknown) => {
      let payload: Record<string, unknown> = {};
      if (typeof nativePayload === 'string') {
        try {
          payload = JSON.parse(nativePayload) as Record<string, unknown>;
        } catch {
          payload = { raw: nativePayload };
        }
      } else if (nativePayload && typeof nativePayload === 'object') {
        payload = nativePayload as Record<string, unknown>;
      }

      const message: ARMessage = {
        type: eventType as ARMessage['type'],
        payload,
        timestamp: Date.now(),
      };
      callback(message);
    });

    return () => subscription.remove();
  }
}

export const unityBridge = new UnityBridgeModule();

// Re-export `CardDescriptorRN` so consumers can import both the bridge and
// the DTO from this module without a separate types import.
export type { CardDescriptorRN };
