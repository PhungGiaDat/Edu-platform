const CAT_MEOW_BLOCKING_PHASES = new Set([
  'COMBO_ARMED',
  'COMBO_TURNING',
  'COMBO_PLAYING',
])

const CAT_AMBIENT_BLOCKING_PHASES = new Set([
  'COMBO_ARMED',
  'COMBO_TURNING',
  'COMBO_PLAYING',
])

const CAT_FISH_PROXIMITY = Object.freeze({
  enterDistance: 0.52,
  exitDistance: 0.60,
  proximityStableMs: 300,
  smoothingAlpha: 0.25,
})

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

export function classifyCatGesture({ durationMs, dx, dy }) {
  const absDx = Math.abs(dx)
  const absDy = Math.abs(dy)
  const movement = Math.hypot(dx, dy)

  if (durationMs <= 700 && absDx >= 60 && absDx >= absDy * 1.4) return 'swipe'
  if (durationMs >= 450 && movement <= 18) return 'pet'
  if (durationMs < 350 && movement <= 14) return 'tap'
  return 'none'
}

export function getTargetLossGraceState({ lostAt, now, lostGraceMs }) {
  if (lostAt == null) {
    return {
      lostForMs: 0,
      withinGrace: false,
      confirmed: false,
      hide: false,
    }
  }

  const lostForMs = Math.max(0, now - lostAt)
  const withinGrace = lostForMs < lostGraceMs
  return {
    lostForMs,
    withinGrace,
    confirmed: !withinGrace,
    hide: !withinGrace,
  }
}

export function normalizeInteractionRule(rule) {
  const requiredTargets = Array.isArray(rule?.tags)
    ? rule.tags.filter((target) => typeof target === 'string' && target.length > 0)
    : []
  const orderedTargets = Array.isArray(rule?.target_order)
    ? rule.target_order.filter((target) => requiredTargets.includes(target))
    : []
  const actorSource = orderedTargets.length > 0
    ? 'target_order'
    : 'required_tags_fallback'
  const actorTarget = orderedTargets[0] ?? requiredTargets[0] ?? null
  const partnerTargets = actorTarget == null
    ? []
    : requiredTargets.filter((target) => target !== actorTarget)
  const proximity = rule?.proximity
    ? {
        enterDistance: rule.proximity.enter_distance,
        exitDistance: rule.proximity.exit_distance,
        stableMs: rule.proximity.proximity_stable_ms,
        smoothingAlpha: rule.proximity.smoothing_alpha,
      }
    : null

  return {
    id: String(rule?.combo_id || ''),
    requiredTargets,
    actorTarget,
    partnerTargets,
    animation: rule?.animation_trigger || null,
    priority: Number(rule?.priority || 0),
    proximity,
    actorSource,
    executable: requiredTargets.length === 2 && actorTarget != null && partnerTargets.length === 1,
  }
}

export function isInteractionRuleMatched(rule, trackedTargetNames) {
  if (!rule?.executable) return false
  const tracked = trackedTargetNames instanceof Set
    ? trackedTargetNames
    : new Set(trackedTargetNames || [])
  return rule.requiredTargets.every((target) => tracked.has(target))
}

export function selectActiveInteractionRule(rules, trackedTargetNames) {
  return (rules || [])
    .filter((rule) => isInteractionRuleMatched(rule, trackedTargetNames))
    .sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority
      return String(a.id).localeCompare(String(b.id))
    })[0] || null
}

export function resolveCatFishComboRule({ primaryTargetName, secondaryTargetName, rules }) {
  if (primaryTargetName !== 'cat001' || secondaryTargetName !== 'fish001') return null

  const rule = Array.isArray(rules)
    ? rules.find(candidate => {
      const tags = candidate?.tags
      return Array.isArray(tags) && tags.length === 2 && tags.includes('cat001') && tags.includes('fish001')
    })
    : null
  const proximity = rule?.proximity
  const fromBackend = proximity &&
    proximity.enter_distance === CAT_FISH_PROXIMITY.enterDistance &&
    proximity.exit_distance === CAT_FISH_PROXIMITY.exitDistance &&
    proximity.proximity_stable_ms === CAT_FISH_PROXIMITY.proximityStableMs &&
    proximity.smoothing_alpha === CAT_FISH_PROXIMITY.smoothingAlpha

  return {
    primaryTargetName,
    secondaryTargetName,
    source: fromBackend ? 'backend' : 'fallback',
    ...CAT_FISH_PROXIMITY,
  }
}

export function selectComboSecondaryTargetName({ primaryTargetName, targetNames }) {
  if (primaryTargetName === 'cat001' && targetNames.includes('fish001')) {
    return 'fish001'
  }
  return targetNames.find(targetName => targetName !== primaryTargetName) || null
}

export function advanceComboProximityGate({ now, distance, enteredAt, comboConsumed, config }) {
  if (distance == null) {
    return { enteredAt: null, stable: false, rearmEligible: false }
  }
  if (comboConsumed) {
    return {
      enteredAt: null,
      stable: false,
      rearmEligible: distance >= config.exitDistance,
    }
  }
  if (distance > config.enterDistance) {
    return { enteredAt: null, stable: false, rearmEligible: false }
  }

  const nextEnteredAt = enteredAt ?? now
  return {
    enteredAt: nextEnteredAt,
    stable: now - nextEnteredAt >= config.proximityStableMs,
    rearmEligible: false,
  }
}

export function isCatOneShotCompletionOwner({ capturedGeneration, capturedAction, current }) {
  return capturedGeneration === current?.generation && capturedAction === current?.action
}

export function shouldReplaceCatAnimation({ currentPriority, nextPriority }) {
  return nextPriority >= currentPriority
}

export function getEligibleCatAmbient({
  now,
  idleSince,
  nextClip,
  activeOneShot,
  pointerGestureActive,
  catReturn,
  phase,
}) {
  if (
    activeOneShot ||
    pointerGestureActive ||
    catReturn ||
    CAT_AMBIENT_BLOCKING_PHASES.has(phase)
  ) return null

  const delayMs = nextClip === 'CAT_SIT' ? 16000 : 8000
  return now - idleSince >= delayMs ? nextClip : null
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
