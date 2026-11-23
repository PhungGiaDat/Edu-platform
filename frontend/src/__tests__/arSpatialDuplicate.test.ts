import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { distanceBetweenPositions } from '../../public/static/ar-assets/js/ar-interaction-lifecycle.js'

const viewerSource = readFileSync(resolve(process.cwd(), 'public/ar-xr.html'), 'utf8')

function sliceBetween(source: string, start: string, end: string) {
  const from = source.indexOf(start)
  const to = source.indexOf(end, from + start.length)
  expect(from).toBeGreaterThanOrEqual(0)
  expect(to).toBeGreaterThan(from)
  return source.slice(from, to)
}

const section = sliceBetween(viewerSource, '// ========== SPATIAL DUPLICATE SUPPRESSION ==========', '\n    function waitForXR8')

type Position = { x: number; y: number; z: number }
type Owner = { existingTarget: string; distance: number } | null

// Runs the viewer's real helpers; `tracked` stands in for getEffectivelyTrackedTargetNames().
function loadHelpers(tracked: () => string[]) {
  return new Function('distanceBetweenPositions', 'getEffectivelyTrackedTargetNames', 'performance',
    `${section}; return { SPATIAL_DUPLICATE_DISTANCE, lastRawAnchorPositions, findSpatialDuplicateOwner, getSpatialOwnerPositions };`,
  )(distanceBetweenPositions, tracked, { now: () => 0 }) as {
    SPATIAL_DUPLICATE_DISTANCE: number
    lastRawAnchorPositions: Map<string, Position>
    findSpatialDuplicateOwner: (args: {
      candidateTarget: string, candidatePosition: Position, ownerPositions: Map<string, Position>, threshold: number
    }) => Owner
    getSpatialOwnerPositions: () => Map<string, Position>
  }
}

const origin = { x: 0, y: 0, z: 0 }
const at = (d: number) => ({ x: d, y: 0, z: 0 })

describe('spatial duplicate suppression', () => {
  const { SPATIAL_DUPLICATE_DISTANCE: threshold, findSpatialDuplicateOwner } = loadHelpers(() => [])
  const find = (candidateTarget: string, candidatePosition: Position, owners: Array<[string, Position]>) =>
    findSpatialDuplicateOwner({ candidateTarget, candidatePosition, ownerPositions: new Map(owners), threshold })

  it('uses the evidence-based 0.20 threshold', () => {
    expect(threshold).toBe(0.2)
  })

  it('rejects a different target 0.13 from a tracked owner', () => {
    expect(find('rabbit001', at(0.13), [['dog001', origin]])).toEqual({ existingTarget: 'dog001', distance: 0.13 })
  })

  it('reproduces the physical DOG/RABBIT cross-fire positions', () => {
    const owner = find('rabbit001', { x: 0.067, y: 0.512, z: -0.147 }, [['dog001', { x: 0.011, y: 0.442, z: -0.237 }]])
    expect(owner?.existingTarget).toBe('dog001')
    expect(owner!.distance).toBeCloseTo(0.127, 2)
  })

  it('allows a genuinely separate card such as BONE at 0.56', () => {
    expect(find('bone001', at(0.56), [['dog001', origin]])).toBeNull()
  })

  it('never treats the same target as its own duplicate', () => {
    expect(find('dog001', at(0.01), [['dog001', origin]])).toBeNull()
  })

  it('allows the candidate when nothing is tracked', () => {
    expect(find('rabbit001', at(0.01), [])).toBeNull()
  })

  it('lets CAT, DOG and BONE coexist when their cards are apart', () => {
    const owners: Array<[string, Position]> = [['cat001', at(-0.8)], ['dog001', origin]]
    expect(find('bone001', at(0.56), owners)).toBeNull()
  })

  it('releases ownership once the existing target is confirmed lost', () => {
    let tracked = ['dog001']
    const helpers = loadHelpers(() => tracked)
    helpers.lastRawAnchorPositions.set('dog001', origin)
    const check = () => helpers.findSpatialDuplicateOwner({
      candidateTarget: 'rabbit001', candidatePosition: at(0.13),
      ownerPositions: helpers.getSpatialOwnerPositions(), threshold: helpers.SPATIAL_DUPLICATE_DISTANCE,
    })
    expect(check()?.existingTarget).toBe('dog001')     // tracked or within loss grace
    tracked = []                                        // grace expired: confirmed loss
    expect(check()).toBeNull()
  })

  it('keeps the helpers generic', () => {
    expect(section).not.toMatch(/\b[a-z]+\d{3}\b/)
  })

  it('rejects before the model path and re-arms the candidate on raw loss', () => {
    const events = sliceBetween(viewerSource, 'const imageTargetEvents = {', '// Register pipeline modules')
    const found = sliceBetween(events, "event: 'reality.imagefound'", "event: 'reality.imageupdated'")
    const updated = sliceBetween(events, "event: 'reality.imageupdated'", "event: 'reality.imagelost'")
    const lost = events.slice(events.indexOf("event: 'reality.imagelost'"))

    const admission = found.indexOf('isRuntimeTargetAdmitted(detail.name)')
    const duplicateCheck = found.indexOf('findSpatialDuplicateOwner(')
    const rejectLog = found.indexOf("sendARDebug('TARGET_FOUND_REJECTED_SPATIAL_DUPLICATE'")
    const accept = found.indexOf('onTargetFound(detail)')
    expect(admission).toBeGreaterThanOrEqual(0)
    expect(duplicateCheck).toBeGreaterThan(admission)
    expect(rejectLog).toBeGreaterThan(duplicateCheck)
    expect(accept).toBeGreaterThan(rejectLog)
    for (const field of ['candidateTarget', 'existingTarget', 'distance', 'threshold']) {
      expect(found.slice(rejectLog, accept)).toContain(field)
    }
    expect(found.slice(duplicateCheck, accept)).toContain('spatialDuplicateTargets.add(detail.name)')
    expect(updated.indexOf('spatialDuplicateTargets.has(detail.name)')).toBeLessThan(updated.indexOf('saveTargetPose(detail)'))
    expect(lost.indexOf('spatialDuplicateTargets.delete(detail.name)')).toBeLessThan(lost.indexOf('onTargetLost(detail.name)'))
  })
})
