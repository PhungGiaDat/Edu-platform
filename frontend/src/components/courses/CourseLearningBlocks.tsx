import React from 'react';

import { useLocale } from '@/contexts/LocaleContext';
import { getAssetCandidateUrls } from '@/lib/courseAssets';
import { cleanText } from '@/lib/courseLocale';
import type {
  Activity,
  AssetReference,
  PronunciationTask,
  QuizQuestion,
  ReadAloudStory,
  Reward,
  SectionGame,
  VideoScene,
  VocabularyItem,
} from '@/types/course';

const blockCopy = {
  en: {
    videoScenes: 'Video scenes',
    newWords: 'New words',
    quickGame: 'Quick game',
    sayIt: 'Say it aloud',
    story: 'Story',
    activity: 'Activity',
    quiz: 'Fun quiz',
    rewardFallback: 'You earned a reward!',
    greatJob: 'Great job!',
    niceSpeaking: 'Nice speaking!',
    storyPrompt: 'Read the story and repeat the new words.',
    picturePrompt: 'Choose the matching picture.',
    gamePrompt: 'Listen and choose the matching picture.',
    wonderfulReading: 'Wonderful reading!',
    greatWork: 'Great work!',
    yay: 'Yay!',
    page: 'Page',
    scene: 'Scene',
    duration: 'Duration',
    visual: 'Visual idea',
    audio: 'Audio',
    sticker: 'Sticker',
    prompt: 'Prompt',
    targetWords: 'Target words',
    scoreGoal: 'Pass score',
    options: 'Options',
    statusReady: 'Ready',
    statusPending: 'Pending',
    statusGenerating: 'Generating',
    statusFailed: 'Failed',
  },
  vi: {
    videoScenes: 'Cảnh video',
    newWords: 'Từ mới',
    quickGame: 'Trò chơi nhanh',
    sayIt: 'Nói thật to',
    story: 'Câu chuyện',
    activity: 'Hoạt động',
    quiz: 'Quiz vui',
    rewardFallback: 'Bạn đã nhận được phần thưởng!',
    greatJob: 'Làm tốt lắm!',
    niceSpeaking: 'Phát âm tốt lắm!',
    storyPrompt: 'Đọc câu chuyện và lặp lại từ mới.',
    picturePrompt: 'Chọn hình phù hợp.',
    gamePrompt: 'Nghe và chọn hình phù hợp.',
    wonderfulReading: 'Đọc hay lắm!',
    greatWork: 'Giỏi lắm!',
    yay: 'Tuyệt!',
    page: 'Trang',
    scene: 'Cảnh',
    duration: 'Thời lượng',
    visual: 'Ý tưởng hình ảnh',
    audio: 'Âm thanh',
    sticker: 'Sticker',
    prompt: 'Lời nhắc',
    targetWords: 'Từ mục tiêu',
    scoreGoal: 'Mốc đạt',
    options: 'Lựa chọn',
    statusReady: 'Sẵn sàng',
    statusPending: 'Đang chờ',
    statusGenerating: 'Đang tạo',
    statusFailed: 'Lỗi',
  },
} as const;

const tones = ['#FFF1D7', '#EAF5FF', '#EEF9E7', '#FFE7E3'];

const statusCopy = (
  status: AssetReference['status'] | undefined,
  locale: keyof typeof blockCopy,
) => {
  const copy = blockCopy[locale];
  if (status === 'ready') return copy.statusReady;
  if (status === 'generating') return copy.statusGenerating;
  if (status === 'failed') return copy.statusFailed;
  return copy.statusPending;
};

const labelFromPath = (path?: string) => {
  if (!path) return '';
  const parts = path.split('/');
  return parts[parts.length - 1] || path;
};

const toneForIndex = (index: number) => tones[index % tones.length];

const Badge: React.FC<{ children: React.ReactNode; tone?: string }> = ({ children, tone = '#FFFFFF' }) => (
  <span
    className="inline-flex rounded-full border-4 border-white px-3 py-1 text-xs font-black text-slate-700 shadow-[0_4px_0_rgba(15,23,42,0.08)]"
    style={{ background: tone }}
  >
    {children}
  </span>
);

