/**
 * GamesPage — "Khu chơi" hub (topic-based, course-aligned)
 *
 * Rebuild 2026-09-05 per approved design: choose a TOPIC first (Animals /
 * Home / Nature / School & Food — momo course themes), then a game.
 * Topic progress = 3 mini-games played today (XP idempotent per game/day,
 * so the daily ceiling is 60 XP). Lexi hero + clay tokens, Vietnamese copy.
 */
import React, { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { colors, shadows, withOpacity } from '@/design-tokens/claymorphic';
import { CodexPetSprite } from '@/features/pets/components';
import { GAME_TOPICS, normalizeGameTopic, topicBackgroundUrl } from '@/services/gamesVocabService';
import { Msr } from '@/shared/components/Msr';

const DISPLAY_FONT = "'Nunito', sans-serif";

type GameSlug = 'drag-match' | 'memory-pairs' | 'color-animal';

const GAMES: { slug: GameSlug; name: string; desc: string; icon: string; bg: string; color: string }[] = [
  { slug: 'drag-match', name: 'Ghép hình — từ', desc: 'Chạm hình và từ đúng cặp', icon: 'extension', bg: colors.skyLight, color: colors.skyDark ?? colors.skyBlue },
  { slug: 'memory-pairs', name: 'Tìm cặp thẻ', desc: 'Lật thẻ ghép hình với từ', icon: 'style', bg: colors.mintLight, color: '#4C8A2A' },
  { slug: 'color-animal', name: 'Tô màu con vật', desc: 'Tô màu và nghe phát âm', icon: 'brush', bg: colors.coralLight, color: colors.coralDark ?? colors.coralPink },
];

const TOPIC_THUMB: Record<string, React.ReactNode> = {
  animals: (<svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="7" r="2.6" fill="#1A2744"/><circle cx="16" cy="7" r="2.6" fill="#1A2744"/><circle cx="4.8" cy="12" r="2.2" fill="#1A2744"/><circle cx="19.2" cy="12" r="2.2" fill="#1A2744"/><path d="M12 11c3.2 0 5.6 2.4 5.6 5 0 2.2-1.8 3.4-5.6 3.4S6.4 18.2 6.4 16c0-2.6 2.4-5 5.6-5z" fill="#1A2744"/></svg>),
  home: (<svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z" fill="#1A2744"/></svg>),
  nature: (<svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 4c-9 0-14 4-14 10 0 2 .8 4 2.2 5.4C9 16 11.5 13 15 11c-3 2.5-5.4 5.8-6.4 9 .9.4 1.9.6 3 .6 5 0 8.4-4.4 8.4-16.6z" fill="#1A2744"/></svg>),
  school_food: (<svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 6a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3h2a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2zm2 0h6a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1zM5 10v9h14v-9z" fill="#1A2744"/></svg>),
};

const TOPIC_TINT: Record<string, string> = {
  animals: colors.skyLight,
  home: colors.coralLight,
  nature: colors.mintLight,
  school_food: colors.sunshineYellowLight,
};

const TOPIC_BAR: Record<string, string> = {
  animals: colors.skyBlue,
  home: colors.coralPink,
  nature: colors.mintGreen,
  school_food: colors.sunshineYellow,
};

/** Tracks "games played today" locally — XP server-side is the authority;
 *  this is a UI hint only and tolerates being wrong (localStorage reset). */
function playedTodayKey(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `eduar_games_played_${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
}

export const GamesPage: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const activeTopic = normalizeGameTopic(params.get('topic'));

  const playedToday = useMemo(() => {
    try { return JSON.parse(localStorage.getItem(playedTodayKey()) || '{}') as Record<string, string[]>; }
    catch { return {}; }
  }, []);

  const totalToday = useMemo(
    () => Object.values(playedToday).reduce((n, arr) => n + arr.length, 0),
    [playedToday],
  );

  const markPlayed = (game: GameSlug) => {
    try {
      const key = playedTodayKey();
      const map = JSON.parse(localStorage.getItem(key) || '{}') as Record<string, string[]>;
      const forTopic = new Set(map[game] ?? []);
      (activeTopic ? [activeTopic] : GAME_TOPICS.map((t) => t.slug)).forEach((t) => forTopic.add(t));
      map[game] = [...forTopic];
      localStorage.setItem(key, JSON.stringify(map));
    } catch { /* UI hint only */ }
  };

  const openGame = (game: GameSlug, topic?: string) => {
    markPlayed(game);
    navigate(`/games/${game}${topic ? `?topic=${topic}` : ''}`);
  };

  return (
    <div className="gsh-shell">
      {/* Lexi hero */}
      <div className="gsh-hero">
        <CodexPetSprite animationState="waving" label="Lexi chào bạn" size={62} />
        <div>
          <b>Chơi cùng Lexi nhé!</b>
          <span>Chọn chủ đề con thích — mỗi game nhận 30 XP</span>
        </div>
      </div>

      <div className="gsh-daily" role="status">
        <Msr icon="local_fire_department" size={18} color={colors.sunshineDark ?? colors.sunshineYellow} />
        Hôm nay: {totalToday}/12 lượt chơi · 3 game × 4 chủ đề
      </div>

      {/* Topic selection */}
      {!activeTopic && (
        <div className="gsh-topics">
          <h2 className="gsh-section-title"><Msr icon="category" size={18} color={colors.skyBlue} /> Chọn chủ đề</h2>
          <div className="gsh-topic-grid">
            {GAME_TOPICS.map((t) => {
              const done = GAMES.filter((g) => (playedToday[g.slug] ?? []).includes(t.slug)).length;
              const bg = topicBackgroundUrl(t.slug);
              return (
                <button
                  key={t.slug}
                  className="gsh-topic"
                  onClick={() => navigate(`/games?topic=${t.slug}`)}
                  aria-label={`Chủ đề ${t.label}`}
                  style={bg ? {
                    backgroundImage: `linear-gradient(rgba(255,251,240,.62),rgba(255,251,240,.78)), url(${bg})`,
                    backgroundSize: 'cover', backgroundPosition: 'center',
                  } : undefined}
                >
                  <span className="gsh-topic-thumb" style={{ background: TOPIC_TINT[t.slug] }}>{TOPIC_THUMB[t.slug]}</span>
                  <b>{t.labelEn}</b>
                  <small>{t.label}</small>
                  <span className="gsh-topic-bar"><i style={{ width: `${(done / GAMES.length) * 100}%`, background: TOPIC_BAR[t.slug] }} /></span>
                  <small className="gsh-topic-done">{done}/3 game hôm nay</small>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Game selection within a topic */}
      {activeTopic && (
        <div className="gsh-games">
          <button className="gsh-switch" onClick={() => navigate('/games')}>
            <Msr icon="arrow_back" size={16} /> Đổi chủ đề
          </button>
          <h2 className="gsh-section-title">
            {TOPIC_THUMB[activeTopic]} {GAME_TOPICS.find((t) => t.slug === activeTopic)?.labelEn}
          </h2>
          <div className="gsh-game-list">
            {GAMES.map((g) => {
              const done = (playedToday[g.slug] ?? []).includes(activeTopic);
              return (
                <button key={g.slug} className="gsh-game-card" onClick={() => openGame(g.slug, activeTopic)}>
                  <span className="gsh-game-icon" style={{ background: g.bg }}>
                    <Msr icon={g.icon} size={26} color={g.color} />
                  </span>
                  <span className="gsh-game-info">
                    <b>{g.name}</b>
                    <small>{g.desc}</small>
                  </span>
                  {done
                    ? <span className="gsh-done-badge"><Msr icon="check_circle" size={18} color="#4C8A2A" />Đã chơi</span>
                    : <Msr icon="chevron_right" size={22} color={colors.lightGray} />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <style>{`
        .gsh-shell{min-height:100dvh;background:${colors.backgroundBase};padding:16px 16px 40px;max-width:560px;margin:0 auto;padding-top:max(16px, env(safe-area-inset-top))}
        .gsh-hero{display:flex;align-items:center;gap:12px;border-radius:24px;padding:14px 18px;background:linear-gradient(135deg,${colors.sunshineYellowLight},${colors.coralLight});box-shadow:${shadows.clayCard}}
        .gsh-hero b{font-family:${DISPLAY_FONT};font-weight:900;display:block;font-size:1.05rem}
        .gsh-hero span{font-size:.8rem;color:${colors.mediumGray}}
        .gsh-daily{display:flex;align-items:center;gap:8px;margin-top:12px;border-radius:16px;padding:10px 14px;background:${colors.warmWhite};box-shadow:${shadows.claySm};font-size:.82rem;font-weight:700;color:${colors.deepSlate}}
        .gsh-section-title{display:flex;align-items:center;gap:8px;font-family:${DISPLAY_FONT};font-weight:900;font-size:1.02rem;margin:18px 0 12px}
        .gsh-topic-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
        .gsh-topic{border:none;border-radius:22px;padding:14px;background:${colors.warmWhite};box-shadow:${shadows.clayCard};cursor:pointer;text-align:left;transition:transform .18s cubic-bezier(.34,1.56,.64,1)}
        .gsh-topic:hover{transform:translateY(-3px)}
        .gsh-topic-thumb{width:46px;height:46px;border-radius:16px;display:grid;place-items:center;margin-bottom:8px}
        .gsh-topic b{font-family:${DISPLAY_FONT};font-weight:900;font-size:.95rem;display:block;color:${colors.deepSlate}}
        .gsh-topic small{font-size:.72rem;color:${colors.grayLight}}
        .gsh-topic-bar{display:block;height:8px;border-radius:999px;background:rgba(26,39,68,.08);margin-top:10px;overflow:hidden}
        .gsh-topic-bar i{display:block;height:100%;border-radius:999px;transition:width .4s ease}
        .gsh-topic-done{display:block;margin-top:4px;color:${colors.mediumGray}}
        .gsh-switch{display:inline-flex;align-items:center;gap:4px;border:none;border-radius:12px;padding:8px 12px;background:${withOpacity(colors.skyBlue, 0.25)};font-family:${DISPLAY_FONT};font-weight:800;font-size:.8rem;color:${colors.deepSlate};cursor:pointer;margin-top:10px}
        .gsh-game-list{display:flex;flex-direction:column;gap:12px}
        .gsh-game-card{display:flex;align-items:center;gap:14px;border:none;border-radius:22px;padding:16px;background:${colors.warmWhite};box-shadow:${shadows.clayCard};cursor:pointer;text-align:left;transition:transform .18s cubic-bezier(.34,1.56,.64,1)}
        .gsh-game-card:hover{transform:translateY(-2px)}
        .gsh-game-icon{width:52px;height:52px;border-radius:18px;display:grid;place-items:center;flex-shrink:0}
        .gsh-game-info{flex:1;min-width:0}
        .gsh-game-info b{font-family:${DISPLAY_FONT};font-weight:900;font-size:1rem;color:${colors.deepSlate};display:block}
        .gsh-game-info small{font-size:.8rem;color:${colors.mediumGray}}
        .gsh-done-badge{display:inline-flex;align-items:center;gap:4px;font-family:${DISPLAY_FONT};font-weight:800;font-size:.75rem;color:#4C8A2A;background:${colors.mintLight};border-radius:999px;padding:5px 10px}
        @media (prefers-reduced-motion: reduce){.gsh-topic,.gsh-game-card{transition:none}}
      `}</style>
    </div>
  );
};

export default GamesPage;
