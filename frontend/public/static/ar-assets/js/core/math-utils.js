/**
 * Core Mathematical Utilities for AR Pose Calculations
 * Pure mathematical functions - NO side effects, fully testable
 */

/**
 * Calculate Euclidean distance between two 3D points
 * @param {Object} a - First point {x, y, z}
 * @param {Object} b - Second point {x, y, z}
 * @returns {number} Euclidean distance
 */
const distance3D = (a, b) => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dz = b.z - a.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
};

/**
 * Calculate angular distance between two quaternions
 * Returns value between 0 and Pi radians
 * @param {Object} q1 - First quaternion {x, y, z, w}
 * @param {Object} q2 - Second quaternion {x, y, z, w}
 * @returns {number} Angular distance in radians (0 to PI)
 */
const quaternionAngle = (q1, q2) => {
    const dot = q1.x * q2.x + q1.y * q2.y + q1.z * q2.z + q1.w * q2.w;
    return 2 * Math.acos(Math.min(1, Math.abs(dot)));
};

/**
 * Linear interpolation between two values
 * @param {number} a - Start value
 * @param {number} b - End value
 * @param {number} t - Interpolation factor (0 to 1)
 * @returns {number} Interpolated value
 */
const lerp = (a, b, t) => {
    return a + (b - a) * t;
};

/**
 * Clamp a value between min and max bounds
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum bound
 * @param {number} max - Maximum bound
 * @returns {number} Clamped value
 */
const clamp = (value, min, max) => {
    return Math.min(max, Math.max(min, value));
};

/**
 * Calculate variance of an array of values
 * Uses population variance formula (divides by n, not n-1)
 * @param {number[]} values - Array of numeric values
 * @returns {number} Variance (0 if array is empty)
 */
const variance = (values) => {
    if (values.length === 0) return 0;
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    return values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
};

/**
 * Calculate standard deviation of an array of values
 * @param {number[]} values - Array of numeric values
 * @returns {number} Standard deviation
 */
const stdDev = (values) => {
    return Math.sqrt(variance(values));
};

/**
 * Normalize a quaternion to unit length
 * @param {Object} q - Quaternion {x, y, z, w}
 * @returns {Object} Normalized quaternion
 */
const normalizeQuaternion = (q) => {
    const magnitude = Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w);
    if (magnitude === 0) return { x: 0, y: 0, z: 0, w: 1 };
    return {
        x: q.x / magnitude,
        y: q.y / magnitude,
        z: q.z / magnitude,
        w: q.w / magnitude
    };
};

/**
 * Add two 3D vectors
 * @param {Object} a - First vector {x, y, z}
 * @param {Object} b - Second vector {x, y, z}
 * @returns {Object} Result vector {x, y, z}
 */
const addVectors = (a, b) => {
    return {
        x: a.x + b.x,
        y: a.y + b.y,
        z: a.z + b.z
    };
};

/**
 * Scale a 3D vector by a scalar
 * @param {Object} v - Vector {x, y, z}
 * @param {number} scale - Scalar multiplier
 * @returns {Object} Scaled vector {x, y, z}
 */
const scaleVector = (v, scale) => {
    return {
        x: v.x * scale,
        y: v.y * scale,
        z: v.z * scale
    };
};

const MathUtils = {
    distance3D,
    quaternionAngle,
    lerp,
    clamp,
    variance,
    stdDev,
    normalizeQuaternion,
    addVectors,
    scaleVector
};

export { MathUtils };
export { distance3D, quaternionAngle, lerp, clamp, variance, stdDev, normalizeQuaternion, addVectors, scaleVector };
