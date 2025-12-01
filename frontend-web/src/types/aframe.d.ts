// src/types/aframe.d.ts
/**
 * A-Frame Type Definitions
 * Re-export types from @types/aframe và thêm custom extensions
 */

/// <reference types="aframe" />

import type * as AFrameLib from 'aframe';

/**
 * Re-export core types từ aframe namespace
 */
export type AFrameScene = AFrameLib.Scene;
export type AFrameEntity = AFrameLib.Entity;
export type AFrameComponent<T = any> = AFrameLib.Component<T>;
export type AFrameSystem<T = any> = AFrameLib.System<T>;

/**
 * Custom AR.js NFT Entity
 */
export interface NFTEntity extends AFrameEntity {
  components?: {
    'arjs-tracked-controls'?: any;
    [key: string]: any;
  };
}

/**
 * Position type (string hoặc object)
 */
export type Position = string | { x: number; y: number; z: number };
export type Rotation = string | { x: number; y: number; z: number };
export type Scale = string | { x: number; y: number; z: number };

/**
 * Global type augmentation for JSX
 */
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'a-scene': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          ref?: React.Ref<HTMLElement>;
          arjs?: string;
          embedded?: boolean | string;
          'vr-mode-ui'?: string;
          'loading-screen'?: string;
          renderer?: string;
          'gesture-detector'?: boolean | string;
          light?: string;
        },
        HTMLElement
      >;
      
      'a-nft': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          ref?: React.Ref<HTMLElement>;
          type?: 'nft';
          url?: string;
          smooth?: boolean | string;
          smoothCount?: number | string;
          smoothTolerance?: number | string;
          smoothThreshold?: number | string;
          registerevents?: boolean | string;
          emitevents?: boolean | string;
        },
        HTMLElement
      >;
      
      'a-entity': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          ref?: React.Ref<HTMLElement>;
          position?: Position;
          rotation?: Rotation;
          scale?: Scale;
          visible?: boolean | string;
          'gltf-model'?: string;
          light?: string;
          cursor?: string;
          raycaster?: string;
          geometry?: string;
          material?: string;
          text?: string;
          camera?: boolean | string;
          'wasd-controls-enabled'?: boolean | string;
          'look-controls-enabled'?: boolean | string;
          [key: string]: any;
        },
        HTMLElement
      >;
      
      'a-camera': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          ref?: React.Ref<HTMLElement>;
          position?: Position;
          rotation?: Rotation;
          scale?: Scale;
          'look-controls'?: boolean | string;
          'wasd-controls'?: boolean | string;
          'look-controls-enabled'?: boolean | string;
          'wasd-controls-enabled'?: boolean | string;
          cursor?: string;
          raycaster?: string;
          fov?: number | string;
          zoom?: number | string;
          active?: boolean | string;
        },
        HTMLElement
      >;
      
      'a-plane': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          ref?: React.Ref<HTMLElement>;
          position?: Position;
          rotation?: Rotation;
          scale?: Scale;
          width?: number | string;
          height?: number | string;
          color?: string;
          src?: string;
          material?: string;
          geometry?: string;
          opacity?: number | string;
        },
        HTMLElement
      >;
      
      'a-image': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          ref?: React.Ref<HTMLElement>;
          src?: string;
          position?: Position;
          rotation?: Rotation;
          scale?: Scale;
          width?: number | string;
          height?: number | string;
          opacity?: number | string;
          material?: string;
          transparent?: boolean | string;
        },
        HTMLElement
      >;
      
      'a-cursor': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          ref?: React.Ref<HTMLElement>;
          position?: Position;
          rotation?: Rotation;
          scale?: Scale;
          geometry?: string;
          material?: string;
          fuse?: boolean | string;
          'fuse-timeout'?: number | string;
          raycaster?: string;
        },
        HTMLElement
      >;
      
      'a-box': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          ref?: React.Ref<HTMLElement>;
          position?: Position;
          rotation?: Rotation;
          scale?: Scale;
          color?: string;
          width?: number | string;
          height?: number | string;
          depth?: number | string;
        },
        HTMLElement
      >;
      
      'a-text': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          ref?: React.Ref<HTMLElement>;
          value?: string;
          position?: Position;
          rotation?: Rotation;
          scale?: Scale;
          color?: string;
          align?: string;
          width?: number | string;
        },
        HTMLElement
      >;
      
      'a-light': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          ref?: React.Ref<HTMLElement>;
          type?: 'ambient' | 'directional' | 'point' | 'spot';
          color?: string;
          intensity?: number | string;
          position?: Position;
        },
        HTMLElement
      >;
      
      'a-assets': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
      
      'a-asset-item': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          id?: string;
          src?: string;
        },
        HTMLElement
      >;
    }
  }
}