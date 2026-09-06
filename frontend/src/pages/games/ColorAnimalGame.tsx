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
import { colors, shadows, withOpacity } from '@/design-tokens/claymorphic';
import { awardGameComplete } from '@/services/gamesVocabService';
import { normalizeGameTopic, topicBackgroundUrl } from '@/services/gamesVocabService';
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
  svg: React.ReactElement;
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
  {
    word: 'pig', nameVi: 'heo', regions: ['bg', 'body', 'head', 'earL', 'earR', 'tail'],
    svg: (<>
      <rect {...th('bg')} x="6" y="6" width="208" height="178" rx="18" {...S} strokeWidth={3} />
      <ellipse {...th('body')} cx="100" cy="115" rx="60" ry="44" {...S} />
      <path {...th('tail')} d="M158 96 q22 -4 18 -22 q-2 -10 -12 -8" fill="none" strokeWidth={7} stroke={STROKE} strokeLinecap="round" />
      <ellipse {...th('earL')} cx="62" cy="66" rx="13" ry="18" {...S} />
      <ellipse {...th('earR')} cx="128" cy="64" rx="13" ry="18" {...S} />
      <circle {...th('head')} cx="95" cy="76" r="36" {...S} />
      <ellipse cx="95" cy="90" rx="17" ry="12" {...S} />
      <circle cx="89" cy="90" r="3" fill={STROKE} />
      <circle cx="101" cy="90" r="3" fill={STROKE} />
      <circle cx="80" cy="70" r="4" fill={STROKE} />
      <circle cx="110" cy="70" r="4" fill={STROKE} />
    </>),
  },
  {
    word: 'cow', nameVi: 'bò', regions: ['bg', 'body', 'head', 'earL', 'earR', 'legs', 'udder'],
    svg: (<>
      <rect {...th('bg')} x="6" y="6" width="208" height="178" rx="18" {...S} strokeWidth={3} />
      <ellipse {...th('body')} cx="100" cy="112" rx="62" ry="42" {...S} />
      <rect {...th('legs')} x="56" y="140" width="17" height="32" rx="7" {...S} />
      <rect {...th('legs')} x="122" y="140" width="17" height="32" rx="7" {...S} />
      <path {...th('udder')} d="M126 140 q14 16 30 4 q-4 14 -22 12 q-10-2-8-16z" {...S} />
      <circle {...th('head')} cx="52" cy="72" r="34" {...S} />
      <ellipse {...th('earL')} cx="24" cy="56" rx="12" ry="9" {...S} />
      <ellipse {...th('earR')} cx="80" cy="56" rx="12" ry="9" {...S} />
      <ellipse cx="52" cy="90" rx="14" ry="10" {...S} />
      <circle cx="46" cy="90" r="3" fill={STROKE} />
      <circle cx="58" cy="90" r="3" fill={STROKE} />
      <circle cx="40" cy="64" r="4" fill={STROKE} />
      <circle cx="64" cy="64" r="4" fill={STROKE} />
    </>),
  },
  {
    word: 'horse', nameVi: 'ngựa', regions: ['bg', 'body', 'head', 'legs', 'tail', 'mane'],
    svg: (<>
      <rect {...th('bg')} x="6" y="6" width="208" height="178" rx="18" {...S} strokeWidth={3} />
      <ellipse {...th('body')} cx="105" cy="108" rx="58" ry="40" {...S} />
      <path {...th('mane')} d="M138 84 q14 -14 6 -30 q16 8 14 26" fill="none" strokeWidth={10} stroke={STROKE} strokeLinecap="round" />
      <path {...th('tail')} d="M162 100 q26 6 22 36" fill="none" strokeWidth={9} stroke={STROKE} strokeLinecap="round" />
      <rect {...th('legs')} x="60" y="134" width="15" height="40" rx="6" {...S} />
      <rect {...th('legs')} x="96" y="136" width="15" height="40" rx="6" {...S} />
      <rect {...th('legs')} x="130" y="136" width="15" height="40" rx="6" {...S} />
      <circle {...th('head')} cx="148" cy="66" r="26" {...S} />
      <ellipse cx="148" cy="76" rx="10" ry="7" {...S} />
      <circle cx="140" cy="60" r="3.5" fill={STROKE} />
      <circle cx="158" cy="60" r="3.5" fill={STROKE} />
    </>),
  },
  {
    word: 'sheep', nameVi: 'cừu', regions: ['bg', 'wool', 'head', 'earL', 'earR', 'legs', 'tail'],
    svg: (<>
      <rect {...th('bg')} x="6" y="6" width="208" height="178" rx="18" {...S} strokeWidth={3} />
      <path {...th('wool')} d="M56 96 q-8-22 16-24 q2-20 24-16 q10-16 28-8 q20-6 26 12 q20 4 14 24 q14 14-2 28 q4 20-18 22 q-8 16-26 10 q-16 12-30 0 q-20 4-24-14 q-18-6-8-34z" {...S} />
      <circle {...th('head')} cx="60" cy="100" r="24" {...S} />
      <ellipse {...th('earL')} cx="42" cy="86" rx="11" ry="8" {...S} />
      <ellipse {...th('earR')} cx="46" cy="114" rx="11" ry="8" {...S} />
      <rect {...th('legs')} x="90" y="138" width="13" height="28" rx="6" {...S} />
      <rect {...th('legs')} x="134" y="138" width="13" height="28" rx="6" {...S} />
      <path {...th('tail')} d="M158 118 q16 2 12 16" fill="none" strokeWidth={7} stroke={STROKE} strokeLinecap="round" />
      <circle cx="54" cy="96" r="3.5" fill={STROKE} />
      <circle cx="70" cy="96" r="3.5" fill={STROKE} />
    </>),
  },
  {
    word: 'owl', nameVi: 'cú', regions: ['bg', 'body', 'head', 'earL', 'earR', 'wingL', 'wingR'],
    svg: (<>
      <rect {...th('bg')} x="6" y="6" width="208" height="178" rx="18" {...S} strokeWidth={3} />
      <path d="M78 48 l4 -18 14 12 M142 48 l-4 -18 -14 12" fill="none" stroke={STROKE} strokeWidth="3" strokeLinecap="round" />
      <ellipse {...th('body')} cx="110" cy="110" rx="52" ry="56" {...S} />
      <circle {...th('head')} cx="110" cy="66" r="38" {...S} />
      <path {...th('earL')} d="M78 42 l6 -24 18 16z" {...S} />
      <path {...th('earR')} d="M142 42 l-6 -24 -18 16z" {...S} />
      <ellipse {...th('wingL')} cx="76" cy="112" rx="18" ry="34" {...S} />
      <ellipse {...th('wingR')} cx="144" cy="112" rx="18" ry="34" {...S} />
      <circle cx="94" cy="60" r="7" {...S} strokeWidth={3} />
      <circle cx="126" cy="60" r="7" {...S} strokeWidth={3} />
      <circle cx="94" cy="60" r="2.5" fill={STROKE} />
      <circle cx="126" cy="60" r="2.5" fill={STROKE} />
      <path d="M106 74 l4 6 4-6" fill="none" stroke={STROKE} strokeWidth="3" strokeLinecap="round" />
      <path d="M96 92 q14 10 28 0" stroke={STROKE} strokeWidth="2.5" fill="none" strokeLinecap="round" opacity=".6" />
    </>),
  },
  {
    word: 'penguin', nameVi: 'chim cánh cụt', regions: ['bg', 'body', 'wingL', 'wingR', 'belly'],
    svg: (<>
      <rect {...th('bg')} x="6" y="6" width="208" height="178" rx="18" {...S} strokeWidth={3} />
      <ellipse {...th('body')} cx="110" cy="102" rx="48" ry="62" {...S} />
      <ellipse {...th('belly')} cx="110" cy="114" rx="32" ry="44" {...S} />
      <ellipse {...th('wingL')} cx="62" cy="102" rx="12" ry="34" {...S} />
      <ellipse {...th('wingR')} cx="158" cy="102" rx="12" ry="34" {...S} />
      <circle cx="94" cy="72" r="4.5" fill={STROKE} />
      <circle cx="126" cy="72" r="4.5" fill={STROKE} />
      <path d="M102 84 l8 6 8-6z" fill="#FFD93D" stroke={STROKE} strokeWidth={3} />
      <path d="M84 164 l8 -10 M136 164 l-8 -10" stroke={STROKE} strokeWidth="3" strokeLinecap="round" />
    </>),
  },
  {
    word: 'dolphin', nameVi: 'cá heo', regions: ['bg', 'body', 'finTop', 'tail', 'finSide', 'belly'],
    svg: (<>
      <rect {...th('bg')} x="6" y="6" width="208" height="178" rx="18" {...S} strokeWidth={3} />
      <path {...th('body')} d="M40 104 q30 -46 86 -40 q40 4 52 34 q-24 34 -70 36 q-46 2 -68 -30z" {...S} />
      <path {...th('finTop')} d="M104 64 q10 -26 34 -24 q-6 16 -18 26z" {...S} />
      <path {...th('tail')} d="M176 96 l28 -16 -8 22 8 20z" {...S} />
      <path {...th('finSide')} d="M96 112 q8 22 28 22 q-16 8 -34 -4z" {...S} />
      <path {...th('belly')} d="M58 122 q40 22 96 6" fill="none" strokeWidth={6} stroke={STROKE} strokeLinecap="round" opacity=".6" />
      <circle cx="58" cy="88" r="4.5" fill={STROKE} />
      <path d="M44 100 q8 6 18 6" stroke={STROKE} strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </>),
  },
  {
    word: 'crab', nameVi: 'cua', regions: ['bg', 'body', 'clawL', 'clawR', 'legL', 'legR'],
    svg: (<>
      <rect {...th('bg')} x="6" y="6" width="208" height="178" rx="18" {...S} strokeWidth={3} />
      <ellipse {...th('body')} cx="110" cy="104" rx="54" ry="38" {...S} />
      <path {...th('clawL')} d="M58 84 q-28 -8 -34 -30 q22 -4 34 14 q6 8 0 16z" {...S} />
      <path {...th('clawR')} d="M162 84 q28 -8 34 -30 q-22 -4 -34 14 q-6 8 0 16z" {...S} />
      <path {...th('legL')} d="M74 130 l-18 26 M96 138 l-8 30" fill="none" strokeWidth={8} stroke={STROKE} strokeLinecap="round" />
      <path {...th('legR')} d="M146 130 l18 26 M124 138 l8 30" fill="none" strokeWidth={8} stroke={STROKE} strokeLinecap="round" />
      <circle cx="88" cy="94" r="6" {...S} strokeWidth={3} />
      <circle cx="132" cy="94" r="6" {...S} strokeWidth={3} />
      <circle cx="88" cy="94" r="2.2" fill={STROKE} />
      <circle cx="132" cy="94" r="2.2" fill={STROKE} />
      <path d="M100 112 q10 8 20 0" stroke={STROKE} strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </>),
  },
  {
    word: 'frog', nameVi: 'ếch', regions: ['bg', 'body', 'head', 'eyeL', 'eyeR', 'legL', 'legR'],
    svg: (<>
      <rect {...th('bg')} x="6" y="6" width="208" height="178" rx="18" {...S} strokeWidth={3} />
      <ellipse {...th('body')} cx="110" cy="118" rx="56" ry="40" {...S} />
      <circle {...th('head')} cx="110" cy="76" r="40" {...S} />
      <circle {...th('eyeL')} cx="82" cy="44" r="17" {...S} />
      <circle {...th('eyeR')} cx="138" cy="44" r="17" {...S} />
      <circle cx="82" cy="46" r="5" fill={STROKE} />
      <circle cx="138" cy="46" r="5" fill={STROKE} />
      <path d="M84 92 q26 18 52 0" fill="none" stroke={STROKE} strokeWidth="4" strokeLinecap="round" />
      <path {...th('legL')} d="M66 140 q-24 14 -10 30 q18 4 26-14" {...S} />
      <path {...th('legR')} d="M154 140 q24 14 10 30 q-18 4-26-14" {...S} />
    </>),
  },
  {
    word: 'snake', nameVi: 'con rắn', regions: ['bg', 'body', 'tongue'],
    svg: (<>
      <rect {...th('bg')} x="6" y="6" width="208" height="178" rx="18" {...S} strokeWidth={3} />
      <path {...th('body')} d="M30 60 q40 -34 74 0 q34 34 68 0 M172 60 q14 -14 28 -6 M172 60 q10 22 -8 30 M64 88 q30 24 66 6 q22 -12 40 4" fill="none" strokeWidth={16} stroke={STROKE} strokeLinecap="round" />
      <circle cx="40" cy="56" r="13" {...S} strokeWidth={3} />
      <circle cx="37" cy="54" r="3" fill={STROKE} />
      <path {...th('tongue')} d="M28 62 q-14 6 -20 2 q8 8 18 6z" fill="#FF6B6B" stroke={STROKE} strokeWidth={2} />
    </>),
  },
];

