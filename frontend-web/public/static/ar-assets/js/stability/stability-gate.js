import { MathUtils } from '../core/math-utils.js';

class StabilityGate {
    constructor() {
        this._tracking = new Map();
        this._stableTargets = new Set();
    }

    startTracking(targetIndex) {
        this._tracking.set(targetIndex, { count: 0, samples: [] });
    }

    addSample(targetIndex, pose) {
        const tracking = this._tracking.get(targetIndex);
        if (!tracking) return false;

        tracking.samples.push(pose);
        
        const MAX_SAMPLES = 20;
        if (tracking.samples.length > MAX_SAMPLES) {
            tracking.samples.shift();
        }

        if (tracking.samples.length >= 3) {
            const avg = this._computeAverage(tracking.samples);
            if (this._isWithinThreshold(tracking.samples, avg, 0.02, 0.1)) {
                tracking.count++;
            } else {
                tracking.count = 0;
            }
        }

        if (tracking.count >= 15 && !this._stableTargets.has(targetIndex)) {
            this._stableTargets.add(targetIndex);
            return true;
        }
        return false;
    }

    isStable(targetIndex) {
        return this._stableTargets.has(targetIndex);
    }

    stopTracking(targetIndex) {
        this._tracking.delete(targetIndex);
    }

    reset(targetIndex) {
        this._stableTargets.delete(targetIndex);
        const tracking = this._tracking.get(targetIndex);
        if (tracking) {
            tracking.count = 0;
            tracking.samples = [];
        }
    }

    getFrameCount(targetIndex) {
        return this._tracking.get(targetIndex)?.count || 0;
    }

    _computeAverage(samples) {
        const n = samples.length;
        return {
            position: {
                x: samples.reduce((s, p) => s + p.position.x, 0) / n,
                y: samples.reduce((s, p) => s + p.position.y, 0) / n,
                z: samples.reduce((s, p) => s + p.position.z, 0) / n
            },
            quaternion: samples[samples.length - 1].quaternion
        };
    }

    _isWithinThreshold(samples, avg, posThresh, rotThresh) {
        for (const sample of samples) {
            const posDist = MathUtils.distance3D(avg.position, sample.position);
            if (posDist > posThresh) return false;
        }
        return true;
    }
}

export { StabilityGate };
