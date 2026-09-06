/**
 * DragMatchGame — "Ghép hình ↔ từ" (topic-based, real vocab)
 *
 * Rebuild 2026-09-05 per approved design (docs/design/games-stickers-mockup.html):
 * - Two columns: IMAGE cards (game-card asset) ↔ WORD chips — matches the
 *   original spec "Kéo thả: Ghép hình ảnh vào đúng từ vựng".
 * - Vocabulary comes from GET /api/v1/games/vocab?topic=... (notebook words
 *   first, seed fallback — never empty).
 * - Tap-to-select (touch friendly for age 5-8); drag still works via the
 *   same tap-pairing state machine.
 * - Completion awards XP through POST /gamification/xp-event with an
 *   idempotent event_id (max 1 award per game per day) — client never
 *   decides XP amounts.
 * - Claymorphic tokens throughout; copy in Vietnamese, Lexi's voice.
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
  speakWord,
  GAME_TOPICS,
  type GameVocabItem,
  type GameTopic,
} from '@/services/gamesVocabService';
import { useAuth } from '@/contexts/AuthContext';
import { ClayBurst3D } from '@/shared/components/ClayBurst3D';

const DISPLAY_FONT = "'Nunito', sans-serif";

interface Card extends GameVocabItem {
  id: string;
}

type Phase = 'LOADING' | 'PLAYING' | 'SUCCESS' | 'EMPTY';

const Msr: React.FC<{ icon: string; size?: number; color?: string; style?: React.CSSProperties }> = ({
  icon, size = 20, color, style,
}) => (
  <span aria-hidden="true" className="msr" style={{ fontSize: size, color, ...style }}>{icon}</span>
);

const EmptyTopic: React.FC<{ onBack: () => void }> = ({ onBack }) => (
  <div className="dm-shell">
    <ClayCard style={{ padding: 28, textAlign: 'center', maxWidth: 420 }}>
      <Msr icon="sentiment_satisfied" size={40} color={colors.sunshineDark ?? colors.sunshineYellow} />
      <h2 style={{ fontFamily: DISPLAY_FONT, fontWeight: 900, margin: '10px 0 6px' }}>Chủ đề đang cập nhật</h2>
      <p style={{ fontSize: 14, color: colors.mediumGray }}>
        Lexi đang chuẩn bị thêm từ cho chủ đề này. Con quay lại sau nhé!
      </p>
      <button onClick={onBack} className="dm-back-btn" style={{ marginTop: 16 }}>Về màn hình chính</button>
    </ClayCard>
  </div>
);

export const DragMatchGame: React.FC = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const topic: GameTopic | null = useMemo(() => normalizeGameTopic(params.get('topic')), [params]);

  const [phase, setPhase] = useState<Phase>('LOADING');
  const [cards, setCards] = useState<Card[]>([]);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [shakeWord, setShakeWord] = useState<string | null>(null);
  const [mismatches, setMismatches] = useState(0);
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
        const items = (data.items ?? []).map((it, i) => ({ ...it, id: `${it.word}-${i}` }));
        if (items.length < 3) { setPhase('EMPTY'); return; }
        setCards(items);
        setPhase('PLAYING');
      })
      .catch(() => alive && setError('Không tải được từ vựng — kiểm tra mạng rồi thử lại nhé.'));
    return () => { alive = false; };
  }, [topic]);

  const shuffledWords = useMemo(
    () => [...cards].sort(() => Math.random() - 0.5),
    [cards],
  );

  const complete = matched.size === cards.length && cards.length > 0;

  const awardXp = useCallback(async () => {
    if (!user?.id) return;
    const res = await awardGameComplete(user.id, 'drag_match');
    setXpAwarded(res.xp_awarded);
  }, [user?.id]);

  useEffect(() => {
    if (complete) void awardXp();
  }, [complete, awardXp]);

  const tryMatch = (card: Card) => {
    if (!selectedWord || matched.has(card.id)) return;
    if (selectedWord === card.word) {
      setMatched((m) => new Set(m).add(card.id));
      setSelectedWord(null);
    } else {
      setMismatches((n) => n + 1);
      setShakeWord(selectedWord);
      setTimeout(() => { setShakeWord(null); setSelectedWord(null); }, 450);
    }
  };

  if (error) {
    return (
      <div className="dm-shell">
        <ClayCard style={{ padding: 28, textAlign: 'center', maxWidth: 420 }}>
          <p style={{ fontSize: 15, fontWeight: 700 }}>{error}</p>
          <button onClick={() => window.location.reload()} className="dm-back-btn" style={{ marginTop: 14 }}>Thử lại</button>
        </ClayCard>
      </div>
    );
  }
  if (phase === 'EMPTY') return <EmptyTopic onBack={() => navigate('/games')} />;
  if (phase === 'LOADING') {
    return (
      <div className="dm-shell">
        <div className="dm-skeleton" aria-label="Đang tải">
          {[0, 1, 2, 3].map((i) => <div key={i} className="dm-skel-row" />)}
        </div>
      </div>
    );
  }

  if (phase === 'SUCCESS' || complete) {
    return (
      <div className="dm-shell dm-success">
        <ClayBurst3D show />
        <ClayCard style={{ padding: 32, textAlign: 'center', maxWidth: 440 }}>
          <CodexPetSprite animationState="jumping" label="Lexi nhảy mừng" size={130} />
          <h2 style={{ fontFamily: DISPLAY_FONT, fontWeight: 900, fontSize: 24, margin: '8px 0 4px' }}>
            Con ghép giỏi lắm!
          </h2>
          <p style={{ fontSize: 15, color: colors.mediumGray }}>
            Ghép đúng {cards.length} cặp{mismatches > 0 ? ` · ${mismatches} lần nhầm (không sao cả!)` : ' · chính xác tuyệt đối'}
          </p>
          <div
            className="dm-xp-chip"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 14,
              background: withOpacity(colors.sunshineYellow, 0.55), borderRadius: 16, padding: '10px 18px',
              boxShadow: shadows.claySm, fontFamily: DISPLAY_FONT, fontWeight: 900,
            }}
          >
            <Msr icon="bolt" size={18} color={colors.sunshineDark ?? colors.sunshineYellow} />
            {xpAwarded === null ? 'Đang nhận phần thưởng…' : xpAwarded > 0 ? `+${xpAwarded} XP` : 'Hôm nay đã nhận XP game này rồi — mai chơi tiếp nhé!'}
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 18, flexWrap: 'wrap' }}>
            <button className="dm-back-btn" onClick={() => { setMatched(new Set()); setMismatches(0); setXpAwarded(null); setPhase('PLAYING'); }}>
              Chơi lại
            </button>
            <button className="dm-back-btn dm-back-btn--primary" onClick={() => navigate('/games')}>Về Khu chơi</button>
          </div>
        </ClayCard>
      </div>
    );
  }

  return (
    <div className="dm-shell">
      <div className="dm-topbar">
        <button className="dm-icon-btn" onClick={() => navigate('/games')} aria-label="Về Khu chơi">
          <Msr icon="arrow_back" size={20} />
        </button>
        <div className="dm-topic-chip">
          <Msr icon="category" size={16} color={colors.skyDark ?? colors.skyBlue} />
          {topicLabel} · {cards.length} từ
        </div>
        <div className="dm-progress" aria-label={`Đã ghép ${matched.size} trên ${cards.length}`}>
          <span style={{ width: `${(matched.size / cards.length) * 100}%` }} />
        </div>
      </div>

      <p className="dm-guide">Chạm một hình, rồi chạm từ đúng của nó nhé!</p>

      <div className="dm-board">
        <div className="dm-col">
          {cards.map((card) => {
            const done = matched.has(card.id);
            return (
              <button
                key={`img-${card.id}`}
                className={`dm-img-card ${done ? 'dm-done' : ''}`}
                onClick={() => { if (!done) { setSelectedWord(card.word); speakWord(card); } }}
                disabled={done}
                aria-label={`Hình: ${card.word}`}
              >
                <img src={card.image_url} alt="" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.25'; }} />
                {done && <Msr icon="check_circle" size={22} color="#4C8A2A" style={{ position: 'absolute', top: 6, right: 6 }} />}
              </button>
            );
          })}
        </div>
        <div className="dm-col">
          {shuffledWords.map((card) => {
            const done = matched.has(card.id);
            const shaking = shakeWord === card.word;
            return (
              <button
                key={`w-${card.id}`}
                className={`dm-word-card ${done ? 'dm-done' : ''} ${shaking ? 'dm-shake' : ''} ${selectedWord === card.word ? 'dm-sel' : ''}`}
                onClick={() => tryMatch(card)}
                disabled={done}
                aria-pressed={selectedWord === card.word}
              >
                {card.word}
              </button>
            );
          })}
        </div>
      </div>

      <style>{`
        .dm-shell{min-height:100dvh;background:${colors.backgroundBase};padding:16px 16px 32px;max-width:560px;margin:0 auto;padding-top:max(16px, env(safe-area-inset-top))}
        .dm-topbar{display:flex;align-items:center;gap:10px;margin-bottom:10px}
        .dm-icon-btn{width:44px;height:44px;border:none;border-radius:14px;background:${colors.warmWhite};box-shadow:0 4px 0 rgba(26,39,68,.10);cursor:pointer;display:grid;place-items:center;color:${colors.deepSlate}}
        .dm-topic-chip{display:inline-flex;align-items:center;gap:6px;font-family:${DISPLAY_FONT};font-weight:800;font-size:.85rem;background:${colors.warmWhite};border-radius:999px;padding:8px 14px;box-shadow:0 3px 0 rgba(26,39,68,.08)}
        .dm-progress{flex:1;height:10px;border-radius:999px;background:rgba(26,39,68,.08);overflow:hidden}
        .dm-progress span{display:block;height:100%;border-radius:999px;background:${colors.mintGreen};transition:width .35s cubic-bezier(.34,1.56,.64,1)}
        .dm-guide{text-align:center;font-size:.9rem;color:${colors.mediumGray};margin:2px 0 14px}
        .dm-board{display:grid;grid-template-columns:1fr 1fr;gap:12px}
        .dm-col{display:flex;flex-direction:column;gap:10px}
        .dm-img-card{position:relative;border:3px solid transparent;border-radius:20px;background:#fff;box-shadow:0 6px 0 rgba(26,39,68,.08),0 10px 18px rgba(26,39,68,.08);padding:10px;cursor:pointer;min-height:96px;display:grid;place-items:center;transition:transform .18s cubic-bezier(.34,1.56,.64,1),border-color .2s}
        .dm-img-card:active{transform:scale(.97)}
        .dm-img-card img{width:100%;max-width:120px;aspect-ratio:1;object-fit:cover;border-radius:14px;transition:opacity .3s}
        .dm-word-card{border:3px solid transparent;border-radius:18px;background:${colors.warmWhite};box-shadow:0 5px 0 rgba(26,39,68,.10);padding:18px 10px;font-family:${DISPLAY_FONT};font-weight:900;font-size:1rem;color:${colors.deepSlate};cursor:pointer;min-height:56px;transition:transform .18s cubic-bezier(.34,1.56,.64,1),border-color .2s,background .2s}
        .dm-sel{border-color:${colors.skyBlue};background:${withOpacity(colors.skyBlue, 0.18)}}
        .dm-done{border-color:${colors.mintGreen};background:${colors.mintLight};opacity:.85;cursor:default}
        .dm-shake{animation:dmshake .4s ease}
        @keyframes dmshake{0%,100%{transform:translateX(0)}20%{transform:translateX(-6px)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}
        .dm-back-btn{border:none;border-radius:16px;padding:12px 20px;font-family:${DISPLAY_FONT};font-weight:800;font-size:.9rem;background:${withOpacity(colors.skyBlue, 0.3)};color:${colors.deepSlate};cursor:pointer;box-shadow:0 4px 0 ${colors.skyDark}}
        .dm-back-btn--primary{background:linear-gradient(145deg,${colors.sunshineYellowLight},${colors.sunshineYellow});box-shadow:0 5px 0 ${colors.sunshineDark}}
        .dm-skel-row{height:96px;border-radius:20px;background:linear-gradient(90deg,rgba(26,39,68,.06),rgba(26,39,68,.12),rgba(26,39,68,.06));background-size:200% 100%;animation:dmsweep 1.2s infinite}
        @keyframes dmsweep{to{background-position:-200% 0}}
        @media (prefers-reduced-motion: reduce){.dm-shake,.dm-skel-row{animation:none}.dm-img-card,.dm-word-card,.dm-progress span{transition:none}}
      `}</style>
    </div>
  );
};

export default DragMatchGame;
