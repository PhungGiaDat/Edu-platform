// src/pages/LearnAR.tsx

import { useState, useRef, useCallback, useEffect } from 'react';
import ARScene_SOLID from '../components/ARScene_SOLID';
import ARControlPanel from '../components/panel/ARControlPanel';
import { QuizOverlay } from '../components/Quiz';
import { GameOverlay } from '../components/Gameoverlay'; // <-- Updated import
import { useArData } from '../hooks/useArData';
import { useQuizData } from '../hooks/useQuizData';
import { useGameData } from '../hooks/useGameData';
import { useVerificationSocket } from '../hooks/useVerificationSocket';
import { useArQrScanner } from '../hooks/useArQrScanner';
import '../styles/ARScene.css';
import { useDisplayMode } from '../hooks/useDisplayMode';
import type { GameDifficulty, GameType } from '../types';

export default function LearnAR() {
  const {
    displayMode,
    toggleDisplayMode,
    appMode,
    setAppMode
  } = useDisplayMode('2D', 'LEARNING');
  
  const arVideoRef = useRef<HTMLVideoElement | null>(null);
  const [detectedQrId, setDetectedQrId] = useState<string | null>(null);
  const [isVideoReady, setIsVideoReady] = useState(false);
  
  // ========== Game selection states ==========
  const [selectedDifficulty, setSelectedDifficulty] = useState<GameDifficulty | null>(null);
  const [selectedGameType, setSelectedGameType] = useState<GameType | null>(null);
  const [showGameSelector, setShowGameSelector] = useState(false);
  const [selectorStep, setSelectorStep] = useState<'difficulty' | 'game_type'>('difficulty');

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

  // Fetch Quiz data
  const { quizData, isLoading: quizLoading, error: quizError } = useQuizData(
    appMode === 'QUIZ' ? detectedQrId : null
  );

  // Fetch Game data
  const { gameData, isLoading: gameLoading, error: gameError } = useGameData(
    appMode === 'GAME' ? detectedQrId : null,
    appMode === 'GAME' ? selectedDifficulty : null,
    appMode === 'GAME' ? selectedGameType : null
  );

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

  // Event handlers
  const handleDisplayModeToggle = useCallback(() => {
    console.log('🔄 Display mode toggle clicked');
    toggleDisplayMode();
  }, [toggleDisplayMode]);

  const handleAppModeSwitch = useCallback((mode: typeof appMode) => {
    console.log('🎮 App mode switch clicked:', mode);
    
    if (mode === 'GAME') {
      // Show game selector
      setShowGameSelector(true);
      setSelectorStep('difficulty');
    } else {
      setAppMode(mode);
    }
  }, [setAppMode]);

  const handleReset = useCallback(() => {
    console.log('🔄 Reset clicked');
    setDetectedQrId(null);
    setAppMode('LEARNING');
    setSelectedDifficulty(null);
    setSelectedGameType(null);
    setShowGameSelector(false);
  }, [setAppMode]);

  const handleQuizExit = useCallback(() => {
    console.log('🔙 Exiting quiz');
    setAppMode('LEARNING');
  }, [setAppMode]);

  const handleGameExit = useCallback(() => {
    console.log('🔙 Exiting game');
    setAppMode('LEARNING');
    setSelectedDifficulty(null);
    setSelectedGameType(null);
  }, [setAppMode]);

  // ========== Game Selection Handlers ==========
  const handleDifficultySelect = useCallback((difficulty: GameDifficulty) => {
    console.log('🎯 Selected difficulty:', difficulty);
    setSelectedDifficulty(difficulty);
    setSelectorStep('game_type');
  }, []);

  const handleGameTypeSelect = useCallback((gameType: GameType) => {
    console.log('🎮 Selected game type:', gameType);
    setSelectedGameType(gameType);
    setShowGameSelector(false);
    setAppMode('GAME');
  }, [setAppMode]);

  const handleCancelSelector = useCallback(() => {
    setShowGameSelector(false);
    setSelectedDifficulty(null);
    setSelectedGameType(null);
    setSelectorStep('difficulty');
  }, []);

  const handleBackToStep = useCallback(() => {
    if (selectorStep === 'game_type') {
      setSelectorStep('difficulty');
      setSelectedDifficulty(null);
    }
  }, [selectorStep]);
  
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

      {/* Quiz Overlay */}
      {appMode === 'QUIZ' && appState === 'AR_VIEW' && (
        <>
          {quizLoading && (
            <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80">
              <div className="text-white text-xl">Loading Quiz...</div>
            </div>
          )}
          
          {quizError && (
            <div className="fixed inset-0 z-40 flex items-center justify-center bg-red-900/90">
              <div className="text-center text-white p-6">
                <p className="text-2xl mb-4">⚠️ {quizError}</p>
                <button
                  onClick={handleQuizExit}
                  className="px-6 py-3 bg-gray-600 hover:bg-gray-700 rounded-lg font-bold"
                >
                  Back to AR
                </button>
              </div>
            </div>
          )}
          
          {!quizLoading && !quizError && quizData && (
            <QuizOverlay 
              quizSession={quizData} 
              onExit={handleQuizExit}
            />
          )}
        </>
      )}

      {/* Game Overlay */}
      {appMode === 'GAME' && appState === 'AR_VIEW' && !showGameSelector && (
        <>
          {gameLoading && (
            <div className="fixed inset-0 z-40 flex items-center justify-center backdrop-blur-sm">
              <div className="bg-white/95 backdrop-blur-md rounded-3xl p-8 shadow-2xl border-4 border-pink-400">
                <div className="text-6xl animate-bounce mb-3">🎮</div>
                <p className="text-xl font-bold text-pink-600">Loading Game...</p>
              </div>
            </div>
          )}
          
          {gameError && (
            <div className="fixed inset-0 z-40 flex items-center justify-center backdrop-blur-sm">
              <div className="bg-white/95 backdrop-blur-md p-6 rounded-3xl shadow-2xl border-4 border-red-400 text-center max-w-xs">
                <div className="text-6xl mb-3">😢</div>
                <p className="text-xl font-bold text-red-600 mb-3">⚠️ {gameError}</p>
                <button
                  onClick={handleGameExit}
                  className="px-5 py-2 bg-blue-500 hover:bg-blue-600 rounded-2xl text-white font-bold"
                >
                  Back to AR
                </button>
              </div>
            </div>
          )}
          
          {!gameLoading && !gameError && gameData && (
            <GameOverlay 
              gameSession={gameData} 
              onExit={handleGameExit}
            />
          )}
        </>
      )}

      {/* ========== Game Selector Modal ========== */}
      {showGameSelector && appState === 'AR_VIEW' && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-gradient-to-br from-purple-100 to-pink-100 backdrop-blur-md rounded-3xl shadow-2xl p-6 border-4 border-purple-400">
            
            {/* Step 1: Difficulty Selection */}
            {selectorStep === 'difficulty' && (
              <>
                <div className="text-center mb-6">
                  <h2 className="text-3xl font-black text-purple-700 mb-2">
                    Choose Difficulty! 🎯
                  </h2>
                  <p className="text-base text-purple-600 font-semibold">
                    Pick your challenge level!
                  </p>
                </div>

                <div className="space-y-4 mb-6">
                  <button
                    onClick={() => handleDifficultySelect('easy')}
                    className="w-full p-5 bg-gradient-to-br from-green-400 to-emerald-500 hover:from-green-500 hover:to-emerald-600 rounded-2xl text-white font-black text-xl transition-all transform hover:scale-105 active:scale-95 shadow-lg border-4 border-green-600"
                  >
                    <div className="flex items-center justify-between">
                      <span>🌱 Easy</span>
                      <span className="text-sm opacity-90">Perfect for beginners!</span>
                    </div>
                  </button>

                  <button
                    onClick={() => handleDifficultySelect('medium')}
                    className="w-full p-5 bg-gradient-to-br from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600 rounded-2xl text-white font-black text-xl transition-all transform hover:scale-105 active:scale-95 shadow-lg border-4 border-orange-600"
                  >
                    <div className="flex items-center justify-between">
                      <span>⚡ Medium</span>
                      <span className="text-sm opacity-90">Ready for a challenge?</span>
                    </div>
                  </button>

                  <button
                    onClick={() => handleDifficultySelect('hard')}
                    className="w-full p-5 bg-gradient-to-br from-red-400 to-red-500 hover:from-red-500 hover:to-red-600 rounded-2xl text-white font-black text-xl transition-all transform hover:scale-105 active:scale-95 shadow-lg border-4 border-red-600"
                  >
                    <div className="flex items-center justify-between">
                      <span>🔥 Hard</span>
                      <span className="text-sm opacity-90">For champions!</span>
                    </div>
                  </button>
                </div>
              </>
            )}

            {/* Step 2: Game Type Selection */}
            {selectorStep === 'game_type' && (
              <>
                <div className="text-center mb-6">
                  <h2 className="text-3xl font-black text-purple-700 mb-2">
                    Choose Game Type! 🎮
                  </h2>
                  <p className="text-base text-purple-600 font-semibold">
                    Pick your favorite game!
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <button
                    onClick={() => handleGameTypeSelect('drag_match')}
                    className="p-5 bg-gradient-to-br from-blue-400 to-cyan-500 hover:from-blue-500 hover:to-cyan-600 rounded-2xl text-white font-black text-lg transition-all transform hover:scale-105 active:scale-95 shadow-lg border-4 border-blue-600"
                  >
                    <div className="text-5xl mb-2">🧩</div>
                    <div>Drag & Match</div>
                  </button>

                  <button
                    onClick={() => handleGameTypeSelect('catch_word')}
                    className="p-5 bg-gradient-to-br from-green-400 to-emerald-500 hover:from-green-500 hover:to-emerald-600 rounded-2xl text-white font-black text-lg transition-all transform hover:scale-105 active:scale-95 shadow-lg border-4 border-green-600"
                  >
                    <div className="text-5xl mb-2">🎯</div>
                    <div>Catch Word</div>
                  </button>

                  <button
                    onClick={() => handleGameTypeSelect('word_scramble')}
                    className="p-5 bg-gradient-to-br from-purple-400 to-pink-500 hover:from-purple-500 hover:to-pink-600 rounded-2xl text-white font-black text-lg transition-all transform hover:scale-105 active:scale-95 shadow-lg border-4 border-purple-600"
                  >
                    <div className="text-5xl mb-2">🔀</div>
                    <div>Word Scramble</div>
                  </button>

                  <button
                    onClick={() => handleGameTypeSelect('memory_match')}
                    className="p-5 bg-gradient-to-br from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 rounded-2xl text-white font-black text-lg transition-all transform hover:scale-105 active:scale-95 shadow-lg border-4 border-yellow-600"
                  >
                    <div className="text-5xl mb-2">🎪</div>
                    <div>Memory Match</div>
                  </button>
                </div>

                <button
                  onClick={handleBackToStep}
                  className="w-full px-6 py-3 bg-gray-400 hover:bg-gray-500 rounded-2xl text-white font-bold text-lg transition-all transform hover:scale-105 active:scale-95 shadow-lg mb-3"
                >
                  ← Back to Difficulty
                </button>
              </>
            )}

            {/* Cancel button */}
            <button
              onClick={handleCancelSelector}
              className="w-full px-6 py-3 bg-red-400 hover:bg-red-500 rounded-2xl text-white font-bold text-lg transition-all transform hover:scale-105 active:scale-95 shadow-lg"
            >
              ✕ Cancel
            </button>
          </div>
        </div>
      )}

      {/* AR Control Panel */}
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