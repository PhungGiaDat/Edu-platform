import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { resolvePersistentMindViewerEnabled } from '@/config';

describe('persistent MindAR viewer rollout', () => {
  it('enables continuous scanning when the environment flag is absent', () => {
    expect(resolvePersistentMindViewerEnabled(undefined)).toBe(true);
  });

  it('keeps continuous scanning enabled for the explicit true value', () => {
    expect(resolvePersistentMindViewerEnabled('true')).toBe(true);
  });

  it('allows an explicit legacy rollback', () => {
    expect(resolvePersistentMindViewerEnabled('false')).toBe(false);
  });

  it('renders Add Card only in explicit legacy mode', () => {
    const source = fs.readFileSync(path.resolve(process.cwd(), 'src/pages/LearnARV2.tsx'), 'utf8');

    expect(source).toContain(
      "appState === 'VIEWING' && !isPersistentViewerEnabled && !isComboViewer",
    );
  });
});
