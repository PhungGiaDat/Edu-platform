/**
 * ar-target-registry.js
 *
 * Pure factory for the Shared-Mind Persistent Viewer's revisioned slot map.
 *
 * Every time the React parent sends a SET_ACTIVE_TARGETS message, the iframe
 * calls `registry.apply(snapshot)` to validate the payload and commit the new
 * slot bindings.  Lookups (`getByMindIndex`, `getBySlot`, `getByArTag`) are
 * then used to translate MindAR targetFound / targetLost / click events into
 * the parent's expected identity fields (slotIndex, mindTargetIndex, arTag).
 *
 * Throws strings so callers can propagate the exact code to the parent as a
 * rejection payload without string-parsing a boxed Error.
 *
 * Usage from ar-viewer.js:
 *
 *   const registry = ARTargetRegistry.create({ catalogId, targetCount });
 *   // on SET_ACTIVE_TARGETS message:
 *   registry.apply(payload);
 *   const entry = registry.getByMindIndex(foundIndex);
 *   if (entry) sendToParent('TARGET_FOUND', {
 *     targetIndex: foundIndex,
 *     slotIndex:    entry.slotIndex,
 *     mindTargetIndex: entry.mindTargetIndex,
 *     arTag:        entry.arTag,
 *   });
 */
(function (root) {
  'use strict';

  var REGISTRY_PRIVATE = Symbol('ar-target-registry-internal');

  /**
   * @param {{ catalogId: string, targetCount: number }} options
   * @returns {{ apply: Function, getByMindIndex: Function, getBySlot: Function, getByArTag: Function }}
   */
  function create(options) {
    var catalogId = options.catalogId;
    var targetCount = options.targetCount;

    // Revision starts at 0; first apply must use revision 1.
    var currentRevision = 0;

    // Map<mindTargetIndex, ActiveTarget>
    var byMind = new Map();
    // Map<slotIndex, ActiveTarget>
    var bySlot = new Map();
    // Map<arTag, ActiveTarget>
    var byTag = new Map();

    /**
     * Validate and commit a revisioned target snapshot.
     *
     * @param {{ catalogId: string, revision: number, targets: Array }} snapshot
     * @returns {{ byMindTargetIndex: Map, bySlot: Map }} maps for convenience
     * @throws {'ACTIVE_TARGETS_INVALID'} on malformed input
     * @throws {'ACTIVE_TARGETS_STALE'}   on old revision number
     */
    function apply(snapshot) {
      if (snapshot.catalogId !== catalogId) {
        throw 'ACTIVE_TARGETS_INVALID';
      }

      if (typeof snapshot.revision !== 'number' || snapshot.revision !== currentRevision + 1) {
        throw 'ACTIVE_TARGETS_STALE';
      }

      var targets = snapshot.targets;
      if (
        !Array.isArray(targets) ||
        targets.length < 1 ||
        targets.length > 2
      ) {
        throw 'ACTIVE_TARGETS_INVALID';
      }

      var seenSlots = new Set();
      var seenMind = new Set();

      for (var i = 0; i < targets.length; i++) {
        var t = targets[i];

        if (!Number.isInteger(t.slotIndex) || t.slotIndex < 0 || t.slotIndex > 1) {
          throw 'ACTIVE_TARGETS_INVALID';
        }

        if (
          !Number.isInteger(t.mindTargetIndex) ||
          t.mindTargetIndex < 0 ||
          t.mindTargetIndex >= targetCount
        ) {
          throw 'ACTIVE_TARGETS_INVALID';
        }

        if (!t.arTag || typeof t.arTag !== 'string' || t.arTag.trim() === '') {
          throw 'ACTIVE_TARGETS_INVALID';
        }

        if (!t.modelUrl || typeof t.modelUrl !== 'string' || t.modelUrl.trim() === '') {
          throw 'ACTIVE_TARGETS_INVALID';
        }

        if (seenSlots.has(t.slotIndex)) {
          throw 'ACTIVE_TARGETS_INVALID';
        }
        if (seenMind.has(t.mindTargetIndex)) {
          throw 'ACTIVE_TARGETS_INVALID';
        }

        seenSlots.add(t.slotIndex);
        seenMind.add(t.mindTargetIndex);
      }

      // Commit: clear previous bindings
      byMind.clear();
      bySlot.clear();
      byTag.clear();

      for (var j = 0; j < targets.length; j++) {
        var entry = targets[j];
        byMind.set(entry.mindTargetIndex, entry);
        bySlot.set(entry.slotIndex, entry);
        byTag.set(entry.arTag, entry);
      }

      currentRevision = snapshot.revision;

      return {
        byMindTargetIndex: new Map(byMind),
        bySlot: new Map(bySlot),
      };
    }

    function getByMindIndex(n) {
      return byMind.get(n);
    }

    function getBySlot(i) {
      return bySlot.get(i);
    }

    function getByArTag(tag) {
      return byTag.get(tag);
    }

    return {
      apply: apply,
      getByMindIndex: getByMindIndex,
      getBySlot: getBySlot,
      getByArTag: getByArTag,
    };
  }

  // Expose globally; ar-viewer.js will read this.
  root.ARTargetRegistry = { create: create };
})(typeof globalThis !== 'undefined' ? globalThis : window);
