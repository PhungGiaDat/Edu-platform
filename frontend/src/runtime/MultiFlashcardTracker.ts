// src/runtime/MultiFlashcardTracker.ts
/**
 * MultiFlashcardTracker
 * 
 * Chịu trách nhiệm track nhiều QR/NFT marker liên tục
 * và kích hoạt combo khi đủ điều kiện
 */

import type { IEventBus } from '@/core/interfaces/IEventBus';
import type { IMarkerStateManager } from '@/core/interfaces/IMarkerStateManager';
import { AREvent } from '@/core/types/AREvents';

export interface MultiFlashcardConfig {
  requiredTags: string[];
  timeout?: number; // ms, default 30000 (30s)
  allowPartialMatch?: boolean; // Allow combo with subset of tags
  minRequiredTags?: number; // Minimum tags needed (if allowPartialMatch = true)
}

export class MultiFlashcardTracker {
  private eventBus: IEventBus;
  private markerStateManager: IMarkerStateManager;
  private isActive: boolean = false;
  private requiredTags: Set<string> = new Set();
  private foundTags: Set<string> = new Set();
  private timeoutId: number | null = null;
  private config: MultiFlashcardConfig | null = null;

  // Event handlers (store for cleanup)
  private handleMarkerFound: ((payload: any) => void) | null = null;
  private handleMarkerLost: ((payload: any) => void) | null = null;

  constructor(eventBus: IEventBus, markerStateManager: IMarkerStateManager) {
    this.eventBus = eventBus;
    this.markerStateManager = markerStateManager;
  }

  /**
   * Start tracking multiple flashcards
   */
  start(config: MultiFlashcardConfig): void {
    if (this.isActive) {
      console.warn('⚠️ MultiFlashcardTracker: Already active');
      this.stop(); // Stop previous tracking
    }

    console.log('🎯 MultiFlashcardTracker: Starting', config);

    this.config = config;
    this.requiredTags = new Set(config.requiredTags);
    this.foundTags.clear();
    this.isActive = true;

    // Subscribe to marker events
    this.setupEventListeners();

    // Setup timeout if specified
    if (config.timeout) {
      this.timeoutId = window.setTimeout(() => {
        console.log('⏰ MultiFlashcardTracker: Timeout reached');
        this.handleTimeout();
      }, config.timeout);
    }

    // Check if markers already found (in case of restart)
    this.checkExistingMarkers();
  }

  /**
   * Stop tracking
   */
  stop(): void {
    if (!this.isActive) {
      return;
    }

    console.log('🛑 MultiFlashcardTracker: Stopping');

    // Clear timeout
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    // Unsubscribe from events
    this.cleanupEventListeners();

    // Clear state
    this.isActive = false;
    this.requiredTags.clear();
    this.foundTags.clear();
    this.config = null;
  }

  /**
   * Check if tracker is active
   */
  isTracking(): boolean {
    return this.isActive;
  }

  /**
   * Get tracking progress
   */
  getProgress() {
    const required = Array.from(this.requiredTags);
    const found = Array.from(this.foundTags);
    const remaining = required.filter(tag => !this.foundTags.has(tag));
    const progress = (found.length / required.length) * 100;

    return {
      required,
      found,
      remaining,
      progress: Math.round(progress),
      isComplete: remaining.length === 0,
    };
  }

  // ========== PRIVATE METHODS ==========

  /**
   * Setup event listeners for marker tracking
   */
  private setupEventListeners(): void {
    this.handleMarkerFound = (payload: { markerId: string }) => {
      this.onMarkerFound(payload.markerId);
    };

    this.handleMarkerLost = (payload: { markerId: string }) => {
      this.onMarkerLost(payload.markerId);
    };

    this.eventBus.on(AREvent.MARKER_FOUND, this.handleMarkerFound as any);
    this.eventBus.on(AREvent.MARKER_LOST, this.handleMarkerLost as any);
  }

  /**
   * Cleanup event listeners
   */
  private cleanupEventListeners(): void {
    if (this.handleMarkerFound) {
      this.eventBus.off(AREvent.MARKER_FOUND, this.handleMarkerFound as any);
      this.handleMarkerFound = null;
    }

    if (this.handleMarkerLost) {
      this.eventBus.off(AREvent.MARKER_LOST, this.handleMarkerLost as any);
      this.handleMarkerLost = null;
    }
  }

