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
    <div className="ar-control-panel">
      {/* Display Mode Toggle */}
      <DisplayModeButton
        displayMode={displayMode}
        onToggle={onDisplayModeToggle}
        disabled={disabled}
      />

      {/* App Mode Buttons */}
      <div className="ar-control-buttons">
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