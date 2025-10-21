import { useState, useCallback } from 'react';

export type DisplayMode = '2D' | '3D';
export type AppMode = 'LEARNING' | 'GAME' | 'QUIZ';

interface UseDisplayModeReturn {
  // Display modes
  displayMode: DisplayMode;
  setDisplayMode: (mode: DisplayMode) => void;
  toggleDisplayMode: () => void;
  
  // App modes  
  appMode: AppMode;
  setAppMode: (mode: AppMode) => void;
  
  // Combined state
  isGameMode: boolean;
  isLearningMode: boolean;
  is2DMode: boolean;
  is3DMode: boolean;
}

export function useDisplayMode(
  initialDisplayMode: DisplayMode = '2D',
  initialAppMode: AppMode = 'LEARNING'
): UseDisplayModeReturn {
  
  const [displayMode, setDisplayModeState] = useState<DisplayMode>(initialDisplayMode);
  const [appMode, setAppModeState] = useState<AppMode>(initialAppMode);

  // ✅ Memoized functions to prevent unnecessary re-renders
  const setDisplayMode = useCallback((mode: DisplayMode) => {
    console.log('🔄 Display mode changed:', displayMode, '->', mode);
    setDisplayModeState(mode);
  }, [displayMode]);

  const toggleDisplayMode = useCallback(() => {
    const newMode = displayMode === '2D' ? '3D' : '2D';
    console.log(`🔄 Toggling display mode: ${displayMode} -> ${newMode}`);
    setDisplayModeState(newMode);
  }, [displayMode]);

  const setAppMode = useCallback((mode: AppMode) => {
    console.log('🎮 App mode changed:', appMode, '->', mode);
    setAppModeState(mode);
  }, [appMode]);

  // ✅ Derived state for easy checking
  const isGameMode = appMode === 'GAME';
  const isLearningMode = appMode === 'LEARNING';
  const is2DMode = displayMode === '2D';
  const is3DMode = displayMode === '3D';

  return {
    // Display modes
    displayMode,
    setDisplayMode,
    toggleDisplayMode,
    
    // App modes
    appMode,
    setAppMode,
    
    // Helper booleans
    isGameMode,
    isLearningMode,
    is2DMode,
    is3DMode
  };
}