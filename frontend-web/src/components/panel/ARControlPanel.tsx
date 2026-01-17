import React, { useState } from 'react';
import DisplayModeButton from '../button/DisplayModeButton';
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
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      className="ar-control-panel-wrapper"
      style={{
        position: 'fixed',
        top: 'max(0.5rem, env(safe-area-inset-top))',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 150000,
        pointerEvents: 'auto'
      }}
    >
      {/* Hamburger Toggle Button - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          padding: '10px 16px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          border: '2px solid rgba(255,255,255,0.5)',
          borderRadius: '20px',
          color: '#fff',
          fontWeight: 700,
          fontSize: '14px',
          cursor: 'pointer',
          boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
          transition: 'all 0.3s ease'
        }}
      >
        <span style={{ fontSize: '18px' }}>{isExpanded ? '✕' : '☰'}</span>
        <span>{isExpanded ? 'Close' : 'Menu'}</span>
      </button>

      {/* Dropdown Menu */}
      {isExpanded && (
        <div
          style={{
            marginTop: '8px',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            borderRadius: '16px',
            padding: '12px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            minWidth: '200px',
            animation: 'slideDown 0.2s ease-out'
          }}
        >
          {/* Display Mode Toggle */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            paddingBottom: '8px',
            borderBottom: '1px solid rgba(0,0,0,0.1)'
          }}>
            <DisplayModeButton
              displayMode={displayMode}
              onToggle={() => {
                onDisplayModeToggle();
              }}
              disabled={disabled}
            />
          </div>

          {/* App Mode Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <button
              onClick={() => {
                onAppModeSwitch('LEARNING');
                setIsExpanded(false);
              }}
              disabled={disabled}
              style={{
                padding: '12px 16px',
                background: appMode === 'LEARNING'
                  ? 'linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%)'
                  : 'linear-gradient(135deg, #e0e0e0 0%, #f5f5f5 100%)',
                border: appMode === 'LEARNING' ? '2px solid #44A08D' : '2px solid transparent',
                borderRadius: '12px',
                color: appMode === 'LEARNING' ? '#fff' : '#333',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease'
              }}
            >
              <span>📚</span> Learning {appMode === 'LEARNING' && '✓'}
            </button>

            <button
              onClick={() => {
                onAppModeSwitch('GAME');
                setIsExpanded(false);
              }}
              disabled={disabled}
              style={{
                padding: '12px 16px',
                background: appMode === 'GAME'
                  ? 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)'
                  : 'linear-gradient(135deg, #e0e0e0 0%, #f5f5f5 100%)',
                border: appMode === 'GAME' ? '2px solid #FF6B6B' : '2px solid transparent',
                borderRadius: '12px',
                color: appMode === 'GAME' ? '#fff' : '#333',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease'
              }}
            >
              <span>🎮</span> Game Mode
            </button>

            <button
              onClick={() => {
                onAppModeSwitch('QUIZ');
                setIsExpanded(false);
              }}
              disabled={disabled}
              style={{
                padding: '12px 16px',
                background: appMode === 'QUIZ'
                  ? 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)'
                  : 'linear-gradient(135deg, #e0e0e0 0%, #f5f5f5 100%)',
                border: appMode === 'QUIZ' ? '2px solid #a855f7' : '2px solid transparent',
                borderRadius: '12px',
                color: appMode === 'QUIZ' ? '#fff' : '#333',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease'
              }}
            >
              <span>🎯</span> Quiz Mode
            </button>
          </div>
        </div>
      )}

      {/* Animation styles */}
      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default ARControlPanel;