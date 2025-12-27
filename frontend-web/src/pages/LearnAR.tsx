// src/pages/LearnAR.tsx - REFACTORED WITH RUNTIME BRIDGE
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import ARContainer from '@/components/ar/ARContainer';
import ARControlPanel from '@/components/panel/ARControlPanel';
import { QuizOverlay } from '@/components/Quiz';
import { GameOverlay } from '@/components/GameOverlay';
import { useArData } from '@/hooks/useArData';
import { useQuizData } from '@/hooks/useQuizData';
import { useGameData } from '@/hooks/useGameData';
import { useVerificationSocket } from '@/hooks/useVerificationSocket';
import { useRuntimeBridge } from '@/hooks/useRuntimeBridge';
import { useARInjection } from '@/hooks/useARInjection';
import type { DisplayMode, AppMode } from '@/hooks/useDisplayMode';
import type { GameDifficulty, GameType } from '@/types';
import '@/styles/ARScene.css';

// ========== TYPE DEFINITIONS ==========
type AppState = 'SCANNING_QR' | 'LOADING_DATA' | 'AR_ACTIVE' | 'ERROR';

export default function LearnAR() {
  // const navigate = useNavigate();

  // ========== STATE ==========
  const [appState, setAppState] = useState<AppState>('SCANNING_QR');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('2D');
  const [appMode, setAppMode] = useState<AppMode>('LEARNING');
  const [detectedQrId, setDetectedQrId] = useState<string | null>(null);
  const [isComboActive, setIsComboActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Game selection states
  const [selectedDifficulty, setSelectedDifficulty] = useState<GameDifficulty | null>(null);
  const [selectedGameType, setSelectedGameType] = useState<GameType | null>(null);
  const [showGameSelector, setShowGameSelector] = useState(false);
  const [selectorStep, setSelectorStep] = useState<'difficulty' | 'game_type'>('difficulty');

  // ========== RUNTIME BRIDGE & AR INJECTION ==========
  const bridge = useRuntimeBridge({ debug: true });
  useARInjection(); // 🚀 Decoupled Dynamic Injection via EventBus

  // ========== REFS ==========
  const arVideoRef = useRef<HTMLVideoElement | null>(null);
  const markerCountRef = useRef(0);

  // ========== EVENT SUBSCRIPTIONS ==========
  useEffect(() => {
    const { eventBus } = bridge;

    console.log('📡 LearnAR: Setting up event subscriptions');

    const handleMarkerFound = (payload: { markerId: string }) => {
      console.log('🎯 LearnAR: Marker found:', payload.markerId);
      markerCountRef.current++;

      if (appState === 'SCANNING_QR') {
        setDetectedQrId(payload.markerId);
        setAppState('LOADING_DATA');
      }
    };

    const handleMarkerLost = (payload: { markerId: string }) => {
      console.log('👋 LearnAR: Marker lost:', payload.markerId);
    };

    const handleComboActivated = (payload: { combo: any }) => {
      console.log('🎉 LearnAR: Combo activated:', payload.combo);
      setIsComboActive(true);
    };

    const handleComboDeactivated = () => {
      console.log('💔 LearnAR: Combo deactivated');
      setIsComboActive(false);
    };

    eventBus.on('MARKER_FOUND' as any, handleMarkerFound);
    eventBus.on('MARKER_LOST' as any, handleMarkerLost);
    eventBus.on('COMBO_ACTIVATED' as any, handleComboActivated);
    eventBus.on('COMBO_DEACTIVATED' as any, handleComboDeactivated);

    return () => {
      eventBus.off('MARKER_FOUND' as any, handleMarkerFound);
      eventBus.off('MARKER_LOST' as any, handleMarkerLost);
      eventBus.off('COMBO_ACTIVATED' as any, handleComboActivated);
      eventBus.off('COMBO_DEACTIVATED' as any, handleComboDeactivated);
    };
  }, [bridge, appState]);

  // ========== DATA FETCHING ==========
  const { arData, isLoading, error: dataError } = useArData(detectedQrId);
  const { quizData, isLoading: quizLoading, error: quizError } = useQuizData(
    appMode === 'QUIZ' ? detectedQrId : null
  );
  const { gameData, isLoading: gameLoading, error: gameError } = useGameData(
    appMode === 'GAME' ? detectedQrId : null,
    appMode === 'GAME' ? selectedDifficulty : null,
    appMode === 'GAME' ? selectedGameType : null
  );

  useVerificationSocket(detectedQrId, arVideoRef.current, !!arData);

  useEffect(() => {
    if (dataError) {
      setAppState('ERROR');
      setErrorMessage(dataError);
    } else if (detectedQrId && isLoading) {
      setAppState('LOADING_DATA');
    } else if (detectedQrId && arData) {
      setAppState('AR_ACTIVE');
    }
  }, [detectedQrId, isLoading, arData, dataError]);

  // ========== MULTI-FLASHCARD TRACKING ==========
  useEffect(() => {
    if (appState === 'AR_ACTIVE' && arData?.combo) {
      const requiredTags = arData.combo.required_tags;

      console.log('🎯 Starting multi-flashcard tracking:', requiredTags);
      bridge.startMultiFlashcardTracking(requiredTags, 30000);

      const handleProgress = (payload: any) => {
        console.log('📊 Multi-flashcard progress:', payload.progress);
      };

      const handleComplete = (payload: any) => {
        console.log('🎉 Multi-flashcard complete!', payload);
      };

      const handleTimeout = (payload: any) => {
        console.log('⏰ Multi-flashcard timeout', payload);
      };

      bridge.eventBus.on('MULTI_FLASHCARD_PROGRESS' as any, handleProgress);
      bridge.eventBus.on('MULTI_FLASHCARD_COMPLETE' as any, handleComplete);
      bridge.eventBus.on('MULTI_FLASHCARD_TIMEOUT' as any, handleTimeout);

      return () => {
        bridge.stopMultiFlashcardTracking();
        bridge.eventBus.off('MULTI_FLASHCARD_PROGRESS' as any, handleProgress);
        bridge.eventBus.off('MULTI_FLASHCARD_COMPLETE' as any, handleComplete);
        bridge.eventBus.off('MULTI_FLASHCARD_TIMEOUT' as any, handleTimeout);
      };
    }
  }, [appState, arData, bridge]);

  // ========== ACTION HANDLERS ==========
  const handleDisplayModeToggle = useCallback(() => {
    setDisplayMode((prev: DisplayMode) => prev === '2D' ? '3D' : '2D');
  }, []);

  const handleAppModeSwitch = useCallback((mode: AppMode) => {
    console.log('🔀 Switch to', mode);

    if (mode === 'GAME') {
      setShowGameSelector(true);
      setSelectorStep('difficulty');
    } else {
      setAppMode(mode);
    }
  }, []);

  const handleQuizExit = useCallback(() => {
    setAppMode('LEARNING');
  }, []);

  const handleGameExit = useCallback(() => {
    setAppMode('LEARNING');
    setSelectedDifficulty(null);
    setSelectedGameType(null);
  }, []);

  const handleChangeLevel = useCallback(() => {
    setSelectedGameType(null);
    setSelectedDifficulty(null);
    setSelectorStep('difficulty');
    setShowGameSelector(true);
    setAppMode('LEARNING');
  }, []);

  const handleDifficultySelect = useCallback((difficulty: GameDifficulty) => {
    setSelectedDifficulty(difficulty);
    setSelectorStep('game_type');
  }, []);

  const handleGameTypeSelect = useCallback((gameType: GameType) => {
    setSelectedGameType(gameType);
    setShowGameSelector(false);
    setAppMode('GAME');
  }, []);

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

  const handleReset = useCallback(() => {
    console.log('🔄 Reset experience');
    setAppState('SCANNING_QR');
    setDetectedQrId(null);
    setSelectedDifficulty(null);
    setSelectedGameType(null);
    setAppMode('LEARNING');
    setIsComboActive(false);
    setErrorMessage(null);
    setShowGameSelector(false);
    bridge.resetMarkers();
    markerCountRef.current = 0;

    if (arVideoRef.current) {
      bridge.startQRScanning();
    }
  }, [bridge]);

  // const handleBack = useCallback(() => {
  //   navigate('/');
  // }, [navigate]);

  // ========== RENDER ==========
  return (
    <div className="learn-ar-container">
      {/* 🚀 New Iframe AR Container */}
      <div className="ar-wrapper">
        <ARContainer
          debug={true}
          className={appState === 'AR_ACTIVE' ? 'visible' : 'hidden'}
        />
      </div>

      {/* UI Overlay Layer */}
      <div className="ar-ui-overlay">
        {/* Loading State */}
        {appState === 'LOADING_DATA' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-auto bg-black/80">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-white text-xl">Loading AR content...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {appState === 'ERROR' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-auto bg-black/90">
            <div className="text-center text-white p-8 max-w-md">
              <div className="text-6xl mb-4">❌</div>
              <p className="text-xl font-semibold mb-6">{errorMessage || 'Error loading AR'}</p>
              <button
                className="px-8 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-bold transition-all"
                onClick={handleReset}
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Status Overlay (Debug) */}
        {process.env.NODE_ENV === 'development' && appState === 'AR_ACTIVE' && (
          <div className="absolute top-4 left-4 bg-black/50 text-white text-sm rounded-lg p-3 pointer-events-none">
            <div><strong>State:</strong> {appState}</div>
            <div><strong>Mode:</strong> {appMode}</div>
            <div><strong>QR:</strong> {detectedQrId || 'none'}</div>
            <div><strong>Display:</strong> {displayMode}</div>
            <div><strong>Combo:</strong> {isComboActive ? '✅' : '❌'}</div>
            <div><strong>Events:</strong> {markerCountRef.current}</div>
          </div>
        )}

        {/* Reset Button */}
        {(appState === 'AR_ACTIVE' || appState === 'ERROR') && (
          <div className="absolute bottom-4 right-4 pointer-events-auto">
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-white font-bold shadow-lg transition-all"
            >
              🔄 Scan Another
            </button>
          </div>
        )}

        {/* Control Panel - INSIDE ar-ui-overlay */}
        {appState === 'AR_ACTIVE' && (
          <ARControlPanel
            displayMode={displayMode}
            appMode={appMode}
            onDisplayModeToggle={handleDisplayModeToggle}
            onAppModeSwitch={handleAppModeSwitch}
            disabled={false}
          />
        )}

        {/* Quiz Overlay - INSIDE ar-ui-overlay */}
        {appMode === 'QUIZ' && appState === 'AR_ACTIVE' && (
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

        {/* Game Overlay - INSIDE ar-ui-overlay */}
        {appMode === 'GAME' && appState === 'AR_ACTIVE' && !showGameSelector && (
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
                onChangeLevel={handleChangeLevel}
              />
            )}
          </>
        )}

        {/* Game Selector Modal - INSIDE ar-ui-overlay */}
        {showGameSelector && appState === 'AR_ACTIVE' && (
          <div className="fixed inset-0 z-40 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg bg-gradient-to-br from-purple-100 to-pink-100 backdrop-blur-md rounded-3xl shadow-2xl p-6 border-4 border-purple-400">

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

              <button
                onClick={handleCancelSelector}
                className="w-full px-6 py-3 bg-red-400 hover:bg-red-500 rounded-2xl text-white font-bold text-lg transition-all transform hover:scale-105 active:scale-95 shadow-lg"
              >
                ✕ Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}