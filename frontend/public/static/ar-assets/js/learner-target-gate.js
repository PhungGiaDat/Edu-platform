export const LEARNER_TARGET_STABLE_DWELL_MS = 300;

/**
 * Keeps learner-facing acquisition events independent from raw XR events.
 * Rendering and runtime loss grace remain owned by the iframe runtime.
 */
export function createLearnerTargetGate({
  dwellMs = LEARNER_TARGET_STABLE_DWELL_MS,
  onStableFound = () => {},
  onStableLost = () => {},
} = {}) {
  const targets = new Map();

  function onFound({ targetName, word, acquiredAt }) {
    if (typeof targetName !== 'string' || !targetName) return;

    const existing = targets.get(targetName);
    if (existing?.stable || existing?.timer) return;

    const state = {
      stable: false,
      timer: null,
      word,
      acquiredAt,
    };

    state.timer = setTimeout(() => {
      if (targets.get(targetName) !== state || state.stable) return;

      state.timer = null;
      state.stable = true;
      onStableFound({ targetName, word: state.word, acquiredAt: state.acquiredAt });
    }, dwellMs);

    targets.set(targetName, state);
  }

  function onRawLost(targetName) {
    const state = targets.get(targetName);
    if (!state || state.stable) return;

    clearTimeout(state.timer);
    targets.delete(targetName);
  }

  function onConfirmedLoss({ targetName, lostAt }) {
    const state = targets.get(targetName);
    if (!state) return;

    clearTimeout(state.timer);
    targets.delete(targetName);

    if (state.stable) {
      onStableLost({ targetName, lostAt });
    }
  }

  function dispose() {
    for (const state of targets.values()) {
      clearTimeout(state.timer);
    }
    targets.clear();
  }

  return { onFound, onRawLost, onConfirmedLoss, dispose };
}
