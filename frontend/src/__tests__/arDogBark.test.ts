import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { selectCapabilityTargetInstance } from '../../public/static/ar-assets/js/ar-interaction-lifecycle.js'

const viewerSource = readFileSync(resolve(process.cwd(), 'public/ar-xr.html'), 'utf8')

function sliceBetween(start: string, end: string) {
  const from = viewerSource.indexOf(start)
  const to = viewerSource.indexOf(end, from + start.length)
  expect(from).toBeGreaterThanOrEqual(0)
  expect(to).toBeGreaterThan(from)
  return viewerSource.slice(from, to)
}

const dogBlock = sliceBetween('// ========== DOG TAP / BARK ==========', '// Pointer event handler')

class FakeAudio {
  static created: FakeAudio[] = []
  currentTime = 7
  plays = 0
  preload = ''
  playsInline = false
  error = null
  src: string
  constructor(src: string) { this.src = src; FakeAudio.created.push(this) }
  load() {}
  play() { this.plays += 1; return Promise.resolve() }
}

type Hit = { target: string; source: string; distance: number }
type DogApi = {
  getDogBarkInstance: () => { config: { qr_id: string } } | null
  canTriggerDogBark: () => boolean
  requestDogBarkAudio: () => void
  preloadDogBarkAudio: () => void
  pickTapTarget: (hits: Hit[]) => Hit | null
  DOG_AUDIO_CONFIG: { barkUrl: string }
}

function bootDog({ tracked = true, visible = true, ready = true, locked = false, ownsDog = false } = {}) {
  FakeAudio.created = []
  const logs: string[] = []
  const catAnimationState = { action: null, generation: 3 }
  const dog = { config: { qr_id: 'dog001' }, modelState: 'loaded', model: { visible }, tracked, interactionReady: ready }
  const cat = { config: { qr_id: 'cat001' }, modelState: 'loaded', model: { visible: true }, tracked: true, interactionReady: true }
  const api = new Function(
    'targetInstances', 'selectCapabilityTargetInstance', 'sendARDebug', 'Audio',
    'isInteractionExecutionLocked', 'isTargetInActiveInteraction',
    `${dogBlock}; return { getDogBarkInstance, canTriggerDogBark, requestDogBarkAudio, preloadDogBarkAudio, pickTapTarget, DOG_AUDIO_CONFIG };`,
  )(new Map<string, unknown>([['cat001', cat], ['dog001', dog]]), selectCapabilityTargetInstance,
    (type: string) => logs.push(type), FakeAudio, () => locked, (name: string) => ownsDog && name === 'dog001') as DogApi
  return { ...api, logs, dog, catAnimationState }
}

describe('DOG tap bark', () => {
  const { pickTapTarget } = bootDog()

  it('resolves a CAT hit to CAT and a DOG hit to DOG', () => {
    expect(pickTapTarget([{ target: 'cat', source: 'mesh', distance: 0.5 }])?.target).toBe('cat')
    expect(pickTapTarget([{ target: 'dog', source: 'mesh', distance: 0.5 }])?.target).toBe('dog')
  })

  it('picks the nearest animal when one ray hits both', () => {
    expect(pickTapTarget([{ target: 'cat', source: 'mesh', distance: 0.9 }, { target: 'dog', source: 'mesh', distance: 0.4 }])?.target).toBe('dog')
    expect(pickTapTarget([{ target: 'cat', source: 'mesh', distance: 0.3 }, { target: 'dog', source: 'mesh', distance: 0.4 }])?.target).toBe('cat')
  })

  it('never lets the CAT near-miss proxy steal a real DOG mesh hit', () => {
    expect(pickTapTarget([{ target: 'cat', source: 'proxy', distance: 0.2 }, { target: 'dog', source: 'mesh', distance: 0.6 }])?.target).toBe('dog')
  })

  it('resolves a miss to nothing', () => {
    expect(pickTapTarget([])).toBeNull()
  })

  it('selects DOG by exact target identity only when tracked, visible and interaction-ready', () => {
    expect(bootDog().getDogBarkInstance()?.config.qr_id).toBe('dog001')
    for (const blocked of [{ tracked: false }, { visible: false }, { ready: false }]) {
      expect(bootDog(blocked).canTriggerDogBark(), JSON.stringify(blocked)).toBe(false)
    }
  })

  it('blocks the bark only while a committed combo owns DOG', () => {
    expect(bootDog({ locked: true, ownsDog: true }).canTriggerDogBark()).toBe(false)
    expect(bootDog({ locked: true, ownsDog: false }).canTriggerDogBark()).toBe(true)
    expect(bootDog({ locked: false, ownsDog: true }).canTriggerDogBark()).toBe(true)
  })

  it('restarts the bark from 0 on every tap and leaves CAT animation state alone', async () => {
    const h = bootDog()
    h.preloadDogBarkAudio()
    h.preloadDogBarkAudio()
    expect(FakeAudio.created).toHaveLength(1)
    const audio = FakeAudio.created[0]
    expect(audio.src).toBe(h.DOG_AUDIO_CONFIG.barkUrl)
    expect(audio.preload).toBe('auto')
    expect(audio.playsInline).toBe(true)
    h.requestDogBarkAudio()
    audio.currentTime = 0.4
    h.requestDogBarkAudio()
    await Promise.resolve()
    expect(audio.plays).toBe(2)
    expect(audio.currentTime).toBe(0)
    expect(h.logs.filter(type => type === 'DOG_BARK_AUDIO_REQUESTED')).toHaveLength(2)
    expect(h.logs).toContain('DOG_BARK_AUDIO_PLAYING')
    expect(h.catAnimationState).toEqual({ action: null, generation: 3 })
  })

  it('reports a rejected play as telemetry only', async () => {
    const h = bootDog()
    h.preloadDogBarkAudio()
    FakeAudio.created[0].play = () => Promise.reject(new Error('NotAllowedError'))
    expect(() => h.requestDogBarkAudio()).not.toThrow()
    await Promise.resolve(); await Promise.resolve()
    expect(h.logs).toContain('DOG_BARK_AUDIO_PLAY_ERROR')
  })

  it('wires one shared ray into CAT and DOG and barks only on a short DOG tap', () => {
    const down = sliceBetween('function onPointerDown(event)', '\n    function onPointerUp(event)')
    const up = sliceBetween('function onPointerUp(event)', '\n    function onPointerCancel(event)')
    expect(down.match(/pointerNdc\.x =/g)).toHaveLength(1)
    expect(down).toContain('raycaster.intersectObject(dogInst.model, true)')
    expect(down).toContain('pickTapTarget(')
    expect(down).not.toContain('intersectObjects(scene.children')
    expect(up).toMatch(/classifyCatGesture\(\{ durationMs, dx, dy \}\) === 'tap' && canTriggerDogBark\(\)/)
    expect(up.indexOf('requestDogBarkAudio()')).toBeLessThan(up.indexOf('catPointerGesture.active ||'))
    const loadComplete = sliceBetween('if (isCatMascotInstance(instance)) preloadCatMeowAudio();', 'if (targetName === primaryModelTargetName')
    expect(loadComplete).toContain('preloadDogBarkAudio()')
  })
})
