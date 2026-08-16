using System;
using UnityEngine;

/// <summary>
/// Maps JSON payloads from React Native into strongly-typed Unity structs.
/// Uses Unity's JsonUtility for cross-platform compatibility.
/// </summary>
public static class ARPayloadMapper
{
    /// <summary>
    /// Parses the raw JSON from React Native into an ARExperiencePayload struct.
    /// </summary>
    public static ARExperiencePayload Parse(string json) {
        if (string.IsNullOrEmpty(json)) {
            throw new ArgumentException("JSON payload is null or empty", nameof(json));
        }

        try {
            var dto = JsonUtility.FromJson<ARExperiencePayloadDto>(json);
            return MapToPayload(dto);
        } catch (Exception ex) {
            throw new FormatException($"Failed to parse AR payload: {ex.Message}", ex);
        }
    }

    private static ARExperiencePayload MapToPayload(ARExperiencePayloadDto dto) {
        var payload = new ARExperiencePayload {
            QrId = dto.qrId,
            ArTag = dto.arTag ?? dto.qrId,
            Word = dto.word,
            TranslationVi = dto.translationVi,
            AudioUrl = dto.audioUrl,
            ModelUrl = dto.modelUrl,
            AnimationType = ParseAnimationType(dto.animationType),
            GlbSize = dto.glbSize,
            Position = ParseVector3(dto.position),
            Rotation = ParseVector3(dto.rotation),
            Scale = ParseVector3(dto.scale),
        };
        return payload;
    }

    private static ARAnimationType ParseAnimationType(string type) {
        return type?.ToLowerInvariant() switch {
            "rotate" => ARAnimationType.Rotate,
            "bounce" => ARAnimationType.Bounce,
            "idle" => ARAnimationType.Idle,
            _ => ARAnimationType.Idle,
        };
    }

    private static Vector3 ParseVector3(string vec) {
        if (string.IsNullOrEmpty(vec)) return Vector3.zero;
        var parts = vec.Split(' ');
        if (parts.Length < 3) return Vector3.zero;
        try {
            return new Vector3(
                float.Parse(parts[0]),
                float.Parse(parts[1]),
                float.Parse(parts[2])
            );
        } catch {
            return Vector3.zero;
        }
    }

    [Serializable]
    private class ARExperiencePayloadDto {
        public string qrId;
        public string arTag;
        public string word;
        public string translationVi;
        public string audioUrl;
        public string modelUrl;
        public string animationType;
        public float glbSize;
        public string position;
        public string rotation;
        public string scale;
    }
}

/// <summary>
/// Strongly-typed AR experience payload used internally by Unity scripts.
/// </summary>
[Serializable]
public struct ARExperiencePayload {
    public string QrId;
    /// <summary>Semantic AR identity used for combo lookup via required_tags resolution.</summary>
    public string ArTag;
    public string Word;
    public string TranslationVi;
    public string AudioUrl;
    public string ModelUrl;
    public ARAnimationType AnimationType;
    public float GlbSize;
    public Vector3 Position;
    public Vector3 Rotation;
    public Vector3 Scale;
}

/// <summary>
/// Supported animation types for AR models.
/// </summary>
public enum ARAnimationType {
    Idle,
    Rotate,
    Bounce
}
