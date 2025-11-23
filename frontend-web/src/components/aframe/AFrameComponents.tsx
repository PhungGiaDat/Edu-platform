// src/components/aframe/AFrameComponents.tsx
import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type { AFrameScene} from '@/types/aframe';
import type {
  ISceneProps,
  IEntityProps,
  ICameraProps,
  IPlaneProps,
  IImageProps,
  ICursorProps,
  IGltfModelProps
} from '@/core/interfaces/IAFrameProps';
import { AREvent } from '@/core/types/AREvents';

export const Scene = forwardRef<HTMLElement, ISceneProps>(
  ({ children, eventBus, onVideoReady, ...props }, ref) => {
    const sceneRef = useRef<HTMLElement>(null);
    const videoEmittedRef = useRef(false);
    
    useImperativeHandle(ref, () => sceneRef.current!);
    
    useEffect(() => {
      const sceneEl = sceneRef.current as unknown as AFrameScene | null;
      if (!sceneEl) return;

      let videoFound = false;

      const handleSceneLoaded = () => {
        console.log('🎬 AR Scene loaded');
        
        if (eventBus) {
          eventBus.emit(AREvent.SCENE_READY, { scene: sceneEl });
        }
        
        if (sceneEl.renderer) {
          sceneEl.renderer.setClearColor(0x000000, 0);
          sceneEl.renderer.setClearAlpha(0);
        }

        if (sceneEl.object3D) {
          sceneEl.object3D.background = null;
        }
      };

      const findVideo = () => {
        if (videoFound || videoEmittedRef.current) return;
        const video = document.querySelector('video');
        if (video) {
          videoFound = true;
          videoEmittedRef.current = true;
          console.log('📹 Video element found in AR Scene', {
            width: video.videoWidth,
            height: video.videoHeight,
            readyState: video.readyState
          });
          onVideoReady?.(video);
          if (eventBus) {
            eventBus.emit(AREvent.VIDEO_READY, { video });
          }
        }
      };

      if (sceneEl.hasLoaded) {
        handleSceneLoaded();
      } else {
        sceneEl.addEventListener('loaded', handleSceneLoaded, { once: true });
      }

      [100, 500, 1000, 2000].forEach((delay) => setTimeout(findVideo, delay));

      const observer = new MutationObserver(() => {
        if (document.querySelector('video')) setTimeout(findVideo, 100);
      });

      observer.observe(document.body, { childList: true, subtree: true });

      return () => {
        sceneEl.removeEventListener('loaded', handleSceneLoaded);
        observer.disconnect();
        videoEmittedRef.current = false;
        
        if (eventBus) {
          eventBus.emit(AREvent.SCENE_DESTROYED, { scene: sceneEl });
        }
      };
    }, [eventBus, onVideoReady]);
    
    return <a-scene ref={sceneRef} {...props}>{children}</a-scene>;
  }
);
Scene.displayName = 'Scene';

export const Entity = forwardRef<HTMLElement, IEntityProps>(
  ({ children, ...props }, ref) => <a-entity ref={ref} {...props}>{children}</a-entity>
);
Entity.displayName = 'Entity';

export const Camera = forwardRef<HTMLElement, ICameraProps>(
  ({ children, ...props }, ref) => <a-camera ref={ref} {...props}>{children}</a-camera>
);
Camera.displayName = 'Camera';

export const Plane = forwardRef<HTMLElement, IPlaneProps>(
  (props, ref) => <a-plane ref={ref} {...props} />
);
Plane.displayName = 'Plane';

export const Image = forwardRef<HTMLElement, IImageProps>(
  (props, ref) => <a-image ref={ref} {...props} />
);
Image.displayName = 'Image';

export const Cursor = forwardRef<HTMLElement, ICursorProps>(
  (props, ref) => <a-cursor ref={ref} {...props} />
);
Cursor.displayName = 'Cursor';

export const GltfModel = forwardRef<HTMLElement, IGltfModelProps>(
  ({ children, ...props }, ref) => <a-entity ref={ref} {...props}>{children}</a-entity>
);
GltfModel.displayName = 'GltfModel';