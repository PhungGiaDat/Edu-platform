import React, { useEffect, useMemo, useState } from 'react';

export type CodexPetAnimationState =
    | 'idle'
    | 'running-right'
    | 'running-left'
    | 'waving'
    | 'jumping'
    | 'failed'
    | 'waiting'
    | 'running'
    | 'review';

export interface CodexPetSpriteProps {
    animationState?: CodexPetAnimationState;
    className?: string;
    label?: string;
    size?: number | string;
    src?: string;
    style?: React.CSSProperties;
}

const DEFAULT_LEXI_SPRITESHEET = '/assets/pets/lexi/spritesheet.webp';
const ATLAS_COLUMNS = 8;
const ATLAS_ROWS = 9;
const CELL_WIDTH = 192;
const CELL_HEIGHT = 208;

const ANIMATION_ROWS: Record<CodexPetAnimationState, { row: number; durations: number[] }> = {
    idle: { row: 0, durations: [280, 110, 110, 140, 140, 320] },
    'running-right': { row: 1, durations: [120, 120, 120, 120, 120, 120, 120, 220] },
    'running-left': { row: 2, durations: [120, 120, 120, 120, 120, 120, 120, 220] },
    waving: { row: 3, durations: [140, 140, 140, 280] },
    jumping: { row: 4, durations: [140, 140, 140, 140, 280] },
    failed: { row: 5, durations: [140, 140, 140, 140, 140, 140, 140, 240] },
    waiting: { row: 6, durations: [150, 150, 150, 150, 150, 260] },
    running: { row: 7, durations: [120, 120, 120, 120, 120, 220] },
    review: { row: 8, durations: [150, 150, 150, 150, 150, 280] },
};

function toCssSize(size: number | string): string {
    return typeof size === 'number' ? `${size}px` : size;
}

export function CodexPetSprite({
    animationState = 'idle',
    className = '',
    label = 'Lexi',
    size = '100%',
    src = DEFAULT_LEXI_SPRITESHEET,
    style,
}: CodexPetSpriteProps) {
    const animation = useMemo(() => ANIMATION_ROWS[animationState], [animationState]);
    const [frame, setFrame] = useState(0);
    const [reduceMotion, setReduceMotion] = useState(false);

    useEffect(() => {
        if (typeof window.matchMedia !== 'function') return;

        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        if (!mediaQuery) return;
        const updateMotionPreference = () => {
            setReduceMotion(mediaQuery.matches);
            if (mediaQuery.matches) setFrame(0);
        };

        updateMotionPreference();
        if (typeof mediaQuery.addEventListener === 'function') {
            mediaQuery.addEventListener('change', updateMotionPreference);
        } else {
            mediaQuery.addListener?.(updateMotionPreference);
        }

        return () => {
            if (typeof mediaQuery.removeEventListener === 'function') {
                mediaQuery.removeEventListener('change', updateMotionPreference);
            } else {
                mediaQuery.removeListener?.(updateMotionPreference);
            }
        };
    }, []);

    useEffect(() => {
        setFrame(0);
    }, [animationState]);

    useEffect(() => {
        if (reduceMotion) return;

        const duration = animation.durations[frame] ?? animation.durations[0];
        const timer = window.setTimeout(() => {
            setFrame((currentFrame) => (currentFrame + 1) % animation.durations.length);
        }, duration);

        return () => window.clearTimeout(timer);
    }, [animation, frame, reduceMotion]);

    const safeFrame = Math.min(frame, animation.durations.length - 1);
    const backgroundPositionX = `${(safeFrame / (ATLAS_COLUMNS - 1)) * 100}%`;
    const backgroundPositionY = `${(animation.row / (ATLAS_ROWS - 1)) * 100}%`;

    return (
        <div
            className={`flex items-center justify-center overflow-visible ${className}`}
            style={{
                width: toCssSize(size),
                height: toCssSize(size),
                ...style,
            }}
            role="img"
            aria-label={label}
        >
            <div
                className="max-h-full max-w-full shrink-0"
                style={{
                    width: 'auto',
                    height: '100%',
                    aspectRatio: `${CELL_WIDTH} / ${CELL_HEIGHT}`,
                    backgroundImage: `url("${src}")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: `${ATLAS_COLUMNS * 100}% ${ATLAS_ROWS * 100}%`,
                    backgroundPosition: `${backgroundPositionX} ${backgroundPositionY}`,
                    filter: 'drop-shadow(0 18px 20px rgba(15, 23, 42, 0.24))',
                }}
            />
        </div>
    );
}

export default CodexPetSprite;
