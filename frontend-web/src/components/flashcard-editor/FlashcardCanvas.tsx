// frontend-web/src/components/flashcard-editor/FlashcardCanvas.tsx
import React, { useRef, useEffect, useCallback } from 'react';
import { Stage, Layer, Text, Image as KonvaImage, Rect, Transformer, Group } from 'react-konva';
import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import useFlashcardEditorStore, { 
  CanvasElement, 
  TextElement, 
  ImageElement, 
  CANVAS_WIDTH, 
  CANVAS_HEIGHT 
} from '../../stores/flashcard-editor.store';

interface FlashcardCanvasProps {
  stageRef?: React.RefObject<Konva.Stage>;
}

const FlashcardCanvas: React.FC<FlashcardCanvasProps> = ({ stageRef: externalStageRef }) => {
  const internalStageRef = useRef<Konva.Stage>(null);
  const stageRef = externalStageRef || internalStageRef;
  const transformerRef = useRef<Konva.Transformer>(null);
  
  const {
    elements,
    selectedId,
    selectElement,
    updateElement,
  } = useFlashcardEditorStore();

  // Update transformer when selection changes
  useEffect(() => {
    if (!transformerRef.current || !internalStageRef.current) return;
    
    if (selectedId) {
      const node = internalStageRef.current.findOne(`#${selectedId}`);
      if (node) {
        transformerRef.current.nodes([node]);
        transformerRef.current.getLayer()?.batchDraw();
      }
    } else {
      transformerRef.current.nodes([]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [selectedId, elements]);

  const handleSelect = useCallback((e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    const clickedOnEmpty = e.target === e.target.getStage();
    if (clickedOnEmpty) {
      selectElement(null);
    }
  }, [selectElement]);

  const handleTransformEnd = useCallback((element: CanvasElement) => {
    const node = stageRef.current?.findOne(`#${element.id}`) as Konva.Group;
    if (!node) return;

    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    // Reset scale and update width/height
    node.scaleX(1);
    node.scaleY(1);

    updateElement(element.id, {
      x: node.x(),
      y: node.y(),
      width: Math.max(20, (element as any).width * scaleX),
      height: Math.max(20, (element as any).height * scaleY),
      rotation: node.rotation(),
    });
  }, [stageRef, updateElement]);

  const handleDragEnd = useCallback((element: CanvasElement) => {
    return (e: KonvaEventObject<DragEvent>) => {
      updateElement(element.id, {
        x: e.target.x(),
        y: e.target.y(),
      });
    };
  }, [updateElement]);

  const renderElement = (element: CanvasElement) => {
    const commonProps = {
      id: element.id,
      x: element.x,
      y: element.y,
      rotation: element.rotation,
      opacity: element.opacity,
      draggable: true,
      onClick: (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
        e.cancelBubble = true;
        selectElement(element.id);
      },
      onTap: () => selectElement(element.id),
      onDragEnd: handleDragEnd(element),
      onTransformEnd: () => handleTransformEnd(element),
    };

    switch (element.type) {
      case 'text': {
        const textEl = element as TextElement;
        return (
          <Group
            key={element.id}
            {...commonProps}
            width={textEl.width}
            height={textEl.height}
          >
            {textEl.backgroundColor && (
              <Rect
                width={textEl.width}
                height={textEl.height}
                fill={textEl.backgroundColor}
                cornerRadius={4}
                padding={textEl.padding}
              />
            )}
            <Text
              text={textEl.text}
              fontSize={textEl.fontSize}
              fontFamily={textEl.fontFamily}
              fill={textEl.fontColor}
              fontStyle={textEl.fontStyle}
              align={textEl.textAlign}
              verticalAlign="middle"
              width={textEl.width}
              height={textEl.height}
              padding={textEl.padding}
            />
          </Group>
        );
      }
      case 'image': {
        const imageEl = element as ImageElement;
        const [image, setImage] = React.useState<HTMLImageElement | null>(null);

        useEffect(() => {
          const img = new window.Image();
          img.crossOrigin = 'anonymous';
          img.src = imageEl.src;
          img.onload = () => setImage(img);
        }, [imageEl.src]);

        if (!image) return null;

        return (
          <KonvaImage
            key={element.id}
            id={element.id}
            x={element.x}
            y={element.y}
            width={imageEl.width}
            height={imageEl.height}
            rotation={element.rotation}
            opacity={element.opacity}
            image={image}
            cornerRadius={imageEl.borderRadius}
            draggable
            onClick={(e) => {
              e.cancelBubble = true;
              selectElement(element.id);
            }}
            onTap={() => selectElement(element.id)}
            onDragEnd={handleDragEnd(element)}
            onTransformEnd={() => handleTransformEnd(element)}
          />
        );
      }
      case 'qr': {
        // QR elements are rendered separately in QRLayer
        return null;
      }
      default:
        return null;
    }
  };

  // Sort elements by zIndex
  const sortedElements = [...elements].sort((a, b) => a.zIndex - b.zIndex);

  return (
    <div className="flashcard-canvas-container relative">
      <Stage
        ref={stageRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        onMouseDown={handleSelect}
        onTouchStart={handleSelect}
        className="border-2 border-gray-300 rounded-lg bg-white"
        style={{ maxWidth: '100%' }}
      >
        <Layer>
          {/* Background */}
          <Rect
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            fill="#ffffff"
          />
          
          {/* Render elements */}
          {sortedElements.map(renderElement)}
          
          {/* Transformer */}
          <Transformer
            ref={transformerRef}
            boundBoxFunc={(oldBox, newBox) => {
              // Limit resize
              if (newBox.width < 20 || newBox.height < 20) {
                return oldBox;
              }
              return newBox;
            }}
            rotateEnabled={true}
            enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right', 'middle-left', 'middle-right', 'top-center', 'bottom-center']}
          />
        </Layer>
      </Stage>
    </div>
  );
};

export default FlashcardCanvas;
