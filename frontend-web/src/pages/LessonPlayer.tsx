import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import {
    ActivityCard,
    AssetTile,
    ImageQuiz,
    PronunciationCard,
    ReadAloudStoryCard,
    RewardPopup,
    SectionGameCard,
    VideoScenePreview,
    VocabularyCards,
} from '@/components/courses/CourseLearningBlocks';
import { useAuth } from '@/contexts/AuthContext';
import { courseService } from '@/services/CourseService';
import type { Lesson, QuizSubmitResult, Reward } from '@/types/course';

const getLearnerId = (userId?: string | null) => userId || 'guest-learner';

export const LessonPlayer: React.FC = () => {
    const { courseId, lessonId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [lesson, setLesson] = useState<Lesson | null>(null);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [result, setResult] = useState<QuizSubmitResult | null>(null);
    const [reward, setReward] = useState<Reward | null>(null);
    const [activeStep, setActiveStep] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!courseId || !lessonId) return;
        setIsLoading(true);
        setError(null);
        setActiveStep(0);
        setAnswers({});
        setResult(null);
        courseService.getLesson(courseId, lessonId)
            .then(setLesson)
            .catch(err => {
                console.error('[LessonPlayer] load error:', err);
                setError('Chua tai duoc bai hoc.');
            })
            .finally(() => setIsLoading(false));
    }, [courseId, lessonId]);

    const allAnswered = useMemo(() => {
        if (!lesson) return false;
        return lesson.quiz.every(question => Boolean(answers[question.question_id]));
    }, [answers, lesson]);

    const handleSubmit = async () => {
        if (!courseId || !lessonId || !lesson || !allAnswered) return;
        setIsSubmitting(true);
        try {
            const quizResult = await courseService.submitQuiz(courseId, lessonId, answers, getLearnerId(user?.id));
            setResult(quizResult);
            if (quizResult.passed && quizResult.reward) {
                await courseService.completeLesson(courseId, lessonId, getLearnerId(user?.id));
                setReward(quizResult.reward);
            }
        } catch (err) {
            console.error('[LessonPlayer] submit error:', err);
            setError('Quiz chua gui duoc. Be thu lai nhe!');
        } finally {
            setIsSubmitting(false);
        }
    };

    const steps = useMemo(() => {
        if (!lesson) return [];
        return [
            {
                id: 'video',
                label: 'Watch',
                title: lesson.videoLesson?.title || lesson.title,
                content: lesson.videoLesson ? (
                    <section className="rounded-[32px] border-4 border-white bg-slate-950 p-4 text-white shadow-[0_8px_0_rgba(15,23,42,0.16)]">
                        <div className="flex aspect-video items-center justify-center rounded-3xl bg-gradient-to-br from-[#5B8DEF] via-[#6EE7B7] to-[#FFD93D] text-center">
                            <div className="px-4">
                                <div className="text-5xl font-black">Play</div>
                                <p className="mt-3 text-2xl font-black">{lesson.videoLesson.title}</p>
                                <p className="mt-1 text-sm font-bold opacity-85">
                                    {lesson.videoLesson.duration_seconds}s - {lesson.videoLesson.video.status}
                                </p>
                            </div>
                        </div>
                    </section>
                ) : null,
            },
            lesson.videoLesson && {
                id: 'story',
                label: 'Story',
                title: 'Short video story',
                content: <VideoScenePreview scenes={lesson.videoLesson.scenes} />,
            },
            lesson.game && {
                id: 'game',
                label: 'Game',
                title: 'Check after video',
                content: <SectionGameCard game={lesson.game} />,
            },
            {
                id: 'words',
                label: 'Words',
                title: 'New words',
                content: <VocabularyCards items={lesson.vocabulary} />,
            },
            lesson.readAloudStory && {
                id: 'read',
                label: 'Read',
                title: 'Read-aloud story',
                content: <ReadAloudStoryCard story={lesson.readAloudStory} />,
            },
            lesson.pronunciation && {
                id: 'say',
                label: 'Say',
                title: 'Pronunciation test',
                content: <PronunciationCard task={lesson.pronunciation} />,
            },
            lesson.activity && {
                id: 'activity',
                label: 'Do',
                title: 'Picture activity',
                content: <ActivityCard activity={lesson.activity} />,
            },
            lesson.arReference && {
                id: 'ar',
                label: 'AR',
                title: 'Flashcard scan',
                content: (
                    <section className="rounded-[32px] border-4 border-white bg-white p-6 text-center shadow-[0_8px_0_rgba(91,141,239,0.12)]">
                        <h2 className="text-3xl font-black text-slate-800">Scan Flashcard</h2>
                        <p className="mx-auto mt-2 max-w-md font-bold text-slate-500">
                            This section is ready to connect with LearnAR later.
                        </p>
                        <button type="button" className="clay-cta-secondary mt-5 w-full justify-center sm:w-auto">
                            Scan Flashcard
                        </button>
                    </section>
                ),
            },
            {
                id: 'quiz',
                label: 'Quiz',
                title: 'Fun quiz',
                content: (
                    <ImageQuiz
                        questions={lesson.quiz}
                        answers={answers}
                        onAnswer={(questionId, optionId) => {
                            setAnswers(prev => ({ ...prev, [questionId]: optionId }));
                            setResult(null);
                        }}
                    />
                ),
            },
            {
                id: 'finish',
                label: 'Finish',
                title: 'Earn reward',
                content: (
                    <section className="rounded-[32px] border-4 border-white bg-gradient-to-br from-yellow-100 via-white to-sky-100 p-6 text-center shadow-[0_8px_0_rgba(91,141,239,0.12)]">
                        <AssetTile asset={lesson.reward?.sticker} label={lesson.reward?.badgeTitle || 'Reward'} emoji="reward" className="mx-auto max-w-sm" />
                        <p className="mt-4 text-3xl font-black text-slate-800">Ready for your reward?</p>
                        <p className="mt-2 font-bold text-slate-500">
                            Answer the quiz, then finish this section.
                        </p>
                        {result && (
                            <div className="mx-auto mt-4 max-w-sm rounded-3xl bg-white px-5 py-4 shadow-sm">
                                <p className="text-3xl font-black text-slate-800">{result.score}%</p>
                                <p className="font-bold text-slate-600">
                                    {result.passed ? 'Gioi qua! Be da qua bai quiz.' : 'Tot lam! Be thu lai de lay phan thuong nhe.'}
                                </p>
                            </div>
                        )}
                    </section>
                ),
            },
        ].filter(Boolean) as Array<{ id: string; label: string; title: string; content: React.ReactNode }>;
    }, [answers, lesson, result]);

    if (isLoading) {
        return <div className="min-h-screen clay-bg-playful p-6 text-center text-xl font-black text-slate-700">Dang mo bai hoc...</div>;
    }

    if (!lesson || error) {
        return (
            <div className="min-h-screen clay-bg-playful p-6 text-center">
                <p className="text-xl font-black text-rose-600">{error || 'Khong co bai hoc.'}</p>
                <button type="button" onClick={() => navigate('/courses')} className="clay-cta-primary mt-4">Ve Course Catalog</button>
            </div>
        );
    }

    const currentStep = steps[Math.min(activeStep, steps.length - 1)];
    const isQuizStep = currentStep?.id === 'quiz';
    const isFinishStep = currentStep?.id === 'finish';
    const progress = Math.round(((activeStep + 1) / Math.max(steps.length, 1)) * 100);
    const canGoNext = !isQuizStep || allAnswered;

    return (
        <div className="flex min-h-[100dvh] w-full max-w-[100vw] min-w-0 flex-col overflow-hidden clay-bg-playful pb-[calc(env(safe-area-inset-bottom)+7rem)] md:pb-6">
            <div className="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-1 flex-col px-4 py-4 sm:px-6 lg:px-8">
                <div className="mb-4 flex items-center justify-between gap-3">
                    <button type="button" onClick={() => navigate(`/courses/${courseId}`)} className="clay-btn clay-btn-sm bg-white text-slate-700">
                        Back
                    </button>
                    <div className="rounded-full bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-sm">
                        Section {lesson.order} - {progress}%
                    </div>
                </div>

                <header className="mb-4 rounded-[30px] border-4 border-white bg-white/85 p-4 shadow-[0_10px_0_rgba(91,141,239,0.12)]">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                            <p className="text-sm font-black text-sky-600">{currentStep.label}</p>
                            <h1 className="text-2xl font-black leading-tight text-slate-800 sm:text-4xl">{lesson.title}</h1>
                            <p className="font-bold text-slate-500">{currentStep.title}</p>
                        </div>
                        <div className="h-3 overflow-hidden rounded-full bg-slate-100 sm:w-56">
                            <div className="h-full rounded-full bg-gradient-to-r from-[#5B8DEF] via-[#B19CD9] to-[#FF8E8E]" style={{ width: `${progress}%` }} />
                        </div>
                    </div>
                    <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                        {steps.map((step, index) => (
                            <button
                                key={step.id}
                                type="button"
                                onClick={() => setActiveStep(index)}
                                className={`h-10 shrink-0 rounded-full px-4 text-sm font-black transition ${
                                    index === activeStep ? 'bg-sky-500 text-white shadow-sm' : 'bg-white text-slate-500'
                                }`}
                            >
                                {step.label}
                            </button>
                        ))}
                    </div>
                </header>

                <main className="min-h-0 flex-1 overflow-y-auto rounded-[34px] border-4 border-white/80 bg-white/45 p-3 shadow-inner sm:p-5">
                    {currentStep.content}
                </main>

                <footer className="mt-4 grid grid-cols-2 gap-3 sm:flex sm:justify-between">
                    <button
                        type="button"
                        onClick={() => setActiveStep(step => Math.max(0, step - 1))}
                        disabled={activeStep === 0}
                        className="clay-btn justify-center bg-white text-slate-700 disabled:opacity-50"
                    >
                        Previous
                    </button>
                    {isFinishStep ? (
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={!allAnswered || isSubmitting}
                            className="clay-cta-primary justify-center disabled:opacity-60"
                        >
                            {isSubmitting ? 'Dang cham diem...' : 'Hoan thanh'}
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={() => setActiveStep(step => Math.min(steps.length - 1, step + 1))}
                            disabled={!canGoNext}
                            className="clay-cta-primary justify-center disabled:opacity-60"
                        >
                            Next
                        </button>
                    )}
                </footer>
            </div>

            {reward && <RewardPopup reward={reward} onClose={() => setReward(null)} />}
        </div>
    );
};

export default LessonPlayer;
