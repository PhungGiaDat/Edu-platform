import React, { useRef, useEffect, useState } from 'react';
import { RealtimeQRService, type QRDetectionResult } from '../services/WebSocketQRServices';

// Type declarations for global libraries
declare global {
  interface Window {
    AFRAME: any;
    MINDAR: any;
  }
}

const ARView: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const mirrorVideoRef = useRef<HTMLVideoElement>(null); // Add visible camera feed
  const [arReady, setArReady] = useState(false);
  const [qrService, setQrService] = useState<RealtimeQRService | null>(null);
  const [detectedObjects, setDetectedObjects] = useState<QRDetectionResult[]>([]);
  const [connectionStatus, setConnectionStatus] = useState('Connecting...');
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [alreadyLoadedQRs, setAlreadyLoadedQRs] = useState<string[]>([]);
  const [mindarSystem, setMindarSystem] = useState<any>(null);
  const [allDetectedTargets, setAllDetectedTargets] = useState<QRDetectionResult[]>([]);

  // Helper function to dynamically update MindAR targets for multi-marker detection
  const updateARTargets = async (detectionResult: QRDetectionResult) => {
    if (!mindarSystem || !detectionResult.mind_file_url || !detectionResult.targets) {
      console.warn('⚠️ Cannot update AR targets - missing system or data');
      return;
    }

    try {
      console.log('🎯 Updating MindAR with multi-marker targets:', detectionResult.mind_file_url);
      console.log('📋 Target count:', detectionResult.targets.length);
      
      // Stop current tracking if active
      if (mindarSystem.isTracking) {
        console.log('⏸️ Stopping current MindAR tracking...');
        await mindarSystem.stop();
      }

      // Get the scene element to update imageTargetSrc dynamically
      const scene = sceneRef.current?.querySelector('a-scene');
      if (scene) {
        console.log('🔄 Updating imageTargetSrc with mind file:', detectionResult.mind_file_url);
        // Update imageTargetSrc dynamically with the .mind file URL
        scene.setAttribute('mindar-image', 
          `imageTargetSrc: ${detectionResult.mind_file_url}; ` +
          'autoStart: false; ' +
          'uiLoading: no; ' +
          'uiScanning: no; ' +
          'uiError: no; ' +
          'maxTrack: 5'
        );
      }

      // Update the mind file for tracking (targets should match .mind file)
      mindarSystem.targetFiles = [detectionResult.mind_file_url];
      
      // Re-initialize with new targets
      console.log('🔧 Re-initializing MindAR system...');
      await mindarSystem.init();
      
      // Add/update AR entities for each target (multi-models support)
      const arContainer = document.querySelector('#ar-container');
      const assets = document.querySelector('#ar-assets');
      
      if (arContainer && assets) {
        // Clear previous entities
        arContainer.innerHTML = '';
        console.log('🧹 Cleared previous AR entities');
        
        // Process each target for multi-marker experience
        detectionResult.targets.forEach((target, index) => {
          console.log(`🎯 Processing target ${index + 1}/${detectionResult.targets!.length}:`, target.tag);
          
          // Add model to assets if not already there (multi-models)
          const modelId = `model-${target.targetId}`;
          if (!document.querySelector(`#${modelId}`)) {
            const modelAsset = document.createElement('a-asset-item');
            modelAsset.id = modelId;
            modelAsset.setAttribute('src', target.model_url);
            assets.appendChild(modelAsset);
            console.log(`📦 Added model asset: ${modelId} -> ${target.model_url}`);
          }

          // Create AR target entity with proper targetIndex
          const arTarget = document.createElement('a-entity');
          arTarget.setAttribute('mindar-image-target', `targetIndex: ${index}`);
          arTarget.id = `target-${index}`;
          
          // Create 3D model element
          const model = document.createElement('a-gltf-model');
          model.setAttribute('src', `#${modelId}`);
          model.setAttribute('scale', target.scale || '1 1 1');
          model.setAttribute('position', target.position || '0 0 0');
          model.setAttribute('rotation', target.rotation || '0 0 0');
          model.setAttribute('animation-mixer', '');
          
          // Add optional text/description if available
          if (target.tag || target.description) {
            const textEntity = document.createElement('a-text');
            textEntity.setAttribute('value', target.tag || target.description || '');
            textEntity.setAttribute('position', '0 1.5 0');
            textEntity.setAttribute('align', 'center');
            textEntity.setAttribute('color', '#FFFFFF');
            textEntity.setAttribute('shader', 'msdf');
            textEntity.setAttribute('font', 'roboto');
            arTarget.appendChild(textEntity);
            console.log(`📝 Added text label: "${target.tag || target.description}"`);
          }
          
          arTarget.appendChild(model);
          arContainer.appendChild(arTarget);
          console.log(`✅ Created AR target ${index}: ${target.tag}`);
        });
        
        console.log(`🎊 Successfully created ${detectionResult.targets.length} AR targets`);
      }

      // Start tracking with new multi-target configuration
      console.log('🚀 Starting MindAR multi-target tracking...');
      await mindarSystem.start();
      console.log('✅ MindAR multi-marker tracking started successfully');
      
    } catch (error) {
      console.error('❌ Failed to update AR targets:', error);
      throw error;
    }
  };

  // Helper function to merge multiple QR detections for multi-flashcard scenarios
  const mergeMultipleTargets = (newResult: QRDetectionResult) => {
    console.log('🔗 Merging multiple AR targets for multi-flashcard experience');
    
    // Combine all targets from different QR codes
    const allTargets = allDetectedTargets.reduce((acc, result) => {
      if (result.targets) {
        acc.push(...result.targets);
      }
      return acc;
    }, [] as any[]);

    // Add new targets
    if (newResult.targets) {
      allTargets.push(...newResult.targets);
    }

    // Create merged result with all targets
    const mergedResult: QRDetectionResult = {
      ...newResult,
      targets: allTargets,
      message: `Multi-flashcard AR: ${allTargets.length} targets loaded`
    };

    return mergedResult;
  };

  useEffect(() => {
    let mindARScript: HTMLScriptElement | null = null;
    let aFrameScript: HTMLScriptElement | null = null;

    const loadScripts = async () => {
      try {
        // Load A-Frame first
        if (!window.AFRAME) {
          aFrameScript = document.createElement('script');
          aFrameScript.src = 'https://aframe.io/releases/1.6.0/aframe.min.js';
          aFrameScript.async = true;
          document.head.appendChild(aFrameScript);
          
          await new Promise((resolve, reject) => {
            aFrameScript!.onload = resolve;
            aFrameScript!.onerror = reject;
          });
        }

        // Load MindAR after A-Frame
        if (!window.MINDAR) {
          mindARScript = document.createElement('script');
          mindARScript.src = 'https://cdn.jsdelivr.net/npm/mind-ar@1.2.2/dist/mindar-image-aframe.prod.js';
          mindARScript.async = true;
          document.head.appendChild(mindARScript);
          
          await new Promise((resolve, reject) => {
            mindARScript!.onload = resolve;
            mindARScript!.onerror = reject;
          });
        }

        setArReady(true);
      } catch (error) {
        console.error('Failed to load AR scripts:', error);
        setConnectionStatus('Failed to load AR libraries');
      }
    };

    loadScripts();

    return () => {
      if (mindARScript) {
        document.head.removeChild(mindARScript);
      }
      if (aFrameScript) {
        document.head.removeChild(aFrameScript);
      }
    };
  }, []);

  useEffect(() => {
    if (!arReady || !sceneRef.current) return;

    const initializeARScene = () => {
      console.log('🎬 Initializing MindAR scene with dynamic setup for multi/single image markers');
      
      // Clear any existing scene
      if (sceneRef.current) {
        sceneRef.current.innerHTML = '';
      }
      
      // Create A-Frame scene dynamically with proper attribute format
      const scene = document.createElement('a-scene');
      
      // Set mindar-image attributes as string (not JSON) for A-Frame compatibility
      scene.setAttribute('mindar-image', 
        'imageTargetSrc: ; ' +           // Empty initially - will be dynamically updated
        'autoStart: false; ' +           // Don't start detection immediately  
        'uiLoading: no; ' +             // Hide loading animation
        'uiScanning: no; ' +            // Hide scanning animation
        'uiError: no; ' +               // Hide error animation
        'maxTrack: 5'                   // Support up to 5 simultaneous targets for multi-marker
      );
      
      // Set other scene attributes
      scene.setAttribute('color-space', 'sRGB');
      scene.setAttribute('renderer', 'colorManagement: true, physicallyCorrectLights');
      scene.setAttribute('vr-mode-ui', 'enabled: false');
      scene.setAttribute('device-orientation-permission-ui', 'enabled: false');
      scene.setAttribute('embedded', '');

      // Add camera with AR capabilities
      const camera = document.createElement('a-camera');
      camera.setAttribute('position', '0 0 0');
      camera.setAttribute('look-controls', 'enabled: false');
      camera.setAttribute('cursor', 'fuse: false; rayOrigin: mouse');
      camera.setAttribute('raycaster', 'far: 10000; objects: .clickable');
      scene.appendChild(camera);

      // Add empty assets container (will be populated dynamically when QR detected)
      const assets = document.createElement('a-assets');
      assets.id = 'ar-assets';
      scene.appendChild(assets);

      // Add container for AR entities (will be populated when targets detected)
      const arContainer = document.createElement('a-entity');
      arContainer.id = 'ar-container';
      scene.appendChild(arContainer);

      // Append scene to container
      sceneRef.current!.appendChild(scene);

      // Get MindAR system reference after render starts
      scene.addEventListener('renderstart', () => {
        console.log('🎯 A-Frame render started, getting MindAR system...');
        const system = (scene as any).systems['mindar-image'];
        if (system) {
          setMindarSystem(system);
          console.log('✅ MindAR system ready for dynamic target loading');
        } else {
          console.warn('⚠️ MindAR system not found after renderstart');
        }
      });

      setConnectionStatus('AR scene ready - awaiting targets');
    };

    const initializeCamera = async () => {
      try {
        // Start shared camera stream for both QR detection and MindAR background
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: "environment",
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
        });

        setCameraStream(stream);

        // Set up hidden video for QR detection and MindAR
        const video = videoRef.current!;
        video.srcObject = stream;
        video.setAttribute("playsinline", "");
        video.setAttribute("autoplay", "");
        video.setAttribute("muted", "");

        // Set up visible video for camera feed display
        const mirrorVideo = mirrorVideoRef.current!;
        mirrorVideo.srcObject = stream;
        mirrorVideo.setAttribute("playsinline", "");
        mirrorVideo.setAttribute("autoplay", "");
        mirrorVideo.setAttribute("muted", "");

        video.onloadedmetadata = async () => {
          try {
            await video.play();
            await mirrorVideo.play();
            
            setConnectionStatus('Camera ready');
            console.log('📷 Camera initialized:', video.videoWidth, 'x', video.videoHeight);
            
            // Inject video into MindAR when system is ready
            if (mindarSystem) {
              console.log('🎯 Injecting camera stream into MindAR...');
              mindarSystem.video = video;
              await mindarSystem.startVideo();
              setConnectionStatus('MindAR camera feed active');
            }

            // Initialize RealtimeQRService for realtime scanning
            const onDetection = async (result: QRDetectionResult) => {
              console.log("✅ Realtime QR detected from backend:", result);
              
              // Check for multiple flashcard detection to prevent reload
              if (result.qr_id && alreadyLoadedQRs.includes(result.qr_id)) {
                console.log("🔄 QR already loaded, skipping:", result.qr_id);
                return;
              }
              
              // Process detection result from backend (multi-marker support)
              if (result.success) {
                console.log("🎯 Processing successful detection result...");
                
                // Validate required fields for multi-marker
                if (!result.mind_file_url || !result.targets || result.targets.length === 0) {
                  console.warn("⚠️ Invalid detection result - missing mind_file_url or targets");
                  setConnectionStatus('❌ Invalid QR detection result');
                  return;
                }
                
                console.log(`📋 Backend provided mind file: ${result.mind_file_url}`);
                console.log(`🎯 Backend provided ${result.targets.length} targets for multi-marker`);
                
                if (result.qr_id) {
                  setAlreadyLoadedQRs(prev => [...prev, result.qr_id!]);
                  // Track all detected targets for multi-flashcard scenarios
                  setAllDetectedTargets(prev => [...prev, result]);
                }
                
                setDetectedObjects(prev => [...prev, result]);
                setConnectionStatus('🎯 QR detected! Loading multi-marker AR...');
                
                try {
                  // For multi-flashcard: merge with existing targets if needed
                  const finalResult = allDetectedTargets.length > 0 ? 
                    mergeMultipleTargets(result) : result;
                  
                  console.log(`🔄 Updating AR scene with ${finalResult.targets?.length || 0} targets...`);
                  
                  // Update imageTargetSrc, add assets, create targets, and start tracking
                  await updateARTargets(finalResult);
                  
                  const targetCount = finalResult.targets?.length || 0;
                  setConnectionStatus(`🎯 Multi-marker AR active! (${targetCount} ${targetCount === 1 ? 'target' : 'targets'} tracking)`);
                  
                  console.log(`✅ Multi-marker AR scene successfully updated with ${targetCount} targets`);
                  
                } catch (error) {
                  console.error('❌ Failed to update multi-marker AR scene:', error);
                  setConnectionStatus('❌ Multi-marker AR update failed');
                }
              } else {
                console.log("❌ Detection result was not successful:", result.error || result.message);
                setConnectionStatus('❌ QR detection failed');
              }
            };

            const onError = (error: Error) => {
              console.error("❌ Realtime QR Service error:", error);
              setConnectionStatus('❌ Realtime scanner error - reconnecting...');
            };

            const onConnectionChange = (connected: boolean) => {
              const status = connected ? 
                '🔌 Connected - Scanning every 10s...' : 
                '🔌 Disconnected from realtime service';
              setConnectionStatus(status);
              console.log(connected ? '✅ WebSocket connected for realtime scanning' : '❌ WebSocket disconnected');
            };

            // Create RealtimeQRService instance with 10s interval for base64 frame capture
            const service = new RealtimeQRService(
              onDetection, 
              onError, 
              onConnectionChange,
              10000 // Send base64 frame every 10 seconds for realtime scanning
            );
            
            try {
              console.log('🔌 Connecting to realtime QR WebSocket service...');
              setConnectionStatus('🔌 Connecting to realtime service...');
              
              // Connect to WebSocket first
              await service.connect();
              console.log('✅ WebSocket connected, initializing camera integration...');
              
              // Initialize with shared video element (same video used for MindAR)
              service.initialize(video);
              console.log('📷 Camera integrated with realtime QR service');
              
              // Start realtime scanning (captureAndSend every 10s)
              service.startScanning();
              console.log('🔍 Realtime scanning started - capturing frames every 10s');
              
              setQrService(service);
              setConnectionStatus('🔍 Realtime scanning active...');
              
            } catch (error) {
              console.error('❌ Failed to initialize realtime QR service:', error);
              setConnectionStatus('❌ Realtime service failed to start');
            }
            
          } catch (err) {
            console.error('Camera playback error:', err);
            setConnectionStatus("Camera playback failed: " + (err as Error).message);
          }
        };
      } catch (error) {
        console.error('Failed to initialize camera:', error);
        setConnectionStatus('Camera access failed');
      }
    };

    // Initialize both AR scene and camera
    initializeARScene();
    initializeCamera();

    return () => {
      console.log('🧹 Cleaning up ARView component...');
      
      // Stop and disconnect RealtimeQRService
      if (qrService) {
        console.log('⏹️ Stopping QR scanning service...');
        qrService.stopScanning();
        qrService.disconnect();
        setQrService(null);
      }
      
      // Stop MindAR tracking if active
      if (mindarSystem && mindarSystem.isTracking) {
        console.log('⏹️ Stopping MindAR tracking...');
        mindarSystem.stop().catch(console.error);
        setMindarSystem(null);
      }
      
      // Clean up camera stream tracks
      if (cameraStream) {
        console.log('📷 Stopping camera stream tracks...');
        cameraStream.getTracks().forEach(track => {
          track.stop();
          console.log(`🔴 Stopped ${track.kind} track:`, track.label);
        });
        setCameraStream(null);
      }
      
      // Clean up video elements
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      if (mirrorVideoRef.current) {
        mirrorVideoRef.current.srcObject = null;
      }
      
      // Remove A-Frame scene completely
      if (sceneRef.current) {
        console.log('🗑️ Removing A-Frame scene...');
        sceneRef.current.innerHTML = '';
      }
      
      // Reset all state
      setDetectedObjects([]);
      setAlreadyLoadedQRs([]);
      setAllDetectedTargets([]);
      setConnectionStatus('Disconnected');
      
      console.log('✅ ARView cleanup completed');
    };
  }, [arReady, mindarSystem, alreadyLoadedQRs, allDetectedTargets]);

  // Loading Screen Component
  const LoadingScreen = () => (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100 text-gray-800">
      <div className="mb-4">
        <div className="w-10 h-10 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-lg font-medium">Loading AR Experience...</p>
      </div>
    </div>
  );

  // Status Bar Component
  const StatusBar = () => (
    <div className="absolute top-3 left-3 right-3 z-50 bg-black bg-opacity-70 text-white p-3 rounded-lg text-sm">
      <div className="flex justify-between items-center">
        <span>AR Status: Ready</span>
        <span className={`font-bold ${detectedObjects.length > 0 ? 'text-green-400' : 'text-yellow-400'}`}>
          {connectionStatus}
        </span>
      </div>
      {detectedObjects.length > 0 && (
        <div className="mt-1 text-xs">
          Detected: {detectedObjects.map(obj => obj.targets?.[0]?.tag || 'Unknown').join(', ')}
        </div>
      )}
    </div>
  );

  // Instructions Component
  const Instructions = () => (
    <div className="absolute bottom-5 left-5 right-5 z-50 bg-white bg-opacity-95 p-4 rounded-lg text-center shadow-lg">
      <div className="text-base font-bold mb-1">
        📚 Multi-Marker AR Learning Experience
      </div>
      <div className="text-sm text-gray-600">
        <div className="mb-2">
          🔍 <strong>Step 1:</strong> Hold flashcard with QR code in front of camera
        </div>
        <div className="mb-2">
          🎯 <strong>Step 2:</strong> Point camera at target images to see 3D models
        </div>
        <div className="mb-2">
          🔗 <strong>Multi-Marker:</strong> Scan multiple QR codes for combined AR experience
        </div>
        {detectedObjects.length === 0 && (
          <div className="text-blue-500 mt-2 p-2 bg-blue-50 rounded">
            📡 Realtime multi-marker scanning every 10 seconds via WebSocket!
          </div>
        )}
        {detectedObjects.length > 0 && (
          <div className="text-green-600 mt-2 p-2 bg-green-50 rounded">
            ✅ {detectedObjects.reduce((count, obj) => count + (obj.targets?.length || 0), 0)} AR targets active
          </div>
        )}
        <div className="text-xs text-gray-500 mt-2">
          💡 Camera permissions required • 🎮 Supports simultaneous tracking of multiple objects
        </div>
      </div>
    </div>
  );

  if (!arReady) {
    return <LoadingScreen />;
  }

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
      <StatusBar />

      {/* Visible Camera Feed Background - like AR.js */}
      <video 
        ref={mirrorVideoRef}
        autoPlay 
        muted 
        playsInline 
        className="absolute inset-0 w-full h-full object-cover"
        style={{ transform: 'scaleX(-1)' }} // Mirror for front camera
      />

      {/* Hidden video for QR detection */}
      <video 
        ref={videoRef} 
        className="hidden"
        autoPlay 
        muted 
        playsInline 
      />

      {/* AR Content Overlay */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Container for dynamically created A-Frame scene */}
        <div ref={sceneRef} className="w-full h-full opacity-90" />
      </div>

      {/* Multi-Marker QR Detection Results Overlay */}
      {detectedObjects.length > 0 && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-40">
          <div className="bg-green-500 bg-opacity-90 text-white p-4 rounded-lg text-center shadow-lg">
            <div className="text-lg font-bold">🎯 Multi-Marker QR Detected!</div>
            <div className="text-sm">
              {detectedObjects.map(obj => obj.targets?.[0]?.tag).filter(Boolean).join(', ') || 'AR Objects'}
            </div>
            <div className="text-xs mt-1">
              {(() => {
                const totalTargets = detectedObjects.reduce((count, obj) => count + (obj.targets?.length || 0), 0);
                return `${totalTargets} target${totalTargets !== 1 ? 's' : ''} ready for tracking`;
              })()}
            </div>
            <div className="text-xs mt-1 opacity-75">
              Point camera at target images to see 3D models
            </div>
          </div>
        </div>
      )}

      <Instructions />
    </div>
  );
};

export default ARView;
