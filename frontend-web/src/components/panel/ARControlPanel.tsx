import React from 'react';
import DisplayModeButton from '../button/DisplayModeButton';
import AppModeButton from '../button/AppModeButton';
import type { DisplayMode, AppMode } from '../../hooks/useDisplayMode';
import '../../styles/ARScene.css';

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
    <div
      className="ar-control-panel"
      style={{
        position: 'fixed',
        top: '1rem',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 150000,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        alignItems: 'center',
        pointerEvents: 'auto'
      }}
    >
      {/* Display Mode Toggle */}
      <DisplayModeButton
        displayMode={displayMode}
        onToggle={onDisplayModeToggle}
        disabled={disabled}
      />

      {/* App Mode Buttons */}
      <div
        className="ar-control-buttons"
        style={{
          display: 'flex',
          gap: '0.4rem',
          flexWrap: 'nowrap'
        }}
      >
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