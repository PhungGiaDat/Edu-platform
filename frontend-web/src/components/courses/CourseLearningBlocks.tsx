import React from 'react';
import { useLocale } from '@/contexts/LocaleContext';
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

export const AssetTile: React.FC<{
  asset?: AssetReference | null;
  label: string;
  emoji?: string;
  className?: string;
  showAssetMeta?: boolean;
}> = ({ asset, label, emoji = 'image', className = '', showAssetMeta = false }) => (
  <div className={`flex min-h-[120px] flex-col items-center justify-center rounded-3xl border-4 border-white/80 bg-gradient-to-br from-sky-100 to-yellow-50 p-4 text-center shadow-[0_6px_0_rgba(91,141,239,0.12)] ${className}`}>
    <div className="flex h-11 min-w-11 items-center justify-center rounded-2xl bg-white/70 px-2 text-sm font-black text-sky-600">{emoji}</div>
    <div className="mt-2 text-sm font-black text-slate-700">{label}</div>
    {asset && showAssetMeta && (
      <div className="mt-1 max-w-full truncate rounded-full bg-white/70 px-3 py-1 text-[10px] font-bold text-slate-500">
        {asset.status}: {asset.path}
      </div>
    )}
  </div>
);

export const VideoScenePreview: React.FC<{ scenes: VideoScene[] }> = ({ scenes }) => {
  const { locale } = useLocale();
  return (
    <section className="space-y-3">
      <h2 className="text-2xl font-black text-slate-800">{locale === 'vi' ? 'Canh video' : 'Video scenes'}</h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {scenes.map(scene => (
          <div key={scene.scene_id} className="rounded-3xl border-4 border-white bg-white/85 p-4 shadow-[0_6px_0_rgba(91,141,239,0.12)]">
            <AssetTile asset={scene.image} label={`${locale === 'vi' ? 'Canh' : 'Scene'} ${scene.order}`} emoji="SC" className="mb-3" />
            <p className="text-base font-black text-slate-800">{cleanText(scene.audio_text_en, `Scene ${scene.order}`)}</p>
            {locale === 'vi' && (
              <p className="mt-1 text-sm font-semibold text-slate-600">{cleanText(scene.narration_vi, scene.audio_text_en)}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};

export const VocabularyCards: React.FC<{ items: VocabularyItem[] }> = ({ items }) => {
  const { locale } = useLocale();
  return (
    <section className="space-y-3">
      <h2 className="text-2xl font-black text-slate-800">{locale === 'vi' ? 'Tu moi' : 'New words'}</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(item => (
          <div key={item.word_en} className="rounded-3xl border-4 border-white bg-white p-4 text-center shadow-[0_8px_0_rgba(255,217,61,0.18)]">
            <AssetTile asset={item.image} label={item.word_en} emoji={item.word_en.slice(0, 2).toUpperCase()} className="mb-3" />
            <h3 className="text-3xl font-black text-slate-800">{cleanText(item.word_en, 'Word')}</h3>
            {locale === 'vi' && <p className="text-lg font-bold text-slate-500">{cleanText(item.word_vi, item.word_en)}</p>}
            <p className="mt-2 rounded-2xl bg-sky-50 px-3 py-2 text-sm font-bold text-sky-700">{cleanText(item.simple_sentence, item.word_en)}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export const SectionGameCard: React.FC<{ game: SectionGame }> = ({ game }) => {
  const { locale } = useLocale();
  return (
  <section className="rounded-[28px] border-4 border-white bg-gradient-to-br from-yellow-100 to-rose-100 p-5 shadow-[0_8px_0_rgba(251,191,36,0.18)]">
    <div className="mb-4 flex items-center gap-3">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-xl font-black text-amber-500 shadow-sm">
        Play
      </div>
      <div className="min-w-0">
        <h2 className="text-2xl font-black text-slate-800">{locale === 'vi' ? 'Tro choi nhanh' : 'Quick game'}</h2>
        <p className="font-bold text-slate-600">{cleanText(game.instruction_vi, 'Listen and choose the matching picture.')}</p>
        <p className="text-sm font-black text-amber-700">Listen: {game.prompt_audio_text}</p>
      </div>
    </div>
    <div className="grid gap-3 sm:grid-cols-3">
      {game.items.map((item, index) => {
        const image = item.image as AssetReference | undefined;
        const label = String(item.label || item.word || item.id || `card-${index + 1}`);
        return <AssetTile key={`${label}-${index}`} asset={image} label={label} emoji="TAP" />;
      })}
    </div>
    <p className="mt-4 rounded-2xl bg-white/75 px-4 py-3 text-center font-black text-amber-700">
      {cleanText(game.feedback_positive_vi, locale === 'vi' ? 'Lam tot lam!' : 'Great job!')}
    </p>
  </section>
  );
};

export const PronunciationCard: React.FC<{ task: PronunciationTask }> = ({ task }) => {
  const { locale } = useLocale();
  return (
  <section className="rounded-[28px] border-4 border-white bg-gradient-to-br from-violet-100 to-sky-100 p-5 shadow-[0_8px_0_rgba(139,92,246,0.16)]">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h2 className="text-2xl font-black text-slate-800">{locale === 'vi' ? 'Doc to len' : 'Say it aloud'}</h2>
        <p className="font-bold text-slate-600">{cleanText(task.instruction_vi, 'Say each word clearly.')}</p>
        <p className="mt-1 text-sm font-black text-violet-700">Listen: {task.prompt_audio_text}</p>
      </div>
      <AssetTile asset={task.audio} label="Pronunciation audio" emoji="AU" className="sm:w-52" />
    </div>
    <div className="mt-4 flex flex-wrap gap-2">
      {task.target_words.map(word => (
        <span key={word} className="rounded-full bg-white px-4 py-2 text-lg font-black text-slate-800 shadow-sm">
          {word}
        </span>
      ))}
    </div>
    <p className="mt-4 rounded-2xl bg-white/75 px-4 py-3 text-center font-black text-violet-700">
      {cleanText(task.feedback_positive_vi, locale === 'vi' ? 'Phat am tot!' : 'Nice speaking!')}
    </p>
  </section>
  );
};

export const ReadAloudStoryCard: React.FC<{ story: ReadAloudStory }> = ({ story }) => {
  const { locale } = useLocale();
  return (
  <section className="rounded-[28px] border-4 border-white bg-gradient-to-br from-rose-100 via-white to-yellow-100 p-5 shadow-[0_8px_0_rgba(244,114,182,0.16)]">
    <div className="mb-4">
      <h2 className="text-2xl font-black text-slate-800">{cleanText(story.title, locale === 'vi' ? 'Cau chuyen' : 'Story')}</h2>
      <p className="font-bold text-slate-600">{cleanText(story.instruction_vi, locale === 'vi' ? 'Doc cau chuyen va lap lai tu moi.' : 'Read the story and repeat the new words.')}</p>
    </div>
    <div className="grid gap-3 lg:grid-cols-2">
      {story.pages.map(page => (
        <article key={page.page_id} className="rounded-3xl border-4 border-white bg-white/90 p-4 shadow-[0_6px_0_rgba(15,23,42,0.08)]">
          <AssetTile asset={page.image} label={`${locale === 'vi' ? 'Trang' : 'Page'} ${page.order}`} emoji="RD" className="mb-3" />
          <p className="text-xl font-black text-slate-800">{cleanText(page.text_en, `Page ${page.order}`)}</p>
          {locale === 'vi' && <p className="mt-1 font-bold text-slate-500">{cleanText(page.text_vi, page.text_en)}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            {page.highlighted_words.map(word => (
              <span key={word} className="rounded-full bg-yellow-100 px-3 py-1 text-sm font-black text-amber-700">
                {word}
              </span>
            ))}
          </div>
          <div className="mt-3 max-w-full truncate rounded-full bg-sky-50 px-3 py-2 text-xs font-bold text-sky-700">
            audio: {page.audio.status} / {page.audio.path}
          </div>
        </article>
      ))}
    </div>
    <p className="mt-4 rounded-2xl bg-white/75 px-4 py-3 text-center font-black text-rose-700">
      {cleanText(story.feedback_positive_vi, locale === 'vi' ? 'Doc tot lam!' : 'Wonderful reading!')}
    </p>
  </section>
  );
};

export const ActivityCard: React.FC<{ activity: Activity }> = ({ activity }) => {
  const { locale } = useLocale();
  return (
  <section className="rounded-[28px] border-4 border-white bg-gradient-to-br from-emerald-100 to-sky-100 p-5 shadow-[0_8px_0_rgba(52,211,153,0.18)]">
    <div className="mb-4 flex items-center gap-3">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-xl font-black text-emerald-600 shadow-sm">Do</div>
      <div>
        <h2 className="text-2xl font-black text-slate-800">Activity</h2>
        <p className="font-bold text-slate-600">{cleanText(activity.instruction_vi, 'Choose the matching picture.')}</p>
      </div>
    </div>
    <div className="grid gap-3 sm:grid-cols-3">
      {activity.items.map((item, index) => {
        const image = item.image as AssetReference | undefined;
        const label = String(item.label || item.id || `item-${index + 1}`);
        return <AssetTile key={`${label}-${index}`} asset={image} label={label} emoji="DO" />;
      })}
    </div>
    <p className="mt-4 rounded-2xl bg-white/75 px-4 py-3 text-center font-black text-emerald-700">
      {cleanText(activity.feedback_positive_vi, locale === 'vi' ? 'Lam tot lam!' : 'Great work!')}
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
  return (
  <section className="space-y-4">
    <h2 className="text-2xl font-black text-slate-800">{locale === 'vi' ? 'Quiz vui' : 'Fun quiz'}</h2>
    {questions.map(question => (
      <div key={question.question_id} className="rounded-[28px] border-4 border-white bg-white p-4 shadow-[0_8px_0_rgba(91,141,239,0.12)]">
        <div className="mb-3">
          <p className="text-xl font-black text-slate-800">{cleanText(question.prompt_vi, 'Choose the correct answer.')}</p>
          <p className="text-sm font-bold text-sky-600">Listen: {question.questionAudioText}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {question.options.map(option => {
            const selected = answers[question.question_id] === option.option_id;
            return (
              <button
                key={option.option_id}
                type="button"
                onClick={() => onAnswer(question.question_id, option.option_id)}
                className={`min-h-[92px] rounded-3xl border-4 p-3 text-left transition-all ${
                  selected
                    ? 'border-sky-400 bg-sky-50 shadow-[0_6px_0_#60A5FA]'
                    : 'border-white bg-slate-50 shadow-[0_4px_0_rgba(148,163,184,0.18)]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <AssetTile asset={option.image} label={cleanText(option.label, 'Option')} emoji="IMG" className="min-h-[68px] w-24 shrink-0 p-2" />
                  <span className="text-lg font-black text-slate-800">{cleanText(option.label, 'Option')}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    ))}
  </section>
  );
};

export const RewardPopup: React.FC<{ reward: Reward; onClose: () => void }> = ({ reward, onClose }) => (
  <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/35 p-4">
    <div className="max-w-sm rounded-[32px] border-4 border-white bg-gradient-to-br from-yellow-100 to-sky-100 p-6 text-center shadow-2xl">
      <div className="text-5xl font-black text-amber-500">Win</div>
      <h2 className="mt-3 text-3xl font-black text-slate-800">{reward.badgeTitle}</h2>
      <p className="mt-2 text-lg font-bold text-slate-600">{cleanText(reward.message_vi, 'You earned a reward!')}</p>
      <p className="mt-3 rounded-full bg-white px-4 py-2 text-2xl font-black text-amber-500">+{reward.xp} XP</p>
      <button type="button" onClick={onClose} className="clay-cta-primary mt-5 w-full justify-center">
        Yay!
      </button>
    </div>
  </div>
);
