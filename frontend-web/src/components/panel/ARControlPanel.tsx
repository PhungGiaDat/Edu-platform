import React from 'react';
import type { DisplayMode, AppMode } from '../../hooks/useDisplayMode';
import { HapticService } from '../../services/HapticService';
import { SoundEffectService } from '../../services/SoundEffectService';
import '../../styles/ARScene.css';

interface Props {
  displayMode: DisplayMode;
  appMode: AppMode;
  onDisplayModeToggle: () => void;
  onAppModeSwitch: (mode: AppMode) => void;
  onExit?: () => void;
  disabled?: boolean;
}

/**
 * Kid-Friendly AR Control Panel
 * - Always-visible icon buttons (no hamburger menu)
 * - Minimum 48px touch targets
 * - Haptic + Sound feedback on every tap
 */
const ARControlPanel: React.FC<Props> = ({
  displayMode,
  appMode,
  onDisplayModeToggle,
  onAppModeSwitch,
  onExit,
  disabled = false
}) => {
  // Feedback helper - call on every button tap
  const triggerFeedback = (type: 'tap' | 'success' = 'tap') => {
    if (type === 'success') {
      HapticService.success();
      SoundEffectService.play('success');
    } else {
      HapticService.tap();
      SoundEffectService.play('tap');
    }
  };

  const handleDisplayToggle = () => {
    if (disabled) return;
    triggerFeedback('tap');
    onDisplayModeToggle();
  };

  const handleModeSwitch = (mode: AppMode) => {
    if (disabled) return;
    triggerFeedback(appMode !== mode ? 'success' : 'tap');
    onAppModeSwitch(mode);
  };

  const handleExit = () => {
    triggerFeedback('tap');
    onExit?.();
  };

  // Button style helper
  const getButtonStyle = (isActive: boolean, gradient: string, borderColor: string): React.CSSProperties => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '56px',
    minHeight: '56px',
    padding: '8px 12px',
    background: isActive ? gradient : 'rgba(255, 255, 255, 0.9)',
    border: `3px solid ${isActive ? borderColor : 'rgba(0,0,0,0.1)'}`,
    borderRadius: '16px',
    color: isActive ? '#fff' : '#555',
    fontWeight: 700,
    fontSize: '10px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    boxShadow: isActive 
      ? `0 4px 15px ${borderColor}50` 
      : '0 2px 8px rgba(0,0,0,0.15)',
    transition: 'all 0.2s ease',
    opacity: disabled ? 0.5 : 1,
    WebkitTapHighlightColor: 'transparent',
    touchAction: 'manipulation'
  });

  return (
    <div
      className="ar-control-panel-wrapper"
      style={{
        position: 'fixed',
        top: 'max(8px, env(safe-area-inset-top))',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 150000,
        pointerEvents: 'auto'
      }}
    >
      {/* Always-visible horizontal button bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px',
          background: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(12px)',
          borderRadius: '20px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
          border: '2px solid rgba(255,255,255,0.5)'
        }}
      >
        {/* 2D/3D Toggle Button */}
        <button
          onClick={handleDisplayToggle}
          disabled={disabled}
          aria-label={`Switch to ${displayMode === '2D' ? '3D' : '2D'} mode`}
          style={getButtonStyle(
            true,
            displayMode === '3D' 
              ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
              : 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            displayMode === '3D' ? '#764ba2' : '#f5576c'
          )}
        >
          <span style={{ fontSize: '22px', marginBottom: '2px' }}>
            {displayMode === '3D' ? '🧊' : '🖼️'}
          </span>
          <span>{displayMode}</span>
        </button>

        {/* Learning Mode Button */}
        <button
          onClick={() => handleModeSwitch('LEARNING')}
          disabled={disabled}
          aria-label="Learning mode"
          style={getButtonStyle(
            appMode === 'LEARNING',
            'linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%)',
            '#44A08D'
          )}
        >
          <span style={{ fontSize: '22px', marginBottom: '2px' }}>📚</span>
          <span>Learn</span>
        </button>

        {/* Game Mode Button */}
        <button
          onClick={() => handleModeSwitch('GAME')}
          disabled={disabled}
          aria-label="Game mode"
          style={getButtonStyle(
            appMode === 'GAME',
            'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)',
            '#FF6B6B'
          )}
        >
          <span style={{ fontSize: '22px', marginBottom: '2px' }}>🎮</span>
          <span>Game</span>
        </button>

        {/* Quiz Mode Button */}
        <button
          onClick={() => handleModeSwitch('QUIZ')}
          disabled={disabled}
          aria-label="Quiz mode"
          style={getButtonStyle(
            appMode === 'QUIZ',
            'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
            '#a855f7'
          )}
        >
          <span style={{ fontSize: '22px', marginBottom: '2px' }}>🎯</span>
          <span>Quiz</span>
        </button>

        {/* Exit Button (if handler provided) */}
        {onExit && (
          <button
            onClick={handleExit}
            aria-label="Exit AR"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '56px',
              minHeight: '56px',
              padding: '8px 12px',
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              border: '3px solid #b91c1c',
              borderRadius: '16px',
              color: '#fff',
              fontWeight: 700,
              fontSize: '10px',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(239, 68, 68, 0.4)',
              transition: 'all 0.2s ease',
              WebkitTapHighlightColor: 'transparent',
              touchAction: 'manipulation'
            }}
          >
            <span style={{ fontSize: '22px', marginBottom: '2px' }}>✕</span>
            <span>Exit</span>
          </button>
        )}
      </div>

      {/* Current mode indicator pill (below buttons) */}
      <div
        style={{
          marginTop: '6px',
          textAlign: 'center'
        }}
      >
        <span
          style={{
            display: 'inline-block',
            padding: '4px 12px',
            background: appMode === 'LEARNING' 
              ? 'linear-gradient(135deg, #4ECDC4, #44A08D)'
              : appMode === 'GAME'
              ? 'linear-gradient(135deg, #FF6B6B, #FF8E53)'
              : 'linear-gradient(135deg, #a855f7, #7c3aed)',
            borderRadius: '12px',
            color: '#fff',
            fontSize: '11px',
            fontWeight: 700,
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}
        >
          {appMode === 'LEARNING' && '📚 Learning Mode'}
          {appMode === 'GAME' && '🎮 Game Mode'}
          {appMode === 'QUIZ' && '🎯 Quiz Mode'}
        </span>
      </div>
    </div>
  );
};

export default ARControlPanel;
