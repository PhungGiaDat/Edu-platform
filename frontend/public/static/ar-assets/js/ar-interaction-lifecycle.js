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

export function shouldRevealAR({ cameraReady, primaryReady }) {
  return Boolean(cameraReady && primaryReady)
}

/**
 * Plans attachment for one tracked target instance. The caller owns the
 * Three.js objects; this helper deliberately owns no target identity or scene
 * mutation, so every model follows the same load/attach lifecycle.
 */
export function resolveTargetModelAttachment({
  targetName,
  instance,
  tracked,
  sceneReady,
}) {
  if (!targetName || !instance) return { action: 'skip', reason: 'missing_target_instance' }
  if (!tracked) return { action: 'wait', reason: 'target_not_tracked' }
  if (instance.modelState === 'error') return { action: 'skip', reason: 'model_error' }
  if (instance.modelState !== 'loaded' || !instance.model) {
    return { action: 'load', reason: 'model_not_loaded' }
  }
  if (!sceneReady || !instance.anchor || !instance.offsetGroup || !instance.surfaceRoot) {
    return { action: 'wait', reason: 'xr_scene_not_ready' }
  }
  return { action: 'attach', reason: 'ready' }
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

const PRESENTATION_MODE_AUTO = 'AUTO'
const PRESENTATION_MODE_SCREEN = 'SCREEN'
const PRESENTATION_MODE_TABLETOP = 'TABLETOP'
const DEFAULT_TABLETOP_ENTER_SCORE = 0.82
const DEFAULT_TABLETOP_EXIT_SCORE = 0.65
const DEFAULT_ORIENTATION_STABLE_MS = 400

export function resolvePresentationMode(requestedMode) {
  const normalized = String(requestedMode || '').trim().toUpperCase()
  if (normalized === PRESENTATION_MODE_SCREEN) return PRESENTATION_MODE_SCREEN
  if (normalized === PRESENTATION_MODE_TABLETOP) return PRESENTATION_MODE_TABLETOP
  return PRESENTATION_MODE_AUTO
}

function normalizeVector3(vector) {
  if (!vector) return null
  const { x, y, z } = vector
  if (![x, y, z].every(Number.isFinite)) return null
  const length = Math.hypot(x, y, z)
  if (length === 0) return null
  return { x: x / length, y: y / length, z: z / length }
}

export function getSurfaceFlatScore({ targetNormal, worldUp }) {
  const normalizedNormal = normalizeVector3(targetNormal)
  const normalizedWorldUp = normalizeVector3(worldUp)
  if (!normalizedNormal || !normalizedWorldUp) return null
  return Math.abs(
    normalizedNormal.x * normalizedWorldUp.x
    + normalizedNormal.y * normalizedWorldUp.y
    + normalizedNormal.z * normalizedWorldUp.z,
  )
}

export function getSurfaceAlignmentQuaternion({ presentationMode, targetNormal }) {
  if (resolvePresentationMode(presentationMode) !== PRESENTATION_MODE_TABLETOP) {
    return { x: 0, y: 0, z: 0, w: 1 }
  }

  const normal = normalizeVector3(targetNormal)
  if (!normal) return { x: 0, y: 0, z: 0, w: 1 }

  // Shortest rotation from model-local +Y to the target plane normal.
  // For antiparallel vectors, choose a stable perpendicular axis (+Z).
  if (normal.y <= -0.999999) return { x: 0, y: 0, z: 1, w: 0 }

  const raw = {
    x: normal.z,
    y: 0,
    z: -normal.x,
    w: 1 + normal.y,
  }
  const length = Math.hypot(raw.x, raw.y, raw.z, raw.w)
  if (length === 0) return { x: 0, y: 0, z: 0, w: 1 }
  return {
    x: raw.x / length,
    y: raw.y / length,
    z: raw.z / length,
    w: raw.w / length,
  }
}

const MODEL_PRESENTATION_PROFILES = Object.freeze({
  // A pet fills approximately one-and-a-quarter target widths. Per-asset
  // calibration stays declarative through presentation_scale_multiplier.
  pet: Object.freeze({
    name: 'pet',
    fitRatio: 1.25,
    minScale: 0.01,
    maxScale: 5,
  }),
})

const FORWARD_AXES = Object.freeze({
  '+X': Object.freeze({ x: 1, y: 0, z: 0, name: '+X' }),
  '-X': Object.freeze({ x: -1, y: 0, z: 0, name: '-X' }),
  '+Y': Object.freeze({ x: 0, y: 1, z: 0, name: '+Y' }),
  '-Y': Object.freeze({ x: 0, y: -1, z: 0, name: '-Y' }),
  '+Z': Object.freeze({ x: 0, y: 0, z: 1, name: '+Z' }),
  '-Z': Object.freeze({ x: 0, y: 0, z: -1, name: '-Z' }),
})

function parseVector3(value, fallback) {
  if (Array.isArray(value) && value.length === 3 && value.every(Number.isFinite)) {
    return [...value]
  }
  if (typeof value !== 'string') return [...fallback]
  const parsed = value.trim().split(/\s+/).map(Number)
  return parsed.length === 3 && parsed.every(Number.isFinite) ? parsed : [...fallback]
}

function parseUniformScale(value, fallback = 1) {
  const first = Array.isArray(value) ? value[0] : String(value ?? '').trim().split(/\s+/)[0]
  const parsed = Number(first)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export function resolveModelPresentationProfile(profileName) {
  const normalized = String(profileName || '').trim().toLowerCase()
  const profile = MODEL_PRESENTATION_PROFILES[normalized]
  return profile ? { ...profile } : null
}

export function resolveForwardAxis(axis) {
  const resolved = FORWARD_AXES[String(axis || '').trim().toUpperCase()]
  return resolved ? { ...resolved } : null
}

export function getGroundedCenterOffset(bounds) {
  const min = bounds?.min
  const max = bounds?.max
  const values = [min?.x, min?.y, min?.z, max?.x, max?.y, max?.z]
  if (!values.every(Number.isFinite)) return null
  return {
    x: -(min.x + max.x) / 2,
    y: -min.y,
    z: -(min.z + max.z) / 2,
  }
}

export function getPresentationBoundingWidth({ size, forwardAxis }) {
  const values = [size?.x, size?.y, size?.z]
  if (!values.every(Number.isFinite) || values.some((value) => value <= 0)) return null
  const axis = resolveForwardAxis(forwardAxis)
  if (!axis) return null
  if (axis.name === '+X' || axis.name === '-X') return size.z
  if (axis.name === '+Z' || axis.name === '-Z') return size.x
  return Math.max(size.x, size.z)
}

export function calculateAutoFitScale({
  boundingBoxWidth,
  physicalWidth,
  fitRatio,
  scaleMultiplier = 1,
  fallbackScale = 1,
  minScale = 0.01,
  maxScale = 5,
}) {
  const safeFallback = Number.isFinite(fallbackScale) && fallbackScale > 0 ? fallbackScale : 1
  if (!Number.isFinite(boundingBoxWidth) || boundingBoxWidth <= 0) {
    return { ok: false, reason: 'invalid_bounding_box_width', finalScale: safeFallback }
  }
  if (!Number.isFinite(physicalWidth) || physicalWidth <= 0) {
    return { ok: false, reason: 'invalid_physical_width', finalScale: safeFallback }
  }
  if (!Number.isFinite(fitRatio) || fitRatio <= 0) {
    return { ok: false, reason: 'invalid_fit_ratio', finalScale: safeFallback }
  }
  if (!Number.isFinite(scaleMultiplier) || scaleMultiplier <= 0) {
    return { ok: false, reason: 'invalid_scale_multiplier', finalScale: safeFallback }
  }

  const desiredWidth = physicalWidth * fitRatio
  const autoScale = desiredWidth / boundingBoxWidth
  const finalScale = autoScale * scaleMultiplier
  if (
    !Number.isFinite(finalScale)
    || finalScale < minScale
    || finalScale > maxScale
  ) {
    return { ok: false, reason: 'scale_out_of_bounds', finalScale: safeFallback }
  }
  return { ok: true, reason: 'auto_fit', desiredWidth, autoScale, finalScale }
}

export function resolveModelPresentation({ config, bounds, physicalWidth }) {
  const legacyPosition = parseVector3(config?.position, [0, 0, 0])
  const legacyRotation = parseVector3(config?.rotation, [0, 0, 0])
  const legacyScale = parseUniformScale(config?.scale, 1)
  const profile = resolveModelPresentationProfile(config?.presentation_profile)
  if (!profile) {
    return {
      mode: 'legacy',
      profile: null,
      position: legacyPosition,
      rotation: legacyRotation,
      finalScale: legacyScale,
      positionOffset: [0, 0, 0],
      forwardAxis: null,
      autoFit: null,
    }
  }

  const forwardAxis = resolveForwardAxis(config?.presentation_forward_axis) || resolveForwardAxis('+Z')
  const positionOffset = parseVector3(config?.presentation_position_offset, [0, 0, 0])
  const scaleMultiplier = Number(config?.presentation_scale_multiplier ?? 1)
  const boundingBoxWidth = getPresentationBoundingWidth({
    size: bounds?.size,
    forwardAxis: forwardAxis?.name,
  })
  const autoFit = calculateAutoFitScale({
    boundingBoxWidth,
    physicalWidth: Number(physicalWidth),
    fitRatio: profile.fitRatio,
    scaleMultiplier,
    fallbackScale: legacyScale,
    minScale: profile.minScale,
    maxScale: profile.maxScale,
  })

  return {
    mode: 'profile',
    profile: profile.name,
    position: positionOffset,
    rotation: [0, 0, 0],
    finalScale: autoFit.finalScale,
    positionOffset,
    forwardAxis,
    autoFit,
  }
}

export function classifySurfaceOrientation({
  requestedMode,
  flatScore,
  currentMode,
  candidateMode,
  candidateSince,
  now,
  tabletopEnterScore = DEFAULT_TABLETOP_ENTER_SCORE,
  tabletopExitScore = DEFAULT_TABLETOP_EXIT_SCORE,
  orientationStableMs = DEFAULT_ORIENTATION_STABLE_MS,
}) {
  const requested = resolvePresentationMode(requestedMode)
  const current = currentMode === PRESENTATION_MODE_TABLETOP
    ? PRESENTATION_MODE_TABLETOP
    : PRESENTATION_MODE_SCREEN

  if (requested !== PRESENTATION_MODE_AUTO) {
    return {
      presentationMode: requested,
      candidateMode: null,
      candidateSince: null,
      changed: current !== requested,
      reason: 'manual_override',
    }
  }

  if (!Number.isFinite(flatScore)) {
    return {
      presentationMode: PRESENTATION_MODE_SCREEN,
      candidateMode: null,
      candidateSince: null,
      changed: current !== PRESENTATION_MODE_SCREEN,
      reason: 'world_up_unavailable',
    }
  }

  const desired = flatScore >= tabletopEnterScore
    ? PRESENTATION_MODE_TABLETOP
    : flatScore <= tabletopExitScore
      ? PRESENTATION_MODE_SCREEN
      : current

  if (desired === current) {
    return {
      presentationMode: current,
      candidateMode: null,
      candidateSince: null,
      changed: false,
      reason: desired === PRESENTATION_MODE_TABLETOP ? 'auto_tabletop_hold' : 'auto_screen_hold',
    }
  }

  const candidateStartedAt = candidateMode === desired && Number.isFinite(candidateSince)
    ? candidateSince
    : now
  if (now - candidateStartedAt >= orientationStableMs) {
    return {
      presentationMode: desired,
      candidateMode: null,
      candidateSince: null,
      changed: true,
      reason: 'auto_stable',
    }
  }

  return {
    presentationMode: current,
    candidateMode: desired,
    candidateSince: candidateStartedAt,
    changed: false,
    reason: 'auto_candidate',
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
  const consumeAtRatio = Number.isFinite(rule?.action?.consumeAtRatio)
    ? rule.action.consumeAtRatio
    : Number.isFinite(rule?.consume_at_ratio)
      ? rule.consume_at_ratio
      : 0.65

  return {
    id: String(rule?.combo_id || ''),
    requiredTargets,
    actorTarget,
    partnerTargets,
    animation: rule?.animation_trigger || null,
    priority: Number(rule?.priority || 0),
    action: {
      consumePartners: rule?.action?.consumePartners ?? rule?.consume_partners ?? true,
      facePrimaryPartner: rule?.action?.facePrimaryPartner ?? rule?.face_primary_partner ?? true,
      consumeAtRatio,
    },
    proximity,
    actorSource,
    source: rule?.source === 'fallback' ? 'fallback' : 'backend',
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

export function distanceBetweenPositions(a, b) {
  if (!a || !b) return null
  const values = [a.x, a.y, a.z, b.x, b.y, b.z]
  if (!values.every(Number.isFinite)) return null

  const dx = a.x - b.x
  const dy = a.y - b.y
  const dz = a.z - b.z
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

export function resolveRuleProximityConfig(rule, fallback = null) {
  const proximity = rule?.proximity
  if (!proximity) return fallback
  const values = [
    proximity.enterDistance,
    proximity.exitDistance,
    proximity.stableMs,
    proximity.smoothingAlpha,
  ]
  if (!values.every(Number.isFinite)) return fallback

  return {
    enterDistance: proximity.enterDistance,
    exitDistance: proximity.exitDistance,
    stableMs: proximity.stableMs,
    smoothingAlpha: proximity.smoothingAlpha,
  }
}

export function getInteractionParticipantTargets(rule) {
  if (!rule?.actorTarget) return []
  return [rule.actorTarget, ...(rule.partnerTargets || [])]
}

export function getConsumablePartnerTargets(rule) {
  return Array.isArray(rule?.partnerTargets) ? [...rule.partnerTargets] : []
}

export function createInteractionTransaction({ runId, rule, lockedAt, watchdogAt }) {
  const actorTarget = rule?.actorTarget || null
  const partnerTargets = getConsumablePartnerTargets(rule)
  return {
    runId,
    ruleId: rule?.id || null,
    actorTarget,
    partnerTargets,
    participantTargets: actorTarget == null ? [] : [actorTarget, ...partnerTargets],
    lockedAt,
    watchdogAt,
  }
}

export function isInteractionTransactionLocked({ transaction, currentRunId }) {
  return transaction != null && transaction.runId === currentRunId
}

export function isInteractionRunOwner({ runId, currentRunId, transaction }) {
  return runId === currentRunId && isInteractionTransactionLocked({ transaction, currentRunId })
}

export function classifyInteractionTargetLoss({ transaction, targetName, currentRunId }) {
  if (!isInteractionTransactionLocked({ transaction, currentRunId })) {
    return { defer: false, role: null, runId: null }
  }
  if (targetName === transaction.actorTarget) {
    return { defer: true, role: 'actor', runId: transaction.runId }
  }
  if (transaction.partnerTargets.includes(targetName)) {
    return { defer: true, role: 'partner', runId: transaction.runId }
  }
  return { defer: false, role: null, runId: transaction.runId }
}

export function reconcileInteractionParticipantTracking({
  transaction,
  targetName,
  tracked,
  lossConfirmed,
}) {
  const isParticipant = transaction?.participantTargets?.includes(targetName) || false
  if (!isParticipant) {
    return {
      targetName,
      deferredLossConfirmed: false,
      result: 'not_a_participant',
    }
  }
  if (tracked) {
    return {
      targetName,
      deferredLossConfirmed: Boolean(lossConfirmed),
      result: 'resume_live_tracking',
    }
  }
  if (lossConfirmed) {
    return {
      targetName,
      deferredLossConfirmed: true,
      result: 'apply_confirmed_loss',
    }
  }
  return {
    targetName,
    deferredLossConfirmed: false,
    result: 'await_loss_grace',
  }
}

export function isInteractionTransactionWatchdogExpired({ now, transaction }) {
  return Number.isFinite(transaction?.watchdogAt) && now >= transaction.watchdogAt
}

export function setInteractionPartnerVisibility({ rule, targetInstances, visible }) {
  const changedTargets = []
  for (const targetName of getConsumablePartnerTargets(rule)) {
    const instance = targetInstances?.get?.(targetName)
    if (!instance) continue
    instance.visibleByInteraction = visible
    if (instance.model) instance.model.visible = Boolean(visible && instance.tracked)
    changedTargets.push(targetName)
  }
  return changedTargets
}

export function resolveInteractionAnimation({ rule, actorInstance }) {
  const requested = rule?.animation || null
  const animations = Array.isArray(actorInstance?.animations) ? actorInstance.animations : []
  const available = animations
    .map((clip) => clip?.name)
    .filter((name) => typeof name === 'string')
  const clip = requested == null
    ? null
    : animations.find((candidate) => candidate?.name === requested) || null

  return {
    ok: clip != null,
    clip,
    requested,
    available,
    shouldClearInteraction: clip == null,
  }
}

export function hasAnimationCapability(instanceLike, clipName) {
  if (!clipName || !Array.isArray(instanceLike?.animations)) return false
  return instanceLike.animations.some((clip) => clip?.name === clipName)
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
