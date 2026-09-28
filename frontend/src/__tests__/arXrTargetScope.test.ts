import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  normalizeInteractionRule,
  selectActiveInteractionRule,
} from '../../public/static/ar-assets/js/ar-interaction-lifecycle.js'

const viewerSource = readFileSync(resolve(process.cwd(), 'public/ar-xr.html'), 'utf8')

function sliceBetween(start: string, end: string) {
  const from = viewerSource.indexOf(start)
  const to = viewerSource.indexOf(end, from + start.length)
  expect(from).toBeGreaterThanOrEqual(0)
  expect(to).toBeGreaterThan(from)
  return viewerSource.slice(from, to)
}

const CATALOGUE = ['cat001', 'dog001', 'rabbit001', 'tiger001', 'elephant001', 'panda001',
  'fish001', 'bone001', 'carrot001', 'grass001', 'meat001', 'bamboo001']

const DEMO_INTERACTION_FALLBACKS = new Function(
  `return ${sliceBetween('Object.freeze([{', ']);')}]);`,
)() as Array<Record<string, unknown>>

const backendRule = (actor: string, partner: string) => ({
  tags: [actor, partner],
  target_order: [actor, partner],
  combo_id: `clay_${actor}_${partner}`,
  animation_trigger: 'EAT',
  priority: 10,
  proximity: { enter_distance: 0.62, exit_distance: 0.7, proximity_stable_ms: 300, smoothing_alpha: 0.25 },
})

// Runs the viewer's real admission code against a session catalogue entered via `entryTarget`.
function bootAdmission(entryTarget: string) {
  const logs: Array<[string, Record<string, unknown>]> = []
  const init = sliceBetween('let admittedTargetNames =', '\n')
  const admission = sliceBetween('function refreshSessionTargetAdmission()', '\n    if (isDebug)')
  const isRuntimeTargetAdmitted = new Function(
    'targetInstances', 'primaryModelTargetName', 'sendDebugOnly',
    `${init}\nlet sessionAdmissionLogEmitted = false;\n${admission}
     refreshSessionTargetAdmission();
     return isRuntimeTargetAdmitted;`,
  )(new Map(CATALOGUE.map(name => [name, {}])), entryTarget,
    (type: string, payload: Record<string, unknown>) => logs.push([type, payload])) as (name: string) => boolean
  return { isRuntimeTargetAdmitted, logs }
}

describe('multi-target session contract', () => {
  it('admits DOG and BONE in a CAT-entry session and rejects only non-catalogue targets', () => {
    const { isRuntimeTargetAdmitted, logs } = bootAdmission('cat001')
    for (const name of CATALOGUE) expect(isRuntimeTargetAdmitted(name), name).toBe(true)
    expect(isRuntimeTargetAdmitted('unknown999')).toBe(false)
    expect(logs).toEqual([['SESSION_TARGET_ADMISSION', {
      entryTarget: 'cat001', admittedTargets: CATALOGUE, source: 'session-catalogue',
    }]])
  })

  it('lets the DOG+BONE rule execute in a CAT-entry session while CAT stays tracked', () => {
    const rules = [backendRule('dog001', 'bone001'), ...DEMO_INTERACTION_FALLBACKS].map(normalizeInteractionRule)
    const rule = selectActiveInteractionRule(rules, new Set(['cat001', 'dog001', 'bone001']))
    expect(rule?.actorTarget).toBe('dog001')
    expect(rule?.partnerTargets).toEqual(['bone001'])
  })

  it('still resolves CAT+FISH through the demo fallback', () => {
    const rules = [backendRule('dog001', 'bone001'), ...DEMO_INTERACTION_FALLBACKS].map(normalizeInteractionRule)
    const rule = selectActiveInteractionRule(rules, new Set(['cat001', 'fish001']))
    expect(rule?.actorTarget).toBe('cat001')
    expect(rule?.partnerTargets).toEqual(['fish001'])
  })

  it('registers the full catalogue and never blocks XR boot on the rules request', () => {
    const mainSource = sliceBetween('async function main()', "if (document.readyState === 'loading')")
    expect(mainSource).toContain('loadComboRules();')
    expect(mainSource).not.toContain('await loadComboRules')
    expect(mainSource).toContain('await initXR(targetDataList);')
    expect(viewerSource).not.toContain('scopeXrTargetData')
    expect(viewerSource).not.toContain('waitForSettled')
    expect(viewerSource).toContain('const imageTargetData = targetDataList.map(')
  })

  it('reports rules-load success truthfully and installs fallbacks on every path', async () => {
    const loaderSource = sliceBetween('async function loadComboRules()', '// ========== MESSAGE LISTENER')
    const cases: Array<[string, () => Promise<unknown>, boolean]> = [
      ['network error', () => Promise.reject(new TypeError('Failed to fetch')), false],
      ['non-2xx', () => Promise.resolve({ ok: false, status: 503 }), false],
      ['bad JSON', () => Promise.resolve({ ok: true, json: () => Promise.reject(new SyntaxError('bad')) }), false],
      ['success', () => Promise.resolve({ ok: true, json: () => Promise.resolve({ rules: [backendRule('dog001', 'bone001')] }) }), true],
    ]
    for (const [label, fetchImpl, expected] of cases) {
      const installed: unknown[][] = []
      const load = new Function(
        'fetch', 'params', 'apiBase', 'sendARDebug', 'installInteractionRules',
        `${loaderSource}; return loadComboRules;`,
      )(fetchImpl, new URLSearchParams(), '', () => {}, (rules: unknown[]) => installed.push(rules)) as () => Promise<boolean>
      await expect(load(), label).resolves.toBe(expected)
      expect(installed, label).toHaveLength(1)
    }
  })
})
