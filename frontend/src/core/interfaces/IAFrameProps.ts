// src/core/interfaces/IAFrameProps.ts
/**
 * Props Interfaces cho A-Frame Components
 * Tuân theo Interface Segregation Principle (ISP)
 */

import { IEventBus } from './IEventBus';
import { IMarkerStateManager } from './IMarkerStateManager';
import type { ARTarget } from '../../types';

// ============= BASE INTERFACES =============

/**
 * Base props cho tất cả A-Frame components
 */
export interface IBaseComponentProps {
  id?: string;
  className?: string;
  visible?: boolean;
  children?: React.ReactNode;
}

/**
 * Props cho components có transform (position, rotation, scale)
 */
export interface ITransformableProps extends IBaseComponentProps {
  position?: string | { x: number; y: number; z: number };
  rotation?: string | { x: number; y: number; z: number };
  scale?: string | { x: number; y: number; z: number };
}

// ============= SCENE PROPS =============

/**
 * Props cho A-Frame Scene
 * Nhận EventBus để emit scene lifecycle events
 */
export interface ISceneProps extends IBaseComponentProps {
  embedded?: boolean;
  arjs?: string;
  'vr-mode-ui'?: string;
  renderer?: string;
  light?: string;
  
  // 🔥 Dependency Injection
  eventBus?: IEventBus;
  
  // Legacy props (sẽ deprecated)
  onVideoReady?: (video: HTMLVideoElement) => void;
}

// ============= ENTITY PROPS =============

/**
 * Props cho A-Frame Entity (generic)
 */
export interface IEntityProps extends ITransformableProps {
  geometry?: string;
  material?: string;
  light?: string;
  sound?: string;
  text?: string;
  animation?: string;
  camera?: boolean;
  cursor?: string;
  'wasd-controls-enabled'?: string | boolean;
  'look-controls-enabled'?: string | boolean;
  [key: string]: any; // A-Frame dynamic attributes
}

// ============= CAMERA PROPS =============

/**
 * Props cho A-Frame Camera
 */
export interface ICameraProps extends ITransformableProps {
  'look-controls'?: string | boolean;
  'wasd-controls'?: string | boolean;
  'look-controls-enabled'?: boolean;
  'wasd-controls-enabled'?: boolean;
  fov?: number;
  zoom?: number;
  active?: boolean;
  cursor?: string;
}

// ============= MARKER PROPS (EVENT-DRIVEN) =============

/**
 * Props cho NFT Marker Component
 * 🔥 EVENT-DRIVEN: Không có callbacks, chỉ inject dependencies
 */
export interface INftMarkerProps extends ITransformableProps {
  type: 'nft';
  url: string;
  
  /** Unique marker ID để track state */
  markerId: string;
  
  /** Target data (optional, để access metadata) */
  target?: ARTarget;
  
  // 🔥 DEPENDENCY INJECTION - Core pattern
  eventBus?: IEventBus;
  markerStateManager?: IMarkerStateManager;
  
  // ❌ DEPRECATED: Callbacks vi phạm event-driven
  // onMarkerFound?: () => void;
  // onMarkerLost?: () => void;
  
  // A-Frame NFT specific props
  smooth?: string | boolean;
  smoothCount?: string | number;
  smoothTolerance?: string | number;
  smoothThreshold?: string | number;
}

// ============= PRIMITIVE PROPS =============

/**
 * Props cho A-Frame Image
 */
export interface IImageProps extends Omit<ITransformableProps, 'children'> {
  src: string;
  width?: number;
  height?: number;
  opacity?: number;
  transparent?: boolean;
  material?: string;
}

/**
 * Props cho A-Frame Plane
 */
export interface IPlaneProps extends Omit<ITransformableProps, 'children'> {
  width?: number | string;
  height?: number | string;
  color?: string;
  opacity?: number | string;
  material?: string;
}

/**
 * Props cho A-Frame Cursor
 */
export interface ICursorProps extends Omit<ITransformableProps, 'children'> {
  geometry?: string;
  material?: string;
  fuse?: boolean;
  'fuse-timeout'?: number;
  raycaster?: string;
}

/**
 * Props cho GLTF Model
 */
export interface IGltfModelProps extends ITransformableProps {
  'gltf-model': string;
  'animation-mixer'?: string;
  shadow?: string;
}