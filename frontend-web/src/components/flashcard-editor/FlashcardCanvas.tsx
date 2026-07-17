// frontend-web/src/components/flashcard-editor/FlashcardCanvas.tsx
import React, { useRef, useEffect, useCallback, useState } from 'react';
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
  onElementSelect?: (element: CanvasElement | null) => void;
}

const FlashcardCanvas: React.FC<FlashcardCanvasProps> = ({ stageRef: externalStageRef, onElementSelect }) => {
  const internalStageRef = useRef<Konva.Stage>(null);
  const stageRef = externalStageRef || internalStageRef;
  const transformerRef = useRef<Konva.Transformer>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  
  const {
    elements,
    selectedId,
    selectElement,
    updateElement,
  } = useFlashcardEditorStore();

  // Sync with external ref
  useEffect(() => {
    if (externalStageRef) {
      (externalStageRef as React.MutableRefObject<Konva.Stage | null>).current = internalStageRef.current;
    }
  }, [externalStageRef]);

  // Update transformer when selection changes
  useEffect(() => {
    if (!transformerRef.current || !internalStageRef.current) return;
    
    if (selectedId) {
      const node = internalStageRef.current.findOne(`#${selectedId}`);
      if (node) {
        transformerRef.current.nodes([node]);
        transformerRef.current.getLayer()?.batchDraw();
        
        // Notify external listeners
        const element = elements.find(el => el.id === selectedId);
        onElementSelect?.(element || null);
      }
    } else {
      transformerRef.current.nodes([]);
      transformerRef.current.getLayer()?.batchDraw();
      onElementSelect?.(null);
    }
  }, [selectedId, elements, onElementSelect]);

  // Handle click on empty canvas
  const handleSelect = useCallback((e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    const clickedOnEmpty = e.target === e.target.getStage();
    if (clickedOnEmpty) {
      selectElement(null);
      setEditingTextId(null);
    }
  }, [selectElement]);

  // Handle transform end
  const handleTransformEnd = useCallback((element: CanvasElement) => {
    const node = stageRef.current?.findOne(`#${element.id}`) as Konva.Group;
    if (!node) return;

    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

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

  // Handle drag end
  const handleDragEnd = useCallback((element: CanvasElement) => {
    return (e: KonvaEventObject<DragEvent>) => {
      updateElement(element.id, {
        x: e.target.x(),
        y: e.target.y(),
      });
    };
  }, [updateElement]);

  // Handle double click to edit text
  const handleDblClick = useCallback((element: CanvasElement) => {
    if (element.type === 'text') {
      setEditingTextId(element.id);
    }
  }, []);

  // Render text element
  const renderTextElement = (element: TextElement) => {
    const isEditing = editingTextId === element.id;
    
    return (
      <Group
        key={element.id}
        id={element.id}
        x={element.x}
        y={element.y}
        rotation={element.rotation}
        opacity={element.opacity}
        draggable={!isEditing}
        onClick={(e) => {
          e.cancelBubble = true;
          selectElement(element.id);
          setEditingTextId(null);
        }}
        onTap={() => selectElement(element.id)}
        onDragEnd={handleDragEnd(element)}
        onTransformEnd={() => handleTransformEnd(element)}
        onDblClick={() => handleDblClick(element)}
        onDblTap={() => handleDblClick(element)}
        width={element.width}
        height={element.height}
      >
        {element.backgroundColor && (
          <Rect
            width={element.width}
            height={element.height}
            fill={element.backgroundColor}
            cornerRadius={8}
          />
        )}
        {isEditing ? (
          <Text
            text={element.text}
            fontSize={element.fontSize}
            fontFamily={element.fontFamily}
            fill={element.fontColor}
            fontStyle={element.fontStyle}
            align={element.textAlign}
            width={element.width}
            height={element.height}
            padding={element.padding}
          />
        ) : (
          <Text
            text={element.text}
            fontSize={element.fontSize}
            fontFamily={element.fontFamily}
            fill={element.fontColor}
            fontStyle={element.fontStyle}
            align={element.textAlign}
            verticalAlign="middle"
            width={element.width}
            height={element.height}
            padding={element.padding}
          />
        )}
      </Group>
    );
  };

  // Render image element
  const renderImageElement = (element: ImageElement) => {
    const [image, setImage] = useState<HTMLImageElement | null>(null);

    useEffect(() => {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.src = element.src;
      img.onload = () => setImage(img);
    }, [element.src]);

    if (!image) {
      return (
        <Rect
          key={element.id}
          id={element.id}
          x={element.x}
          y={element.y}
          width={element.width}
          height={element.height}
          fill="#f3f4f6"
          cornerRadius={element.borderRadius}
        />
      );
    }

    return (
      <KonvaImage
        key={element.id}
        id={element.id}
        x={element.x}
        y={element.y}
        width={element.width}
        height={element.height}
        rotation={element.rotation}
        opacity={element.opacity}
        image={image}
        cornerRadius={element.borderRadius}
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
  };

  // Render QR element
  const renderQRElement = () => {
    // QR is rendered by QRLayer component, not in Konva
    return null;
  };

  // Sort elements by zIndex
  const sortedElements = [...elements].sort((a, b) => a.zIndex - b.zIndex);

  return (
    <div className="flashcard-canvas-container relative bg-gray-100 p-4 rounded-lg">
      <Stage
        ref={stageRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        onMouseDown={handleSelect}
        onTouchStart={handleSelect}
        className="shadow-lg"
        scaleX={1}
        scaleY={1}
      >
        <Layer>
          {/* Canvas Background */}
          <Rect
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            fill="#ffffff"
            shadowColor="black"
            shadowBlur={10}
            shadowOpacity={0.1}
            shadowOffsetX={2}
            shadowOffsetY={2}
          />
          
          {/* Render elements */}
          {sortedElements.map((element) => {
            switch (element.type) {
              case 'text':
                return renderTextElement(element as TextElement);
              case 'image':
                return renderImageElement(element as ImageElement);
              case 'qr':
                return renderQRElement();
              default:
                return null;
            }
          })}
          
          {/* Transformer for selected elements */}
          <Transformer
            ref={transformerRef}
            boundBoxFunc={(oldBox, newBox) => {
              if (newBox.width < 20 || newBox.height < 20) {
                return oldBox;
              }
              return newBox;
            }}
            rotateEnabled={true}
            enabledAnchors={[
              'top-left',
              'top-right',
              'bottom-left',
              'bottom-right',
              'middle-left',
              'middle-right',
              'top-center',
              'bottom-center'
            ]}
            borderStroke="#3b82f6"
            borderStrokeWidth={2}
            anchorFill="#ffffff"
            anchorStroke="#3b82f6"
            anchorSize={10}
            anchorCornerRadius={2}
          />
        </Layer>
      </Stage>
      
      {/* Canvas Size Indicator */}
      <div className="absolute bottom-2 right-2 text-xs text-gray-400 bg-white/80 px-2 py-1 rounded">
        {CANVAS_WIDTH} × {CANVAS_HEIGHT}px
      </div>
    </div>
  );
};

export default FlashcardCanvas;

// Export stage getter for external use
export const getStage = (ref: React.RefObject<Konva.Stage | null>) => ref.current;
