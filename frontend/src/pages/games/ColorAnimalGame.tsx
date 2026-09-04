/**
 * ColorAnimalGame — "Tô màu con vật" (mới theo spec gốc)
 *
 * "Trẻ tô màu vào con vật và hệ thống phát âm tên con vật/màu sắc đó."
 * - 10 con vật SVG line-art, mỗi con gồm các vùng tô (region-fill).
 * - Chạm ô màu → nghe phát âm tên màu (en-US).
 * - Chạm vùng trên con vật → tô màu vùng đó.
 * - Tô đủ vùng → nghe tên con vật + màn thành công + XP idempotent.
 *
 * Line-art stays SVG (region fill needs discrete paths — a bitmap/AI
 * render cannot be filled per region). XP via /gamification/xp-event.
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ClayCard } from '@/shared/components/clay/ClayCard';
import { colors, shadows, withOpacity } from '@/design-tokens/claymorphic';
import { CodexPetSprite } from '@/features/pets/components';
import { awardGameComplete } from '@/services/gamesVocabService';
import { useAuth } from '@/contexts/AuthContext';
import { ClayBurst3D } from '@/shared/components/ClayBurst3D';

const DISPLAY_FONT = "'Nunito', sans-serif";
const STROKE = '#1A2744';

const Msr: React.FC<{ icon: string; size?: number; color?: string; style?: React.CSSProperties }> = ({
  icon, size = 20, color, style,
}) => (
  <span aria-hidden="true" className="msr" style={{ fontSize: size, color, ...style }}>{icon}</span>
);

const PALETTE = [
  { hex: '#9AA5B1', en: 'gray' }, { hex: '#FF9F9F', en: 'pink' }, { hex: '#FF6B6B', en: 'red' },
  { hex: '#FF8C42', en: 'orange' }, { hex: '#FFD93D', en: 'yellow' }, { hex: '#B4E197', en: 'green' },
  { hex: '#6EB9FF', en: 'blue' }, { hex: '#C4A7F5', en: 'purple' },
];

interface AnimalDef {
  word: string;
  nameVi: string;
  regions: string[];
  svg: React.ReactNode;
}

const S = { fill: '#FFFFFF', stroke: STROKE, strokeWidth: 3.5 } as const;
const th = (r: string) => ({ className: 'cr', 'data-region': r });

const ANIMALS: AnimalDef[] = [
  {
    word: 'elephant', nameVi: 'con voi', regions: ['bg', 'body', 'head', 'earL', 'earR', 'trunk', 'legs'],
    svg: (<>
      <rect {...th('bg')} x="6" y="6" width="208" height="178" rx="18" {...S} strokeWidth={3} />
      <ellipse {...th('body')} cx="95" cy="112" rx="55" ry="44" {...S} />
      <rect {...th('legs')} x="62" y="140" width="18" height="34" rx="7" {...S} />
      <rect {...th('legs')} x="100" y="140" width="18" height="34" rx="7" {...S} />
      <circle {...th('head')} cx="152" cy="84" r="37" {...S} />
      <ellipse {...th('earL')} cx="126" cy="78" rx="19" ry="25" {...S} />
      <ellipse {...th('earR')} cx="179" cy="78" rx="19" ry="25" {...S} />
      <path {...th('trunk')} d="M158 112 q8 30 -6 50 q-5 8 -14 4" fill="none" strokeWidth={13} stroke={STROKE} strokeLinecap="round" />
      <circle cx="160" cy="80" r="4.5" fill={STROKE} />
      <path d="M170 96 q5 4 10 0" stroke={STROKE} strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </>),
  },
  {
    word: 'lion', nameVi: 'sư tử', regions: ['bg', 'mane', 'face', 'muzzle', 'earL', 'earR'],
    svg: (<>
      <rect {...th('bg')} x="6" y="6" width="208" height="178" rx="18" {...S} strokeWidth={3} />
      <circle {...th('mane')} cx="110" cy="98" r="62" {...S} />
      <circle {...th('earL')} cx="70" cy="48" r="14" {...S} />
      <circle {...th('earR')} cx="150" cy="48" r="14" {...S} />
      <circle {...th('face')} cx="110" cy="98" r="42" {...S} />
      <ellipse {...th('muzzle')} cx="110" cy="112" rx="20" ry="14" {...S} />
      <circle cx="95" cy="92" r="4.5" fill={STROKE} />
      <circle cx="125" cy="92" r="4.5" fill={STROKE} />
      <ellipse cx="110" cy="108" rx="6" ry="4.5" fill={STROKE} />
    </>),
  },
  {
    word: 'dog', nameVi: 'chó', regions: ['bg', 'body', 'head', 'earL', 'earR', 'legs', 'tail'],
    svg: (<>
      <rect {...th('bg')} x="6" y="6" width="208" height="178" rx="18" {...S} strokeWidth={3} />
      <ellipse {...th('body')} cx="90" cy="115" rx="55" ry="40" {...S} />
      <path {...th('tail')} d="M145 100 q30 -8 26 -34" fill="none" strokeWidth={12} stroke={STROKE} strokeLinecap="round" />
      <rect {...th('legs')} x="56" y="142" width="17" height="32" rx="7" {...S} />
      <rect {...th('legs')} x="98" y="142" width="17" height="32" rx="7" {...S} />
      <circle {...th('head')} cx="145" cy="80" r="36" {...S} />
      <ellipse {...th('earL')} cx="116" cy="62" rx="12" ry="24" {...S} />
      <ellipse {...th('earR')} cx="172" cy="62" rx="12" ry="24" {...S} />
      <circle cx="136" cy="76" r="4.5" fill={STROKE} />
      <circle cx="158" cy="76" r="4.5" fill={STROKE} />
      <ellipse cx="147" cy="92" rx="10" ry="8" fill={STROKE} />
    </>),
  },
  {
    word: 'cat', nameVi: 'mèo', regions: ['bg', 'body', 'head', 'earL', 'earR', 'tail'],
    svg: (<>
      <rect {...th('bg')} x="6" y="6" width="208" height="178" rx="18" {...S} strokeWidth={3} />
      <ellipse {...th('body')} cx="95" cy="120" rx="52" ry="38" {...S} />
      <path {...th('tail')} d="M145 112 q34 2 32 -30" fill="none" strokeWidth={11} stroke={STROKE} strokeLinecap="round" />
      <circle {...th('head')} cx="100" cy="68" r="34" {...S} />
      <path {...th('earL')} d="M76 44 l4 -22 18 14z" {...S} />
      <path {...th('earR')} d="M124 44 l-4 -22 -18 14z" {...S} />
      <circle cx="88" cy="66" r="4" fill={STROKE} />
      <circle cx="112" cy="66" r="4" fill={STROKE} />
      <path d="M94 80 l6 5 6 -5 M100 85 v6 M92 93 q8 5 16 0" stroke={STROKE} strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </>),
  },
  {
    word: 'rabbit', nameVi: 'thỏ', regions: ['bg', 'body', 'head', 'earL', 'earR', 'tail'],
    svg: (<>
      <rect {...th('bg')} x="6" y="6" width="208" height="178" rx="18" {...S} strokeWidth={3} />
      <ellipse {...th('body')} cx="105" cy="122" rx="48" ry="36" {...S} />
      <circle {...th('tail')} cx="152" cy="130" r="14" {...S} />
      <circle {...th('head')} cx="85" cy="70" r="32" {...S} />
      <ellipse {...th('earL')} cx="70" cy="26" rx="10" ry="26" {...S} />
      <ellipse {...th('earR')} cx="100" cy="26" rx="10" ry="26" {...S} />
      <circle cx="76" cy="68" r="4" fill={STROKE} />
      <circle cx="94" cy="68" r="4" fill={STROKE} />
      <path d="M85 78 v6 M79 88 q6 4 12 0" stroke={STROKE} strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </>),
  },
  {
    word: 'fish', nameVi: 'cá', regions: ['bg', 'body', 'tail', 'fin', 'stripe'],
    svg: (<>
      <rect {...th('bg')} x="6" y="6" width="208" height="178" rx="18" {...S} strokeWidth={3} />
      <ellipse {...th('body')} cx="100" cy="95" rx="60" ry="38" {...S} />
      <path {...th('tail')} d="M158 95 l36 -22 v44z" {...S} />
      <path {...th('fin')} d="M92 57 q14 -18 30 -6z" {...S} />
      <path {...th('stripe')} d="M100 60 q12 34 0 68" fill="none" strokeWidth={10} stroke={STROKE} strokeLinecap="round" />
      <circle cx="62" cy="86" r="5" fill={STROKE} />
      <path d="M70 104 q6 4 12 0" stroke={STROKE} strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </>),
  },
  {
    word: 'bird', nameVi: 'chim', regions: ['bg', 'body', 'head', 'wing', 'beak'],
    svg: (<>
      <rect {...th('bg')} x="6" y="6" width="208" height="178" rx="18" {...S} strokeWidth={3} />
      <ellipse {...th('body')} cx="105" cy="105" rx="46" ry="40" {...S} />
      <circle {...th('head')} cx="140" cy="60" r="28" {...S} />
      <path {...th('beak')} d="M166 60 l20 6 -20 8z" fill="#FFD93D" stroke={STROKE} strokeWidth={3} />
      <path {...th('wing')} d="M85 95 q-30 12 -14 38 q20 2 26 -22z" {...S} />
      <circle cx="148" cy="56" r="4" fill={STROKE} />
      <path d="M40 156 h44 M96 158 l6 16 M78 158 l-6 16" stroke={STROKE} strokeWidth="3" fill="none" strokeLinecap="round" />
    </>),
  },
  {
    word: 'bear', nameVi: 'gấu', regions: ['bg', 'body', 'head', 'earL', 'earR', 'muzzle'],
    svg: (<>
      <rect {...th('bg')} x="6" y="6" width="208" height="178" rx="18" {...S} strokeWidth={3} />
      <ellipse {...th('body')} cx="110" cy="122" rx="52" ry="40" {...S} />
      <circle {...th('head')} cx="110" cy="66" r="36" {...S} />
      <circle {...th('earL')} cx="78" cy="34" r="14" {...S} />
      <circle {...th('earR')} cx="142" cy="34" r="14" {...S} />
      <ellipse {...th('muzzle')} cx="110" cy="78" rx="16" ry="12" {...S} />
      <circle cx="96" cy="60" r="4" fill={STROKE} />
      <circle cx="124" cy="60" r="4" fill={STROKE} />
      <ellipse cx="110" cy="76" rx="5" ry="4" fill={STROKE} />
    </>),
  },
  {
    word: 'duck', nameVi: 'vịt', regions: ['bg', 'body', 'head', 'beak', 'wing'],
    svg: (<>
      <rect {...th('bg')} x="6" y="6" width="208" height="178" rx="18" {...S} strokeWidth={3} />
      <path d="M40 150 q0 20 20 20 h80 q24 0 24 -22" fill="none" stroke={STROKE} strokeWidth={4} strokeLinecap="round" />
      <ellipse {...th('body')} cx="105" cy="118" rx="52" ry="36" {...S} />
      <circle {...th('head')} cx="150" cy="62" r="28" {...S} />
      <path {...th('beak')} d="M176 60 l22 8 -22 8z" fill="#FFD93D" stroke={STROKE} strokeWidth={3} />
      <path {...th('wing')} d="M80 108 q-20 10 -8 30 q22 0 26 -18z" {...S} />
      <circle cx="156" cy="58" r="4" fill={STROKE} />
    </>),
  },
  {
    word: 'turtle', nameVi: 'rùa', regions: ['bg', 'shell', 'head', 'legs', 'tail'],
    svg: (<>
      <rect {...th('bg')} x="6" y="6" width="208" height="178" rx="18" {...S} strokeWidth={3} />
      <ellipse {...th('shell')} cx="110" cy="100" rx="62" ry="46" {...S} />
      <path d="M60 92 q24 -22 48 0 M76 68 l8 18 M144 68 l-8 18" stroke={STROKE} strokeWidth="3" fill="none" strokeLinecap="round" opacity=".65" />
      <circle {...th('head')} cx="176" cy="96" r="20" {...S} />
      <rect {...th('legs')} x="46" y="130" width="20" height="24" rx="9" {...S} />
      <rect {...th('legs')} x="136" y="134" width="20" height="24" rx="9" {...S} />
      <path {...th('tail')} d="M42 112 q-16 4 -18 16" fill="none" strokeWidth={8} stroke={STROKE} strokeLinecap="round" />
      <circle cx="184" cy="92" r="3.5" fill={STROKE} />
    </>),
  },
];

export const ColorAnimalGame: React.FC = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const topic = params.get('topic'); // optional — coloring is topic-light, kept for URL consistency

  const [animal, setAnimal] = useState<AnimalDef | null>(null);
  const [selColor, setSelColor] = useState<(typeof PALETTE)[number] | null>(null);
  const [filled, setFilled] = useState<Record<string, string>>({});
  const [xpAwarded, setXpAwarded] = useState<number | null>(null);
  const [hint, setHint] = useState('Chạm một màu, rồi chạm lên con vật để tô nhé!');

  const speak = (text: string) => {
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US'; u.rate = 0.85;
      speechSynthesis.cancel(); speechSynthesis.speak(u);
    } catch { /* silent */ }
  };

  const pickAnimal = (a: AnimalDef) => {
    setAnimal(a); setFilled({}); setXpAwarded(null);
    setHint(`Tô đẹp cho ${a.nameVi} nào!`);
  };

  const allRegions = animal ? animal.regions : [];
  const requiredRegions = useMemo(
    () => allRegions.filter((r) => r !== 'bg'),
    [allRegions],
  );
  const doneCount = requiredRegions.filter((r) => filled[r]).length;
  const complete = animal !== null && doneCount === requiredRegions.length;

  const awardXp = useCallback(async () => {
    if (!user?.id) return;
    const res = await awardGameComplete(user.id, 'color_animal');
    setXpAwarded(res.xp_awarded);
  }, [user?.id]);

  useEffect(() => {
    if (complete && animal) {
      setHint(`Tuyệt vời! Nghe tên con vật nhé...`);
      const t = setTimeout(() => speak(animal.word), 350);
      void awardXp();
      return () => clearTimeout(t);
    }
  }, [complete, animal, awardXp]);

  const paint = (region: string) => {
    if (!animal || !selColor) { setHint('Chạm một ô màu trước đã nhé!'); return; }
    setFilled((f) => ({ ...f, [region]: selColor.hex }));
  };

  /* ── Animal picker ── */
  if (!animal) {
    return (
      <div className="ca-shell">
        <div className="ca-topbar">
          <button className="ca-icon-btn" onClick={() => navigate('/games')} aria-label="Về Khu chơi"><Msr icon="arrow_back" size={20} /></button>
          <div className="ca-topic-chip"><Msr icon="brush" size={16} color={colors.coral} />Tô màu con vật</div>
        </div>
        <p className="ca-guide">Chọn một con vật để tô màu cùng Lexi nhé!</p>
        <div className="ca-picker">
          {ANIMALS.map((a) => (
            <button key={a.word} className="ca-pick" onClick={() => pickAnimal(a)} aria-label={`Tô màu ${a.nameVi} (${a.word})`}>
              <svg viewBox="0 0 220 190" aria-hidden="true">{a.svg}</svg>
              <b>{a.word}</b>
              <small>{a.nameVi}</small>
            </button>
          ))}
        </div>
        <style>{caStyles}</style>
      </div>
    );
  }

  /* ── Coloring stage ── */
  return (
    <div className="ca-shell">
      <div className="ca-topbar">
        <button className="ca-icon-btn" onClick={() => setAnimal(null)} aria-label="Chọn con vật khác"><Msr icon="arrow_back" size={20} /></button>
        <div className="ca-topic-chip"><Msr icon="brush" size={16} color={colors.coral} />{animal.word} · {animal.nameVi}</div>
        <div className="ca-moves">{doneCount}/{requiredRegions.length} vùng</div>
      </div>

      <div className="ca-stage">
        <svg viewBox="0 0 220 190" role="img" aria-label={`Tô màu ${animal.nameVi}`}>
          {React.Children.map(animal.svg.props.children, (child) => {
            if (!React.isValidElement(child)) return child;
            const region = (child.props as { 'data-region'?: string })['data-region'];
            if (!region || !filled[region]) return child;
            return React.cloneElement(child as React.ReactElement<{ fill?: string; stroke?: string }>, {
              fill: filled[region],
              stroke: region === 'trunk' || region === 'tail' ? filled[region] : (child.props as { stroke?: string }).stroke,
            });
          })}
        </svg>
      </div>

      <div className="ca-palette" role="listbox" aria-label="Chọn màu">
        {PALETTE.map((c) => (
          <button
            key={c.en}
            className={`ca-pal ${selColor?.en === c.en ? 'ca-sel' : ''}`}
            style={{ background: c.hex }}
            onClick={() => { setSelColor(c); setHint(`Màu "${c.en}" — chạm lên con vật để tô nhé!`); speak(c.en); }}
            aria-label={`Màu ${c.en}`}
          />
        ))}
      </div>

      <div className="ca-hint" role="status">{hint}</div>

      {complete && (
        <ClayBurst3D show />
      )}
      {complete && (
        <div className="ca-done" role="status">
          <Msr icon="celebration" size={20} color="#4C8A2A" />
          <span>
            Tô đẹp lắm! Đây là <b>{animal.word}</b> ({animal.nameVi}) —{' '}
            {xpAwarded === null ? 'đang nhận phần thưởng…' : xpAwarded > 0 ? `+${xpAwarded} XP!` : 'hôm nay game này đã nhận XP rồi — mai tô tiếp nhé!'}
          </span>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button className="ca-btn" onClick={() => speak(animal.word)}><Msr icon="volume_up" size={16} />Nghe: "{animal.word}"</button>
        <button className="ca-btn" onClick={() => setFilled({})}><Msr icon="restart_alt" size={16} />Tô lại</button>
      </div>

      <style>{caStyles}</style>
    </div>
  );
};

const caStyles = `
  .ca-shell{min-height:100dvh;background:${colors.backgroundBase};padding:16px 16px 32px;max-width:560px;margin:0 auto;padding-top:max(16px, env(safe-area-inset-top))}
  .ca-topbar{display:flex;align-items:center;gap:10px;margin-bottom:10px}
  .ca-icon-btn{width:44px;height:44px;border:none;border-radius:14px;background:${colors.warmWhite};box-shadow:0 4px 0 rgba(26,39,68,.10);cursor:pointer;display:grid;place-items:center;color:${colors.deepSlate}}
  .ca-topic-chip{display:inline-flex;align-items:center;gap:6px;font-family:${DISPLAY_FONT};font-weight:800;font-size:.85rem;background:${colors.warmWhite};border-radius:999px;padding:8px 14px;box-shadow:0 3px 0 rgba(26,39,68,.08)}
  .ca-moves{margin-left:auto;font-family:${DISPLAY_FONT};font-weight:900;font-size:.9rem;color:${colors.mediumGray}}
  .ca-guide{text-align:center;font-size:.92rem;color:${colors.mediumGray};margin:4px 0 14px}
  .ca-picker{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px}
  .ca-pick{border:none;border-radius:20px;background:${colors.warmWhite};box-shadow:0 6px 0 rgba(26,39,68,.08),0 10px 18px rgba(26,39,68,.08);padding:10px;cursor:pointer;transition:transform .18s cubic-bezier(.34,1.56,.64,1);display:flex;flex-direction:column;align-items:center}
  .ca-pick:hover{transform:translateY(-3px)}
  .ca-pick svg{width:100%;height:auto}
  .ca-pick b{font-family:${DISPLAY_FONT};font-weight:900;font-size:.95rem;color:${colors.deepSlate}}
  .ca-pick small{font-size:.75rem;color:${colors.grayLight}}
  .ca-stage{background:#fff;border-radius:24px;box-shadow:${shadows.clayCard};padding:12px}
  .ca-stage svg{display:block;width:100%;height:auto}
  .cr{cursor:pointer;transition:fill .25s ease}
  .ca-palette{display:grid;grid-template-columns:repeat(8,1fr);gap:8px;margin-top:12px}
  .ca-pal{aspect-ratio:1;border-radius:14px;cursor:pointer;border:3px solid transparent;box-shadow:0 4px 0 rgba(26,39,68,.12),inset 0 2px 0 rgba(255,255,255,.5);transition:transform .18s cubic-bezier(.34,1.56,.64,1),border-color .2s}
  .ca-pal:hover{transform:translateY(-2px)}
  .ca-pal.ca-sel{border-color:${colors.deepSlate};transform:translateY(-2px) scale(1.06)}
  .ca-hint{font-size:.85rem;color:${colors.mediumGray};text-align:center;min-height:1.3em;margin-top:8px}
  .ca-done{display:flex;align-items:center;gap:8px;border-radius:16px;background:${colors.mintLight};border:2px solid ${colors.mintGreen};padding:10px 14px;font-size:.88rem;font-weight:700;color:${colors.deepSlate};margin-top:6px}
  .ca-btn{display:inline-flex;align-items:center;gap:6px;border:none;cursor:pointer;border-radius:14px;padding:10px 16px;font-family:${DISPLAY_FONT};font-weight:800;font-size:.82rem;background:${withOpacity(colors.skyBlue, 0.3)};color:${colors.deepSlate};box-shadow:0 4px 0 ${colors.skyDark}}
  @media (prefers-reduced-motion: reduce){.ca-pick,.ca-pal{transition:none}}
`;

export default ColorAnimalGame;
