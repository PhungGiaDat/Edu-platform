/**
 * VirtualPet — Kid-friendly companion component.
 *
 * Uses CodexPetSprite for mascot rendering (consistent with Lexi throughout
 * the app) rather than emoji, which violate the no-emoji rule.
 *
 * Compact mode renders a pill button (for AR overlays); full mode renders
 * a claymorphic card with happiness bar and action buttons.
 */
import React from 'react';
import { CodexPetSprite } from '@/features/pets/components/CodexPetSprite';
import { colors } from '@/design-tokens/claymorphic';

type PetType = 'bunny' | 'cat' | 'dog' | 'panda';

interface VirtualPetProps {
  petType?: PetType;
  thumbnailUrl?: string;
  happiness?: number; // 0–100
  name?: string;
  onFeed?: () => void;
  onPlay?: () => void;
  compact?: boolean;
}

const DISPLAY_FONT = "'Nunito', 'Baloo 2', system-ui, sans-serif";

// Compact pill — for AR overlays / compact spaces
const CompactPet: React.FC<VirtualPetProps> = ({
  petType = 'bunny',
  thumbnailUrl,
  happiness = 80,
  name = 'Buddy',
}) => {
  const mood = happiness > 70 ? 'happy' : happiness > 40 ? 'sad' : 'sleeping';
  const label = mood === 'happy' ? `${name} dang vui` : mood === 'sad' ? `${name} can an` : `${name} dang ngu`;

  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-2xl"
      style={{
        background: 'linear-gradient(135deg, #22d3ee 0%, #06b6d4 100%)',
        border: '3px solid #fff',
        boxShadow: `0 4px 0 #0891b2, 0 6px 16px rgba(6,182,212,0.2)`,
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <CodexPetSprite
        animationState={mood === 'happy' ? 'waving' : mood === 'sad' ? 'idle' : 'idle'}
        label={label}
        size={40}
      />
      <div className="flex flex-col items-start">
        <span className="text-white font-black text-xs">{name}</span>
        <div
          className="h-1.5 rounded-full overflow-hidden"
          style={{ width: 40, background: 'rgba(255,255,255,0.3)' }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${happiness}%`,
              background: happiness > 70 ? '#4ade80' : happiness > 40 ? '#fbbf24' : '#f87171',
            }}
          />
        </div>
      </div>
    </div>
  );
};

// Full card — claymorphic companion display
const FullPet: React.FC<VirtualPetProps> = ({
  petType = 'bunny',
  thumbnailUrl,
  happiness = 80,
  name = 'Buddy',
  onFeed,
  onPlay,
}) => {
  const mood = happiness > 70 ? 'happy' : happiness > 40 ? 'sad' : 'sleeping';
  const label =
    mood === 'happy'
      ? `${name} dang vui`
      : mood === 'sad'
        ? `${name} can an`
        : `${name} dang ngu`;

  const animMap: Record<string, 'waving' | 'idle' | 'jumping' | 'waiting'> = {
    happy: 'waving',
    sad: 'idle',
    sleeping: 'waiting',
  };

  const happinessColor =
    happiness > 70 ? '#4ade80' : happiness > 40 ? '#fbbf24' : '#f87171';

  const moodMessage =
    mood === 'happy'
      ? 'May lao dap len voi con!'
      : mood === 'sad'
        ? 'Cho an de vui hon nhe!'
        : 'Zzz... can su chu y!';

  return (
    <div
      className="rounded-3xl p-4"
      style={{
        background: 'linear-gradient(145deg, #67e8f9 0%, #22d3ee 50%, #06b6d4 100%)',
        border: '4px solid #fff',
        boxShadow: `0 10px 0 rgba(6,182,212,0.18), 0 14px 28px rgba(6,182,212,0.12), inset 0 1px 0 rgba(255,255,255,0.5)`,
      }}
    >
      {/* Pet display */}
      <div className="text-center mb-3">
        <div
          className="inline-block"
          style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))' }}
        >
          <CodexPetSprite
            animationState={animMap[mood]}
            label={label}
            size={100}
          />
        </div>
        <p
          className="text-white font-black text-lg drop-shadow mt-2"
          style={{ fontFamily: DISPLAY_FONT }}
        >
          {name}
        </p>
      </div>

      {/* Happiness bar */}
      <div className="mb-3">
        <div className="flex justify-between text-white text-xs font-bold mb-1">
          <span>Happiness</span>
          <span>{happiness}%</span>
        </div>
        <div
          className="h-3 rounded-full overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.3)' }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${happiness}%`,
              background: happinessColor,
            }}
          />
        </div>
      </div>

      {/* Action buttons — claymorphic style */}
      <div className="flex gap-2">
        <button
          onClick={onFeed}
          className="flex-1 py-2 rounded-xl font-black text-sm"
          style={{
            background: colors.sunshineYellow,
            border: '3px solid #fff',
            color: colors.deepSlate,
            boxShadow: `0 5px 0 ${colors.sunshineYellowDark}, inset 0 1px 0 rgba(255,255,255,0.4)`,
            fontFamily: DISPLAY_FONT,
            cursor: 'pointer',
          }}
        >
          Feed
        </button>
        <button
          onClick={onPlay}
          className="flex-1 py-2 rounded-xl font-black text-sm"
          style={{
            background: colors.skyBlue,
            border: '3px solid #fff',
            color: '#fff',
            boxShadow: `0 5px 0 ${colors.skyBlueDark}, inset 0 1px 0 rgba(255,255,255,0.4)`,
            fontFamily: DISPLAY_FONT,
            cursor: 'pointer',
          }}
        >
          Play
        </button>
      </div>

      {/* Mood message */}
      <p
        className="text-center text-white/90 text-xs mt-2 font-semibold"
        style={{ fontFamily: DISPLAY_FONT }}
      >
        {moodMessage}
      </p>
    </div>
  );
};

export const VirtualPet: React.FC<VirtualPetProps> = (props) => {
  if (props.compact) {
    return <CompactPet {...props} />;
  }
  return <FullPet {...props} />;
};

export default VirtualPet;
