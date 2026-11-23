/**
 * @vitest-environment jsdom
 */

import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { CourseWarmupChallenge } from '@/features/courses/components/CourseWarmupChallenge';
import type { CourseWarmupQuestion } from '@/features/courses/courseWarmup';

const questions: CourseWarmupQuestion[] = [{
  question_id: 'animal-question',
  type: 'image_choice',
  prompt_vi: 'Con nao la con meo?',
  options: [
    { option_id: 'cat', label: 'Con meo' },
    { option_id: 'fish', label: 'Con ca' },
  ],
  correctOptionId: 'cat',
  feedbackCorrect: 'Dung roi!',
  feedbackIncorrect: 'Thu lai nhe!',
}];

describe('CourseWarmupChallenge', () => {
  it('renders nothing when no safe authored question is available', () => {
    const { container } = render(<CourseWarmupChallenge questions={[]} locale="vi" />);
    expect(container.innerHTML).toBe('');
  });

  it('gives gentle retry feedback, then completes locally after a correct answer', () => {
    const onComplete = vi.fn();
    render(<CourseWarmupChallenge questions={questions} locale="vi" onComplete={onComplete} />);

    expect(screen.getByRole('heading', { name: 'Chơi cùng Lexi' })).toBeTruthy();
    expect(screen.getByText('Con nao la con meo?')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Con ca' }));
    expect(screen.getByRole('status').textContent).toContain('Thu lai nhe!');
    expect(onComplete).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Con meo' }));
    expect(screen.getByRole('status').textContent).toContain('Dung roi!');
    fireEvent.click(screen.getByRole('button', { name: 'Xem đường nhiệm vụ' }));

    expect(screen.getByRole('status').textContent).toContain('Con đã khởi động xong!');
    fireEvent.click(screen.getByRole('button', { name: 'Xem đường nhiệm vụ' }));

    expect(onComplete).toHaveBeenCalledWith(1);
  });
});
