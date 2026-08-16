# Task 1.1 Brief: Core Math Utilities

## Task Overview
This is Task 1.1 of the AR Freeze Pose + Semantic Manager implementation. Creating modular math utilities for AR pose calculations.

## Requirements

### 1. `frontend-web/public/static/ar-assets/js/core/math-utils.js`
Pure mathematical functions - NO side effects, fully testable:
- `distance3D(a, b)` - Euclidean distance between two 3D points {x, y, z}
- `quaternionAngle(q1, q2)` - Angular distance between two quaternions (0 to Pi radians)
- `lerp(a, b, t)` - Linear interpolation
- `clamp(value, min, max)` - Clamp value between min/max
- `variance(values)` - Variance of array
- `stdDev(values)` - Standard deviation

### 2. `frontend-web/public/static/ar-assets/js/core/pose-averager.js`
Algorithms for averaging pose samples:
- `averageSamples(samples)` - Average positions and quaternions from multiple samples
- `isStable(samples, positionThreshold, rotationThreshold)` - Check if samples are within threshold
- Uses MathUtils for calculations

## Exact Code (from plan - use verbatim)

```javascript
// math-utils.js
const MathUtils = {
    distance3D(a, b) {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dz = b.z - a.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    },
    quaternionAngle(q1, q2) {
        const dot = q1.x * q2.x + q1.y * q2.y + q1.z * q2.z + q1.w * q2.w;
        return 2 * Math.acos(Math.min(1, Math.abs(dot)));
    },
    lerp(a, b, t) { return a + (b - a) * t; },
    clamp(value, min, max) { return Math.min(max, Math.max(min, value)); },
    variance(values) {
        if (values.length === 0) return 0;
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        return values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
    },
    stdDev(values) { return Math.sqrt(this.variance(values)); }
};
export { MathUtils };
```

```javascript
// pose-averager.js
import { MathUtils } from './math-utils.js';

const PoseAverager = {
    averageSamples(samples) {
        if (samples.length === 0) return null;
        if (samples.length === 1) return samples[0];

        const avgPos = {
            x: samples.reduce((s, s2) => s + s2.position.x, 0) / samples.length,
            y: samples.reduce((s, s2) => s + s2.position.y, 0) / samples.length,
            z: samples.reduce((s, s2) => s + s2.position.z, 0) / samples.length
        };

        const avgQuat = this._averageQuaternions(samples.map(s => s.quaternion));

        return { position: avgPos, quaternion: avgQuat };
    },

    _averageQuaternions(quaternions) {
        let qx = 0, qy = 0, qz = 0, qw = 0;
        
        for (const q of quaternions) {
            let qx2 = q.x, qy2 = q.y, qz2 = q.z, qw2 = q.w;
            if (q.x * quaternions[0].x + q.y * quaternions[0].y + 
                q.z * quaternions[0].z + q.w * quaternions[0].w < 0) {
                qx2 = -q.x; qy2 = -q.y; qz2 = -q.z; qw2 = -q.w;
            }
            qx += qx2; qy += qy2; qz += qz2; qw += qw2;
        }

        const len = Math.sqrt(qx * qx + qy * qy + qz * qz + qw * qw);
        return { x: qx / len, y: qy / len, z: qz / len, w: qw / len };
    },

    isStable(samples, positionThreshold, rotationThreshold) {
        if (samples.length < 3) return false;

        const avg = this.averageSamples(samples);
        if (!avg) return false;

        for (const sample of samples) {
            const posDist = MathUtils.distance3D(avg.position, sample.position);
            const rotDist = MathUtils.quaternionAngle(avg.quaternion, sample.quaternion);
            
            if (posDist > positionThreshold || rotDist > rotationThreshold) {
                return false;
            }
        }
        return true;
    }
};

export { PoseAverager };
```

## Deliverables
1. Create `frontend-web/public/static/ar-assets/js/core/math-utils.js`
2. Create `frontend-web/public/static/ar-assets/js/core/pose-averager.js`
3. Create test files for each:
   - `frontend-web/public/static/ar-assets/js/core/math-utils.test.js`
   - `frontend-web/public/static/ar-assets/js/core/pose-averager.test.js`

## Global Constraints (DO NOT VIOLATE)
1. **DO NOT REFACTOR** — Only add new functionality
2. **DO NOT BREAK** existing single-flashcard flow
3. All modules must use ES6 module syntax (export/import)

## Report Contract
Write a brief report to: `report/TASK_1.1_REPORT.md`
Include:
- Files created
- Functions implemented
- Test coverage
- Any concerns or notes

**Load skill: .cursor/skills/superpowers/skills/test-driven-development/SKILL.md**
Then implement following TDD: Write tests first, then implementation.
