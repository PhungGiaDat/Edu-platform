// src/components/game/ColoringGame.tsx
// Kid-friendly coloring game with audio feedback

import React, { useRef, useState, useEffect, useCallback } from 'react';
import type { GameChallenge } from '../../types';
import { AudioService } from '@/services/AudioService';

interface Props {
    challenge: GameChallenge;
    onAnswer: (answer: string) => void;
    showHint: boolean;
}

interface ColorOption {
    name: string;
    nameVi: string;
    hex: string;
}

const COLORS: ColorOption[] = [
    { name: 'Red', nameVi: 'Đỏ', hex: '#ef4444' },
    { name: 'Blue', nameVi: 'Xanh dương', hex: '#3b82f6' },
    { name: 'Green', nameVi: 'Xanh lá', hex: '#22c55e' },
    { name: 'Yellow', nameVi: 'Vàng', hex: '#eab308' },
    { name: 'Orange', nameVi: 'Cam', hex: '#f97316' },
    { name: 'Cyan', nameVi: 'Xanh ngoc', hex: '#06b6d4' },
    { name: 'Sky', nameVi: 'Xanh troi', hex: '#0ea5e9' },
    { name: 'Brown', nameVi: 'Nâu', hex: '#a16207' },
];

export const ColoringGame: React.FC<Props> = ({ challenge, onAnswer, showHint }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [selectedColor, setSelectedColor] = useState<ColorOption>(COLORS[0]);
    const [isDrawing, setIsDrawing] = useState(false);
    const [brushSize] = useState(20);
    const [coloredPercentage, setColoredPercentage] = useState(0);

    // Initialize canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = 300;
        canvas.height = 300;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw outline
        if (challenge.image_url) {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.src = challenge.image_url;
            img.onload = () => {
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            };
        }
    }, [challenge.image_url]);

    const handleColorSelect = useCallback((color: ColorOption) => {
        setSelectedColor(color);
        AudioService.playPronunciation(color.name, 'en');
    }, []);

    const getCoords = (e: React.TouchEvent | React.MouseEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };

        const rect = canvas.getBoundingClientRect();
        if ('touches' in e) {
            return {
                x: (e.touches[0].clientX - rect.left) * (canvas.width / rect.width),
                y: (e.touches[0].clientY - rect.top) * (canvas.height / rect.height)
            };
        }
        return {
            x: (e.clientX - rect.left) * (canvas.width / rect.width),
            y: (e.clientY - rect.top) * (canvas.height / rect.height)
        };
    };

    const startDrawing = useCallback((e: React.TouchEvent | React.MouseEvent) => {
        e.preventDefault();
        setIsDrawing(true);
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx) return;

        const { x, y } = getCoords(e);
        ctx.beginPath();
        ctx.moveTo(x, y);
    }, []);

    const draw = useCallback((e: React.TouchEvent | React.MouseEvent) => {
        if (!isDrawing) return;
        e.preventDefault();

        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx) return;

        const { x, y } = getCoords(e);
        ctx.lineTo(x, y);
        ctx.strokeStyle = selectedColor.hex;
        ctx.lineWidth = brushSize;
        ctx.lineCap = 'round';
        ctx.stroke();
    }, [isDrawing, selectedColor, brushSize]);

    const stopDrawing = useCallback(() => {
        setIsDrawing(false);

        // Calculate progress
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx || !canvas) return;

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let coloredPixels = 0;

        for (let i = 0; i < imageData.data.length; i += 4) {
            if (imageData.data[i] < 250 || imageData.data[i + 1] < 250 || imageData.data[i + 2] < 250) {
                coloredPixels++;
            }
        }

        const percentage = Math.round((coloredPixels / (imageData.data.length / 4)) * 100);
        setColoredPercentage(percentage);

        if (percentage >= 25) {
            onAnswer('completed');
        }
    }, [onAnswer]);

    const handleClear = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx || !canvas) return;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        setColoredPercentage(0);
    };

    return (
        <div className="space-y-3">
            <div
                className="text-center p-2 rounded-xl"
                style={{ background: 'linear-gradient(135deg, #0ea5e9, #22c55e)' }}
            >
                <p className="text-sm font-bold text-white">{challenge.question}</p>
            </div>

            <div className="flex justify-between items-center px-2">
                <span className="text-sm font-bold text-sky-700">🎨 {coloredPercentage}%</span>
                <button
                    onClick={handleClear}
                    className="px-3 py-1 text-xs font-bold text-white rounded-full"
                    style={{ background: '#f97316' }}
                >
                    🧹 Clear
                </button>
            </div>

            <div
                className="relative mx-auto rounded-2xl overflow-hidden shadow-lg"
                style={{
                    width: 'min(300px, 90vw)',
                    height: 'min(300px, 90vw)',
                    border: '4px solid #0ea5e9',
                    touchAction: 'none'
                }}
            >
                <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full h-full"
                    style={{ touchAction: 'none' }}
                />
            </div>

            <div className="flex flex-wrap justify-center gap-2">
                {COLORS.map((color) => (
                    <button
                        key={color.hex}
                        onClick={() => handleColorSelect(color)}
                        className="rounded-full transition-transform"
                        style={{
                            width: 40,
                            height: 40,
                            background: color.hex,
                            border: selectedColor.hex === color.hex ? '4px solid #1f2937' : '2px solid #fff',
                            transform: selectedColor.hex === color.hex ? 'scale(1.2)' : 'scale(1)',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                        }}
                    />
                ))}
            </div>

            {showHint && challenge.hint && (
                <div
                    className="p-2 rounded-xl text-center"
                    style={{ background: '#fef08a', border: '2px solid #eab308' }}
                >
                    <p className="text-xs font-bold text-amber-800">💡 {challenge.hint}</p>
                </div>
            )}
        </div>
    );
};

export default ColoringGame;
