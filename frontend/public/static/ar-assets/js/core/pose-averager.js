/**
 * Pose Averager - Algorithms for averaging pose samples
 * Used by the AR Stability System for filtering and smoothing
 */

import { MathUtils } from './math-utils.js';

/**
 * Average samples (positions and quaternions) from multiple pose samples
 * Uses arithmetic mean for positions and quaternion averaging for rotations
 * @param {Array} samples - Array of pose samples, each containing:
 *   { position: {x, y, z}, quaternion: {x, y, z, w} }
 * @returns {Object} Averaged pose { position: {x, y, z}, quaternion: {x, y, z, w} }
 */
const averageSamples = (samples) => {
    if (!samples || samples.length === 0) {
        return {
            position: { x: 0, y: 0, z: 0 },
            quaternion: { x: 0, y: 0, z: 0, w: 1 }
        };
    }

    if (samples.length === 1) {
        return {
            position: { ...samples[0].position },
            quaternion: { ...samples[0].quaternion }
        };
    }

    // Average positions (arithmetic mean)
    const avgPosition = {
        x: samples.reduce((sum, s) => sum + s.position.x, 0) / samples.length,
        y: samples.reduce((sum, s) => sum + s.position.y, 0) / samples.length,
        z: samples.reduce((sum, s) => sum + s.position.z, 0) / samples.length
    };

    // Average quaternions using markley method (slerp-based)
    // For simplicity, we use simple component averaging with normalization
    // A more robust implementation would use the markley method
    const avgQuaternion = averageQuaternions(samples.map(s => s.quaternion));

    return {
        position: avgPosition,
        quaternion: avgQuaternion
    };
};

/**
 * Average multiple quaternions using simple averaging with normalization
 * Note: This is a simplified approach; for production use, consider
 * the Markley et al. method which handles the quaternion double-cover problem
 * @param {Array} quaternions - Array of quaternions {x, y, z, w}
 * @returns {Object} Averaged quaternion
 */
const averageQuaternions = (quaternions) => {
    if (quaternions.length === 0) {
        return { x: 0, y: 0, z: 0, w: 1 };
    }

    if (quaternions.length === 1) {
        return { ...quaternions[0] };
    }

    // Sum all quaternion components
    let x = 0, y = 0, z = 0, w = 0;
    for (const q of quaternions) {
        x += q.x;
        y += q.y;
        z += q.z;
        w += q.w;
    }

    // Normalize
    const magnitude = Math.sqrt(x * x + y * y + z * z + w * w);
    if (magnitude === 0) {
        return { x: 0, y: 0, z: 0, w: 1 };
    }

    return {
        x: x / magnitude,
        y: y / magnitude,
        z: z / magnitude,
        w: w / magnitude
    };
};

/**
 * Check if a set of samples is "stable" based on position and rotation thresholds
 * @param {Array} samples - Array of pose samples
 * @param {number} positionThreshold - Max allowed position variance (in same units as position)
 * @param {number} rotationThreshold - Max allowed rotation variance (in radians)
 * @returns {boolean} True if samples are within thresholds
 */
const isStable = (samples, positionThreshold, rotationThreshold) => {
    if (!samples || samples.length < 2) {
        return true; // Single sample or empty is considered stable
    }

    // Calculate position variance using MathUtils
    const xValues = samples.map(s => s.position.x);
    const yValues = samples.map(s => s.position.y);
    const zValues = samples.map(s => s.position.z);
    
    const xVariance = MathUtils.variance(xValues);
    const yVariance = MathUtils.variance(yValues);
    const zVariance = MathUtils.variance(zValues);
    
    // Combined position variance (sqrt of sum of variances = sqrt of covariance diagonal)
    const positionVariance = Math.sqrt(xVariance + yVariance + zVariance);

    // Calculate rotation variance
    // Use quaternion-to-Euler variance as a proxy
    // For simplicity, we calculate variance of w component (cos(theta/2))
    const wValues = samples.map(s => s.quaternion.w);
    const wVariance = MathUtils.variance(wValues);
    
    // Approximate rotation variance (in radians^2)
    // Since w = cos(theta/2), variance in w relates to variance in angle
    const rotationVariance = 2 * Math.acos(Math.min(1, Math.abs(1 - wVariance)));

    // Check against thresholds
    return positionVariance <= positionThreshold && rotationVariance <= rotationThreshold;
};

/**
 * Get stability metrics for a set of samples
 * @param {Array} samples - Array of pose samples
 * @returns {Object} Stability metrics { positionVariance, rotationVariance, positionStdDev, rotationStdDev }
 */
const getStabilityMetrics = (samples) => {
    if (!samples || samples.length < 2) {
        return {
            positionVariance: 0,
            rotationVariance: 0,
            positionStdDev: 0,
            rotationStdDev: 0
        };
    }

    // Position variance
    const xValues = samples.map(s => s.position.x);
    const yValues = samples.map(s => s.position.y);
    const zValues = samples.map(s => s.position.z);
    
    const positionVariance = (
        MathUtils.variance(xValues) +
        MathUtils.variance(yValues) +
        MathUtils.variance(zValues)
    );

    // Rotation variance (approximation via w component)
    const wValues = samples.map(s => s.quaternion.w);
    const wVariance = MathUtils.variance(wValues);
    const rotationVariance = 2 * Math.acos(Math.min(1, Math.abs(1 - wVariance)));

    return {
        positionVariance,
        rotationVariance,
        positionStdDev: Math.sqrt(positionVariance),
        rotationStdDev: rotationVariance
    };
};

/**
 * Apply exponential moving average to a series of poses
 * Useful for real-time smoothing with configurable responsiveness
 * @param {Object} currentPose - Current pose { position, quaternion }
 * @param {Object} previousAvgPose - Previous averaged pose (or null for first sample)
 * @param {number} alpha - Smoothing factor (0 to 1), higher = more responsive to new data
 * @returns {Object} Smoothed pose
 */
const smoothPose = (currentPose, previousAvgPose, alpha = 0.3) => {
    if (!previousAvgPose) {
        return {
            position: { ...currentPose.position },
            quaternion: { ...currentPose.quaternion }
        };
    }

    // EMA for position
    const smoothedPosition = {
        x: MathUtils.lerp(previousAvgPose.position.x, currentPose.position.x, alpha),
        y: MathUtils.lerp(previousAvgPose.position.y, currentPose.position.y, alpha),
        z: MathUtils.lerp(previousAvgPose.position.z, currentPose.position.z, alpha)
    };

    // For quaternion, we use slerp-like interpolation
    // Simplified: lerp individual components and renormalize
    const rawQuat = {
        x: MathUtils.lerp(previousAvgPose.quaternion.x, currentPose.quaternion.x, alpha),
        y: MathUtils.lerp(previousAvgPose.quaternion.y, currentPose.quaternion.y, alpha),
        z: MathUtils.lerp(previousAvgPose.quaternion.z, currentPose.quaternion.z, alpha),
        w: MathUtils.lerp(previousAvgPose.quaternion.w, currentPose.quaternion.w, alpha)
    };

    const smoothedQuaternion = MathUtils.normalizeQuaternion(rawQuat);

    return {
        position: smoothedPosition,
        quaternion: smoothedQuaternion
    };
};

const PoseAverager = {
    averageSamples,
    averageQuaternions,
    isStable,
    getStabilityMetrics,
    smoothPose
};

export { PoseAverager };
export { averageSamples, averageQuaternions, isStable, getStabilityMetrics, smoothPose };