export const ColorAnimalGame: React.FC = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const themeBg = topicBackgroundUrl(normalizeGameTopic(params.get('topic')));

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

  const handleRegionClick = (region: string) => {
    if (!animal || !selColor) { setHint('Chạm một ô màu trước đã nhé!'); return; }
    setFilled((f) => ({ ...f, [region]: selColor.hex }));
  };

  /* ── Animal picker ── */
  if (!animal) {
    return (
      <div className="ca-shell">
        {themeBg && (
          <div
            aria-hidden="true"
            style={{
              height: 118, margin: '-16px -16px 12px', borderRadius: '0 0 26px 26px',
              backgroundImage: `linear-gradient(rgba(255,248,238,0.45),rgba(255,248,238,1)), url(${themeBg})`,
              backgroundSize: 'cover', backgroundPosition: 'center',
            }}
          />
        )}
        <div className="ca-topbar">
          <button className="ca-icon-btn" onClick={() => navigate('/games')} aria-label="Về Khu chơi"><Msr icon="arrow_back" size={20} /></button>
          <div className="ca-topic-chip"><Msr icon="brush" size={16} color={colors.coralLight} />Tô màu con vật</div>
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
        <div className="ca-topic-chip"><Msr icon="brush" size={16} color={colors.coralLight} />{animal.word} · {animal.nameVi}</div>
        <div className="ca-moves">{doneCount}/{requiredRegions.length} vùng</div>
      </div>

      <div className="ca-stage">
        <svg
          viewBox="0 0 220 190"
          role="img"
          aria-label={`Tô màu ${animal.nameVi}`}
          style={{ touchAction: 'none' }}
          onPointerDown={(e) => {
            e.preventDefault();
            const el = document.elementFromPoint(e.clientX, e.clientY) as SVGElement | null;
            const region = el?.getAttribute?.('data-region');
            if (region) handleRegionClick(region);
          }}
        >
          {React.Children.map(animal.svg.props.children as React.ReactNode, (child) => {
            if (!React.isValidElement(child)) return child;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const childProps = child.props as any;
            const region = childProps['data-region'];
            if (!region || !filled[region]) return child;
            const stroke = region === 'trunk' || region === 'tail' ? filled[region] : childProps.stroke;
            return React.cloneElement(child as React.ReactElement<{ fill?: string; stroke?: string }>, {
              fill: filled[region],
              stroke,
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
  .ca-shell{min-height:100dvh;background:${colors.backgroundBase};padding:16px 16px 32px;max-width:560px;margin:0 auto;padding-top:max(16px, env(safe-area-inset-top));touch-action:manipulation;-webkit-user-select:none;user-select:none}
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
  .ca-palette{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:12px;max-width:360px;margin-left:auto;margin-right:auto;width:100%}
  .ca-pal{aspect-ratio:1;border-radius:14px;cursor:pointer;border:3px solid transparent;box-shadow:0 4px 0 rgba(26,39,68,.12),inset 0 2px 0 rgba(255,255,255,.5);transition:transform .18s cubic-bezier(.34,1.56,.64,1),border-color .2s}
  .ca-pal:hover{transform:translateY(-2px)}
  .ca-pal.ca-sel{border-color:${colors.deepSlate};transform:translateY(-2px) scale(1.06)}
  .ca-hint{font-size:.85rem;color:${colors.mediumGray};text-align:center;min-height:1.3em;margin-top:8px}
  .ca-done{display:flex;align-items:center;gap:8px;border-radius:16px;background:${colors.mintLight};border:2px solid ${colors.mintGreen};padding:10px 14px;font-size:.88rem;font-weight:700;color:${colors.deepSlate};margin-top:6px}
  .ca-btn{display:inline-flex;align-items:center;gap:6px;border:none;cursor:pointer;border-radius:14px;padding:10px 16px;font-family:${DISPLAY_FONT};font-weight:800;font-size:.82rem;background:${withOpacity(colors.skyBlue, 0.3)};color:${colors.deepSlate};box-shadow:0 4px 0 ${colors.skyDark}}
  @media (prefers-reduced-motion: reduce){.ca-pick,.ca-pal{transition:none}}
`;

export default ColorAnimalGame;
