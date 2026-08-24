/**
 * Pure dynamic-scale policy shared by the MindAR viewer and regression tests.
 * The measured bounding box is already in displayed/world units, so the next
 * entity scale must be relative to its current scale.
 */
(function (root) {
    'use strict';

    const DEFAULT_TARGET_SPAN = 0.75;
    const DEFAULT_MIN_SCALE = 0.001;
    const DEFAULT_MAX_SCALE = 20;
    const BOUNDS_EPSILON = 1e-6;

    function finitePositive(value, fallback) {
        const number = Number(value);
        return Number.isFinite(number) && number > 0 ? number : fallback;
    }

    function computeUniformScale(displayedMaxDimension, currentScale, options) {
        const maxDimension = Number(displayedMaxDimension);
        if (!Number.isFinite(maxDimension) || maxDimension <= BOUNDS_EPSILON) {
            return null;
        }

        const settings = options || {};
        const targetSpan = finitePositive(settings.targetSpan, DEFAULT_TARGET_SPAN);
        const minimum = finitePositive(settings.minScale, DEFAULT_MIN_SCALE);
        const maximum = Math.max(minimum, finitePositive(settings.maxScale, DEFAULT_MAX_SCALE));
        const current = finitePositive(currentScale, 1);
        const rawScale = current * (targetSpan / maxDimension);

        if (!Number.isFinite(rawScale) || rawScale <= 0) return null;
        return Math.max(minimum, Math.min(maximum, rawScale));
    }

    root.ARModelScale = Object.freeze({
        DEFAULT_TARGET_SPAN,
        DEFAULT_MIN_SCALE,
        DEFAULT_MAX_SCALE,
        computeUniformScale,
    });
})(typeof window !== 'undefined' ? window : globalThis);
