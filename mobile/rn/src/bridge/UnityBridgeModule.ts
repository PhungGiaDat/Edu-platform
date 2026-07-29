import { NativeModules, NativeEventEmitter, Platform } from 'react-native';
import type { UnityARExperiencePayload } from '../types/ar';
import { createARMessage, type ARMessage } from './arMessages';

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
   * Sends AR experience data to Unity for rendering.
   */
  async loadExperience(payload: UnityARExperiencePayload): Promise<ARMessage> {
    if (!this.isAvailable) {
      console.warn('UnityBridge: Module not available, simulating load');
      return createARMessage('EXPERIENCE_LOADED', payload);
    }

    try {
      const message = createARMessage('LOAD_EXPERIENCE', payload);
      // Phase 2: Call native module
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
      // Call native method: UnityBridge.startARSession()
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
      // Call native method
    } catch (error) {
      console.error('UnityBridge: startImageTracking failed', error);
    }
  }

  /**
   * Triggers a combo between two cards.
   */
  async triggerCombo(cardA: string, cardB: string): Promise<void> {
    console.log('UnityBridge: Triggering combo', cardA, cardB);
    if (!this.isAvailable) return;

    try {
      // Call native method: UnityBridge.triggerCombo({ cardA, cardB })
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
  }

  /**
   * Resumes the AR session.
   */
  async resumeSession(): Promise<void> {
    console.log('UnityBridge: Resuming session');
    if (!this.isAvailable) return;
  }

  /**
   * Destroys the AR session.
   */
  async destroySession(): Promise<void> {
    console.log('UnityBridge: Destroying session');
    if (!this.isAvailable) return;
  }

  /**
   * Request Unity to play audio.
   */
  async playAudio(audioUrl: string): Promise<void> {
    console.log('UnityBridge: Playing audio:', audioUrl);
  }

  /**
   * Request Unity to close current experience.
   */
  async closeExperience(): Promise<void> {
    console.log('UnityBridge: Closing experience');
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

    const subscription = this.eventEmitter.addListener(eventType, (payload: Record<string, unknown>) => {
      // Parse the message format: "eventName|{jsonPayload}"
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
