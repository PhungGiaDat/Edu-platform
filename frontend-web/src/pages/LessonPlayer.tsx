import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import {
    ActivityCard,
    AssetTile,
    ImageQuiz,
    RewardPopup,
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
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!courseId || !lessonId) return;
        setIsLoading(true);
        setError(null);
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

    if (isLoading) {
        return <div className="min-h-screen clay-bg-playful p-6 text-center text-xl font-black text-slate-700">Dang mo bai hoc...</div>;
    }

    if (!lesson || error) {
        return (
            <div className="min-h-screen clay-bg-playful p-6 text-center">
                <p className="text-xl font-black text-rose-600">{error || 'Khong co bai hoc.'}</p>
                <button onClick={() => navigate('/courses')} className="clay-cta-primary mt-4">Ve Course Catalog</button>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full max-w-[100vw] min-w-0 overflow-x-hidden clay-bg-playful pb-[calc(env(safe-area-inset-bottom)+12rem)] md:pb-10">
            <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <button onClick={() => navigate(`/courses/${courseId}`)} className="clay-btn clay-btn-sm bg-white text-slate-700">
                        Back
                    </button>
                    <div className="clay-badge clay-badge-yellow self-start sm:self-auto">
                        🎁 {lesson.reward?.xp || 0} XP
                    </div>
                </div>

                <header className="mb-6 rounded-[32px] border-4 border-white bg-white/85 p-5 shadow-[0_10px_0_rgba(91,141,239,0.12)]">
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-center">
                        <div>
                            <p className="text-sm font-black text-sky-600">Lesson {lesson.order} • {lesson.duration_minutes} min</p>
                            <h1 className="mt-1 text-3xl font-black leading-tight text-slate-800 sm:text-4xl">{lesson.title}</h1>
                            <p className="mt-2 text-lg font-bold text-slate-500">{lesson.title_vi || lesson.description}</p>
                        </div>
                        <AssetTile asset={lesson.videoLesson?.thumbnail} label="Video preview" emoji="🎬" />
                    </div>
                </header>

                <div className="space-y-8">
                    {lesson.videoLesson && <section className="rounded-[28px] border-4 border-white bg-slate-950 p-4 text-white shadow-[0_8px_0_rgba(15,23,42,0.16)]">
                        <div className="flex aspect-video items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-emerald-300 text-center">
                            <div>
                                <div className="text-6xl">▶️</div>
                                <p className="mt-2 text-xl font-black">{lesson.videoLesson.title}</p>
                                <p className="text-sm font-bold opacity-80">
                                    {lesson.videoLesson.duration_seconds}s • {lesson.videoLesson.video.status}
                                </p>
                            </div>
                        </div>
                    </section>}

                    {lesson.videoLesson && <VideoScenePreview scenes={lesson.videoLesson.scenes} />}
                    <VocabularyCards items={lesson.vocabulary} />
                    {lesson.activity && <ActivityCard activity={lesson.activity} />}

                    {lesson.arReference && (
                        <button className="clay-cta-secondary w-full justify-center">
                            Scan Flashcard
                        </button>
                    )}

                    <ImageQuiz
                        questions={lesson.quiz}
                        answers={answers}
                        onAnswer={(questionId, optionId) => {
                            setAnswers(prev => ({ ...prev, [questionId]: optionId }));
                            setResult(null);
                        }}
                    />

                    {result && (
                        <div className="rounded-[28px] border-4 border-white bg-white p-4 text-center shadow-[0_8px_0_rgba(91,141,239,0.12)]">
                            <p className="text-3xl font-black text-slate-800">{result.score}%</p>
                            <p className="font-bold text-slate-600">
                                {result.passed ? 'Gioi qua! Be da qua bai quiz.' : 'Tot lam! Be thu lai de lay phan thuong nhe.'}
                            </p>
                        </div>
                    )}

                    <button
                        onClick={handleSubmit}
                        disabled={!allAnswered || isSubmitting}
                        className="clay-cta-primary w-full justify-center disabled:opacity-60"
                    >
                        {isSubmitting ? 'Dang cham diem...' : 'Hoan thanh bai hoc'}
                    </button>
                </div>
            </div>

            {reward && <RewardPopup reward={reward} onClose={() => setReward(null)} />}
        </div>
    );
};

export default LessonPlayer;
