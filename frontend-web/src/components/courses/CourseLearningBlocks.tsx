import React from 'react';
import type {
  Activity,
  AssetReference,
  PronunciationTask,
  QuizQuestion,
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
}> = ({ asset, label, emoji = 'image', className = '' }) => (
  <div className={`flex min-h-[120px] flex-col items-center justify-center rounded-3xl border-4 border-white/80 bg-gradient-to-br from-sky-100 to-yellow-50 p-4 text-center shadow-[0_6px_0_rgba(91,141,239,0.12)] ${className}`}>
    <div className="text-2xl font-black text-sky-500">{emoji}</div>
    <div className="mt-2 text-sm font-black text-slate-700">{label}</div>
    {asset && (
      <div className="mt-1 max-w-full truncate rounded-full bg-white/70 px-3 py-1 text-[10px] font-bold text-slate-500">
        {asset.status}: {asset.path}
      </div>
    )}
  </div>
);

export const VideoScenePreview: React.FC<{ scenes: VideoScene[] }> = ({ scenes }) => (
  <section className="space-y-3">
    <h2 className="text-2xl font-black text-slate-800">Video scenes</h2>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {scenes.map(scene => (
        <div key={scene.scene_id} className="rounded-3xl border-4 border-white bg-white/85 p-4 shadow-[0_6px_0_rgba(91,141,239,0.12)]">
          <AssetTile asset={scene.image} label={`Scene ${scene.order}`} emoji="film" className="mb-3" />
          <p className="text-base font-black text-slate-800">{scene.audio_text_en}</p>
          <p className="mt-1 text-sm font-semibold text-slate-600">{scene.narration_vi}</p>
        </div>
      ))}
    </div>
  </section>
);

export const VocabularyCards: React.FC<{ items: VocabularyItem[] }> = ({ items }) => (
  <section className="space-y-3">
    <h2 className="text-2xl font-black text-slate-800">New words</h2>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map(item => (
        <div key={item.word_en} className="rounded-3xl border-4 border-white bg-white p-4 text-center shadow-[0_8px_0_rgba(255,217,61,0.18)]">
          <AssetTile asset={item.image} label={item.word_en} emoji={item.emoji} className="mb-3" />
          <h3 className="text-3xl font-black text-slate-800">{item.word_en}</h3>
          <p className="text-lg font-bold text-slate-500">{item.word_vi}</p>
          <p className="mt-2 rounded-2xl bg-sky-50 px-3 py-2 text-sm font-bold text-sky-700">{item.simple_sentence}</p>
        </div>
      ))}
    </div>
  </section>
);

export const SectionGameCard: React.FC<{ game: SectionGame }> = ({ game }) => (
  <section className="rounded-[28px] border-4 border-white bg-gradient-to-br from-yellow-100 to-rose-100 p-5 shadow-[0_8px_0_rgba(251,191,36,0.18)]">
    <div className="mb-4 flex items-center gap-3">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-xl font-black text-amber-500 shadow-sm">
        Play
      </div>
      <div className="min-w-0">
        <h2 className="text-2xl font-black text-slate-800">Quick game</h2>
        <p className="font-bold text-slate-600">{game.instruction_vi}</p>
        <p className="text-sm font-black text-amber-700">Listen: {game.prompt_audio_text}</p>
      </div>
    </div>
    <div className="grid gap-3 sm:grid-cols-3">
      {game.items.map((item, index) => {
        const image = item.image as AssetReference | undefined;
        const label = String(item.label || item.word || item.id || `card-${index + 1}`);
        return <AssetTile key={`${label}-${index}`} asset={image} label={label} emoji="tap" />;
      })}
    </div>
    <p className="mt-4 rounded-2xl bg-white/75 px-4 py-3 text-center font-black text-amber-700">
      {game.feedback_positive_vi}
    </p>
  </section>
);

