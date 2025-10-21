import React from 'react';
import DisplayModeButton from '../button/DisplayModeButton';
import AppModeButton from '../button/AppModeButton';
import type { DisplayMode, AppMode } from '../../hooks/useDisplayMode';

interface Props {
  displayMode: DisplayMode;
  appMode: AppMode;
  onDisplayModeToggle: () => void;
  onAppModeSwitch: (mode: AppMode) => void;
  disabled?: boolean;
}

const ARControlPanel: React.FC<Props> = ({ 
  displayMode, 
  appMode, 
  onDisplayModeToggle, 
  onAppModeSwitch,
  disabled = false 
}) => {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {/* Display Mode Toggle */}
      <DisplayModeButton
        displayMode={displayMode}
        onToggle={onDisplayModeToggle}
        disabled={disabled}
      />
      
      {/* App Mode Buttons */}
      <div className="flex flex-col gap-1">
        <AppModeButton
          currentMode={appMode}
          targetMode="LEARNING"
          onSwitch={onAppModeSwitch}
          disabled={disabled}
        />
        <AppModeButton
          currentMode={appMode}
          targetMode="GAME"
          onSwitch={onAppModeSwitch}
          disabled={disabled}
        />
        <AppModeButton
          currentMode={appMode}
          targetMode="QUIZ"
          onSwitch={onAppModeSwitch}
          disabled={disabled}
        />
      </div>
    </div>
  );
};

export default ARControlPanel;