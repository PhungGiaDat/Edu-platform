// frontend/src/pages/admin/GameEditor.tsx
/**
 * Game Editor — create/edit admin games (approved spec §3 + HTML spec §3/§3b)
 *
 * Teacher-friendly UX decisions (user-approved 2026-09-09):
 * - Difficulty = preset Dễ/Vừa/Khó (default Vừa); raw technical values live
 *   in a collapsed "Nâng cao" panel and override the preset when edited.
 * - Preset → config mapping is a FRONTEND-only transform on save; the API
 *   always receives concrete values (backend contract unchanged).
 * - Image upload = dropzone (click or drag) + preview + replace/delete.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from '../../../node_modules/react-i18next';
import { AdminLayout } from '@/features/admin/components/AdminLayout';
import {
  adminGamesApi,
  type AdminGame,
  type AdminGameTopic,
  type AdminVocabItem,
  type AdminGameType,
  type GameConfigDraft,
} from '../../services/gamesAdminApi';
import { SaveIcon, TrashIcon, EditIcon } from '@/shared/components/icons/Icons';

export type DifficultyPreset = 'easy' | 'mid' | 'hard';

/** Preset → config mapping (spec §3.2 revised; source of truth for tests) */
export const DIFFICULTY_PRESETS: Record<
  AdminGameType,
  Record<DifficultyPreset, GameConfigDraft>
> = {
  catch_word: {
    easy: { fall_speed: 0.8, spawn_interval: 1200 },
    mid: { fall_speed: 1.2, spawn_interval: 800 },
    hard: { fall_speed: 1.6, spawn_interval: 500 },
  },
  drag_match: {
    easy: { pair_count: 4, timer_seconds: 120 },
    mid: { pair_count: 6, timer_seconds: 90 },
    hard: { pair_count: 8, timer_seconds: 60 },
  },
  memory_match: {
    easy: { pair_count: 4, flip_duration_ms: 1500 },
    mid: { pair_count: 6, flip_duration_ms: 1000 },
    hard: { pair_count: 8, flip_duration_ms: 600 },
  },
  word_scramble: {
    easy: { word_count: 5, hint_letters: 3 },
    mid: { word_count: 8, hint_letters: 2 },
    hard: { word_count: 10, hint_letters: 1 },
  },
};

export const DEFAULT_GAME_TYPE: AdminGameType = 'catch_word';

const GAME_TYPES: { value: AdminGameType; icon: string; vi: string; en: string }[] = [
  { value: 'drag_match', icon: '🧩', vi: 'Ghép cặp', en: 'Drag Match' },
  { value: 'catch_word', icon: '🌧', vi: 'Bắt chữ rơi', en: 'Catch Words' },
  { value: 'word_scramble', icon: '🔤', vi: 'Xếp chữ', en: 'Word Scramble' },
  { value: 'memory_match', icon: '🃏', vi: 'Lật thẻ nhớ', en: 'Memory Match' },
];

const CONFIG_FIELDS: Record<AdminGameType, { key: keyof GameConfigDraft; vi: string; en: string }[]> = {
  catch_word: [
    { key: 'fall_speed', vi: 'Tốc độ rơi (1.0 = chuẩn)', en: 'Fall speed (1.0 = normal)' },
    { key: 'spawn_interval', vi: 'Chu kỳ sinh từ (ms)', en: 'Spawn interval (ms)' },
  ],
  drag_match: [
    { key: 'pair_count', vi: 'Số cặp', en: 'Pair count' },
    { key: 'timer_seconds', vi: 'Thời gian (giây)', en: 'Timer (seconds)' },
  ],
  memory_match: [
    { key: 'pair_count', vi: 'Số cặp', en: 'Pair count' },
    { key: 'flip_duration_ms', vi: 'Thời gian lật thẻ (ms)', en: 'Flip duration (ms)' },
  ],
  word_scramble: [
    { key: 'word_count', vi: 'Số từ mỗi lượt', en: 'Words per round' },
    { key: 'hint_letters', vi: 'Số chữ gợi ý', en: 'Hint letters' },
  ],
};

