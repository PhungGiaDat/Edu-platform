/**
 * GamesVocabService — topic vocabulary for mini-games + idempotent XP award.
 *
 * Data contract (approved design 2026-09-05):
 * - GET /api/v1/games/vocab?topic={slug}&limit=8 → notebook words + seed fallback
 * - Game completion → POST /gamification/xp-event with action "game_completed"
 *   and a stable event_id `game_completed_{game}_{user}_{yyyymmdd}` — the
 *   backend enforces exactly-once XP per event (max 1 XP per game per day).
 * - Client NEVER decides XP amounts (gamification contract).
 */
import { request } from './apiClient';

export type GameTopic = 'animals' | 'home' | 'nature' | 'school_food';

export interface GameVocabItem {
  word: string;
  translation_vi: string;
  image_url: string;
  audio_url?: string | null;
  source: 'notebook' | 'seed';
}

/** Play a word's real pronunciation (course asset) or fall back to TTS. */
export function speakWord(item: { word: string; audio_url?: string | null }): void {
  if (item.audio_url) {
    try {
      const a = new Audio(item.audio_url);
      a.lang = 'en-US';
      void a.play().catch(() => speakTts(item.word));
      return;
    } catch {
      /* fall through to TTS */
    }
  }
  speakTts(item.word);
}

function speakTts(text: string): void {
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    u.rate = 0.85;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  } catch {
    /* unsupported — silent */
  }
}

export interface GameVocab {
  topic: GameTopic | null;
  items: GameVocabItem[];
  source: string;
}

export const GAME_TOPICS: { slug: GameTopic; label: string; labelEn: string }[] = [
  { slug: 'animals', label: 'Động vật', labelEn: 'Animals' },
  { slug: 'home', label: 'Nhà & gia đình', labelEn: 'Home' },
  { slug: 'nature', label: 'Thiên nhiên', labelEn: 'Nature' },
  { slug: 'school_food', label: 'Trường & đồ ăn', labelEn: 'School & Food' },
];

export function normalizeGameTopic(raw: string | null | undefined): GameTopic | null {
  if (!raw) return null;
  const t = raw.trim().toLowerCase().replace(/-/g, '_');
  if (t === 'animals' || t === 'animal') return 'animals';
  if (t === 'home' || t === 'family') return 'home';
  if (t === 'nature') return 'nature';
  if (t === 'school_food' || t === 'school' || t === 'food') return 'school_food';
  return null;
}

/** Claymorphic themed background per topic (assets: /assets/game-themes/). */
export function topicBackgroundUrl(topic: GameTopic | null | undefined): string | null {
  if (!topic) return null;
  return `/assets/game-themes/${topic}/bg.jpg`;
}

export async function fetchGameVocab(topic: GameTopic, limit = 8): Promise<GameVocab> {
  const data = await request(`/api/v1/games/vocab?topic=${encodeURIComponent(topic)}&limit=${limit}`, {
    method: 'GET',
  }) as GameVocab;
  return data;
}

function todayStamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
}

/**
 * Award XP for finishing a game round. Idempotent per game per day.
 * Returns xp_awarded (0 when the event was already processed — a retry
 * or a same-day replay is NOT a new reward).
 */
export async function awardGameComplete(
  userId: string,
  game: 'drag_match' | 'memory_pairs' | 'color_animal',
): Promise<{ xp_awarded: number; alreadyToday: boolean }> {
  const eventId = `game_completed_${game}_${userId}_${todayStamp()}`;
  try {
    const result = await request('/api/v1/gamification/xp-event', {
      method: 'POST',
      body: {
        action: 'game_completed',
        event_id: eventId,
        source_type: 'mini_game',
        source_id: game,
        metadata: { game },
      },
    }) as { xp_awarded?: number; status?: string };
    return {
      xp_awarded: result.xp_awarded ?? 0,
      alreadyToday: (result.status ?? '') !== 'APPLIED' || (result.xp_awarded ?? 0) === 0,
    };
  } catch (err) {
    // XP is a side reward — a gamification outage must never fail the game flow
    console.error('[GamesVocab] awardGameComplete failed:', err);
    return { xp_awarded: 0, alreadyToday: false };
  }
}
