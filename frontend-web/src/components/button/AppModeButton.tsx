import React from 'react';
import type { AppMode } from '../../hooks/useDisplayMode';

interface Props {
  currentMode: AppMode;
  targetMode: AppMode;
  onSwitch: (mode: AppMode) => void;
  disabled?: boolean;
}

const AppModeButton: React.FC<Props> = ({ currentMode, targetMode, onSwitch, disabled = false }) => {
  const getButtonStyle = (mode: AppMode) => {
    const baseStyle = "px-4 py-2 rounded-lg shadow-lg transition-colors duration-200 text-sm font-medium";
    
    switch (mode) {
      case 'LEARNING':
        return `${baseStyle} bg-green-600 hover:bg-green-700 disabled:bg-gray-400`;
      case 'GAME':
        return `${baseStyle} bg-sky-600 hover:bg-sky-700 disabled:bg-gray-400`;
      case 'QUIZ':
        return `${baseStyle} bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400`;
      default:
        return `${baseStyle} bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400`;
    }
  };

  const getButtonText = (mode: AppMode) => {
    switch (mode) {
      case 'LEARNING': return '📚 Learning';
      case 'GAME': return '🎮 Game Mode';
      case 'QUIZ': return '🧠 Quiz Mode';
      default: return mode;
    }
  };

  const isActive = currentMode === targetMode;

  return (
    <button
      onClick={() => onSwitch(targetMode)}
      disabled={disabled || isActive}
      className={`${getButtonStyle(targetMode)} text-white ${isActive ? 'ring-2 ring-white' : ''}`}
    >
      {getButtonText(targetMode)}
      {isActive && ' ✓'}
    </button>
  );
};

export default AppModeButton;