export const PronunciationCard: React.FC<{ task: PronunciationTask }> = ({ task }) => (
  <section className="rounded-[28px] border-4 border-white bg-gradient-to-br from-violet-100 to-sky-100 p-5 shadow-[0_8px_0_rgba(139,92,246,0.16)]">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h2 className="text-2xl font-black text-slate-800">Say it aloud</h2>
        <p className="font-bold text-slate-600">{task.instruction_vi}</p>
        <p className="mt-1 text-sm font-black text-violet-700">Listen: {task.prompt_audio_text}</p>
      </div>
      <AssetTile asset={task.audio} label="Pronunciation audio" emoji="audio" className="sm:w-52" />
    </div>
    <div className="mt-4 flex flex-wrap gap-2">
      {task.target_words.map(word => (
        <span key={word} className="rounded-full bg-white px-4 py-2 text-lg font-black text-slate-800 shadow-sm">
          {word}
        </span>
      ))}
    </div>
    <p className="mt-4 rounded-2xl bg-white/75 px-4 py-3 text-center font-black text-violet-700">
      {task.feedback_positive_vi}
    </p>
  </section>
);

export const ActivityCard: React.FC<{ activity: Activity }> = ({ activity }) => (
  <section className="rounded-[28px] border-4 border-white bg-gradient-to-br from-emerald-100 to-sky-100 p-5 shadow-[0_8px_0_rgba(52,211,153,0.18)]">
    <div className="mb-4 flex items-center gap-3">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-xl font-black text-emerald-600 shadow-sm">Do</div>
      <div>
        <h2 className="text-2xl font-black text-slate-800">Activity</h2>
        <p className="font-bold text-slate-600">{activity.instruction_vi}</p>
      </div>
    </div>
    <div className="grid gap-3 sm:grid-cols-3">
      {activity.items.map((item, index) => {
        const image = item.image as AssetReference | undefined;
        const label = String(item.label || item.id || `item-${index + 1}`);
        return <AssetTile key={`${label}-${index}`} asset={image} label={label} emoji="star" />;
      })}
    </div>
    <p className="mt-4 rounded-2xl bg-white/75 px-4 py-3 text-center font-black text-emerald-700">
      {activity.feedback_positive_vi}
    </p>
  </section>
);

export const ImageQuiz: React.FC<{
  questions: QuizQuestion[];
  answers: Record<string, string>;
  onAnswer: (questionId: string, optionId: string) => void;
}> = ({ questions, answers, onAnswer }) => (
  <section className="space-y-4">
    <h2 className="text-2xl font-black text-slate-800">Fun quiz</h2>
    {questions.map(question => (
      <div key={question.question_id} className="rounded-[28px] border-4 border-white bg-white p-4 shadow-[0_8px_0_rgba(91,141,239,0.12)]">
        <div className="mb-3">
          <p className="text-xl font-black text-slate-800">{question.prompt_vi}</p>
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
                  <AssetTile asset={option.image} label={option.label} emoji="image" className="min-h-[68px] w-24 shrink-0 p-2" />
                  <span className="text-lg font-black text-slate-800">{option.label}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    ))}
  </section>
);

export const RewardPopup: React.FC<{ reward: Reward; onClose: () => void }> = ({ reward, onClose }) => (
  <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/35 p-4">
    <div className="max-w-sm rounded-[32px] border-4 border-white bg-gradient-to-br from-yellow-100 to-sky-100 p-6 text-center shadow-2xl">
      <div className="text-5xl font-black text-amber-500">Win</div>
      <h2 className="mt-3 text-3xl font-black text-slate-800">{reward.badgeTitle}</h2>
      <p className="mt-2 text-lg font-bold text-slate-600">{reward.message_vi}</p>
      <p className="mt-3 rounded-full bg-white px-4 py-2 text-2xl font-black text-amber-500">+{reward.xp} XP</p>
      <button type="button" onClick={onClose} className="clay-cta-primary mt-5 w-full justify-center">
        Yay!
      </button>
    </div>
  </div>
);
