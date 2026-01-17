/**
 * ColoringOverlay.tsx
 * 
 * Mobile-responsive canvas coloring tool.
 * Touch-friendly drawing for mobile AR.
 */

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { eventBus } from '@/runtime/EventBus';
import '@/styles/Games.css';

// ========== TYPES ==========
interface ColoringOverlayProps {
    outlineImageUrl: string;
    wordToSpeak?: string;
    audioUrl?: string;
    onComplete: () => void;
    onClose: () => void;
}

const COLORS = [
    { name: 'Red', hex: '#FF6B6B' },
    { name: 'Orange', hex: '#FFA500' },
    { name: 'Yellow', hex: '#FFE66D' },
    { name: 'Green', hex: '#4ECDC4' },
    { name: 'Blue', hex: '#4A90D9' },
    { name: 'Purple', hex: '#9B59B6' },
    { name: 'Pink', hex: '#FF69B4' },
    { name: 'Brown', hex: '#8B4513' }
];

const BRUSH_SIZES = [8, 15, 25];

// ========== MAIN COMPONENT ==========

export const ColoringOverlay: React.FC<ColoringOverlayProps> = ({
    outlineImageUrl,
    wordToSpeak,
    audioUrl,
    onComplete,
    onClose
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [selectedColor, setSelectedColor] = useState(COLORS[0].hex);
    const [brushSize, setBrushSize] = useState(15);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasDrawn, setHasDrawn] = useState(false);

    // Initialize canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas size for mobile
        const size = Math.min(window.innerWidth - 32, 280);
        canvas.width = size;
        canvas.height = size;

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        };
        img.src = outlineImageUrl;
    }, [outlineImageUrl]);

    // Get position from event (touch or mouse)
    const getPos = (e: React.TouchEvent | React.MouseEvent): { x: number; y: number } => {
        const canvas = canvasRef.current!;
        const rect = canvas.getBoundingClientRect();

        if ('touches' in e && e.touches.length > 0) {
            return {
                x: (e.touches[0].clientX - rect.left) * (canvas.width / rect.width),
                y: (e.touches[0].clientY - rect.top) * (canvas.height / rect.height)
            };
        }

        const mouseEvent = e as React.MouseEvent;
        return {
            x: (mouseEvent.clientX - rect.left) * (canvas.width / rect.width),
            y: (mouseEvent.clientY - rect.top) * (canvas.height / rect.height)
        };
    };

    const startDrawing = useCallback((e: React.TouchEvent | React.MouseEvent) => {
        e.preventDefault();
        setIsDrawing(true);
        setHasDrawn(true);

        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;

        const pos = getPos(e);
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
    }, []);

    const draw = useCallback((e: React.TouchEvent | React.MouseEvent) => {
        e.preventDefault();
        if (!isDrawing) return;

        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;

        const pos = getPos(e);
        ctx.lineTo(pos.x, pos.y);
        ctx.strokeStyle = selectedColor;
        ctx.lineWidth = brushSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
    }, [isDrawing, selectedColor, brushSize]);

    const stopDrawing = useCallback(() => {
        setIsDrawing(false);
    }, []);

    const handleClear = useCallback(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx || !canvas) return;

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        };
        img.src = outlineImageUrl;
    }, [outlineImageUrl]);

    const handleApply = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const dataUrl = canvas.toDataURL('image/png');

        eventBus.emit('AR_COMMAND' as any, {
            type: 'UPDATE_TEXTURE',
            payload: { dataUrl, targetMesh: 'coloringModel' }
        });

        if (audioUrl) {
            new Audio(audioUrl).play().catch(() => { });
        }

        eventBus.emit('AR_COMMAND' as any, {
            type: 'TRIGGER_ANIMATION',
            payload: { clip: 'happy', loop: false }
        });

        if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
        onComplete();
    }, [audioUrl, onComplete]);

    return (
        <div className="game-overlay">
            {/* Header */}
            <div className="game-header">
                <h2>🎨 Color {wordToSpeak || 'it'}!</h2>
                <button className="game-exit-btn" onClick={onClose}>✕</button>
            </div>

            <div className="coloring-container">
                {/* Canvas */}
                <canvas
                    ref={canvasRef}
                    className="coloring-canvas"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                />

                {/* Color Picker */}
                <div className="color-picker">
                    {COLORS.map(color => (
                        <button
                            key={color.hex}
                            className={`color-btn ${selectedColor === color.hex ? 'selected' : ''}`}
                            style={{ background: color.hex }}
                            onClick={() => setSelectedColor(color.hex)}
                            title={color.name}
                        />
                    ))}
                </div>

                {/* Brush Size */}
                <div className="brush-sizes">
                    <span>Brush:</span>
                    {BRUSH_SIZES.map(size => (
                        <button
                            key={size}
                            className={`brush-btn ${brushSize === size ? 'selected' : ''}`}
                            style={{ width: size + 20, height: size + 20 }}
                            onClick={() => setBrushSize(size)}
                        />
                    ))}
                </div>

                {/* Actions */}
                <div className="coloring-actions">
                    <button className="clear-btn" onClick={handleClear}>🗑️ Clear</button>
                    <button className="apply-btn" onClick={handleApply} disabled={!hasDrawn}>
                        ✨ Apply!
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ColoringOverlay;
