// frontend-web/src/components/flashcard-editor/EditorToolbar.tsx
import React, { useRef } from 'react';
import useFlashcardEditorStore from '../../stores/flashcard-editor.store';

interface EditorToolbarProps {
  onImageUpload?: (file: File) => void;
}

const EditorToolbar: React.FC<EditorToolbarProps> = ({ onImageUpload }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const {
    selectedId,
    elements,
    addTextElement,
    addImageElement,
    deleteElement,
    duplicateElement,
    undo,
    redo,
    history,
    historyIndex,
    showQR,
    setShowQR,
  } = useFlashcardEditorStore();

  const selectedElement = elements.find((el) => el.id === selectedId);
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImageUpload) {
      onImageUpload(file);
    }
    // Also create a preview URL for the canvas
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        addImageElement(result);
      };
      reader.readAsDataURL(file);
    }
    // Reset input
    e.target.value = '';
  };

  const handleAddQR = () => {
    // QR is handled by QRLayer, just toggle visibility
    setShowQR(!showQR);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg bg-white p-3 shadow-sm">
      {/* Undo/Redo */}
      <div className="flex items-center gap-1 border-r border-gray-200 pr-3">
        <ToolButton
          onClick={undo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          icon={
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          }
        />
        <ToolButton
          onClick={redo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
          icon={
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
            </svg>
          }
        />
      </div>

      {/* Add Elements */}
      <div className="flex items-center gap-1 border-r border-gray-200 pr-3">
        <ToolButton
          onClick={addTextElement}
          title="Add Text"
          icon={
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          }
        />
        <ToolButton
          onClick={handleImageClick}
          title="Add Image"
          icon={
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
        <ToolButton
          onClick={handleAddQR}
          title={showQR ? 'Hide QR Code' : 'Show QR Code'}
          active={showQR}
          icon={
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
          }
        />
      </div>

      {/* Element Actions */}
      <div className="flex items-center gap-1">
        <ToolButton
          onClick={() => selectedId && duplicateElement(selectedId)}
          disabled={!selectedId}
          title="Duplicate (Ctrl+D)"
          icon={
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          }
        />
        <ToolButton
          onClick={() => selectedId && deleteElement(selectedId)}
          disabled={!selectedId}
          title="Delete (Del)"
          variant="danger"
          icon={
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          }
        />
      </div>

      {/* Selection indicator */}
      {selectedElement && (
        <div className="ml-auto text-sm text-gray-500">
          Selected: <span className="font-medium capitalize">{selectedElement.type}</span>
        </div>
      )}
    </div>
  );
};

// Tool Button Component
interface ToolButtonProps {
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  title: string;
  variant?: 'default' | 'danger';
  icon: React.ReactNode;
}

const ToolButton: React.FC<ToolButtonProps> = ({
  onClick,
  disabled,
  active,
  title,
  variant = 'default',
  icon,
}) => {
  const baseClasses = 'p-2 rounded-md transition-colors';
  const variantClasses = {
    default: active
      ? 'bg-blue-100 text-blue-700'
      : 'text-gray-600 hover:bg-gray-100',
    danger: 'text-red-600 hover:bg-red-50',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`${baseClasses} ${variantClasses[variant]} ${
        disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
      }`}
    >
      {icon}
    </button>
  );
};

export default EditorToolbar;
