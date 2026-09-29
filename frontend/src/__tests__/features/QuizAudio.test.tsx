import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { Lesson } from '@/types/course';
const audio = vi.hoisted(() => ({ playPronunciation: vi.fn<(...args: unknown[]) => Promise<void>>(), playSoundEffect: vi.fn(() => Promise.resolve()) }));
vi.mock('@/services/AudioService', () => ({ AudioService: audio }));
import { QuizSection } from '@/features/courses/components/lesson/QuizSection';
const lesson: Lesson = {
  lesson_id: 'elephant', title: 'Elephant', title_vi: 'Voi', video_duration: 0, description: '', order: 1, duration_minutes: 5,
  generatedMedia: [], images: [], scene_images: [],
  vocabulary: [{ word_en: 'Elephant', word_vi: 'Voi', emoji: '', simple_sentence: 'The elephant is big.', audio: { bucket: 'learnar-assets', path: 'elephant.wav', type: 'audio', status: 'ready' }, image: { bucket: 'learnar-assets', path: 'elephant.png', type: 'image', status: 'ready' } }],
  quiz: [{ question_id: 'q1', type: 'sound_choice', prompt_vi: 'Bé hãy chọn con voi.', questionAudioText: '  eLePhAnT  ', options: [{ option_id: 'a', label: 'Elephant' }, { option_id: 'b', label: 'Tree' }], correctOptionId: 'a', feedbackCorrect: '', feedbackIncorrect: '' }],
  reward: { xp: 1, badgeTitle: '', message_vi: '', sticker: { bucket: 'x', path: 'x.png', type: 'image', status: 'ready' } },
};
function showQuiz(text = lesson.quiz[0].questionAudioText) {
  return render(<QuizSection lesson={{ ...lesson, quiz: [{ ...lesson.quiz[0], questionAudioText: text }] }} answers={{}} onAnswerChange={vi.fn()} onSubmit={vi.fn()} isSubmitting={false} result={null} locale="vi" />);
}
describe('quiz question audio', () => {
  beforeEach(() => audio.playPronunciation.mockReset().mockResolvedValue(undefined));
  it('reuses authored word audio with an exact trimmed case-insensitive match', async () => {
    showQuiz();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: /Nghe câu hỏi/ })));
    expect(audio.playPronunciation).toHaveBeenCalledWith('eLePhAnT', 'en', '/learnar-assets/elephant.wav');
  });
  it('keeps a full sentence instead of substituting word-only audio', async () => {
    showQuiz('The elephant is big.');
    await act(async () => fireEvent.click(screen.getByRole('button', { name: /Nghe câu hỏi/ })));
    expect(audio.playPronunciation.mock.calls[0]?.slice(0, 2)).toEqual(['The elephant is big.', 'en']);
    expect(audio.playPronunciation.mock.calls[0]?.[2]).toBeUndefined();
  });
  it('reads the Vietnamese prompt when authored English audio text is blank', async () => {
    showQuiz('');
    await act(async () => fireEvent.click(screen.getByRole('button', { name: /Nghe câu hỏi/ })));
    expect(audio.playPronunciation).toHaveBeenCalledWith('Bé hãy chọn con voi.', 'vi', undefined);
  });
  it('disables repeat taps while pending and enables replay after completion', async () => {
    let finish!: () => void;
    audio.playPronunciation.mockReturnValueOnce(new Promise<void>(resolve => { finish = resolve; }));
    showQuiz();
    fireEvent.click(screen.getByRole('button', { name: /Nghe câu hỏi/ }));
    const pending = screen.getByRole('button', { name: 'Đang phát câu hỏi' }) as HTMLButtonElement;
    expect(pending.disabled).toBe(true);
    fireEvent.click(pending);
    expect(audio.playPronunciation).toHaveBeenCalledTimes(1);
    await act(async () => finish());
    expect((screen.getByRole('button', { name: /Nghe câu hỏi/ }) as HTMLButtonElement).disabled).toBe(false);
  });
  it('shows friendly failure copy and allows a successful retry', async () => {
    audio.playPronunciation.mockRejectedValueOnce(new Error('NotAllowedError'));
    showQuiz();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: /Nghe câu hỏi/ })));
    expect(screen.getByRole('alert').textContent).toContain('Bé chạm loa để thử lại nhé.');
    expect(screen.queryByText(/NotAllowedError/)).toBeNull();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: /Nghe câu hỏi/ })));
    expect(screen.queryByRole('alert')).toBeNull();
    expect(audio.playPronunciation).toHaveBeenCalledTimes(2);
  });
});
