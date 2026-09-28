import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  normalizeInteractionRule,
  resolveSessionTargetAdmission,
} from '../../public/static/ar-assets/js/ar-interaction-lifecycle.js'

const viewerSource = readFileSync(resolve(process.cwd(), 'public/ar-xr.html'), 'utf8')

function sliceBetween(start: string, end: string) {
  const from = viewerSource.indexOf(start)
  const to = viewerSource.indexOf(end, from + start.length)
  expect(from).toBeGreaterThanOrEqual(0)
  expect(to).toBeGreaterThan(from)
  return viewerSource.slice(from, to)
}

const scopeSource = sliceBetween('// ========== XR TARGET SCOPE ==========', '// ========== MESSAGE LISTENER')
const { RULES_BEFORE_XR_WAIT_MS, waitForSettled, scopeXrTargetData } = new Function(
  `${scopeSource}; return { RULES_BEFORE_XR_WAIT_MS, waitForSettled, scopeXrTargetData };`,
)() as {
  RULES_BEFORE_XR_WAIT_MS: number
  waitForSettled: (promise: Promise<unknown>, timeoutMs: number) => Promise<boolean>
  scopeXrTargetData: <T extends { name: string }>(list: T[], ready: boolean, admitted: Set<string>) => T[]
}

const DEMO_INTERACTION_FALLBACKS = new Function(
  `return ${sliceBetween('Object.freeze([{', ']);')}]);`,
)() as Array<Record<string, unknown>>

const CATALOGUE = ['cat001', 'dog001', 'rabbit001', 'tiger001', 'elephant001', 'panda001',
  'fish001', 'bone001', 'carrot001', 'grass001', 'meat001', 'bamboo001'].map(name => ({ name }))

const backendRule = (actor: string, partner: string) => ({
  tags: [actor, partner],
  target_order: [actor, partner],
  combo_id: `clay_${actor}_${partner}`,
  animation_trigger: 'EAT',
  priority: 10,
  proximity: { enter_distance: 0.62, exit_distance: 0.7, proximity_stable_ms: 300, smoothing_alpha: 0.25 },
})

const scopeFor = (entryTarget: string, rawRules: Array<Record<string, unknown>>, catalogue = CATALOGUE) => {
  const admitted = resolveSessionTargetAdmission({ entryTarget, rules: rawRules.map(normalizeInteractionRule) })
  return scopeXrTargetData(catalogue, true, admitted).map(t => t.name)
}

