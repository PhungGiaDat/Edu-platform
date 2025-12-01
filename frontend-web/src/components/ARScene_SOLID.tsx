// src/components/ARScene_SOLID.tsx - CORRECT ARCHITECTURE
import React, { useEffect, useRef } from 'react';
import type { ARTarget, ARCombo } from '../types';
import type { AppMode } from '../hooks/useDisplayMode';
import { Scene, Entity, Cursor, Plane, Image, GltfModel } from './aframe/AFrameComponents';
import { Nft } from './aframe/Nft';
import { eventBus, markerStateManager } from '@/runtime';
import "../styles/ARScene.css";

interface Props {
  isVisible: boolean;
  displayMode: '2D' | '3D';
  targets: ARTarget[];
  combo: ARCombo | null;
  appMode?: AppMode;
  onVideoReady?: (video: HTMLVideoElement) => void;
  onMarkerEvent?: () => void;
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
  const sceneRef = useRef<HTMLElement>(null);
  const needsCursor = appMode === 'GAME' || appMode === 'QUIZ';

  // ========== DEBUG AR.JS EVENTS (catch ALL events) ==========
  useEffect(() => {
    const sceneEl = sceneRef.current;
    if (!sceneEl) return;

    // Listen for ALL AR.js related events at scene level
    const debugEvents = [
      'arjs-video-loaded',
      'arjs-nft-loaded', 
      'arjs-nft-init-data',
      'camera-init',
      'camera-error',
      'markerFound',
      'markerLost',
      'nftmarker-found',
      'nftmarker-lost'
    ];

    const debugHandler = (eventName: string) => (e: Event) => {
      console.log(`🔍 [AR.js DEBUG] Scene event: ${eventName}`, e);
    };

    debugEvents.forEach(eventName => {
      sceneEl.addEventListener(eventName, debugHandler(eventName));
    });

    // Also listen on window for global AR.js events
    window.addEventListener('arjs-video-loaded', (e) => {
      console.log('🔍 [AR.js DEBUG] Window: arjs-video-loaded', e);
    });

    console.log('🔍 AR.js debug listeners registered at scene level');

    return () => {
      debugEvents.forEach(eventName => {
        sceneEl.removeEventListener(eventName, debugHandler(eventName));
      });
    };
  }, []);

  // ========== RENDERER SETUP (Fix White Screen) ==========
  useEffect(() => {
    const sceneEl = sceneRef.current;
    if (!sceneEl) return;

    const setupRenderer = () => {
      const renderer = (sceneEl as any).renderer;
      if (renderer) {
        // 🔥 Critical: Set transparent background
        renderer.setClearColor(0x000000, 0);
        renderer.setClearAlpha(0);
        console.log('✅ Renderer transparency applied');
      }

      const scene = (sceneEl as any).object3D;
      if (scene) {
        scene.background = null;
        console.log('✅ Scene background removed');
      }
    };

    // Setup immediately if already loaded
    if ((sceneEl as any).hasLoaded) {
      setupRenderer();
    }

    // Listen for loaded event
    const onLoaded = () => {
      console.log('📹 A-Frame scene loaded');
      setupRenderer();
      
      // Debug AR.js system
      const arSystem = (sceneEl as any).systems?.['arjs'];
      console.log('🔍 [AR.js DEBUG] AR.js system:', arSystem);
      
      // Check all a-nft elements
      const nftElements = sceneEl.querySelectorAll('a-nft');
      console.log('🔍 [AR.js DEBUG] NFT elements found:', nftElements.length);
      nftElements.forEach((nft, i) => {
        const nftEl = nft as any;
        console.log(`  NFT ${i}:`, {
          url: nft.getAttribute('url'),
          components: Object.keys(nftEl.components || {}),
          isLoaded: nftEl.hasLoaded
        });
      });
    };

    sceneEl.addEventListener('loaded', onLoaded);

    return () => {
      sceneEl.removeEventListener('loaded', onLoaded);
    };
  }, []);

  // ========== COMBO SETUP ==========
  useEffect(() => {
    console.log('🎯 ARScene_SOLID: Setting combo', combo?.combo_id);
    markerStateManager.setCombo(combo);
    markerStateManager.setEventBus(eventBus);
  }, [combo]);

  // ========== MARKER EVENT SUBSCRIPTION ==========
  useEffect(() => {
    const handleMarkerFound = (payload: any) => {
      console.log('🎯 ARScene_SOLID: Marker found', payload.markerId);
      onMarkerEvent?.();
    };

    const handleMarkerLost = (payload: any) => {
      console.log('👻 ARScene_SOLID: Marker lost', payload.markerId);
      onMarkerEvent?.();
    };

    // Subscribe to events
    eventBus.on('MARKER_FOUND', handleMarkerFound);
    eventBus.on('MARKER_LOST', handleMarkerLost);

    return () => {
      eventBus.off('MARKER_FOUND', handleMarkerFound);
      eventBus.off('MARKER_LOST', handleMarkerLost);
    };
  }, [onMarkerEvent]);

  // ========== GET COMBO STATE ==========
  // Read state from markerStateManager (not from hook)
  const isComboActive = markerStateManager.isComboActive();

  if (!isVisible) {
    return null;
  }

  const anchorTag = combo?.required_tags[0];

  // Determine tracking method based on whether we have NFT targets
  const hasNftTargets = targets.length > 0;
  const trackingMethod = hasNftTargets ? 'nft' : 'best';
  
  return (
    <Scene
      ref={sceneRef}
      embedded
      vr-mode-ui="enabled: false"
      renderer="antialias: true; alpha: true; precision: mediump;logarithmicDepthBuffer: true"
      arjs={`sourceType: webcam; trackingMethod: ${trackingMethod}; debugUIEnabled: true; changeMatrixMode: cameraTransformMatrix;`}
      light="defaultLightEnabled: false"
      eventBus={eventBus}
      onVideoReady={onVideoReady}
    >
      {/* Camera */}
      <Entity 
        camera 
        position="0 0 0"
        wasd-controls-enabled="false" 
        look-controls-enabled="false"
        {...(needsCursor && { cursor: "rayOrigin: mouse" })}
      >
        {needsCursor && (
          <Cursor 
            geometry="primitive: ring; radiusInner: 0.01; radiusOuter: 0.015"
            material="color: #fff; opacity: 0.8"
            position="0 0 -1"
          />
        )}
      </Entity>

      {/* Lighting */}
      <Entity light="type: ambient; intensity: 0.8" />
      <Entity light="type: directional; position: 0 10 5; intensity: 0.6" />

      {/* NFT Markers */}
      {targets.map(target => (
        <Nft
          key={target.tag}
          type="nft"
          url={target.nft_base_url}
          markerId={target.tag}
          target={target}
          eventBus={eventBus}
          markerStateManager={markerStateManager}
        >
          {/* Debug plane */}
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