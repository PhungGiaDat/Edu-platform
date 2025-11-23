// src/runtime/ARSceneManager.ts
import type { ISceneManager } from '@/core/interfaces/IScenceManager';
import type { IEventBus } from '@/core/interfaces/IEventBus';
import type { AFrameScene, AFrameEntity } from '@/types/aframe';
import type { ARTarget } from '@/types';
import { AREvent } from '@/core/types/AREvents';

/**
 * AR Scene Manager Implementation
 * Manages global A-Frame scene lifecycle outside React
 */
class ARSceneManager implements ISceneManager {
  private scene: AFrameScene | null = null;
  private video: HTMLVideoElement | null = null;
  private eventBus: IEventBus | null = null;
  private initialized: boolean = false;
  private markers: Map<string, AFrameEntity> = new Map();

  /**
   * Set EventBus dependency
   */
  setEventBus(eventBus: IEventBus): void {
    this.eventBus = eventBus;
  }

  /**
   * Initialize scene manager
   */
  init(): void {
    if (this.initialized) {
      console.warn('⚠️ ARSceneManager already initialized');
      return;
    }

    console.log('🔧 Initializing ARSceneManager');

    // Subscribe to scene events
    if (this.eventBus) {
      this.eventBus.on(AREvent.SCENE_READY, ({ scene }: { scene: AFrameScene }) => {
        this.scene = scene;
        console.log('✅ Scene registered in ARSceneManager');
        this.setupSceneRenderer();
      });

      this.eventBus.on(AREvent.VIDEO_READY, ({ video }: { video: HTMLVideoElement }) => {
        this.video = video;
        console.log('✅ Video registered in ARSceneManager', {
          width: video.videoWidth,
          height: video.videoHeight,
          readyState: video.readyState
        });
      });

      this.eventBus.on(AREvent.SCENE_DESTROYED, () => {
        this.cleanup();
      });
    }

    this.initialized = true;
  }

  /**
   * Setup renderer transparency and depth testing
   */
  private setupSceneRenderer(): void {
    if (!this.scene) return;

    try {
      // Setup renderer
      if (this.scene.renderer) {
        this.scene.renderer.setClearColor(0x000000, 0);
        this.scene.renderer.setClearAlpha(0);
        
        if (this.scene.renderer.context) {
          const gl = this.scene.renderer.context as WebGLRenderingContext;
          if (gl.DEPTH_TEST !== undefined) {
            gl.enable(gl.DEPTH_TEST);
          }
        }
        console.log('✅ Renderer transparency configured');
      }

      // Remove scene background
      if (this.scene.object3D) {
        this.scene.object3D.background = null;
        console.log('✅ Scene background removed');
      }
    } catch (error) {
      console.error('❌ Error setting up renderer:', error);
      if (this.eventBus) {
        this.eventBus.emit(AREvent.AR_ERROR, {
          error: error as Error,
          context: 'ARSceneManager.setupSceneRenderer'
        });
      }
    }
  }

  /**
   * Get video element
   */
  getVideo(): HTMLVideoElement | null {
    return this.video;
  }

  /**
   * Get A-Frame scene element
   */
  getScene(): AFrameScene | null {
    return this.scene;
  }

  /**
   * Add NFT marker to scene programmatically
   */
  addNFTMarker(
    target: ARTarget,
    displayMode: '2D' | '3D',
    onFound?: () => void,
    onLost?: () => void
  ): void {
    if (!this.scene) {
      console.error('❌ Cannot add NFT marker: Scene not ready');
      return;
    }

    // Check if marker already exists
    if (this.markers.has(target.tag)) {
      console.warn('⚠️ Marker already exists:', target.tag);
      return;
    }

    console.log('🎯 Adding NFT marker programmatically:', target.tag);

    try {
      // Create NFT marker element
      const nftEl = document.createElement('a-nft');
      nftEl.setAttribute('type', 'nft');
      nftEl.setAttribute('url', target.nft_base_url);
      nftEl.setAttribute('smooth', 'true');
      nftEl.setAttribute('smoothCount', '10');
      nftEl.setAttribute('smoothTolerance', '0.01');
      nftEl.setAttribute('smoothThreshold', '5');
      nftEl.setAttribute('registerevents', 'true');

      // Add event listeners
      if (onFound) {
        nftEl.addEventListener('markerFound', onFound);
      }
      if (onLost) {
        nftEl.addEventListener('markerLost', onLost);
      }

      // Add content based on display mode
      if (displayMode === '2D' && target.image_2d_url) {
        const imageEl = document.createElement('a-image');
        imageEl.setAttribute('src', target.image_2d_url);
        imageEl.setAttribute('position', target.position || '0 0 0');
        imageEl.setAttribute('rotation', target.rotation || '-90 0 0');
        imageEl.setAttribute('scale', target.scale || '1 1 1');
        nftEl.appendChild(imageEl);
      } else if (displayMode === '3D' && target.model_3d_url) {
        const modelEl = document.createElement('a-entity');
        modelEl.setAttribute('gltf-model', `url(${target.model_3d_url})`);
        modelEl.setAttribute('position', target.position || '0 0 0');
        modelEl.setAttribute('rotation', target.rotation || '0 0 0');
        modelEl.setAttribute('scale', target.scale || '0.5 0.5 0.5');
        modelEl.setAttribute('animation-mixer', 'clip: *; loop: repeat');
        nftEl.appendChild(modelEl);
      }

      // Add to scene
      this.scene.appendChild(nftEl);
      
      // Store reference
      this.markers.set(target.tag, nftEl as unknown as AFrameEntity);
      
      console.log('✅ Marker added successfully:', target.tag);
    } catch (error) {
      console.error('❌ Error adding marker:', error);
      if (this.eventBus) {
        this.eventBus.emit(AREvent.AR_ERROR, {
          error: error as Error,
          context: `ARSceneManager.addNFTMarker(${target.tag})`
        });
      }
    }
  }

  /**
   * Clear all markers from scene
   */
  clearMarkers(): void {
    if (!this.scene) return;

    try {
      const markers = this.scene.querySelectorAll('a-nft');
      markers.forEach((marker: Element) => marker.remove());
      
      this.markers.clear();
      
      console.log('🧹 Cleared all markers');
    } catch (error) {
      console.error('❌ Error clearing markers:', error);
    }
  }

  /**
   * Set display mode (2D/3D) - updates existing markers
   */
  setDisplayMode(mode: '2D' | '3D'): void {
    console.log('🎨 Setting display mode:', mode);

    // Emit event
    if (this.eventBus) {
      this.eventBus.emit(AREvent.DISPLAY_MODE_CHANGED, { mode });
    }

    // Note: In React-based approach, display mode is controlled via props
    // This method is kept for programmatic API compatibility
  }

  /**
   * Check if scene is ready
   */
  isReady(): boolean {
    return this.scene !== null && this.video !== null;
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    this.clearMarkers();
    this.markers.clear();
    console.log('🧹 ARSceneManager cleanup complete');
  }

  /**
   * Destroy manager
   */
  destroy(): void {
    this.cleanup();
    this.scene = null;
    this.video = null;
    this.initialized = false;
    
    console.log('🧹 ARSceneManager destroyed');
  }
}

/**
 * Export singleton instance
 */
export const arSceneManager = new ARSceneManager();

/**
 * Export class for testing
 */
export { ARSceneManager };