const DIFFICULTY_HELPER: Record<DifficultyPreset, { vi: string; en: string }> = {
  easy: {
    vi: '🌿 Dễ: nhịp chơi nhẹ nhàng — phù hợp làm quen.',
    en: '🌿 Easy: gentle pace — good for beginners.',
  },
  mid: {
    vi: '⚡ Vừa: nhịp chơi cân bằng — phù hợp đa số học viên.',
    en: '⚡ Medium: balanced pace — fits most learners.',
  },
  hard: {
    vi: '🔥 Khó: nhịp chơi nhanh, thử thách hơn.',
    en: '🔥 Hard: fast, challenging pace.',
  },
};

const GameEditor: React.FC<{ isEdit?: boolean }> = ({ isEdit = false }) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { gameId } = useParams<{ gameId: string }>();
  const lang = (i18n.language || 'vi').startsWith('vi') ? 'vi' : 'en';

  // ---- form state
  const [title, setTitle] = useState('');
  const [titleVi, setTitleVi] = useState('');
  const [gameType, setGameType] = useState<AdminGameType>(DEFAULT_GAME_TYPE);
  const [topics, setTopics] = useState<AdminGameTopic[]>([]);
  const [topicId, setTopicId] = useState('');
  const [newTopicName, setNewTopicName] = useState('');
  const [showNewTopic, setShowNewTopic] = useState(false);
  const [preset, setPreset] = useState<DifficultyPreset>('mid');
  const [config, setConfig] = useState<GameConfigDraft>({});
  const [advancedTouched, setAdvancedTouched] = useState(false);
  const [isPublished, setIsPublished] = useState(false);

  // ---- vocab state
  const [vocab, setVocab] = useState<AdminVocabItem[]>([]);
  const [newWord, setNewWord] = useState('');
  const [newTranslation, setNewTranslation] = useState('');
  const [uploadingFor, setUploadingFor] = useState<'new' | string | null>(null);

  // ---- meta state
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const uploadTargetRef = useRef<'new' | string>('new');

  // ---- load topics (+ game when editing)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const topicList = await adminGamesApi.listTopics();
        if (cancelled) return;
        setTopics(topicList);
        if (topicList.length > 0) {
          setTopicId(prev => prev || topicList[0].id);
        }
        if (isEdit && gameId) {
          const game: AdminGame = await adminGamesApi.getGame(gameId);
          if (cancelled) return;
          setTitle(game.title);
          setTitleVi(game.title_vi || '');
          setGameType(game.game_type);
          setTopicId(game.topic_id);
          setConfig(game.config || {});
          setIsPublished(game.is_published);
          // Infer preset from config (best effort)
          const presets = DIFFICULTY_PRESETS[game.game_type];
          const match = (Object.keys(presets) as DifficultyPreset[]).find(
            key => JSON.stringify(presets[key]) === JSON.stringify(game.config || {}),
          );
          setPreset(match ?? 'mid');
          setAdvancedTouched(match === undefined);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isEdit, gameId]);

  // ---- load vocab when topic changes
  useEffect(() => {
    if (!topicId) { setVocab([]); return; }
    let cancelled = false;
    (async () => {
      try {
        const items = await adminGamesApi.listVocab(topicId);
        if (!cancelled) setVocab(items);
      } catch (err) {
        if (!cancelled) console.error('Failed to load vocab:', err);
      }
    })();
    return () => { cancelled = true; };
  }, [topicId]);

  // ---- preset applies to config unless advanced values were touched
  const applyPreset = useCallback((next: DifficultyPreset) => {
    setPreset(next);
    if (!advancedTouched) {
      setConfig({ ...DIFFICULTY_PRESETS[gameType][next] });
    }
  }, [advancedTouched, gameType]);

  useEffect(() => {
    // When engine changes, reset config from current preset (unless advanced touched)
    if (!advancedTouched) {
      setConfig({ ...DIFFICULTY_PRESETS[gameType][preset] });
    }
  }, [gameType]); // eslint-disable-line react-hooks/exhaustive-deps

  const setAdvancedValue = (key: keyof GameConfigDraft, raw: string) => {
    setAdvancedTouched(true);
    setConfig(prev => ({ ...prev, [key]: raw === '' ? undefined : Number(raw) }));
  };

  const validate = (publish: boolean): string | null => {
    if (!title.trim()) return t('admin.games.errTitle', 'Vui lòng nhập tên game');
    if (!topicId) return t('admin.games.errTopic', 'Vui lòng chọn chủ đề');
    if (publish && vocab.length < 3) {
      return t('admin.games.errVocab', 'Cần ít nhất 3 từ vựng trong chủ đề trước khi xuất bản');
    }
    return null;
  };

  const saveGame = async (publish: boolean) => {
    const validationError = validate(publish);
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        title: title.trim(),
        title_vi: titleVi.trim(),
        game_type: gameType,
        topic_id: topicId,
        config: config as GameConfigDraft,
        is_published: publish,
      };
      if (isEdit && gameId) {
        await adminGamesApi.updateGame(gameId, payload);
      } else {
        await adminGamesApi.createGame(payload);
      }
      navigate('/admin/games');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const createTopicInline = async () => {
    if (!newTopicName.trim()) return;
    try {
      const topic = await adminGamesApi.createTopic({ name: newTopicName.trim() });
      setTopics(prev => [...prev, topic]);
      setTopicId(topic.id);
      setNewTopicName('');
      setShowNewTopic(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const addVocabWord = async () => {
    if (!newWord.trim() || !topicId) return;
    try {
      const item = await adminGamesApi.addVocab(topicId, {
        word: newWord.trim(),
        translation_vi: newTranslation.trim(),
      });
      setVocab(prev => [...prev, item]);
      setNewWord('');
      setNewTranslation('');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const deleteVocabWord = async (itemId: string) => {
    try {
      await adminGamesApi.deleteVocab(itemId);
      setVocab(prev => prev.filter(v => v.id !== itemId));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const triggerUpload = (target: 'new' | string) => {
    uploadTargetRef.current = target;
    fileInputRef.current?.click();
  };

  const handleFilePicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const target = uploadTargetRef.current;
    setUploadingFor(target);
    try {
      const url = await adminGamesApi.uploadMedia(file);
      if (target === 'new') {
        setNewWord(prev => prev); // keep word
        setPendingImageUrl(url);
      } else {
        await adminGamesApi.updateVocab(target, { image_url: url });
        setVocab(prev => prev.map(v => (v.id === target ? { ...v, image_url: url } : v)));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setUploadingFor(null);
    }
  };

  const [pendingImageUrl, setPendingImageUrl] = useState<string | null>(null);

  const submitNewVocab = async () => {
    if (!newWord.trim() || !topicId) return;
    try {
      const item = await adminGamesApi.addVocab(topicId, {
        word: newWord.trim(),
        translation_vi: newTranslation.trim(),
        image_url: pendingImageUrl || undefined,
      });
      setVocab(prev => [...prev, item]);
      setNewWord('');
      setNewTranslation('');
      setPendingImageUrl(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const inputCls = 'w-full px-3 py-2.5 rounded-[13px] border-2 border-[rgba(34,48,58,0.08)] bg-white text-sm text-[#22303a] focus:outline-2 focus:outline-[#0d9488]';
  const labelCls = 'block font-bold text-xs mb-1.5 text-[#22303a]';
  const hintCls = 'text-[11px] text-[rgba(34,48,58,0.55)] mt-1';

  const previewWords = useMemo(() => vocab.slice(0, 3).map(v => v.word), [vocab]);

  return (
    <AdminLayout>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={handleFilePicked}
      />

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          {isEdit ? t('admin.games.editTitle', 'Sửa trò chơi') : t('admin.games.createTitle', 'Tạo trò chơi')}
        </h1>
        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${isPublished ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
          {isPublished ? t('admin.games.published', 'Đã xuất bản') : t('admin.games.draft', 'Nháp')}
        </span>
      </div>

      {error && (
        <div role="alert" className="flex items-center gap-3 mb-4 px-4 py-3 rounded-[13px] bg-[rgba(220,38,38,0.09)] border border-[rgba(220,38,38,0.25)]">
          <span className="text-sm font-semibold text-[#dc2626] flex-1">{error}</span>
          <button onClick={() => setError(null)} className="px-3 py-1.5 rounded-[10px] bg-white text-[#dc2626] text-sm font-bold shadow-[0_2px_0_rgba(34,48,58,0.08)]">
            {t('admin.common.close', 'Đóng')}
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-[#0d9488] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5 items-start">
          {/* ================= Left: form ================= */}
          <div className="space-y-4">
            <div className="bg-white border-2 border-white rounded-[18px] shadow-[0_5px_0_rgba(34,48,58,0.05),0_10px_22px_rgba(34,48,58,0.05)] p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className={labelCls}>{t('admin.games.fieldTitle', 'Tên game *')}</label>
                  <input className={inputCls} value={title} onChange={e => setTitle(e.target.value)} placeholder="Bắt chữ rơi — Động vật" />
                  <div className={hintCls}>{t('admin.games.fieldTitleHint', 'Tên học viên sẽ thấy trong Khu chơi.')}</div>
                </div>
                <div>
                  <label className={labelCls}>{t('admin.games.fieldTitleVi', 'Tên tiếng Anh')}</label>
                  <input className={inputCls} value={titleVi} onChange={e => setTitleVi(e.target.value)} />
                </div>
              </div>

              {/* game type */}
              <div className="mb-4">
                <label className={labelCls}>{t('admin.games.fieldType', 'Loại trò chơi *')}</label>
                <div className="flex flex-wrap gap-2">
                  {GAME_TYPES.map(gt => (
                    <button
                      key={gt.value}
                      type="button"
                      onClick={() => setGameType(gt.value)}
                      className={`px-3.5 py-2 rounded-[13px] text-sm font-bold border-2 transition-colors cursor-pointer ${
                        gameType === gt.value
                          ? 'border-[#0d9488] bg-[rgba(13,148,136,0.12)] text-[#0b6b60]'
                          : 'border-[rgba(34,48,58,0.08)] bg-white text-[#22303a] hover:border-[#0d9488]/40'
                      }`}
                    >
                      {gt.icon} {lang === 'vi' ? gt.vi : gt.en}
                    </button>
                  ))}
                </div>
              </div>

              {/* topic */}
              <div className="mb-4">
                <label className={labelCls}>{t('admin.games.fieldTopic', 'Chủ đề *')}</label>
                <div className="flex gap-2">
                  <select className={inputCls} value={topicId} onChange={e => setTopicId(e.target.value)}>
                    {topics.length === 0 && <option value="">{t('admin.games.noTopics', 'Chưa có chủ đề')}</option>}
                    {topics.map(tp => (
                      <option key={tp.id} value={tp.id}>{tp.name_vi || tp.name} ({tp.slug})</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowNewTopic(v => !v)}
                    className="shrink-0 px-3 py-2 rounded-[13px] bg-white text-[#0d9488] text-xs font-bold border-2 border-[rgba(34,48,58,0.08)] shadow-[0_3px_0_rgba(34,48,58,0.08)] cursor-pointer"
                  >
                    + {t('admin.games.newTopic', 'Chủ đề mới')}
                  </button>
                </div>
                {showNewTopic && (
                  <div className="flex gap-2 mt-2">
                    <input className={inputCls} value={newTopicName} onChange={e => setNewTopicName(e.target.value)} placeholder={t('admin.games.newTopicPlaceholder', 'Tên chủ đề mới')} />
                    <button type="button" onClick={createTopicInline} className="shrink-0 px-3 py-2 rounded-[13px] bg-[#0d9488] text-white text-xs font-bold shadow-[0_3px_0_#0b6b60] cursor-pointer">
                      {t('admin.common.save', 'Lưu')}
                    </button>
                  </div>
                )}
              </div>

              {/* difficulty preset */}
              <div>
                <label className={labelCls}>{t('admin.games.fieldDifficulty', 'Độ khó *')}</label>
                <div className="flex gap-2 max-w-xs">
                  {(['easy', 'mid', 'hard'] as DifficultyPreset[]).map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => applyPreset(p)}
                      className={`flex-1 px-3 py-2 rounded-[13px] text-sm font-bold border-2 transition-colors cursor-pointer ${
                        preset === p
                          ? 'border-[#0d9488] bg-[rgba(13,148,136,0.12)] text-[#0b6b60]'
                          : 'border-[rgba(34,48,58,0.08)] bg-white text-[#22303a] hover:border-[#0d9488]/40'
                      }`}
                    >
                      {p === 'easy' ? '🌿 Dễ' : p === 'mid' ? '⚡ Vừa' : '🔥 Khó'}
                    </button>
                  ))}
                </div>
                <div className={hintCls}>{DIFFICULTY_HELPER[preset][lang]}</div>

                {/* advanced panel */}
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs font-bold text-[rgba(34,48,58,0.55)]">
                    ⚙️ {t('admin.games.advanced', 'Nâng cao — chỉnh thông số chi tiết')}
                  </summary>
                  <div className="grid grid-cols-2 gap-3 mt-2.5 p-3 rounded-[13px] bg-[#f7f5f0]">
                    {CONFIG_FIELDS[gameType].map(f => (
                      <div key={f.key}>
                        <label className={labelCls}>{lang === 'vi' ? f.vi : f.en}</label>
                        <input
                          className={inputCls}
                          value={config[f.key] ?? ''}
                          onChange={e => setAdvancedValue(f.key, e.target.value)}
                          type="number"
                          step="any"
                        />
                      </div>
                    ))}
                  </div>
                  <div className={hintCls}>{t('admin.games.advancedHint', 'Chỉnh ở đây sẽ ghi đè preset độ khó.')}</div>
                </details>
              </div>
            </div>
          </div>

          {/* ================= Right: vocab + preview ================= */}
          <div className="space-y-4">
            {/* preview */}
            <div className="bg-[rgba(13,148,136,0.12)] rounded-[18px] p-4">
              <div className="font-bold text-xs text-[#0b6b60] mb-2">👁 {t('admin.games.preview', 'Xem trước')}</div>
              <div className="flex flex-wrap gap-1.5 min-h-[28px]">
                {previewWords.length === 0 ? (
                  <span className="text-xs text-[rgba(34,48,58,0.55)]">{t('admin.games.previewEmpty', 'Thêm từ vựng để xem trước')}</span>
                ) : (
                  previewWords.map(w => (
                    <span key={w} className="px-2 py-0.5 rounded-[10px] bg-white text-xs font-bold text-[#0b6b60]">{w}</span>
                  ))
                )}
              </div>
              <div className="text-[11px] text-[rgba(34,48,58,0.55)] mt-2">
                {DIFFICULTY_HELPER[preset][lang]} · {vocab.length} {t('admin.games.wordsCount', 'từ')}
              </div>
            </div>

            {/* vocab manager */}
            <div className="bg-white border-2 border-white rounded-[18px] shadow-[0_5px_0_rgba(34,48,58,0.05),0_10px_22px_rgba(34,48,58,0.05)] p-4">
              <div className="font-bold text-xs mb-3">
                {t('admin.games.vocabTitle', 'Từ vựng của chủ đề')} <span className="text-[rgba(34,48,58,0.55)]">({vocab.length})</span>
              </div>

              {vocab.map(item => (
                <div key={item.id} className="flex items-center gap-2.5 py-2 border-b border-[rgba(34,48,58,0.06)] last:border-0">
                  <div className="w-9 h-9 rounded-[10px] bg-[rgba(13,148,136,0.12)] overflow-hidden shrink-0 flex items-center justify-center">
                    {item.image_url
                      ? <img src={item.image_url} alt={item.word} className="w-full h-full object-cover" />
                      : <span className="text-xs font-bold text-[#0b6b60]">{item.word.slice(0, 2).toUpperCase()}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold truncate">{item.word}</div>
                    <div className="text-xs text-[rgba(34,48,58,0.55)] truncate">{item.translation_vi}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => triggerUpload(item.id)}
                    disabled={uploadingFor === item.id}
                    className="p-1.5 rounded-[10px] bg-[rgba(13,148,136,0.12)] text-[#0b6b60] cursor-pointer disabled:opacity-50"
                    title={t('admin.games.uploadImage', 'Tải ảnh lên')}
                  >
                    {uploadingFor === item.id
                      ? <span className="block w-4 h-4 border-2 border-[#0b6b60] border-t-transparent rounded-full animate-spin" />
                      : <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>}
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteVocabWord(item.id)}
                    className="p-1.5 rounded-[10px] bg-[rgba(220,38,38,0.09)] text-[#dc2626] cursor-pointer"
                    title={t('admin.common.delete', 'Xóa')}
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              ))}

              {/* add word form */}
              <div className="mt-3 pt-3 border-t-2 border-dashed border-[rgba(34,48,58,0.08)] space-y-2">
                <input className={inputCls} value={newWord} onChange={e => setNewWord(e.target.value)} placeholder={t('admin.games.newWord', 'Từ mới (EN)')} />
                <input className={inputCls} value={newTranslation} onChange={e => setNewTranslation(e.target.value)} placeholder={t('admin.games.newTranslation', 'Nghĩa tiếng Việt')} />
                {pendingImageUrl && (
                  <div className="flex items-center gap-2 text-xs text-[#0b6b60] font-semibold">
                    ✓ {t('admin.games.imageReady', 'Ảnh đã tải lên')}: {pendingImageUrl.slice(0, 48)}…
                    <button type="button" onClick={() => setPendingImageUrl(null)} className="text-[#dc2626] cursor-pointer">{t('admin.common.delete', 'Xóa')}</button>
                  </div>
                )}
                <button
                  type="button"
                  onClick={submitNewVocab}
                  disabled={!newWord.trim()}
                  className="w-full py-2 rounded-[13px] border-2 border-dashed border-[rgba(13,148,136,0.4)] text-[#0d9488] text-sm font-bold cursor-pointer hover:bg-[rgba(13,148,136,0.06)] disabled:opacity-40"
                >
                  + {t('admin.games.addWord', 'Thêm từ mới')}
                </button>
              </div>
            </div>

            {/* publish + save */}
            <div className="bg-white border-2 border-white rounded-[18px] shadow-[0_5px_0_rgba(34,48,58,0.05),0_10px_22px_rgba(34,48,58,0.05)] p-4">
              <label className="flex items-center gap-2 font-semibold text-sm mb-3">
                <input type="checkbox" checked={isPublished} onChange={e => setIsPublished(e.target.checked)} />
                {t('admin.games.publishToggle', 'Hiển thị trong Khu chơi của học viên')}
              </label>
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => saveGame(false)}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-[13px] bg-white text-[#0d9488] text-sm font-bold border-2 border-[rgba(34,48,58,0.08)] shadow-[0_4px_0_rgba(34,48,58,0.08)] cursor-pointer disabled:opacity-50"
                >
                  {t('admin.games.saveDraft', 'Lưu nháp')}
                </button>
                <button
                  type="button"
                  onClick={() => saveGame(true)}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-[13px] bg-[#0d9488] text-white text-sm font-bold shadow-[0_5px_0_#0b6b60] cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <SaveIcon className="w-4 h-4" />
                  {t('admin.games.publish', 'Xuất bản')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export const GameCreatePage = () => <GameEditor isEdit={false} />;
export const GameEditPage = () => <GameEditor isEdit={true} />;
export default GameEditor;
