const CAT_MEOW_BLOCKING_PHASES = new Set([
  'COMBO_ARMED',
  'COMBO_TURNING',
  'COMBO_PLAYING',
])

export function shouldRevealAR({ cameraReady, catReady }) {
  return Boolean(cameraReady && catReady)
}

export function canPlayCatMeow({
  phase,
  catReturn,
  catReady,
  catTracked,
  catMeowing,
}) {
  return Boolean(
    catReady &&
      catTracked &&
      !catMeowing &&
      !catReturn &&
      !CAT_MEOW_BLOCKING_PHASES.has(phase),
  )
}

export function classifyCatTap({ meshHit, proxyHit }) {
  if (meshHit) return 'mesh'
  if (proxyHit) return 'proxy'
  return 'miss'
}

export function smoothstep(value) {
  const clamped = Math.min(1, Math.max(0, value))
  return clamped * clamped * (3 - 2 * clamped)
}

export function advanceCatReturnTween(now, returnState) {
  const elapsed = now - returnState.startedAt
  const progress = returnState.durationMs <= 0 ? 1 : elapsed / returnState.durationMs

  if (progress >= 1) {
    return { yaw: returnState.toYaw, complete: true }
  }

  const eased = smoothstep(progress)
  return {
    yaw: returnState.fromYaw + (returnState.toYaw - returnState.fromYaw) * eased,
    complete: false,
  }
}
