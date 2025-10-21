import React, { useEffect, useRef } from 'react';
import { useMarkerState } from '../hooks/useMarkerState';
import type { ARTarget, ARCombo } from '../types';
import type { AppMode } from '../hooks/useDisplayMode';
import { Scene, Entity, Cursor, Plane, Image, GltfModel } from './aframe/AFrameComponents';
import { Nft } from './aframe/Nft';
import "../styles/ARScene.css";

interface Props {
  isVisible: boolean;
  displayMode: '2D' | '3D';
  targets: ARTarget[];
  combo: ARCombo | null;
  appMode?: AppMode;
  onVideoReady?: (video: HTMLVideoElement) => void;
  onMarkerEvent?: () => void; // ✅ NEW: Callback for marker events
}

const ARScene_SOLID: React.FC<Props> = ({ 
  isVisible, 
  displayMode, 
  targets, 
  combo, 
  appMode = 'LEARNING',
  onVideoReady,
  onMarkerEvent
}) => {
  const sceneRef = useRef<any>(null);
  const { isComboActive, markerHandlers } = useMarkerState(combo);

  const needsCursor = appMode === 'GAME' || appMode === 'QUIZ';

  useEffect(() => {
    const sceneEl = sceneRef.current;
    if (!sceneEl) {
      console.log('❌ Scene element not found');
      return;
    }

    let videoFound = false;
    let setupComplete = false;

    const setupScene = () => {
      if (setupComplete) return;
      
      console.log('🔧 Setting up AR scene...');
      
      const renderer = sceneEl.renderer;
      if (renderer) {
        renderer.setClearColor(0x000000, 0);
        renderer.setClearAlpha(0);
        
        if (renderer.context && renderer.context.DEPTH_TEST !== undefined) {
          renderer.context.enable(renderer.context.DEPTH_TEST);
          console.log('✅ Renderer transparency and depth test applied');
        } else {
          console.log('⚠️ Renderer context not ready yet, skipping DEPTH_TEST');
        }
      }

      const scene = sceneEl.object3D;
      if (scene) {
        scene.background = null;
        console.log('✅ Scene background removed');
      }
      
      setupComplete = true;
    };

    const findVideo = () => {
      if (videoFound) return;

      const video = document.querySelector('video');
      if (video) {
        console.log('✅ Video found');
        videoFound = true;
        onVideoReady?.(video);
      }
    };

    const onLoaded = () => {
      console.log('🎬 AR.js scene loaded');
      setupScene();
      
      setTimeout(() => {
        const arSystem = sceneEl.systems?.arjs;
        console.log('🔍 AR.js System Check:', {
          hasSystem: !!arSystem,
          arjsVersion: (window as any).THREEx?.ArToolkitContext?.prototype?.constructor?.toString().match(/v\d+\.\d+\.\d+/)?.[0],
          trackingMethod: arSystem?.data?.trackingMethod,
          sourceType: arSystem?.data?.sourceType,
          actualChangeMatrixMode: arSystem?.data?.changeMatrixMode
        });
        
        const arjsAttr = sceneEl.getAttribute('arjs');
        console.log('📋 Applied arjs config:', arjsAttr);
      }, 1000);
      
      [100, 500, 1000, 2000].forEach((delay, i) => {
        setTimeout(() => {
          console.log(`🔍 Video search ${i + 1}`);
          findVideo();
        }, delay);
      });
    };

    sceneEl.addEventListener('loaded', onLoaded, { once: true });
    if (sceneEl.hasLoaded) onLoaded();

    const observer = new MutationObserver(() => {
      if (document.querySelector('video')) {
        setTimeout(findVideo, 100);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      sceneEl.removeEventListener('loaded', onLoaded);
      observer.disconnect();
    };
  }, [onVideoReady]);

  if (!isVisible) {
    console.log('🚫 ARScene not visible');
    return null;
  }

  const anchorTag = combo?.required_tags[0];

const onMarkerFound = (tag: string) => {
  console.log('🎯 MARKER FOUND:', tag);
  markerHandlers.onMarkerFound(tag);
  onMarkerEvent?.(); // ✅ Also trigger here for immediate feedback
};

const onMarkerLost = (tag: string) => {
  console.log('🎯 MARKER LOST:', tag);
  markerHandlers.onMarkerLost(tag);
  onMarkerEvent?.(); // ✅ Also trigger here
};

  console.log('🎬 Rendering ARScene:', {
    targetsCount: targets.length,
    displayMode,
    isComboActive
  });

  return (
    <Scene
      ref={sceneRef}
      embedded
      vr-mode-ui="enabled: false"
      renderer="antialias: true; alpha: true; precision: mediump;"
      arjs="sourceType: webcam; trackingMethod: best; debugUIEnabled: true;"
      light="defaultLightEnabled: false"
    >
      <Entity 
        camera 
        position="0 0 0"
        wasd-controls-enabled="false" 
        look-controls-enabled="false"
        {...(needsCursor && {
          cursor: "rayOrigin: mouse"
        })}
      >
        {needsCursor && (
          <Cursor 
            geometry="primitive: ring; radiusInner: 0.01; radiusOuter: 0.015"
            material="color: #fff; opacity: 0.8"
            position="0 0 -1"
          />
        )}
      </Entity>

      <Entity light="type: ambient; intensity: 0.8" />
      <Entity light="type: directional; position: 0 10 5; intensity: 0.6" />

      {targets.map(target => (
        <Nft
          key={target.tag}
          type="nft"
          url={target.nft_base_url}
          onMarkerFound={() => onMarkerFound(target.tag)}
          onMarkerLost={() => onMarkerLost(target.tag)}
        >
          {/* 🔥 DEBUG PLANE - Hình vuông vàng để test anchor */}
          <Plane
            position="0 0 0"
            rotation="-90 0 0"
            width="0.5"
            height="0.5"
            color="yellow"
            opacity="0.5"
            material="side: double; transparent: true"
          />
          
          {/* 2D Image */}
          <Image
            src={target.image_2d_url || ''}
            position={target.position || '0 0 0'}
            rotation={target.rotation || '-90 0 0'}
            scale={target.scale || '1 1 1'}
            visible={!isComboActive && displayMode === '2D'}
            material="transparent: true; alphaTest: 0.1; side: double"
          />

          {/* 3D Model */}
          <GltfModel
            gltf-model={`url(${target.model_3d_url})`}
            position={target.position || '0 0 0'}
            rotation={target.rotation || '0 0 0'}
            scale={target.scale || '0.5 0.5 0.5'}
            visible={!isComboActive && displayMode === '3D'}
            animation-mixer="clip: *; loop: repeat"
          />

          {/* Combo models */}
          {combo && target.tag === anchorTag && (
            <Entity visible={isComboActive}>
              <Image
                src={combo.image_2d_url || ''}
                position={combo.center_transform?.position || '0 0 0.2'}
                rotation="-90 0 0"
                scale={combo.center_transform?.scale || '1.5 1.5 1.5'}
                visible={displayMode === '2D'}
                material="transparent: true; alphaTest: 0.1; side: double"
              />

              <GltfModel
                gltf-model={`url(${combo.model_3d_url})`}
                position={combo.center_transform?.position || '0 0 0.2'}
                scale={combo.center_transform?.scale || '1.5 1.5 1.5'}
                visible={displayMode === '3D'}
                animation-mixer="clip: *; loop: repeat"
              />
            </Entity>
          )}
        </Nft>
      ))}
    </Scene>
  );
};

export default ARScene_SOLID;