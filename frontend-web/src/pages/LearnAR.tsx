// src/pages/LearnAR.tsx

import { useState, useRef, useCallback, useEffect } from 'react';
import ARScene_SOLID from '../components/ARScene_SOLID';
import ARControlPanel from '../components/panel/ARControlPanel';
import { useArData } from '../hooks/useArData';
import { useVerificationSocket } from '../hooks/useVerificationSocket';
import { useArQrScanner } from '../hooks/useArQrScanner';
import '../styles/ARScene.css';
import { useDisplayMode } from '../hooks/useDisplayMode';

export default function LearnAR() {
  const {
    displayMode,
    toggleDisplayMode,
    appMode,
    setAppMode
    // ✅ Remove unused variables: isGameMode, isLearningMode, is2DMode, is3DMode
  } = useDisplayMode('2D', 'LEARNING');
  
  const arVideoRef = useRef<HTMLVideoElement | null>(null);
  const [detectedQrId, setDetectedQrId] = useState<string | null>(null);
  const [isVideoReady, setIsVideoReady] = useState(false);

    const handleArVideoReady = useCallback((video: HTMLVideoElement) => {
    console.log('📹 AR Video ready:', video);
    arVideoRef.current = video;
    setIsVideoReady(true);
  }, []);

  // QR Scanner
  const { qrId: foundQrId } = useArQrScanner(
    arVideoRef, 
    detectedQrId === null && isVideoReady
  );
  
  // Update detected QR
  useEffect(() => {
    if (foundQrId && foundQrId !== detectedQrId) {
      console.log('🔍 New QR detected:', foundQrId);
      setDetectedQrId(foundQrId);
    }
  }, [foundQrId, detectedQrId]);

  // Fetch AR data
  const { arData, isLoading, error: dataError } = useArData(detectedQrId);

  // WebSocket verification
  useVerificationSocket(detectedQrId, arVideoRef.current, !!arData);

  // Derive app state
  let appState: 'SCANNING_IN_AR' | 'LOADING_DATA' | 'AR_VIEW' | 'ERROR';
  
  if (dataError) {
    appState = 'ERROR';
  } else if (detectedQrId && isLoading) {
    appState = 'LOADING_DATA';
  } else if (detectedQrId && arData) {
    appState = 'AR_VIEW';
  } else {
    appState = 'SCANNING_IN_AR';
  }

  // ✅ Event handlers using hook functions
  const handleDisplayModeToggle = useCallback(() => {
    console.log('🔄 Display mode toggle clicked');
    toggleDisplayMode();
  }, [toggleDisplayMode]);

  const handleAppModeSwitch = useCallback((mode: typeof appMode) => {
    console.log('🎮 App mode switch clicked:', mode);
    setAppMode(mode);
  }, [setAppMode]);

  const handleReset = useCallback(() => {
    console.log('🔄 Reset clicked');
    setDetectedQrId(null);
  }, []);
  
  const renderStatusOverlay = () => {
    let statusText = '';
    const isScanning = isVideoReady && !detectedQrId;
    
    switch (appState) {
      case 'SCANNING_IN_AR': 
        statusText = !isVideoReady 
          ? 'Initializing camera...' 
          : isScanning 
            ? 'Scanning for QR code...' 
            : 'Please scan a QR code...';
        break;
      case 'LOADING_DATA': 
        statusText = `Loading data for: ${detectedQrId}`; 
        break;
      case 'AR_VIEW': 
        statusText = `Viewing: ${detectedQrId} (${displayMode} ${appMode} mode)`; 
        break;
      case 'ERROR': 
        statusText = `Error: ${dataError}`; 
        break;
    }
    
    return (
      <div className="absolute top-4 left-4 p-2 bg-black bg-opacity-50 rounded-lg text-sm text-white z-20">
        <strong>Status:</strong> {statusText}
        <br />
        <small>App: {appMode} | Display: {displayMode}</small>
      </div>
    );
  };
  
  const renderResetButton = () => {
    if (appState === 'AR_VIEW' || appState === 'ERROR') {
      return (
        <div className="absolute bottom-4 right-4 z-20">
          <button 
            onClick={handleReset} 
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-white font-bold shadow-lg"
          >
            🔄 Scan Another
          </button>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-full relative">
      <div className="ar-wrapper">
      <ARScene_SOLID
        isVisible={true}
        displayMode={displayMode}
        targets={appState === 'AR_VIEW' && arData ? arData.targets : []}
        combo={appState === 'AR_VIEW' && arData ? arData.combo : null}
        onVideoReady={handleArVideoReady}
      />
      </div>

            {/* ✅ AR Control Panel - Only show when data is loaded */}
      {appState === 'AR_VIEW' && (
        <ARControlPanel
          displayMode={displayMode}
          appMode={appMode}
          onDisplayModeToggle={handleDisplayModeToggle}
          onAppModeSwitch={handleAppModeSwitch}
          disabled={false}
        />
      )}

      <div className="ar-ui-overlay">
        {renderStatusOverlay()}
        {renderResetButton()}

        {appState === 'ERROR' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center h-full text-white bg-red-900 bg-opacity-90 p-4 z-30">
            <h2 className="text-2xl font-bold mb-4">An Error Occurred</h2>
            <p className="mb-6">{dataError}</p>
          </div>
        )}
      </div>
    </div>
  );
}