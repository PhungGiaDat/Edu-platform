// frontend-web/src/components/flashcard-editor/QRLayer.tsx
import React from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import useFlashcardEditorStore, { CANVAS_WIDTH, CANVAS_HEIGHT } from '@/stores/flashcard-editor.store';

interface QRLayerProps {
  visible?: boolean;
}

const QRLayer: React.FC<QRLayerProps> = ({ visible }) => {
  const { qrData, showQR } = useFlashcardEditorStore();
  
  // Default position for QR code (bottom-right)
  const qrX = CANVAS_WIDTH - 180;
  const qrY = CANVAS_HEIGHT - 180;
  const qrSize = 150;
  
  // Use external visibility or internal state
  const isVisible = visible !== undefined ? visible : showQR;
  
  if (!isVisible) {
    return null;
  }
  
  return (
    <div
      className="pointer-events-none absolute"
      style={{
        left: qrX,
        top: qrY,
        width: qrSize,
        height: qrSize,
      }}
    >
      <div className="h-full w-full rounded-lg bg-white p-2 shadow-md">
        <QRCodeCanvas
          value={qrData || 'flashcard'}
          size={qrSize - 16}
          level="H"
          includeMargin={true}
        />
      </div>
    </div>
  );
};

export default QRLayer;
