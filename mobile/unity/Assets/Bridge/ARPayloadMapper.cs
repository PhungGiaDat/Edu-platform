using System;
using System.Text.Json;
using System.Text.Json.Serialization;
using UnityEngine;

/// <summary>
/// Maps JSON payloads from React Native into strongly-typed Unity structs.
/// Uses System.Text.Json for proper snake_case → camelCase conversion
/// matching the ARExperienceResponseSchema API response shape.
///
/// API response shape (ARExperienceResponseSchema):
/// {
///   flashcard: { qr_id, word, audio_url, translation: { vi, en, ... } },
///   target: { ar_tag, model_3d_url, animation_type, glb_size, position, rotation, scale },
///   related_combos: [...]
/// }
/// </summary>
public static class ARPayloadMapper
{
    private static readonly JsonSerializerOptions JsonOptions = new() {
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.SnakeCaseLower) }
    };

    /// <summary>
    /// Parses the raw JSON from React Native into an ARExperiencePayload struct.
    /// Handles ARExperienceResponseSchema (with flashcard/target wrapper) and
    /// legacy flat payload shapes.
    /// </summary>
    public static ARExperiencePayload Parse(string json) {
        if (string.IsNullOrEmpty(json)) {
            throw new ArgumentException("JSON payload is null or empty", nameof(json));
        }

        try {
            var wrapper = JsonSerializer.Deserialize<ARExperienceResponseWrapper>(json, JsonOptions);
            if (wrapper != null) {
                return MapFromWrapper(wrapper);
            }

            // Fallback: try flat legacy payload
            var dto = JsonSerializer.Deserialize<ARExperiencePayloadDto>(json, JsonOptions);
            return MapToPayload(dto);
        } catch (Exception ex) {
            throw new FormatException($"Failed to parse AR payload: {ex.Message}", ex);
        }
    }

    private static ARExperiencePayload MapFromWrapper(ARExperienceResponseWrapper wrapper) {
        var flashcard = wrapper.Flashcard;
        var target = wrapper.Target;

        string translationVi = null;
        if (flashcard?.Translation != null && flashcard.Translation.TryGetValue("vi", out var vi)) {
            translationVi = vi;
        } else if (flashcard?.TranslationVi != null) {
            translationVi = flashcard.TranslationVi;
        }

        return new ARExperiencePayload {
            QrId = flashcard?.QrId ?? flashcard?.ArTag ?? target?.ArTag ?? string.Empty,
            Word = flashcard?.Word ?? string.Empty,
            TranslationVi = translationVi ?? string.Empty,
            AudioUrl = flashcard?.AudioUrl ?? string.Empty,
            ModelUrl = target?.Model3dUrl ?? string.Empty,
            AnimationType = ParseAnimationType(target?.AnimationType),
            GlbSize = target?.GlbSize ?? 1f,
            Position = ParseVector3(target?.Position),
            Rotation = ParseVector3(target?.Rotation),
            Scale = ParseVector3(target?.Scale),
        };
    }

    private static ARExperiencePayload MapToPayload(ARExperiencePayloadDto dto) {
        if (dto == null) return default;

        string translationVi = dto.TranslationVi;
        if (string.IsNullOrEmpty(translationVi) && dto.Translation != null) {
            if (dto.Translation.TryGetValue("vi", out var vi)) {
                translationVi = vi;
            }
        }

        return new ARExperiencePayload {
            QrId = dto.QrId ?? dto.ArTag ?? string.Empty,
            Word = dto.Word ?? string.Empty,
            TranslationVi = translationVi ?? string.Empty,
            AudioUrl = dto.AudioUrl ?? string.Empty,
            ModelUrl = dto.ModelUrl ?? dto.Model3dUrl ?? string.Empty,
            AnimationType = ParseAnimationType(dto.AnimationType),
            GlbSize = dto.GlbSize,
            Position = ParseVector3(dto.Position),
            Rotation = ParseVector3(dto.Rotation),
            Scale = ParseVector3(dto.Scale),
        };
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

    /// <summary>
    /// Full ARExperienceResponseSchema wrapper (ARExperienceResponseSchema).
    /// </summary>
    private class ARExperienceResponseWrapper {
        public FlashcardDto Flashcard { get; set; }
        public TargetDto Target { get; set; }
    }

    private class FlashcardDto {
        public string QrId { get; set; }
        public string ArTag { get; set; }
        public string Word { get; set; }
        public string AudioUrl { get; set; }
        public Dictionary<string, string> Translation { get; set; }
        public string TranslationVi { get; set; }
    }

    private class TargetDto {
        public string ArTag { get; set; }
        public string Model3dUrl { get; set; }
        public string AnimationType { get; set; }
        public float GlbSize { get; set; }
        public string Position { get; set; }
        public string Rotation { get; set; }
        public string Scale { get; set; }
    }

    /// <summary>
    /// Flat legacy payload DTO (for backward compatibility with older API shapes).
    /// Supports both snake_case and camelCase field names via JsonPropertyName.
    /// </summary>
    [Serializable]
    private class ARExperiencePayloadDto {
        [JsonPropertyName("qr_id")]
        public string QrId { get; set; }
        [JsonPropertyName("ar_tag")]
        public string ArTag { get; set; }
        public string Word { get; set; }
        [JsonPropertyName("audio_url")]
        public string AudioUrl { get; set; }
        public Dictionary<string, string> Translation { get; set; }
        [JsonPropertyName("translation_vi")]
        public string TranslationVi { get; set; }
        [JsonPropertyName("model_url")]
        public string ModelUrl { get; set; }
        [JsonPropertyName("model_3d_url")]
        public string Model3dUrl { get; set; }
        [JsonPropertyName("animation_type")]
        public string AnimationType { get; set; }
        [JsonPropertyName("glb_size")]
        public float GlbSize { get; set; }
        public string Position { get; set; }
        public string Rotation { get; set; }
        public string Scale { get; set; }
    }
}

/// <summary>
/// Strongly-typed AR experience payload used internally by Unity scripts.
/// </summary>
[Serializable]
public struct ARExperiencePayload {
    public string QrId;
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
