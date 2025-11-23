// src/runtime/index.ts
/**
 * AR Runtime Services Export
 * Centralized export for all AR runtime singletons and utilities
 */

export { eventBus, EventBus } from './EventBus';
export { markerStateManager, MarkerStateManager } from './MarkerStateManager';
export { arSceneManager, ARSceneManager } from './ARSceneManager';
export { QRDetectionService } from './QRDetectionService';
export { getARSceneController, ARSceneController } from './ARSceneController';
export { MultiFlashcardTracker } from './MultiFlashcardTracker';
export { runtimeBridge, type RuntimeBridge } from './RuntimeBridge';