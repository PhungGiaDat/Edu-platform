import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button } from '@/shared/components/ui/Button';

describe('Button — variant/caller style merge (ISSUE-007)', () => {
  it('keeps variant defaults that the caller style does not set', () => {
    render(
      <Button variant="primary" style={{ backgroundColor: 'gold' }}>
        Go
      </Button>,
    );
    const btn = screen.getByRole('button', { name: /go/i });
    // caller override applies
    expect(btn.style.backgroundColor).toBe('gold');
    // variant default survives (was previously wiped by replace semantics)
    expect(btn.style.color).toBe('white');
  });

  it('lets the caller win per-property', () => {
    render(
      <Button variant="primary" style={{ color: 'rgb(15, 23, 42)' }}>
        Save
      </Button>,
    );
    const btn = screen.getByRole('button', { name: /save/i });
    expect(btn.style.color).toBe('rgb(15, 23, 42)');
    // untouched variant default still present
    expect(btn.style.backgroundColor).toBeTruthy();
  });

  it('merges boxShadow and border from the variant when caller overrides bg', () => {
    render(
      <Button variant="outline" style={{ backgroundColor: '#EFF6FF' }}>
        Cancel
      </Button>,
    );
    const btn = screen.getByRole('button', { name: /cancel/i });
    // jsdom normalizes hex to rgb()
    expect(btn.style.backgroundColor).toBe('rgb(239, 246, 255)');
    expect(btn.style.border).toContain('2px');
  });
});