describe('XR target scope', () => {
  it('registers only dog and bone for a DOG entry with the backend rule', () => {
    const rules = [backendRule('dog001', 'bone001'), backendRule('elephant001', 'grass001'), ...DEMO_INTERACTION_FALLBACKS]
    expect(scopeFor('dog001', rules)).toEqual(['dog001', 'bone001'])
  })

  it('registers only cat and fish for a CAT entry through the demo fallback rule', () => {
    expect(scopeFor('cat001', [backendRule('dog001', 'bone001'), ...DEMO_INTERACTION_FALLBACKS]))
      .toEqual(['cat001', 'fish001'])
  })

  it('excludes unrelated targets and keeps catalogue order', () => {
    const reversed = [...CATALOGUE].reverse()
    expect(scopeFor('dog001', [backendRule('dog001', 'bone001')], reversed)).toEqual(['bone001', 'dog001'])
  })

  it('falls back to the entry target alone when no rule contains it', () => {
    expect(scopeFor('panda001', [backendRule('dog001', 'bone001')])).toEqual(['panda001'])
  })

  it('keeps the full catalogue when rules are not ready or nothing matches', () => {
    expect(scopeXrTargetData(CATALOGUE, false, new Set(['dog001', 'bone001']))).toBe(CATALOGUE)
    expect(scopeXrTargetData(CATALOGUE, true, new Set(['unknown001']))).toBe(CATALOGUE)
  })

  it('bounds the rules wait and treats a rejected rules load as not ready', async () => {
    expect(RULES_BEFORE_XR_WAIT_MS).toBeGreaterThan(0)
    expect(RULES_BEFORE_XR_WAIT_MS).toBeLessThanOrEqual(1500)
    await expect(waitForSettled(Promise.resolve(true), 50)).resolves.toBe(true)
    await expect(waitForSettled(Promise.resolve(false), 50)).resolves.toBe(false)
    await expect(waitForSettled(new Promise(() => {}), 10)).resolves.toBe(false)
    await expect(waitForSettled(Promise.reject(new Error('rules')), 50)).resolves.toBe(false)
  })

  it('keeps the full catalogue when the real rules loader fails, while still installing fallbacks', async () => {
    const loaderSource = sliceBetween('async function loadComboRules()', '// ========== XR TARGET SCOPE')
    const makeLoader = (fetchImpl: () => Promise<unknown>) => {
      const installed: unknown[][] = []
      const load = new Function(
        'fetch', 'params', 'apiBase', 'sendARDebug', 'installInteractionRules',
        `${loaderSource}; return loadComboRules;`,
      )(fetchImpl, new URLSearchParams(), '', () => {}, (rules: unknown[]) => installed.push(rules)) as () => Promise<boolean>
      return { load, installed }
    }
    const dogRules = { rules: [backendRule('dog001', 'bone001')] }
    const cases: Array<[string, () => Promise<unknown>, boolean]> = [
      ['network error', () => Promise.reject(new TypeError('Failed to fetch')), false],
      ['non-2xx', () => Promise.resolve({ ok: false, status: 503 }), false],
      ['bad JSON', () => Promise.resolve({ ok: true, json: () => Promise.reject(new SyntaxError('bad')) }), false],
      ['success', () => Promise.resolve({ ok: true, json: () => Promise.resolve(dogRules) }), true],
    ]
    for (const [label, fetchImpl, expected] of cases) {
      const { load, installed } = makeLoader(fetchImpl)
      const rulesReady = await waitForSettled(load(), 200)
      expect(rulesReady, label).toBe(expected)
      expect(installed, label).toHaveLength(1)  // fallbacks install on every path
      const admitted = resolveSessionTargetAdmission({
        entryTarget: 'dog001',
        rules: (installed[0] as Array<Record<string, unknown>>).map(normalizeInteractionRule),
      })
      const registered = scopeXrTargetData(CATALOGUE, rulesReady, admitted).map(t => t.name)
      expect(registered, label).toEqual(expected ? ['dog001', 'bone001'] : CATALOGUE.map(t => t.name))
    }
  })

  it('keeps the scope logic generic and wires it between target data and XR init', () => {
    expect(scopeSource).not.toMatch(/\b[a-z]+\d{3}\b/)
    const mainSource = sliceBetween('async function main()', "if (document.readyState === 'loading')")
    const rulesStart = mainSource.indexOf('const rulesSettled = loadComboRules();')
    const targetsReady = mainSource.indexOf('const targetDataList = await targetsPromise;')
    const wait = mainSource.indexOf('await waitForSettled(rulesSettled, RULES_BEFORE_XR_WAIT_MS)')
    const scopeLog = mainSource.indexOf("sendARDebug('XR_TARGET_SCOPE'")
    const init = mainSource.indexOf('await initXR(xrTargetDataList);')
    expect(rulesStart).toBeGreaterThanOrEqual(0)
    expect(targetsReady).toBeGreaterThan(rulesStart)
    expect(wait).toBeGreaterThan(targetsReady)
    expect(scopeLog).toBeGreaterThan(wait)
    expect(init).toBeGreaterThan(scopeLog)
    for (const field of ['rulesReady', 'entryTarget', 'admittedTargets', 'registeredTargets', 'totalCatalogueTargets', 'waitedMs']) {
      expect(mainSource.slice(scopeLog, init)).toContain(field)
    }
  })
})