  /**
   * Check if any markers are already found
   */
  private checkExistingMarkers(): void {
    const foundMarkers = this.markerStateManager.getFoundMarkers();
    
    foundMarkers.forEach(markerId => {
      if (this.requiredTags.has(markerId)) {
        this.foundTags.add(markerId);
        console.log('✅ MultiFlashcardTracker: Pre-existing marker', markerId);
      }
    });

    // Check completion immediately
    this.checkCompletion();
  }

  /**
   * Handle marker found event
   */
  private onMarkerFound(markerId: string): void {
    if (!this.isActive) {
      return;
    }

    // Check if this marker is required
    if (!this.requiredTags.has(markerId)) {
      console.log('⏭️ MultiFlashcardTracker: Marker not required', markerId);
      return;
    }

    // Check if already found
    if (this.foundTags.has(markerId)) {
      console.log('⏭️ MultiFlashcardTracker: Marker already tracked', markerId);
      return;
    }

    // Add to found set
    this.foundTags.add(markerId);
    console.log('✅ MultiFlashcardTracker: Marker found', {
      markerId,
      progress: this.getProgress(),
    });

    // Emit progress event
    this.eventBus.emit('MULTI_FLASHCARD_PROGRESS' as any, {
      progress: this.getProgress(),
    });

    // Check if combo complete
    this.checkCompletion();
  }

  /**
   * Handle marker lost event
   */
  private onMarkerLost(markerId: string): void {
    if (!this.isActive) {
      return;
    }

    // Check if this marker was being tracked
    if (!this.foundTags.has(markerId)) {
      return;
    }

    // Remove from found set
    this.foundTags.delete(markerId);
    console.log('❌ MultiFlashcardTracker: Marker lost', {
      markerId,
      progress: this.getProgress(),
    });

    // Emit progress event
    this.eventBus.emit('MULTI_FLASHCARD_PROGRESS' as any, {
      progress: this.getProgress(),
    });

    // Check if combo should deactivate
    this.checkDeactivation();
  }

  /**
   * Check if combo should be activated
   */
  private checkCompletion(): void {
    const progress = this.getProgress();

    // Check full match
    if (progress.isComplete) {
      console.log('🎉 MultiFlashcardTracker: All markers found! Activating combo');
      this.activateCombo();
      return;
    }

    // Check partial match (if allowed)
    if (this.config?.allowPartialMatch && this.config.minRequiredTags) {
      if (this.foundTags.size >= this.config.minRequiredTags) {
        console.log('🎉 MultiFlashcardTracker: Minimum markers found! Activating combo');
        this.activateCombo();
        return;
      }
    }
  }

  /**
   * Check if combo should be deactivated
   */
  private checkDeactivation(): void {
    const combo = this.markerStateManager.getCombo();
    if (!combo) {
      return;
    }

    const isComboActive = this.markerStateManager.isComboActive();
    if (!isComboActive) {
      return;
    }

    // If partial match allowed, check minimum threshold
    if (this.config?.allowPartialMatch && this.config.minRequiredTags) {
      if (this.foundTags.size < this.config.minRequiredTags) {
        console.log('💔 MultiFlashcardTracker: Below minimum markers, deactivating combo');
        this.deactivateCombo();
      }
    } else {
      // Full match required - any loss deactivates
      console.log('💔 MultiFlashcardTracker: Marker lost, deactivating combo');
      this.deactivateCombo();
    }
  }

  /**
   * Activate combo
   */
  private activateCombo(): void {
    const combo = this.markerStateManager.getCombo();
    if (!combo) {
      console.warn('⚠️ MultiFlashcardTracker: No combo configured');
      return;
    }

    // Let MarkerStateManager handle activation
    // It will emit COMBO_ACTIVATED event
    this.markerStateManager.markFound(combo.required_tags[0]); // Trigger combo check

    // Emit completion event
    this.eventBus.emit('MULTI_FLASHCARD_COMPLETE' as any, {
      foundTags: Array.from(this.foundTags),
      combo,
    });

    // Auto-stop tracking (combo is activated)
    // Uncomment if you want to stop after activation
    // this.stop();
  }

  /**
   * Deactivate combo
   */
  private deactivateCombo(): void {
    // MarkerStateManager will handle deactivation
    // through its own marker lost logic
  }

  /**
   * Handle timeout
   */
  private handleTimeout(): void {
    console.log('⏰ MultiFlashcardTracker: Timeout - not all markers found');
    
    const progress = this.getProgress();
    
    this.eventBus.emit('MULTI_FLASHCARD_TIMEOUT' as any, {
      progress,
    });

    this.stop();
  }
}