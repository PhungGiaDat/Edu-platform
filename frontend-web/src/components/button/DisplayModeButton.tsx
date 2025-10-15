import React from 'react';

interface Props {
  displayMode: '2D' | '3D';
  onToggle: () => void;
  disabled?: boolean;
}

const DisplayModeButton: React.FC<Props> = ({ displayMode, onToggle, disabled = false }) => {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg shadow-lg transition-colors duration-200 flex items-center gap-2"
    >
      <span className="text-sm font-medium">
        {displayMode === '2D' ? '📷 2D View' : '🎮 3D View'}
      </span>
      <span className="text-xs opacity-75">
        → {displayMode === '2D' ? '3D' : '2D'}
      </span>
    </button>
  );
};

export default DisplayModeButton;