const AssetArtwork: React.FC<{
  asset?: AssetReference | null;
  alt: string;
  className?: string;
  fallback: React.ReactNode;
  onReadyChange?: (ready: boolean) => void;
}> = ({ asset, alt, className = '', fallback, onReadyChange }) => {
  const candidates = React.useMemo(() => getAssetCandidateUrls(asset), [asset]);
  const [candidateIndex, setCandidateIndex] = React.useState(0);
  const [isReady, setIsReady] = React.useState(false);

  React.useEffect(() => {
    setCandidateIndex(0);
    setIsReady(false);
  }, [candidates]);

  React.useEffect(() => {
    onReadyChange?.(isReady);
  }, [isReady, onReadyChange]);

  const src = candidates[candidateIndex];
  if (!src) return <>{fallback}</>;

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      onLoad={() => setIsReady(true)}
      onError={() => {
        setIsReady(false);
        setCandidateIndex((current) => current + 1);
      }}
    />
  );
};

export const AssetTile: React.FC<{
  asset?: AssetReference | null;
  label: string;
  emoji?: string;
  className?: string;
  showAssetMeta?: boolean;
}> = ({ asset, label, emoji = 'image', className = '', showAssetMeta = false }) => {
  const { locale } = useLocale();
  const [hasArtwork, setHasArtwork] = React.useState(false);

  React.useEffect(() => {
    setHasArtwork(false);
  }, [asset?.bucket, asset?.path, asset?.type]);

  return (
    <div className={`flex min-h-[132px] flex-col items-center justify-center rounded-[28px] border-4 border-white bg-[#F7FBFF] p-4 text-center shadow-[0_8px_0_rgba(91,141,239,0.10),inset_0_1px_0_rgba(255,255,255,0.92)] ${className}`}>
      <div className="flex h-full w-full flex-1 items-center justify-center overflow-hidden rounded-[24px] border-4 border-white bg-white shadow-[0_6px_0_rgba(148,163,184,0.10)]">
        <AssetArtwork
          asset={asset}
          alt={label}
          className="h-full max-h-[180px] w-full object-cover"
          onReadyChange={setHasArtwork}
          fallback={
            <div className="flex h-full min-h-[112px] w-full items-center justify-center bg-[#F7FBFF] px-3 text-center">
              <div className="flex h-12 min-w-12 items-center justify-center rounded-[20px] bg-white px-2 text-sm font-black text-sky-600 shadow-[0_4px_0_rgba(148,163,184,0.12)]">
                {emoji}
              </div>
            </div>
          }
        />
      </div>
      <div className="mt-3 text-sm font-black text-slate-700">{label}</div>
      {asset && (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <Badge tone={asset.status === 'ready' ? '#EEF9E7' : '#FFF1D7'}>
            {hasArtwork ? blockCopy[locale].statusReady : statusCopy(asset.status, locale)}
          </Badge>
          {showAssetMeta && !hasArtwork && labelFromPath(asset.path) && (
            <Badge tone="#FFFFFF">{labelFromPath(asset.path)}</Badge>
          )}
        </div>
      )}
    </div>
  );
};

