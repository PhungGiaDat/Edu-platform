import { useEffect, useRef, useCallback } from 'react';
import 'aframe';
import 'mind-ar/dist/mindar-image-aframe.prod.js';
import * as THREE from 'three';
import { MindARThree } from 'mind-ar/dist/mindar-image-three.prod.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * Types for AR Object configuration
 */
export type ARObjectData = {
  mind_file_url: string;
  model_3d_url: string;
  position?: string;
  rotation?: string;
  scale?: string;
};

export type ARSceneProps = {
  arObjects: ARObjectData[];
  isVisible: boolean;
  onReady?: () => void;
  onFound?: (targetIndex: number) => void;
  onLost?: (targetIndex: number) => void;
  onError?: (error: Error) => void;
  onVideoReady?: (video: HTMLVideoElement) => void; // PROP MỚI
  maxTrack?: number;
  className?: string;
};

/**
 * MindAR + Three.js AR Scene Component
 * Handles multi-card AR detection and 3D model rendering
 */
export default function ARSceneMindAR({
  arObjects,
  isVisible,
  onReady,
  onFound,
  onLost,
  onError,
  onVideoReady, // Nhận prop mới
  maxTrack = 5,
  className = "w-full h-full absolute inset-0"
}: ARSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mindarThreeRef = useRef<any>(null);
  const modelsRef = useRef<any[]>([]);
  const isInitializedRef = useRef(false);

  /**
   * Parse transform string to numbers
   */
  const parseTransform = useCallback((transform: string = "0 0 0"): [number, number, number] => {
    return transform.split(' ').map(Number) as [number, number, number];
  }, []);

  /**
   * Load 3D model using Three.js GLTFLoader
   */
  const loadModel = useCallback(async (modelUrl: string) => {
    const loader = new GLTFLoader();
    return new Promise((resolve, reject) => {
      loader.load(
        modelUrl,
        (gltf: any) => resolve(gltf),
        (progress: any) => console.log('Loading progress:', progress),
        (error: any) => reject(error)
      );
    });
  }, []);

  /**
   * Initialize MindAR scene
   */
  const initializeScene = useCallback(async () => {
    if (!containerRef.current || arObjects.length === 0) {
      console.warn('Container not ready or no AR objects provided');
      return;
    }

    try {
      // Wait for libraries to load
      await waitForLibraries();
      
      // Use the first object's mind file URL for initialization
      const mindFileUrl = arObjects[0].mind_file_url;
      
      console.log('🎯 Initializing MindAR with:', mindFileUrl);
      
      // Initialize MindAR using imported class
      const mindarThree = new MindARThree({
        container: containerRef.current,
        imageTargetSrc: mindFileUrl,
        maxTrack: Math.min(maxTrack, arObjects.length),
        filterMinCF: 0.0001,
        filterBeta: 0.001,
        missTolerance: 5,
        warmupTolerance: 5
      });

      const { renderer, scene, camera } = mindarThree;

      // Configure renderer
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      // Add ambient light
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
      scene.add(ambientLight);

      // Add directional light
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(0, 1, 1);
      directionalLight.castShadow = true;
      scene.add(directionalLight);

      // Load and add models to anchors
      const modelPromises = arObjects.map(async (arObject, index) => {
        try {
          const gltf: any = await loadModel(arObject.model_3d_url);
          const model = gltf.scene;

          // Apply transforms
          const [px, py, pz] = parseTransform(arObject.position);
          const [rx, ry, rz] = parseTransform(arObject.rotation);
          const [sx, sy, sz] = parseTransform(arObject.scale);

          model.position.set(px, py, pz);
          model.rotation.set(
            THREE.MathUtils.degToRad(rx),
            THREE.MathUtils.degToRad(ry),
            THREE.MathUtils.degToRad(rz)
          );
          model.scale.set(sx, sy, sz);

          // Enable shadows
          model.traverse((child: any) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });

          // Create anchor for this target
          const anchor = mindarThree.addAnchor(index);
          anchor.group.add(model);

          // Set up event listeners
          anchor.onTargetFound = () => {
            console.log(`🎯 Target ${index} found`);
            onFound?.(index);
          };

          anchor.onTargetLost = () => {
            console.log(`🎯 Target ${index} lost`);
            onLost?.(index);
          };

          console.log(`✅ Model ${index} loaded and anchored`);
          return model;
        } catch (error) {
          console.error(`❌ Failed to load model ${index}:`, error);
          onError?.(error as Error);
          return null;
        }
      });

      // Wait for all models to load
      const loadedModels = await Promise.all(modelPromises);
      modelsRef.current = loadedModels.filter(Boolean);

      // Start MindAR
      await mindarThree.start();
      mindarThreeRef.current = mindarThree;

      // BƯỚC QUAN TRỌNG: Gửi video element của MindAR về cho component cha
      if (mindarThree.video) {
        console.log('📹 MindAR video element is ready, passing to parent.');
        onVideoReady?.(mindarThree.video);
      }

      console.log('🚀 MindAR scene initialized successfully');
      onReady?.();

      // Start render loop
      const render = () => {
        if (!mindarThreeRef.current) return;
        renderer.render(scene, camera);
        requestAnimationFrame(render);
      };
      render();

      isInitializedRef.current = true;
    } catch (error) {
      console.error('❌ Failed to initialize MindAR scene:', error);
      onError?.(error as Error);
    }
  }, [arObjects, maxTrack, onReady, onFound, onLost, onError, loadModel, parseTransform, onVideoReady]); // Thêm onVideoReady vào dependency

  /**
   * Cleanup scene
   */
  const cleanup = useCallback(() => {
    if (mindarThreeRef.current) {
      console.log('🧹 Cleaning up MindAR scene');
      mindarThreeRef.current.stop();
      mindarThreeRef.current = null;
    }
    modelsRef.current = [];
    isInitializedRef.current = false;
  }, []);

  /**
   * Initialize scene when component mounts or arObjects change
   */
  useEffect(() => {
    if (isVisible && arObjects.length > 0 && !isInitializedRef.current) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(initializeScene, 100);
      return () => clearTimeout(timer);
    }
    
    if (!isVisible && isInitializedRef.current) {
      cleanup();
    }

    return cleanup;
  }, [isVisible, arObjects, initializeScene, cleanup]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  if (!isVisible) {
    return null;
  }

  return (
    <div 
      ref={containerRef} 
      className={className}
      style={{ 
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 10
      }}
    />
  );
}

/**
 * Hook to check if MindAR and Three.js are loaded
 */
export function useMindARReady(): boolean {
  // With NPM imports, libraries are always ready
  return true;
}

// Wait for libraries to load before initializing
function waitForLibraries(): Promise<void> {
  // With NPM imports, libraries are loaded synchronously, so we can return immediately
  return Promise.resolve();
}

// Helper function to preload a single AR object
export function preloadARObject(arObject: ARObjectData): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = arObject.model_3d_url;
  });
}
