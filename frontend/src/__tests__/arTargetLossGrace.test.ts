import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  advanceComboProximityGate,
  advanceTargetAcquisitionState,
  distanceBetweenPositions,
  getTargetLossGraceState,
} from '../../public/static/ar-assets/js/ar-interaction-lifecycle.js'

const viewerSource = readFileSync(resolve(process.cwd(), 'public/ar-xr.html'), 'utf8')

function sliceBetween(start: string, end: string) {
  const from = viewerSource.indexOf(start)
  const to = viewerSource.indexOf(end, from + start.length)
  expect(from).toBeGreaterThanOrEqual(0)
  expect(to).toBeGreaterThan(from)
  return viewerSource.slice(from, to)
}

const INTERACTION_CONFIG = new Function(
  `return ${sliceBetween('const INTERACTION_CONFIG = {', '};').replace('const INTERACTION_CONFIG = ', '')}};`,
)() as { lostGraceMs: number }

type Harness = {
  found: (name: string, at: number, x?: number) => void
  lost: (name: string, at: number) => void
  tick: (at: number) => void
  distance: (a: string, b: string) => number | null
  logs: string[]
  model: (name: string) => { visible: boolean }
}

// Runs the viewer's real found/lost/grace/distance code with the rest of the page stubbed.
function boot({ deferLoss = false } = {}): Harness {
  let clock = 0
  const logs: string[] = []
  const targetInstances = new Map(['dog001', 'bone001'].map(name => [name, {
    config: { qr_id: name }, tracked: false, lostAt: null, foundAt: null, stable: false, model: { visible: true },
  }]))
  const interactionState = { pendingGraceHides: new Map(), filteredDistance: null as number | null, transaction: null, phase: 'SEARCH_PRIMARY' }
  const noop = () => {}
  const deps: Record<string, unknown> = {
    targetInstances, interactionState, INTERACTION_CONFIG,
    trackedTargets: new Map(), lastRawAnchorPositions: new Map(), targetConfigByName: new Map(),
    performance: { now: () => clock, timeOrigin: 0 },
    getTargetLossGraceState, advanceTargetAcquisitionState, distanceBetweenPositions,
    learnerTargetGate: { onFound: noop, onRawLost: noop, onConfirmedLoss: noop },
    sendARDebug: (type: string) => logs.push(type), sendMessage: noop, showCardLabel: noop,
    isCatMascotInstance: () => false, resetCatAmbientIdle: noop, attachTrackedTargetModel: noop,
    primaryModelTargetName: 'dog001', resetInteractionSession: noop, resetVisualPose: noop,
    isTargetInActiveInteraction: () => false,
    getActiveTransactionLossDecision: () => (deferLoss ? { defer: true, role: 'partner', runId: 1 } : { defer: false }),
  }
  const body = [
    sliceBetween('function saveTargetPose(detail)', '// ========== SPATIAL DUPLICATE'),
    sliceBetween('function getAnchorWorldPosition(', 'function getInteractionRuleById('),
    sliceBetween('function hideConfirmedTargetLoss(', 'function evaluateInteraction('),
    sliceBetween('function onTargetFound(detail)', '// ========== COMBO DETECTION'),
    'return { onTargetFound, onTargetLost, processPendingTargetLosses, computeTargetPairDistance, updateFilteredDistance };',
  ].join('\n')
  const api = new Function(...Object.keys(deps), body)(...Object.values(deps))
  return {
    found: (name, at, x = 0) => { clock = at; api.onTargetFound({ name, position: { x, y: 0, z: 0 } }) },
    lost: (name, at) => { clock = at; api.onTargetLost(name) },
    tick: (at) => { clock = at; api.processPendingTargetLosses(at) },
    distance: (a, b) => api.updateFilteredDistance(
      api.computeTargetPairDistance(targetInstances.get(a), targetInstances.get(b)), { smoothingAlpha: 0.25 }),
    logs,
    model: (name) => targetInstances.get(name)!.model,
  }
}

describe('target loss grace', () => {
  it('is 550 ms', () => {
    expect(INTERACTION_CONFIG.lostGraceMs).toBe(550)
  })

  it.each([156, 435])('reacquire %i ms after loss is within grace with no hide', (gap) => {
    const h = boot()
    h.found('dog001', 0)
    h.lost('dog001', 1000)
    h.tick(1000 + gap - 1)
    expect(h.model('dog001').visible).toBe(true)
    h.found('dog001', 1000 + gap)
    h.tick(1000 + 2000)
    expect(h.logs).toContain('TARGET_REACQUIRED_WITHIN_GRACE')
    expect(h.logs).not.toContain('TARGET_LOST_CONFIRMED')
    expect(h.logs).not.toContain('MODEL_HIDDEN_TARGET_LOST')
    expect(h.model('dog001').visible).toBe(true)
  })

  it('keeps the model visible while pending and hides only after 550 ms', () => {
    const h = boot()
    h.found('dog001', 0)
    h.lost('dog001', 1000)
    h.tick(1549)
    expect(h.model('dog001').visible).toBe(true)
    expect(h.logs).not.toContain('TARGET_LOST_CONFIRMED')
    h.tick(1551)
    expect(h.logs).toContain('TARGET_LOST_CONFIRMED')
    expect(h.logs).toContain('MODEL_HIDDEN_TARGET_LOST')
    expect(h.model('dog001').visible).toBe(false)
  })

  it('gives a pending-loss partner no stale pose for proximity, so it cannot newly arm a combo', () => {
    const h = boot()
    h.found('dog001', 0, 0)
    h.found('bone001', 0, 0.3)
    expect(h.distance('dog001', 'bone001')).toBeCloseTo(0.3)
    h.lost('bone001', 1000)
    h.tick(1200) // inside grace: still effectively tracked, model still visible
    expect(h.model('bone001').visible).toBe(true)
    expect(h.distance('dog001', 'bone001')).toBeNull()
    // Arming is only reachable through a non-null filtered distance.
    const gate = sliceBetween('// ---- Proximity enter / stable / combo arm ----', "sendARDebug('COMBO_ARMED'")
    expect(gate).toMatch(/^[^\n]*\n\s*if \(filtered != null && /)
    expect(viewerSource.match(/setInteractionPhase\(InteractionPhase\.COMBO_ARMED\)/g)).toHaveLength(1)
  })

  it('restarts the proximity-stable timer after a pose gap, so reacquire needs fresh stable proximity', () => {
    const proximity = sliceBetween('const filtered = updateFilteredDistance(raw, proximityConfig);', '// Throttled proximity log')
    expect(proximity).toContain('if (filtered == null) interactionState.proximityEnteredAt = null;')
    // With the timer cleared, the first fresh in-range sample after reacquire only starts a new window.
    const config = { enterDistance: 0.62, exitDistance: 0.7, proximityStableMs: 300 }
    const first = advanceComboProximityGate({ now: 1435, distance: 0.3, enteredAt: null, comboConsumed: false, config })
    expect(first.stable).toBe(false)
    expect(advanceComboProximityGate({ now: 1735, distance: 0.3, enteredAt: first.enteredAt, comboConsumed: false, config }).stable).toBe(true)
  })

  it('still defers a confirmed loss owned by a committed combo transaction', () => {
    const h = boot({ deferLoss: true })
    h.found('bone001', 0)
    h.lost('bone001', 1000)
    h.tick(1600)
    expect(h.logs).toContain('INTERACTION_TARGET_LOSS_DEFERRED')
    expect(h.logs).not.toContain('MODEL_HIDDEN_TARGET_LOST')
    expect(h.model('bone001').visible).toBe(true)
  })
})
