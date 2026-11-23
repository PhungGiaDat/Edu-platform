using System;
using System.Text.RegularExpressions;
using UnityEngine;

/// <summary>
/// Maps JSON payloads from React Native into strongly-typed Unity structs.
/// Uses JsonUtility with snake_case → camelCase pre-processing to match the
/// ARExperienceResponseSchema API response shape.
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
    private static readonly Regex SnakeCasePattern = new Regex(
        @"""([a-z][a-z0-9]*)_([a-z])",
        RegexOptions.Compiled);

    /// <summary>
    /// Pre-processes JSON: converts snake_case keys to camelCase so JsonUtility
    /// can deserialize them into camelCase DTO fields.
    /// </summary>
    private static string PreprocessJson(string json)
    {
        return SnakeCasePattern.Replace(json, m =>
            "\"" + m.Groups[1].Value + Char.ToUpper(m.Groups[2].Value[0]) + m.Groups[2].Value.Substring(1));
    }

    /// <summary>
    /// Parses the raw JSON from React Native into an ARExperiencePayload struct.
    /// Handles ARExperienceResponseSchema (with flashcard/target wrapper) and
    /// legacy flat payload shapes.
    /// </summary>
    public static ARExperiencePayload? Parse(string json)
    {
        if (string.IsNullOrEmpty(json))
        {
            throw new ArgumentException("JSON payload is null or empty", nameof(json));
        }

        try
        {
            string processed = PreprocessJson(json);

            // Try wrapper shape first (ARExperienceResponseSchema)
            var wrapper = JsonUtility.FromJson<WrapperDto>(processed);
            if (wrapper != null && (wrapper.Flashcard != null || wrapper.Target != null))
            {
                return MapFromWrapper(wrapper);
            }

            // Fallback: try flat legacy payload
            var dto = JsonUtility.FromJson<FlatPayloadDto>(processed);
            if (dto != null)
            {
                return MapFlat(dto);
            }

            return null;
        }
        catch (Exception ex)
        {
            throw new FormatException($"Failed to parse AR payload: {ex.Message}", ex);
        }
    }

    private static ARExperiencePayload MapFromWrapper(WrapperDto w)
    {
        var flashcard = w.Flashcard;
        var target = w.Target;

        string translationVi = null;
        if (flashcard != null)
        {
            translationVi = GetTranslation(flashcard.TranslationVi, flashcard.Translation);
        }

        return new ARExperiencePayload
        {
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

    private static ARExperiencePayload MapFlat(FlatPayloadDto dto)
    {
        string translationVi = dto.TranslationVi;
        if (string.IsNullOrEmpty(translationVi) && dto.Translation != null)
        {
            translationVi = dto.Translation;
        }

        return new ARExperiencePayload
        {
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

    private static string GetTranslation(string directVi, string translationField)
    {
        if (!string.IsNullOrEmpty(directVi)) return directVi;
        if (!string.IsNullOrEmpty(translationField))
        {
            // translation field is "{\"vi\":\"...\",\"en\":\"...\"}"
            var trans = JsonUtility.FromJson<TranslationDto>(translationField);
            return trans?.Vi;
        }
        return null;
    }

    private static ARAnimationType ParseAnimationType(string type)
    {
        return type?.ToLowerInvariant() switch
        {
            "rotate" => ARAnimationType.Rotate,
            "bounce" => ARAnimationType.Bounce,
            "idle" => ARAnimationType.Idle,
            _ => ARAnimationType.Idle,
        };
    }

    private static Vector3 ParseVector3(string vec)
    {
        if (string.IsNullOrEmpty(vec)) return Vector3.zero;
        var parts = vec.Split(' ');
        if (parts.Length < 3) return Vector3.zero;
        try
        {
            return new Vector3(
                float.Parse(parts[0]),
                float.Parse(parts[1]),
                float.Parse(parts[2])
            );
        }
        catch
        {
            return Vector3.zero;
        }
    }

    #region DTOs

    [Serializable]
    private class WrapperDto
    {
        public FlashcardDto Flashcard;
        public TargetDto Target;
    }

    [Serializable]
    private class FlashcardDto
    {
        public string QrId;
        public string ArTag;
        public string Word;
        public string AudioUrl;
        public string TranslationVi; // snake_case converted to camelCase
        public string Translation;    // raw JSON string, parsed separately
    }

    [Serializable]
    private class TargetDto
    {
        public string ArTag;
        public string Model3dUrl;
        public string AnimationType;
        public float GlbSize;
        public string Position;
        public string Rotation;
        public string Scale;
    }

    [Serializable]
    private class FlatPayloadDto
    {
        public string QrId;
        public string ArTag;
        public string Word;
        public string AudioUrl;
        public string TranslationVi;
        public string Translation;    // raw JSON string
        public string ModelUrl;
        public string Model3dUrl;
        public string AnimationType;
        public float GlbSize;
        public string Position;
        public string Rotation;
        public string Scale;
    }

    [Serializable]
    private class TranslationDto
    {
        public string Vi;
    }

    #endregion
}

/// <summary>
/// Strongly-typed AR experience payload used internally by Unity scripts.
/// </summary>
[Serializable]
public struct ARExperiencePayload
{
    public string QrId;
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
public enum ARAnimationType
{
    Idle,
    Rotate,
    Bounce
}
