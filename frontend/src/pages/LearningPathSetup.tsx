import React, { useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { useLocale } from '@/contexts/LocaleContext';
import { colors, shadows } from '@/design-tokens/claymorphic';
import { learningTopics, topicHint, topicLabel } from '@/lib/learningPathTopics';
import {
  learningPathService,
  type LearningPathPayload,
} from '@/services/LearningPathService';

type SetupStep = 'topics' | 'goals' | 'complete';

type DailyGoals = {
  timeGoalMins: number;
  wordsGoal: number;
};

const copy = {
  en: {
    kicker: 'Set up a learning path',
    title: 'Choose what your child should learn first',
    body: 'Start with real beginner themes inspired by early English readers for ages 5 to 8.',
    step: 'Step',
    of: 'of',
    topicTitle: 'Priority topics',
    topicBody: 'Pick the themes you want to see first in the course catalog.',
    topicEmpty: 'Tap at least one topic to build a custom path.',
    topicSelected: (count: number) => `${count} topic${count === 1 ? '' : 's'} selected`,
    next: 'Next: daily goals',
    goalsTitle: 'Daily goals',
    goalsBody: 'Set a small rhythm that feels easy to repeat every day.',
    timeGoal: 'Daily time',
    wordGoal: 'Daily words',
    back: 'Back',
    save: 'Save learning path',
    saving: 'Saving...',
    completeTitle: 'Learning path ready',
    completeBody: 'Your priorities and goals are saved. Recommended courses will move to the top of the catalog.',
    restart: 'Edit choices',
    saved: 'Learning path saved.',
    signInRequired: 'Sign in to save this learning path.',
    saveFallback: 'We could not save right now, but your choices are still on screen.',
    ageBand: 'Age 5-8',
    words: 'words',
    recommended: 'Recommended',
    timeSuffix: 'mins',
    wordsSuffix: 'words',
  },
  vi: {
    kicker: 'Thiết lập lộ trình học',
    title: 'Chọn chủ đề ưu tiên cho bé học trước',
    body: 'Bắt đầu với các chủ đề tiếng Anh cơ bản dành cho trẻ 5 đến 8 tuổi.',
    step: 'Bước',
    of: 'trên',
    topicTitle: 'Chủ đề ưu tiên',
    topicBody: 'Chọn các chủ đề bạn muốn xuất hiện đầu tiên trong danh sách khóa học.',
    topicEmpty: 'Hãy chọn ít nhất một chủ đề để tạo lộ trình riêng.',
    topicSelected: (count: number) => `Đã chọn ${count} chủ đề`,
    next: 'Tiếp theo: mục tiêu hằng ngày',
    goalsTitle: 'Mục tiêu hằng ngày',
    goalsBody: 'Chọn nhịp học ngắn gọn để bé dễ duy trì mỗi ngày.',
    timeGoal: 'Thời gian học',
    wordGoal: 'Số từ mới',
    back: 'Quay lại',
    save: 'Lưu lộ trình học',
    saving: 'Đang lưu...',
    completeTitle: 'Lộ trình đã sẵn sàng',
    completeBody: 'Ưu tiên và mục tiêu học đã được lưu. Các khóa học phù hợp sẽ được đẩy lên đầu danh sách.',
    restart: 'Chỉnh sửa lại',
    saved: 'Đã lưu lộ trình học.',
    signInRequired: 'Cần đăng nhập để lưu lộ trình học.',
    saveFallback: 'Hiện chưa lưu được, nhưng các lựa chọn của bạn vẫn còn trên màn hình.',
    ageBand: 'Độ tuổi 5-8',
    words: 'từ',
    recommended: 'Khuyên dùng',
    timeSuffix: 'phút',
    wordsSuffix: 'từ',
  },
} as const;

const timeOptions = [10, 15, 20, 30];
const wordOptions = [3, 5, 7, 10];

const palette = [
  {
    card: '#FFFFFF',
    shell: '#FFF0D9',
    border: 'rgba(255, 217, 61, 0.38)',
    shadow: '0 12px 0 rgba(229, 184, 0, 0.18), 0 22px 36px rgba(26,39,68,0.10), inset 0 1px 0 rgba(255,255,255,0.9)',
    accent: colors.sunshineYellow,
    accentDark: colors.sunshineYellowDark,
  },
  {
    card: '#FFFFFF',
    shell: '#EAF5FF',
    border: 'rgba(110, 185, 255, 0.34)',
    shadow: '0 12px 0 rgba(58, 143, 209, 0.18), 0 22px 36px rgba(26,39,68,0.10), inset 0 1px 0 rgba(255,255,255,0.9)',
    accent: colors.skyBlue,
    accentDark: colors.skyBlueDark,
  },
  {
    card: '#FFFFFF',
    shell: '#EEF9E7',
    border: 'rgba(180, 225, 151, 0.40)',
    shadow: '0 12px 0 rgba(125, 199, 96, 0.18), 0 22px 36px rgba(26,39,68,0.10), inset 0 1px 0 rgba(255,255,255,0.9)',
    accent: colors.mintGreen,
    accentDark: colors.mintGreenDark,
  },
  {
    card: '#FFFFFF',
    shell: '#FFE6E3',
    border: 'rgba(255, 159, 159, 0.40)',
    shadow: '0 12px 0 rgba(217, 112, 112, 0.18), 0 22px 36px rgba(26,39,68,0.10), inset 0 1px 0 rgba(255,255,255,0.9)',
    accent: colors.coralPink,
    accentDark: colors.coralPinkDark,
  },
];

export const LearningPathSetup: React.FC = () => {
  const { user } = useAuth();
  const { locale } = useLocale();
  const ui = copy[locale];
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [dailyGoals, setDailyGoals] = useState<DailyGoals>({
    timeGoalMins: 15,
    wordsGoal: 5,
  });
  const [step, setStep] = useState<SetupStep>('topics');
  const [isLoading, setIsLoading] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    learningPathService
      .get(user.id)
      .then((response) => {
        const preferences = response.preferences;
        setSelectedTopics(preferences.priority_topics || []);
        setDailyGoals({
          timeGoalMins: preferences.daily_time_goal_mins || 15,
          wordsGoal: preferences.daily_words_goal || 5,
        });
      })
      .catch(() => {
        setSavedMessage(null);
      });
  }, [user?.id]);

  const selectedTopicDetails = useMemo(
    () => learningTopics.filter((topic) => selectedTopics.includes(topic.id)),
    [selectedTopics],
  );

  const toggleTopic = (topicId: string) => {
    setSelectedTopics((current) =>
      current.includes(topicId)
        ? current.filter((value) => value !== topicId)
        : [...current, topicId],
    );
    setSavedMessage(null);
  };

  const handleSave = async () => {
    if (!user?.id) {
      setSavedMessage(ui.signInRequired);
      return;
    }

    const payload: LearningPathPayload = {
      user_id: user.id,
      priority_topics: selectedTopics,
      daily_time_goal_mins: dailyGoals.timeGoalMins,
      daily_words_goal: dailyGoals.wordsGoal,
      notifications_enabled: true,
    };

    setIsLoading(true);
    try {
      await learningPathService.save(payload);
      setSavedMessage(ui.saved);
      setStep('complete');
    } catch {
      setSavedMessage(ui.saveFallback);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen clay-bg-playful pb-[calc(env(safe-area-inset-bottom)+6rem)] md:pb-8">
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <section
          className="rounded-[36px] border-4 border-white px-5 py-6 shadow-[0_14px_0_rgba(91,141,239,0.12)] sm:px-7"
          style={{ background: '#F7FBFF' }}
        >
          <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex rounded-full border-4 border-white bg-white px-4 py-2 text-sm font-black text-sky-700 shadow-[0_6px_0_rgba(91,141,239,0.12)]">
                {ui.kicker}
              </div>
              <h1
                className="mt-4 text-3xl font-black leading-tight text-slate-800 sm:text-4xl lg:text-5xl"
                style={{ fontFamily: "'Baloo 2', system-ui, sans-serif" }}
              >
                {ui.title}
              </h1>
              <p className="mt-3 max-w-2xl text-base font-bold leading-7 text-slate-600 sm:text-lg">
                {ui.body}
              </p>
            </div>
            <div className="rounded-[28px] border-4 border-white bg-white px-4 py-4 text-sm font-black text-slate-700 shadow-[0_8px_0_rgba(255,217,61,0.18)]">
              <div>{ui.step} {step === 'topics' ? 1 : step === 'goals' ? 2 : 3} {ui.of} 3</div>
              <div className="mt-3 flex gap-2">
                {['topics', 'goals', 'complete'].map((item, index) => (
                  <div
                    key={item}
                    className="h-2 w-14 rounded-full"
                    style={{
                      background: (step === 'topics' && index === 0)
                        || (step === 'goals' && index <= 1)
                        || (step === 'complete')
                        ? colors.coralPink
                        : '#E2E8F0',
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {savedMessage && (
            <div className="mb-5 rounded-[28px] border-4 border-white bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-[0_6px_0_rgba(91,141,239,0.10)]">
              {savedMessage}
            </div>
          )}

          {step === 'topics' && (
            <section>
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-2xl font-black text-slate-800 sm:text-3xl">{ui.topicTitle}</h2>
                  <p className="mt-1 font-bold text-slate-600">{ui.topicBody}</p>
                </div>
                <div className="rounded-full border-4 border-white bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-[0_6px_0_rgba(26,39,68,0.08)]">
                  {selectedTopics.length === 0 ? ui.topicEmpty : ui.topicSelected(selectedTopics.length)}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {learningTopics.map((topic, index) => {
                  const tone = palette[index % palette.length];
                  const isSelected = selectedTopics.includes(topic.id);
                  return (
                    <button
                      key={topic.id}
                      type="button"
                      onClick={() => toggleTopic(topic.id)}
                      className="min-h-[188px] rounded-[32px] border-4 p-4 text-left transition-transform hover:-translate-y-1 focus-visible:outline-4 focus-visible:outline-slate-800"
                      style={{
                        background: isSelected ? tone.shell : tone.card,
                        borderColor: isSelected ? tone.accent : tone.border,
                        boxShadow: isSelected ? tone.shadow : shadows.clay,
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div
                          className="flex h-16 w-16 items-center justify-center rounded-[22px] text-xl font-black text-slate-800"
                          style={{
                            background: tone.accent,
                            boxShadow: `0 6px 0 ${tone.accentDark}, inset 0 1px 0 rgba(255,255,255,0.45)`,
                          }}
                        >
                          {topic.icon}
                        </div>
                        <div className="rounded-full border-4 border-white bg-white px-3 py-1 text-xs font-black text-slate-600 shadow-[0_4px_0_rgba(15,23,42,0.08)]">
                          {ui.ageBand}
                        </div>
                      </div>
                      <h3 className="mt-4 text-2xl font-black text-slate-800">
                        {topicLabel(topic.id, locale)}
                      </h3>
                      <p className="mt-2 text-sm font-bold leading-6 text-slate-600">
                        {topicHint(topic.id, locale)}
                      </p>
                      <div className="mt-4 flex items-center justify-between gap-3">
                        <span className="rounded-full bg-white px-3 py-2 text-xs font-black text-slate-600 shadow-[0_4px_0_rgba(15,23,42,0.06)]">
                          {topic.wordCount} {ui.words}
                        </span>
                        {topic.id === 'school' && (
                          <span className="rounded-full px-3 py-2 text-xs font-black text-slate-800" style={{ background: '#FFF3A3' }}>
                            {ui.recommended}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => setStep('goals')}
                  disabled={selectedTopics.length === 0}
                  className="min-h-14 rounded-[28px] border-4 px-6 text-base font-black text-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  style={{
                    background: colors.coralPink,
                    borderColor: '#FFFFFF',
                    boxShadow: shadows.clayPink,
                  }}
                >
                  {ui.next}
                </button>
              </div>
            </section>
          )}

          {step === 'goals' && (
            <section>
              <div className="mb-5">
                <h2 className="text-3xl font-black text-slate-800">{ui.goalsTitle}</h2>
                <p className="mt-1 font-bold text-slate-600">{ui.goalsBody}</p>
              </div>

              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_320px]">
                <GoalSelector
                  title={ui.timeGoal}
                  suffix={ui.timeSuffix}
                  value={dailyGoals.timeGoalMins}
                  values={timeOptions}
                  onSelect={(value) => setDailyGoals((current) => ({ ...current, timeGoalMins: value }))}
                  tone={palette[1]}
                />
                <GoalSelector
                  title={ui.wordGoal}
                  suffix={ui.wordsSuffix}
                  value={dailyGoals.wordsGoal}
                  values={wordOptions}
                  onSelect={(value) => setDailyGoals((current) => ({ ...current, wordsGoal: value }))}
                  tone={palette[0]}
                />
                <aside className="rounded-[32px] border-4 border-white bg-white p-5 shadow-[0_10px_0_rgba(26,39,68,0.08)]">
                  <h3 className="text-xl font-black text-slate-800">
                    {locale === 'vi' ? 'Tóm tắt lộ trình' : 'Path summary'}
                  </h3>
                  <div className="mt-4 space-y-3">
                    {selectedTopicDetails.map((topic) => (
                      <div key={topic.id} className="rounded-[22px] bg-slate-50 px-4 py-3">
                        <div className="text-sm font-black text-slate-800">{topicLabel(topic.id, locale)}</div>
                        <div className="mt-1 text-xs font-bold text-slate-500">{topicHint(topic.id, locale)}</div>
                      </div>
                    ))}
                  </div>
                </aside>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
                <button
                  type="button"
                  onClick={() => setStep('topics')}
                  className="min-h-14 rounded-[28px] border-4 border-white bg-white px-6 text-base font-black text-slate-700 shadow-[0_6px_0_rgba(148,163,184,0.18)]"
                >
                  {ui.back}
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isLoading}
                  className="min-h-14 rounded-[28px] border-4 border-white px-6 text-base font-black text-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  style={{
                    background: colors.mintGreen,
                    boxShadow: shadows.clayGreen,
                  }}
                >
                  {isLoading ? ui.saving : ui.save}
                </button>
              </div>
            </section>
          )}

          {step === 'complete' && (
            <section className="rounded-[32px] border-4 border-white bg-white px-5 py-6 text-center shadow-[0_10px_0_rgba(91,141,239,0.12)]">
              <div
                className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] text-2xl font-black text-slate-800"
                style={{
                  background: colors.sunshineYellow,
                  boxShadow: shadows.clayYellow,
                }}
              >
                OK
              </div>
              <h2 className="mt-5 text-3xl font-black text-slate-800">{ui.completeTitle}</h2>
              <p className="mx-auto mt-3 max-w-2xl font-bold leading-7 text-slate-600">
                {ui.completeBody}
              </p>
              <div className="mx-auto mt-6 grid max-w-3xl gap-3 sm:grid-cols-3">
                {selectedTopicDetails.slice(0, 3).map((topic, index) => {
                  const tone = palette[index % palette.length];
                  return (
                    <div
                      key={topic.id}
                      className="rounded-[26px] border-4 border-white px-4 py-4 text-left"
                      style={{
                        background: tone.shell,
                        boxShadow: '0 8px 0 rgba(26,39,68,0.08)',
                      }}
                    >
                      <div className="text-sm font-black text-slate-500">{ui.ageBand}</div>
                      <div className="mt-2 text-xl font-black text-slate-800">{topicLabel(topic.id, locale)}</div>
                      <div className="mt-2 text-sm font-bold text-slate-600">{topicHint(topic.id, locale)}</div>
                    </div>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => setStep('topics')}
                className="mt-6 min-h-14 rounded-[28px] border-4 border-white px-6 text-base font-black text-slate-800"
                style={{
                  background: colors.coralPink,
                  boxShadow: shadows.clayPink,
                }}
              >
                {ui.restart}
              </button>
            </section>
          )}
        </section>
      </div>
    </div>
  );
};

const GoalSelector: React.FC<{
  title: string;
  suffix: string;
  value: number;
  values: number[];
  onSelect: (value: number) => void;
  tone: {
    card: string;
    shell: string;
    border: string;
    shadow: string;
    accent: string;
    accentDark: string;
  };
}> = ({ title, suffix, value, values, onSelect, tone }) => (
  <section
    className="rounded-[32px] border-4 p-5"
    style={{
      background: tone.shell,
      borderColor: tone.border,
      boxShadow: tone.shadow,
    }}
  >
    <h3 className="text-2xl font-black text-slate-800">{title}</h3>
    <div className="mt-4 grid grid-cols-2 gap-2 sm:gap-3">
      {values.map((option) => {
        const isActive = option === value;
        return (
          <button
            key={option}
            type="button"
            onClick={() => onSelect(option)}
            className="min-h-[88px] rounded-[24px] border-4 px-4 py-3 text-center transition-transform hover:-translate-y-1"
            style={{
              background: '#FFFFFF',
              borderColor: isActive ? tone.accent : '#FFFFFF',
              boxShadow: isActive
                ? `0 8px 0 ${tone.accentDark}, inset 0 1px 0 rgba(255,255,255,0.7)`
                : '0 6px 0 rgba(148,163,184,0.18), inset 0 1px 0 rgba(255,255,255,0.9)',
            }}
          >
            <div className="text-3xl font-black text-slate-800">{option}</div>
            <div className="mt-1 text-xs font-black text-slate-500">{suffix}</div>
          </button>
        );
      })}
    </div>
  </section>
);

export default LearningPathSetup;

