/**
 * MemoryPairsGame — "Tìm cặp hình ↔ từ" (topic-based, real vocab)
 *
 * Rebuild 2026-09-05 per approved design:
 * - 4×4 grid (8 pairs) of IMAGE tiles ↔ WORD tiles — spec: "Tìm hình ảnh
 *   và từ tương ứng". Adaptive 3×4 when fewer words are available.
 * - Vocab from GET /api/v1/games/vocab?topic=... (notebook first, seed fill).
 * - Card flip via CSS 3D perspective (transform-only, cheap on mobile).
 * - Tapping an image tile speaks the word (passive reinforcement).
 * - Completion → idempotent XP via /gamification/xp-event (1/game/day).
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ClayCard } from '@/shared/components/clay/ClayCard';
import { colors, shadows, withOpacity } from '@/design-tokens/claymorphic';
import { CodexPetSprite } from '@/features/pets/components';
import {
  fetchGameVocab,
  awardGameComplete,
  normalizeGameTopic,
  GAME_TOPICS,
  type GameVocabItem,
  type GameTopic,
} from '@/services/gamesVocabService';
import { useAuth } from '@/contexts/AuthContext';
import { ClayBurst3D } from '@/shared/components/ClayBurst3D';

const DISPLAY_FONT = "'Nunito', sans-serif";

interface Pair extends GameVocabItem {
  id: string;
}

interface Tile {
  key: string;
  pairId: string;
  kind: 'image' | 'word';
}

type Phase = 'LOADING' | 'PLAYING' | 'SUCCESS' | 'EMPTY';

const Msr: React.FC<{ icon: string; size?: number; color?: string; style?: React.CSSProperties }> = ({
  icon, size = 20, color, style,
}) => (
  <span aria-hidden="true" className="msr" style={{ fontSize: size, color, ...style }}>{icon}</span>
);

function buildTiles(pairs: Pair[]): Tile[] {
  const tiles: Tile[] = [];
  pairs.forEach((p) => {
    tiles.push({ key: `img-${p.id}`, pairId: p.id, kind: 'image' });
    tiles.push({ key: `w-${p.id}`, pairId: p.id, kind: 'word' });
  });
  return tiles.sort(() => Math.random() - 0.5);
}

export const MemoryPairsGame: React.FC = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const topic: GameTopic | null = useMemo(() => normalizeGameTopic(params.get('topic')), [params]);

  const [phase, setPhase] = useState<Phase>('LOADING');
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [flipped, setFlipped] = useState<Tile[]>([]);
  const [matchedIds, setMatchedIds] = useState<Set<string>>(new Set());
  const [moves, setMoves] = useState(0);
  const [xpAwarded, setXpAwarded] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const topicLabel = GAME_TOPICS.find((t) => t.slug === topic)?.label ?? '';

  useEffect(() => {
    if (!topic) { setPhase('EMPTY'); return; }
    let alive = true;
    setPhase('LOADING');
    fetchGameVocab(topic, 8)
      .then((data) => {
        if (!alive) return;
        const ps = (data.items ?? []).map((it, i) => ({ ...it, id: `${it.word}-${i}` })).slice(0, 8);
        if (ps.length < 3) { setPhase('EMPTY'); return; }
        setPairs(ps);
        setTiles(buildTiles(ps));
        setPhase('PLAYING');
      })
      .catch(() => alive && setError('Không tải được từ vựng — kiểm tra mạng rồi thử lại nhé.'));
    return () => { alive = false; };
  }, [topic]);

  const complete = pairs.length > 0 && matchedIds.size === pairs.length;

  const awardXp = useCallback(async () => {
    if (!user?.id) return;
    const res = await awardGameComplete(user.id, 'memory_pairs');
    setXpAwarded(res.xp_awarded);
  }, [user?.id]);

  useEffect(() => {
    if (complete) void awardXp();
  }, [complete, awardXp]);

  const pairById = useMemo(() => new Map(pairs.map((p) => [p.id, p])), [pairs]);

  const flip = (tile: Tile) => {
    if (matchedIds.has(tile.pairId) || flipped.some((f) => f.key === tile.key) || flipped.length >= 2) return;
    const next = [...flipped, tile];
    setFlipped(next);
    if (tile.kind === 'image') {
      const p = pairById.get(tile.pairId);
      if (p) {
        try {
          const u = new SpeechSynthesisUtterance(p.word);
          u.lang = 'en-US'; u.rate = 0.85;
          speechSynthesis.cancel(); speechSynthesis.speak(u);
        } catch { /* silent */ }
      }
    }
    if (next.length === 2) {
      setMoves((m) => m + 1);
      if (next[0].pairId === next[1].pairId) {
        setMatchedIds((s) => new Set(s).add(next[0].pairId));
        setFlipped([]);
      } else {
        setTimeout(() => setFlipped([]), 800);
      }
    }
  };

  const restart = () => {
    setPairs((ps) => { setTiles(buildTiles(ps)); return ps; });
    setMatchedIds(new Set()); setFlipped([]); setMoves(0); setXpAwarded(null);
  };

  if (error) {
    return (
      <div className="mp-shell">
        <ClayCard style={{ padding: 28, textAlign: 'center', maxWidth: 420 }}>
          <p style={{ fontSize: 15, fontWeight: 700 }}>{error}</p>
          <button className="mp-btn" style={{ marginTop: 14 }} onClick={() => window.location.reload()}>Thử lại</button>
        </ClayCard>
      </div>
    );
  }
  if (phase === 'EMPTY') {
    return (
      <div className="mp-shell">
        <ClayCard style={{ padding: 28, textAlign: 'center', maxWidth: 420 }}>
          <h2 style={{ fontFamily: DISPLAY_FONT, fontWeight: 900 }}>Chủ đề đang cập nhật</h2>
          <p style={{ fontSize: 14, color: colors.mediumGray }}>Lexi đang thêm từ cho chủ đề này, quay lại sau nhé!</p>
          <button className="mp-btn" style={{ marginTop: 14 }} onClick={() => navigate('/games')}>Về Khu chơi</button>
        </ClayCard>
      </div>
    );
  }

  if (phase === 'SUCCESS' || complete) {
    return (
      <div className="mp-shell mp-success">
        <ClayBurst3D show />
        <ClayCard style={{ padding: 32, textAlign: 'center', maxWidth: 440 }}>
          <CodexPetSprite animationState="jumping" label="Lexi nhảy mừng" size={130} />
          <h2 style={{ fontFamily: DISPLAY_FONT, fontWeight: 900, fontSize: 24, margin: '8px 0 4px' }}>Bé nhớ siêu lắm!</h2>
          <p style={{ fontSize: 15, color: colors.mediumGray }}>Ghép đủ {pairs.length} cặp trong {moves} lượt</p>
          <div className="mp-xp-chip">
            <Msr icon="bolt" size={18} color={colors.sunshineDark ?? colors.sunshineYellow} />
            {xpAwarded === null ? 'Đang nhận phần thưởng…' : xpAwarded > 0 ? `+${xpAwarded} XP` : 'Hôm nay game này đã nhận XP rồi — mai nhé!'}
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 18, flexWrap: 'wrap' }}>
            <button className="mp-btn" onClick={restart}>Chơi lại</button>
            <button className="mp-btn mp-btn--primary" onClick={() => navigate('/games')}>Về Khu chơi</button>
          </div>
        </ClayCard>
      </div>
    );
  }

  const cols = pairs.length >= 6 ? 4 : 3;

  return (
    <div className="mp-shell">
      <div className="mp-topbar">
        <button className="mp-icon-btn" onClick={() => navigate('/games')} aria-label="Về Khu chơi"><Msr icon="arrow_back" size={20} /></button>
        <div className="mp-topic-chip"><Msr icon="category" size={16} color={colors.skyDark ?? colors.skyBlue} />{topicLabel} · {pairs.length} cặp</div>
        <div className="mp-moves">Lượt: {moves}</div>
      </div>
      <p className="mp-guide">Lật hai thẻ — tìm hình và từ là một cặp nhé!</p>
      <div className="mp-grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }} role="grid" aria-label="Bàn tìm cặp">
        {tiles.map((tile) => {
          const isMatched = matchedIds.has(tile.pairId);
          const isFlipped = flipped.some((f) => f.key === tile.key);
          const pair = pairById.get(tile.pairId)!;
          const face = isFlipped || isMatched;
          return (
            <button
              key={tile.key}
              className={`mp-tile ${isMatched ? 'mp-matched' : ''}`}
              onClick={() => flip(tile)}
              aria-label={face ? (tile.kind === 'image' ? `Hình ${pair.word}` : `Từ ${pair.word}`) : 'Thẻ úp'}
              aria-pressed={face}
            >
              <span className={`mp-flip ${face ? 'mp-face' : ''}`}>
                <span className="mp-face mp-back"><Msr icon="pets" size={22} /></span>
                {tile.kind === 'image' ? (
                  <span className="mp-face mp-front mp-front-img">
                    <img src={pair.image_url} alt="" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.25'; }} />
                  </span>
                ) : (
                  <span className="mp-face mp-front mp-front-word">{pair.word}</span>
                )}
              </span>
              {isMatched && <Msr icon="check_circle" size={18} color="#4C8A2A" style={{ position: 'absolute', top: 4, right: 4 }} />}
            </button>
          );
        })}
      </div>
      <style>{`
        .mp-shell{min-height:100dvh;background:${colors.backgroundBase};padding:16px 16px 32px;max-width:560px;margin:0 auto;padding-top:max(16px, env(safe-area-inset-top))}
        .mp-topbar{display:flex;align-items:center;gap:10px;margin-bottom:10px}
        .mp-icon-btn{width:44px;height:44px;border:none;border-radius:14px;background:${colors.warmWhite};box-shadow:0 4px 0 rgba(26,39,68,.10);cursor:pointer;display:grid;place-items:center;color:${colors.deepSlate}}
        .mp-topic-chip{display:inline-flex;align-items:center;gap:6px;font-family:${DISPLAY_FONT};font-weight:800;font-size:.85rem;background:${colors.warmWhite};border-radius:999px;padding:8px 14px;box-shadow:0 3px 0 rgba(26,39,68,.08)}
        .mp-moves{margin-left:auto;font-family:${DISPLAY_FONT};font-weight:900;font-size:.9rem;color:${colors.mediumGray}}
        .mp-guide{text-align:center;font-size:.9rem;color:${colors.mediumGray};margin:2px 0 14px}
        .mp-grid{display:grid;gap:9px}
        .mp-tile{position:relative;aspect-ratio:1;border:none;background:transparent;padding:0;cursor:pointer;perspective:600px}
        .mp-flip{position:absolute;inset:0;transform-style:preserve-3d;transition:transform .45s cubic-bezier(.34,1.3,.64,1)}
        .mp-flip.mp-face{transform:rotateY(180deg)}
        .mp-face{position:absolute;inset:0;backface-visibility:hidden;border-radius:16px;display:grid;place-items:center;font-family:${DISPLAY_FONT};font-weight:900;font-size:.8rem;color:${colors.deepSlate}}
        .mp-back{background:${colors.skyBlue};box-shadow:0 4px 0 ${colors.skyDark},inset 0 2px 0 rgba(255,255,255,.5)}
        .mp-back .msr{color:#fff;font-size:22px}
        .mp-front{transform:rotateY(180deg);background:#fff;box-shadow:0 4px 0 rgba(26,39,68,.10)}
        .mp-front-img img{width:82%;height:82%;object-fit:cover;border-radius:12px}
        .mp-front-word{background:${colors.warmWhite};padding:6px;text-align:center}
        .mp-matched .mp-front{background:${colors.mintLight};box-shadow:0 4px 0 rgba(125,199,96,.4);opacity:.9}
        .mp-btn{border:none;border-radius:16px;padding:12px 20px;font-family:${DISPLAY_FONT};font-weight:800;font-size:.9rem;background:${withOpacity(colors.skyBlue, 0.3)};color:${colors.deepSlate};cursor:pointer;box-shadow:0 4px 0 ${colors.skyDark}}
        .mp-btn--primary{background:linear-gradient(145deg,${colors.sunshineYellowLight},${colors.sunshineYellow});box-shadow:0 5px 0 ${colors.sunshineDark}}
        .mp-xp-chip{display:inline-flex;align-items:center;gap:8px;margin-top:14px;background:${withOpacity(colors.sunshineYellow, 0.55)};border-radius:16px;padding:10px 18px;box-shadow:${shadows.claySm};font-family:${DISPLAY_FONT};font-weight:900}
        @media (prefers-reduced-motion: reduce){.mp-flip{transition:none}}
      `}</style>
    </div>
  );
};

export default MemoryPairsGame;