export const VideoScenePreview: React.FC<{ scenes: VideoScene[] }> = ({ scenes }) => {
  const { locale } = useLocale();
  const copy = blockCopy[locale];

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-black text-slate-800">{copy.videoScenes}</h2>
      <div className="grid gap-4">
        {scenes.map((scene, index) => (
          <article
            key={scene.scene_id}
            className="rounded-[30px] border-4 border-white p-4 shadow-[0_8px_0_rgba(91,141,239,0.10)]"
            style={{ background: toneForIndex(index) }}
          >
            <div className="grid gap-4 lg:grid-cols-[200px_minmax(0,1fr)]">
              <AssetTile
                asset={scene.image}
                label={`${copy.scene} ${scene.order}`}
                emoji={String(scene.order).padStart(2, '0')}
                showAssetMeta
              />
              <div className="min-w-0 rounded-[24px] border-4 border-white bg-white/80 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                <div className="flex flex-wrap gap-2">
                  <Badge tone="#EAF5FF">{copy.duration}: {scene.duration_seconds}s</Badge>
                  {scene.image && <Badge tone="#FFFFFF">{statusCopy(scene.image.status, locale)}</Badge>}
                </div>
                <h3 className="mt-4 text-2xl font-black text-slate-800">
                  {cleanText(scene.audio_text_en, `${copy.scene} ${scene.order}`)}
                </h3>
                {scene.narration_vi && (
                  <p className="mt-2 text-base font-bold text-slate-600">
                    {locale === 'vi' ? scene.narration_vi : cleanText(scene.audio_text_en, scene.narration_vi)}
                  </p>
                )}
                <div className="mt-4 rounded-[20px] bg-slate-50 px-4 py-3">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-400">{copy.visual}</p>
                  <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">
                    {cleanText(scene.visual_prompt, cleanText(scene.audio_text_en, `${copy.scene} ${scene.order}`))}
                  </p>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

export const VocabularyCards: React.FC<{ items: VocabularyItem[] }> = ({ items }) => {
  const { locale } = useLocale();
  const copy = blockCopy[locale];

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-black text-slate-800">{copy.newWords}</h2>
      <div className="grid grid-cols-1 gap-4">
        {items.map((item, index) => (
          <article
            key={item.word_en}
            className="rounded-[32px] border-4 border-white p-4 shadow-[0_10px_0_rgba(91,141,239,0.10)]"
            style={{ background: toneForIndex(index) }}
          >
            <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
              <AssetTile
                asset={item.image}
                label={item.word_en}
                emoji={(item.emoji || item.word_en).slice(0, 2).toUpperCase()}
                showAssetMeta
              />
              <div className="min-w-0 rounded-[24px] border-4 border-white bg-white/85 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                <div className="flex flex-wrap gap-2">
                  <Badge tone="#EAF5FF">{copy.audio}: {statusCopy(item.audio.status, locale)}</Badge>
                  {item.sticker && <Badge tone="#EEF9E7">{copy.sticker}: {statusCopy(item.sticker.status, locale)}</Badge>}
                </div>
                <h3 className="mt-4 text-4xl font-black text-slate-800">{cleanText(item.word_en, 'Word')}</h3>
                <p className="mt-2 text-lg font-bold text-slate-500">{cleanText(item.word_vi, item.word_en)}</p>
                <div className="mt-4 rounded-[20px] bg-slate-50 px-4 py-3 text-sm font-bold text-sky-700">
                  {cleanText(item.simple_sentence, item.word_en)}
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

export const SectionGameCard: React.FC<{ game: SectionGame }> = ({ game }) => {
  const { locale } = useLocale();
  const copy = blockCopy[locale];

  return (
    <section className="rounded-[30px] border-4 border-white bg-[#FFF1D7] p-5 shadow-[0_10px_0_rgba(251,191,36,0.16)]">
      <div className="grid gap-4 lg:grid-cols-[auto_minmax(0,1fr)]">
        <div className="flex h-16 w-16 items-center justify-center rounded-[24px] border-4 border-white bg-white text-2xl font-black text-amber-500 shadow-[0_6px_0_rgba(229,184,0,0.16)]">
          Play
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <Badge tone="#FFFFFF">{copy.options}: {game.items.length}</Badge>
            <Badge tone="#FFE7E3">{copy.prompt}: {game.type.replaceAll('_', ' ')}</Badge>
          </div>
          <h2 className="mt-4 text-3xl font-black text-slate-800">{copy.quickGame}</h2>
          <p className="mt-2 font-bold text-slate-600">{cleanText(game.instruction_vi, copy.gamePrompt)}</p>
          <p className="mt-2 text-sm font-black text-amber-700">Listen: {game.prompt_audio_text}</p>
        </div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {game.items.map((item, index) => {
          const image = item.image as AssetReference | undefined;
          const label = String(item.label || item.word || item.id || `card-${index + 1}`);
          return (
            <div
              key={`${label}-${index}`}
              className="rounded-[26px] border-4 border-white bg-white/90 p-3 shadow-[0_8px_0_rgba(217,119,6,0.10)]"
            >
              <AssetTile asset={image} label={label} emoji={`0${index + 1}`} showAssetMeta />
            </div>
          );
        })}
      </div>
      <p className="mt-5 rounded-[20px] bg-white px-4 py-3 text-center font-black text-amber-700">
        {cleanText(game.feedback_positive_vi, copy.greatJob)}
      </p>
    </section>
  );
};

export const PronunciationCard: React.FC<{ task: PronunciationTask }> = ({ task }) => {
  const { locale } = useLocale();
  const copy = blockCopy[locale];

  return (
    <section className="rounded-[30px] border-4 border-white bg-[#EAF5FF] p-5 shadow-[0_10px_0_rgba(91,141,239,0.14)]">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
        <div className="min-w-0 rounded-[24px] border-4 border-white bg-white/85 p-5">
          <div className="flex flex-wrap gap-2">
            <Badge tone="#FFFFFF">{copy.scoreGoal}: {task.pass_score}%</Badge>
            <Badge tone="#EEF9E7">{copy.targetWords}: {task.target_words.length}</Badge>
          </div>
          <h2 className="mt-4 text-3xl font-black text-slate-800">{copy.sayIt}</h2>
          <p className="mt-2 font-bold text-slate-600">{cleanText(task.instruction_vi, 'Say each word clearly.')}</p>
          <p className="mt-2 text-sm font-black text-violet-700">Listen: {task.prompt_audio_text}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {task.target_words.map((word) => (
              <span key={word} className="rounded-full bg-slate-50 px-4 py-2 text-lg font-black text-slate-800 shadow-[0_4px_0_rgba(148,163,184,0.10)]">
                {word}
              </span>
            ))}
          </div>
        </div>
        <AssetTile asset={task.audio} label={copy.audio} emoji="AU" showAssetMeta />
      </div>
      <p className="mt-5 rounded-[20px] bg-white px-4 py-3 text-center font-black text-violet-700">
        {cleanText(task.feedback_positive_vi, copy.niceSpeaking)}
      </p>
    </section>
  );
};

export const ReadAloudStoryCard: React.FC<{ story: ReadAloudStory }> = ({ story }) => {
  const { locale } = useLocale();
  const copy = blockCopy[locale];

  return (
    <section className="rounded-[30px] border-4 border-white bg-[#FFE7E3] p-5 shadow-[0_10px_0_rgba(244,114,182,0.14)]">
      <div className="rounded-[24px] border-4 border-white bg-white/85 p-5">
        <h2 className="text-3xl font-black text-slate-800">{cleanText(story.title, copy.story)}</h2>
        <p className="mt-2 font-bold text-slate-600">{cleanText(story.instruction_vi, copy.storyPrompt)}</p>
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {story.pages.map((page, index) => (
          <article
            key={page.page_id}
            className="rounded-[28px] border-4 border-white p-4 shadow-[0_8px_0_rgba(15,23,42,0.08)]"
            style={{ background: toneForIndex(index) }}
          >
            <AssetTile asset={page.image} label={`${copy.page} ${page.order}`} emoji={`P${page.order}`} showAssetMeta className="mb-4" />
            <div className="rounded-[22px] border-4 border-white bg-white/90 p-4">
              <p className="text-xl font-black text-slate-800">{cleanText(page.text_en, `${copy.page} ${page.order}`)}</p>
              <p className="mt-2 font-bold text-slate-500">{cleanText(page.text_vi, page.text_en)}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {page.highlighted_words.map((word) => (
                  <Badge key={word} tone="#FFF1D7">{word}</Badge>
                ))}
                <Badge tone="#EAF5FF">{copy.audio}: {statusCopy(page.audio.status, locale)}</Badge>
              </div>
            </div>
          </article>
        ))}
      </div>
      <p className="mt-5 rounded-[20px] bg-white px-4 py-3 text-center font-black text-rose-700">
        {cleanText(story.feedback_positive_vi, copy.wonderfulReading)}
      </p>
    </section>
  );
};

export const ActivityCard: React.FC<{ activity: Activity }> = ({ activity }) => {
  const { locale } = useLocale();
  const copy = blockCopy[locale];

  return (
    <section className="rounded-[30px] border-4 border-white bg-[#EEF9E7] p-5 shadow-[0_10px_0_rgba(52,211,153,0.16)]">
      <div className="rounded-[24px] border-4 border-white bg-white/85 p-5">
        <div className="flex flex-wrap gap-2">
          <Badge tone="#FFFFFF">{copy.options}: {activity.items.length}</Badge>
          <Badge tone="#EAF5FF">{copy.prompt}: {activity.type.replaceAll('_', ' ')}</Badge>
        </div>
        <h2 className="mt-4 text-3xl font-black text-slate-800">{copy.activity}</h2>
        <p className="mt-2 font-bold text-slate-600">{cleanText(activity.instruction_vi, copy.picturePrompt)}</p>
        <p className="mt-2 text-sm font-black text-emerald-700">Listen: {activity.prompt_audio_text}</p>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {activity.items.map((item, index) => {
          const image = item.image as AssetReference | undefined;
          const label = String(item.label || item.id || `item-${index + 1}`);
          return (
            <div
              key={`${label}-${index}`}
              className="rounded-[26px] border-4 border-white bg-white/90 p-3 shadow-[0_8px_0_rgba(52,211,153,0.10)]"
            >
              <AssetTile asset={image} label={label} emoji={`A${index + 1}`} showAssetMeta />
            </div>
          );
        })}
      </div>
      <p className="mt-5 rounded-[20px] bg-white px-4 py-3 text-center font-black text-emerald-700">
        {cleanText(activity.feedback_positive_vi, copy.greatWork)}
      </p>
    </section>
  );
};

export const ImageQuiz: React.FC<{
  questions: QuizQuestion[];
  answers: Record<string, string>;
  onAnswer: (questionId: string, optionId: string) => void;
}> = ({ questions, answers, onAnswer }) => {
  const { locale } = useLocale();
  const copy = blockCopy[locale];

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-black text-slate-800">{copy.quiz}</h2>
      {questions.map((question, questionIndex) => (
        <article
          key={question.question_id}
          className="rounded-[30px] border-4 border-white p-4 shadow-[0_8px_0_rgba(91,141,239,0.10)]"
          style={{ background: toneForIndex(questionIndex) }}
        >
          <div className="rounded-[24px] border-4 border-white bg-white/90 p-4">
            <div className="flex flex-wrap gap-2">
              <Badge tone="#FFFFFF">{copy.options}: {question.options.length}</Badge>
              <Badge tone="#EAF5FF">{copy.prompt}: {question.type.replaceAll('_', ' ')}</Badge>
            </div>
            <p className="mt-4 text-2xl font-black text-slate-800">
              {cleanText(question.prompt_vi, 'Choose the correct answer.')}
            </p>
            <p className="mt-2 text-sm font-bold text-sky-600">Listen: {question.questionAudioText}</p>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {question.options.map((option, optionIndex) => {
              const selected = answers[question.question_id] === option.option_id;
              return (
                <button
                  key={option.option_id}
                  type="button"
                  onClick={() => onAnswer(question.question_id, option.option_id)}
                  className={`rounded-[26px] border-4 p-3 text-left transition-all ${
                    selected
                      ? 'border-sky-400 bg-white shadow-[0_8px_0_rgba(96,165,250,0.28)] -translate-y-1'
                      : 'border-white bg-white/90 shadow-[0_6px_0_rgba(148,163,184,0.18)]'
                  }`}
                >
                  <div className="grid gap-3 sm:grid-cols-[110px_minmax(0,1fr)] sm:items-center">
                    <AssetTile
                      asset={option.image}
                      label={cleanText(option.label, 'Option')}
                      emoji={`0${optionIndex + 1}`}
                      showAssetMeta
                      className="min-h-[88px] p-2"
                    />
                    <div className="min-w-0">
                      <span className="text-lg font-black text-slate-800">{cleanText(option.label, 'Option')}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </article>
      ))}
    </section>
  );
};

export const RewardPopup: React.FC<{ reward: Reward; onClose: () => void }> = ({ reward, onClose }) => {
  const { locale } = useLocale();
  const copy = blockCopy[locale];

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/35 p-4">
      <div className="max-w-sm rounded-[34px] border-4 border-white bg-[#FFF1D7] p-6 text-center shadow-[0_16px_0_rgba(229,184,0,0.20),0_24px_60px_rgba(26,39,68,0.20)]">
        <div className="mx-auto w-full max-w-[220px] rounded-[30px] border-4 border-white bg-white/90 p-4 shadow-[0_10px_0_rgba(229,184,0,0.12)]">
          <AssetArtwork
            asset={reward.sticker}
            alt={reward.badgeTitle}
            className="mx-auto aspect-square w-full rounded-[24px] object-cover"
            fallback={
              <div className="flex aspect-square w-full items-center justify-center rounded-[24px] bg-[#FFF8D8] text-5xl font-black text-amber-500">
                XP
              </div>
            }
          />
        </div>
        <h2 className="mt-4 text-3xl font-black text-slate-800">{reward.badgeTitle}</h2>
        <p className="mt-2 text-lg font-bold text-slate-600">{cleanText(reward.message_vi, copy.rewardFallback)}</p>
        <p className="mt-4 rounded-full bg-white px-4 py-2 text-2xl font-black text-amber-500 shadow-[0_6px_0_rgba(229,184,0,0.12)]">
          +{reward.xp} XP
        </p>
        <button type="button" onClick={onClose} className="clay-cta-primary mt-5 w-full justify-center">
          {copy.yay}
        </button>
      </div>
    </div>
  );
};
