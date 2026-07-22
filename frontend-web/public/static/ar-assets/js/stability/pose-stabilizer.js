import { StabilityGate } from './stability-gate.js';
import { averageSamples, isStable, getStabilityMetrics, smoothPose } from '../core/pose-averager.js';
import { ConfigLoader } from '../core/config-loader.js';

class PoseStabilizer {
    constructor(options = {}) {
        this._gate = new StabilityGate();
        this._configLoader = new ConfigLoader();
        this._config = null;
        this._options = options;
        this._poseGetters = new Map();
    }

    async init() {
        this._config = await this._configLoader.loadStabilityConfig({
            environment: this._options.environment
        });
        console.log('[PoseStabilizer] Config loaded:', this._config);
    }

    start(targetIndex, getPose) {
        this._poseGetters.set(targetIndex, getPose);
        this._gate.startTracking(targetIndex);
    }

    processFrame(targetIndex) {
        const getPose = this._poseGetters.get(targetIndex);
        if (!getPose) return null;

        const pose = getPose();
        if (!pose) {
            this._gate.reset(targetIndex);
            this._options.onUnstable?.(targetIndex);
            return null;
        }

        const isStable = this._gate.addSample(targetIndex, pose);
        
        if (isStable) {
            const tracking = this._gate._tracking?.get(targetIndex);
            const frozenPose = tracking 
                ? averageSamples(tracking.samples)
                : pose;
            
            this._options.onStable?.(targetIndex, frozenPose);
            return frozenPose;
        }
        return null;
    }

    isStable(targetIndex) {
        return this._gate.isStable(targetIndex);
    }

    stop(targetIndex) {
        this._gate.stopTracking(targetIndex);
        this._poseGetters.delete(targetIndex);
    }
}

export { PoseStabilizer };
