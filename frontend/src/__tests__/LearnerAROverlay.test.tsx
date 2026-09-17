import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  LearnerAROverlay,
  type LearnerOverlayTarget,
} from '@/features/ar/components/LearnerAROverlay';

const activeTargets: LearnerOverlayTarget[] = [
  { targetName: 'cat001', word: 'cat', acquiredAt: 100 },
  { targetName: 'fish001', word: 'fish', acquiredAt: 200 },
];

function renderOverlay(overrides: Partial<React.ComponentProps<typeof LearnerAROverlay>> = {}) {
  const onSpeak = vi.fn();
  render(
    <LearnerAROverlay
      activeTargets={activeTargets}
      featuredTargetName="cat001"
      instruction="Hold a card in the camera view."
      feedback={{ id: 'cat-found', message: 'Card found: Cat' }}
      onSpeak={onSpeak}
      {...overrides}
    />,
  );
  return { onSpeak };
}

describe('LearnerAROverlay', () => {
  afterEach(cleanup);

  it('starts in compact mode with the featured target and learner instruction', () => {
    renderOverlay({ activeTargets: [activeTargets[0]] });

    expect(screen.getByTestId('learner-ar-overlay')).toHaveAttribute('data-mode', 'compact');
    expect(screen.getByTestId('learner-overlay-compact')).toBeInTheDocument();
    expect(screen.getByText('Cat')).toBeInTheDocument();
    expect(screen.getByText('Hold a card in the camera view.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hear Cat' })).toBeInTheDocument();
  });

  it('moves from compact to collapsed and back to compact', () => {
    renderOverlay();

    fireEvent.click(screen.getByRole('button', { name: 'Collapse learner overlay' }));
    expect(screen.getByTestId('learner-ar-overlay')).toHaveAttribute('data-mode', 'collapsed');
    expect(screen.getByTestId('learner-overlay-collapsed')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Expand learner overlay' }));
    expect(screen.getByTestId('learner-ar-overlay')).toHaveAttribute('data-mode', 'compact');
  });

  it('moves from compact to expanded and renders every active target', () => {
    renderOverlay();

    fireEvent.click(screen.getByRole('button', { name: 'Show all active cards' }));

    expect(screen.getByTestId('learner-ar-overlay')).toHaveAttribute('data-mode', 'expanded');
    expect(screen.getByTestId('learner-overlay-expanded')).toBeInTheDocument();
    expect(screen.getByText('Cat')).toBeInTheDocument();
    expect(screen.getByText('Fish')).toBeInTheDocument();
    expect(screen.getByText('2 active cards')).toBeInTheDocument();
  });

  it('delegates a generic target speaker action to its parent callback', () => {
    const { onSpeak } = renderOverlay();

    fireEvent.click(screen.getByRole('button', { name: 'Hear Cat' }));
    fireEvent.click(screen.getByRole('button', { name: 'Show all active cards' }));
    fireEvent.click(screen.getByRole('button', { name: 'Hear Fish' }));

    expect(onSpeak).toHaveBeenNthCalledWith(1, 'cat001');
    expect(onSpeak).toHaveBeenNthCalledWith(2, 'fish001');
  });

  it('remounts feedback when its parent supplies a new acquisition id', () => {
    const onSpeak = vi.fn();
    const props = {
      activeTargets: [activeTargets[0]],
      featuredTargetName: 'cat001',
      instruction: 'Hold a card in the camera view.',
      onSpeak,
    };
    const { rerender } = render(
      <LearnerAROverlay
        {...props}
        feedback={{ id: 'cat-found', message: 'Card found: Cat' }}
      />,
    );
    const firstFeedback = screen.getByRole('status');

    rerender(
      <LearnerAROverlay
        {...props}
        feedback={{ id: 'fish-found', message: 'Card found: Fish' }}
      />,
    );

    expect(screen.getByRole('status')).not.toBe(firstFeedback);
  });

  it('contains no operator or diagnostic UI', () => {
    renderOverlay();

    expect(screen.queryByText(/operator/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/diagnostic/i)).not.toBeInTheDocument();
    expect(screen.queryByTestId('operator-debug-ui')).not.toBeInTheDocument();
  });
});
