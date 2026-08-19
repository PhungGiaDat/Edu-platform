// src/core/interfaces/ISceneManager.ts
import type { ARTarget } from '@/types';
import type { AFrameScene } from '@/types/aframe';
import type { IEventBus } from './IEventBus';

export interface ISceneManager {
  /**
   * Initialize scene manager
   */
  init(): void;

  /**
   * Set EventBus dependency
   */
  setEventBus(eventBus: IEventBus): void;

  /**
   * Get video element from AR scene
   */
  getVideo(): HTMLVideoElement | null;
  
  /**
   * Get the A-Frame scene element
   */
  getScene(): AFrameScene | null;
  
  /**
   * Add NFT marker to scene
   */
  addNFTMarker(
    target: ARTarget,
    displayMode: '2D' | '3D',
    onFound?: () => void,
    onLost?: () => void
  ): void;
  
  /**
   * Clear all markers from scene
   */
  clearMarkers(): void;

  /**
   * Set display mode (2D/3D)
   */
  setDisplayMode(mode: '2D' | '3D'): void;

  /**
   * Check if scene is ready
   */
  isReady(): boolean;

  /**
   * Destroy scene and cleanup
   */
  destroy(): void;
}