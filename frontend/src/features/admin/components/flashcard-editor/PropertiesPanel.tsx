// frontend-web/src/components/flashcard-editor/PropertiesPanel.tsx
import React from 'react';
import useFlashcardEditorStore, {
  TextElement,
  ImageElement,
  QRElement,
} from '@/stores/flashcard-editor.store';

const PropertiesPanel: React.FC = () => {
  const {
    elements,
    selectedId,
    updateElement,
    bringToFront,
    sendToBack,
  } = useFlashcardEditorStore();

  const selectedElement = elements.find((el) => el.id === selectedId);

  if (!selectedElement) {
    return (
      <div className="rounded-lg bg-white p-4 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Properties</h3>
        <p className="text-sm text-gray-500">
          Select an element on the canvas to edit its properties.
        </p>
      </div>
    );
  }

  const handlePropertyChange = (property: string, value: any) => {
    updateElement(selectedElement.id, { [property]: value });
  };

  return (
    <div className="rounded-lg bg-white p-4 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-gray-900">Properties</h3>
      
      {/* Common Properties */}
      <div className="mb-6 space-y-4">
        <h4 className="text-sm font-medium text-gray-700">Transform</h4>
        
        <div className="grid grid-cols-2 gap-3">
          <PropertyInput
            label="X"
            type="number"
            value={Math.round(selectedElement.x)}
            onChange={(v) => handlePropertyChange('x', v)}
          />
          <PropertyInput
            label="Y"
            type="number"
            value={Math.round(selectedElement.y)}
            onChange={(v) => handlePropertyChange('y', v)}
          />
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <PropertyInput
            label="Width"
            type="number"
            value={Math.round(selectedElement.width)}
            onChange={(v) => handlePropertyChange('width', Math.max(20, v))}
          />
          <PropertyInput
            label="Height"
            type="number"
            value={Math.round(selectedElement.height)}
            onChange={(v) => handlePropertyChange('height', Math.max(20, v))}
          />
        </div>
        
        <PropertyInput
          label="Rotation"
          type="number"
          value={Math.round(selectedElement.rotation)}
          onChange={(v) => handlePropertyChange('rotation', v)}
          min={-180}
          max={180}
          suffix="°"
        />
        
        <PropertyInput
          label="Opacity"
          type="range"
          value={selectedElement.opacity}
          onChange={(v) => handlePropertyChange('opacity', v)}
          min={0}
          max={1}
          step={0.1}
        />
      </div>

      {/* Type-specific Properties */}
      {selectedElement.type === 'text' && (
        <TextProperties
          element={selectedElement as TextElement}
          onChange={handlePropertyChange}
        />
      )}

      {selectedElement.type === 'image' && (
        <ImageProperties
          element={selectedElement as ImageElement}
          onChange={handlePropertyChange}
        />
      )}

      {selectedElement.type === 'qr' && (
        <QRProperties
          element={selectedElement as QRElement}
          onChange={handlePropertyChange}
        />
      )}

      {/* Layer Order */}
      <div className="mt-6 border-t border-gray-200 pt-4">
        <h4 className="mb-3 text-sm font-medium text-gray-700">Layer Order</h4>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => bringToFront(selectedElement.id)}
            className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Bring to Front
          </button>
          <button
            type="button"
            onClick={() => sendToBack(selectedElement.id)}
            className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Send to Back
          </button>
        </div>
      </div>
    </div>
  );
};

// Property Input Component
interface PropertyInputProps {
  label: string;
  type: 'text' | 'number' | 'color' | 'range';
  value: any;
  onChange: (value: any) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}

const PropertyInput: React.FC<PropertyInputProps> = ({
  label,
  type,
  value,
  onChange,
  min,
  max,
  step,
  suffix,
}) => {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-gray-600">{label}</label>
      <div className="flex items-center gap-2">
        {type === 'range' ? (
          <input
            type="range"
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            min={min}
            max={max}
            step={step}
            className="flex-1"
          />
        ) : (
          <input
            type={type}
            value={value}
            onChange={(e) => onChange(type === 'number' ? parseFloat(e.target.value) : e.target.value)}
            min={min}
            max={max}
            step={step}
            className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
          />
        )}
        {type === 'range' && (
          <span className="min-w-[40px] text-right text-sm text-gray-600">
            {typeof value === 'number' ? value.toFixed(1) : value}
          </span>
        )}
        {suffix && <span className="text-sm text-gray-500">{suffix}</span>}
      </div>
    </div>
  );
};

// Text Properties
interface TextPropertiesProps {
  element: TextElement;
  onChange: (property: string, value: any) => void;
}

const TextProperties: React.FC<TextPropertiesProps> = ({ element, onChange }) => {
  return (
    <div className="space-y-4 border-t border-gray-200 pt-4">
      <h4 className="text-sm font-medium text-gray-700">Text Properties</h4>
      
      <div className="space-y-1">
        <label className="block text-xs font-medium text-gray-600">Content</label>
        <textarea
          value={element.text}
          onChange={(e) => onChange('text', e.target.value)}
          rows={3}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <PropertyInput
          label="Font Size"
          type="number"
          value={element.fontSize}
          onChange={(v) => onChange('fontSize', Math.max(8, v))}
          min={8}
          max={200}
        />
        <PropertyInput
          label="Color"
          type="color"
          value={element.fontColor}
          onChange={(v) => onChange('fontColor', v)}
        />
      </div>

      <div className="space-y-1">
        <label className="block text-xs font-medium text-gray-600">Font Style</label>
        <div className="flex gap-2">
          {(['normal', 'bold', 'italic'] as const).map((style) => (
            <button
              key={style}
              type="button"
              onClick={() => onChange('fontStyle', style)}
              className={`flex-1 rounded-md border px-3 py-1.5 text-sm font-medium capitalize ${
                element.fontStyle === style
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {style}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <label className="block text-xs font-medium text-gray-600">Alignment</label>
        <div className="flex gap-2">
          {(['left', 'center', 'right'] as const).map((align) => (
            <button
              key={align}
              type="button"
              onClick={() => onChange('textAlign', align)}
              className={`flex-1 rounded-md border px-3 py-1.5 text-sm font-medium capitalize ${
                element.textAlign === align
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {align}
            </button>
          ))}
        </div>
      </div>

      <PropertyInput
        label="Background Color"
        type="color"
        value={element.backgroundColor || '#ffffff'}
        onChange={(v) => onChange('backgroundColor', v)}
      />
      
      <button
        type="button"
        onClick={() => onChange('backgroundColor', null)}
        className="text-sm text-blue-600 hover:text-blue-800"
      >
        Remove Background
      </button>
    </div>
  );
};

// Image Properties
interface ImagePropertiesProps {
  element: ImageElement;
  onChange: (property: string, value: any) => void;
}

const ImageProperties: React.FC<ImagePropertiesProps> = ({ element, onChange }) => {
  return (
    <div className="space-y-4 border-t border-gray-200 pt-4">
      <h4 className="text-sm font-medium text-gray-700">Image Properties</h4>
      
      <div className="space-y-1">
        <label className="block text-xs font-medium text-gray-600">Fit Mode</label>
        <div className="flex gap-2">
          {(['cover', 'contain', 'fill'] as const).map((fit) => (
            <button
              key={fit}
              type="button"
              onClick={() => onChange('objectFit', fit)}
              className={`flex-1 rounded-md border px-3 py-1.5 text-sm font-medium capitalize ${
                element.objectFit === fit
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {fit}
            </button>
          ))}
        </div>
      </div>

      <PropertyInput
        label="Border Radius"
        type="number"
        value={element.borderRadius}
        onChange={(v) => onChange('borderRadius', Math.max(0, v))}
        min={0}
        max={100}
        suffix="px"
      />
    </div>
  );
};

// QR Properties
interface QRPropertiesProps {
  element: QRElement;
  onChange: (property: string, value: any) => void;
}

const QRProperties: React.FC<QRPropertiesProps> = ({ element, onChange }) => {
  return (
    <div className="space-y-4 border-t border-gray-200 pt-4">
      <h4 className="text-sm font-medium text-gray-700">QR Code Properties</h4>
      
      <div className="space-y-1">
        <label className="block text-xs font-medium text-gray-600">QR Data</label>
        <input
          type="text"
          value={element.qrData}
          onChange={(e) => onChange('qrData', e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          placeholder="URL or data to encode"
        />
      </div>

      <PropertyInput
        label="QR Size"
        type="number"
        value={element.qrSize}
        onChange={(v) => onChange('qrSize', Math.max(50, Math.min(300, v)))}
        min={50}
        max={300}
        suffix="px"
      />

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="showQR"
          checked={element.showQR}
          onChange={(e) => onChange('showQR', e.target.checked)}
          className="rounded border-gray-300"
        />
        <label htmlFor="showQR" className="text-sm text-gray-600">
          Show QR in export
        </label>
      </div>
    </div>
  );
};

export default PropertiesPanel;
