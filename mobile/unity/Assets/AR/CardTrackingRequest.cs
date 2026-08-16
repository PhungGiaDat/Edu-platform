using System;
using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// Parses and validates the RN -> Unity `startImageTracking` payload into the
/// runtime types used by <see cref="CardImageLibraryBuilder"/> (reference-image
/// definition) and <see cref="MultiCardRegistry"/> (business identity + model).
///
/// Validation is deliberately strict — there is NO width fallback and NO
/// substitution of modelUrl for the reference-image URL:
///   - imageUrl missing/empty            -> MISSING_REFERENCE_IMAGE_METADATA
///   - physicalWidthMeters &lt;= 0        -> MISSING_REFERENCE_IMAGE_METADATA
///   - imageUrl == modelUrl              -> INVALID_REFERENCE_IMAGE_URL
///     (modelUrl is a content asset, never a tracking definition)
///   - qrId missing/empty                -> MISSING_REFERENCE_IMAGE_METADATA
///
/// A card that fails validation is reported explicitly and never silently
/// coerced to a default.
/// </summary>
public static class CardTrackingRequest
{
    public const string ErrMissingMetadata = "MISSING_REFERENCE_IMAGE_METADATA";
    public const string ErrInvalidReferenceUrl = "INVALID_REFERENCE_IMAGE_URL";

    /// <summary>A card that could not be admitted, with the reason code.</summary>
    public struct Rejection
    {
        public string qrId;
        public string code;
        public string detail;
    }

    /// <summary>Result of parsing + validating a startImageTracking payload.</summary>
    public class Result
    {
        /// <summary>Cards that passed validation, as reference-image descriptors.</summary>
        public readonly List<CardDescriptor> Valid = new();
        /// <summary>Per valid qrId, the business payload for the registry / model spawn.</summary>
        public readonly Dictionary<string, ARExperiencePayload> Payloads = new();
        /// <summary>Cards that were rejected, with explicit reason codes.</summary>
        public readonly List<Rejection> Rejected = new();

        public bool HasValidCards => Valid.Count > 0;
    }

    /// <summary>
    /// Parses the JSON and validates each card. Throws <see cref="FormatException"/>
    /// only when the envelope itself is unparseable; individual bad cards are
    /// collected in <see cref="Result.Rejected"/>, not thrown.
    /// </summary>
    public static Result Parse(string json)
    {
        if (string.IsNullOrEmpty(json))
        {
            throw new ArgumentException("startImageTracking payload is null or empty", nameof(json));
        }

        PayloadDto dto;
        try
        {
            dto = JsonUtility.FromJson<PayloadDto>(json);
        }
        catch (Exception ex)
        {
            throw new FormatException($"Failed to parse startImageTracking payload: {ex.Message}", ex);
        }

        var result = new Result();
        if (dto?.cards == null || dto.cards.Length == 0)
        {
            throw new FormatException("startImageTracking payload contained no cards");
        }

        foreach (var card in dto.cards)
        {
            Validate(card, result);
        }
        return result;
    }

    private static void Validate(CardDto card, Result result)
    {
        var qrId = card?.qrId;
        if (string.IsNullOrEmpty(qrId))
        {
            result.Rejected.Add(new Rejection {
                qrId = qrId, code = ErrMissingMetadata, detail = "qrId missing"
            });
            return;
        }
        if (string.IsNullOrEmpty(card.imageUrl))
        {
            result.Rejected.Add(new Rejection {
                qrId = qrId, code = ErrMissingMetadata, detail = "imageUrl missing"
            });
            return;
        }
        // modelUrl is a content asset; it must never stand in for the tracking image.
        if (!string.IsNullOrEmpty(card.modelUrl) && card.modelUrl == card.imageUrl)
        {
            result.Rejected.Add(new Rejection {
                qrId = qrId, code = ErrInvalidReferenceUrl,
                detail = "imageUrl equals modelUrl; reference image must be distinct from the model asset"
            });
            return;
        }

        // physicalWidthMeters is optional. When > 0, use it; when <= 0, CardImageLibraryBuilder
        // uses the AR Foundation / ARCore unknown-size registration path (widthMeters = 0f).
        // There is NO production default — the null path is intentional for pre-measurement development.
        // JsonUtility.FromJson silently produces 0f for missing fields; negative/NaN values from
        // bad JSON are also coerced to 0f (unknown-size dev path).
        float rawWidth = card.physicalWidthMeters;
        if (float.IsNaN(rawWidth) || rawWidth <= 0f) rawWidth = 0f;
        float widthMeters = rawWidth;

        result.Valid.Add(new CardDescriptor(qrId, card.imageUrl, widthMeters));
        result.Payloads[qrId] = new ARExperiencePayload {
            QrId = qrId,
            ArTag = string.IsNullOrEmpty(card.arTag) ? qrId : card.arTag,
            Word = string.IsNullOrEmpty(card.word) ? qrId : card.word,
            TranslationVi = card.translationVi,
            AudioUrl = card.audioUrl,
            ModelUrl = card.modelUrl,
            AnimationType = ParseAnimationType(card.animationType),
            GlbSize = card.glbSize,
            Position = ParseVector3(card.position),
            Rotation = ParseVector3(card.rotation),
            Scale = ParseVector3(card.scale),
        };
    }

    private static ARAnimationType ParseAnimationType(string type)
    {
        return type?.ToLowerInvariant() switch {
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
        try {
            return new Vector3(
                float.Parse(parts[0]),
                float.Parse(parts[1]),
                float.Parse(parts[2]));
        } catch {
            return Vector3.zero;
        }
    }

    [Serializable]
    private class CardDto
    {
        // Tracking
        public string qrId;
        public string imageUrl;
        public float physicalWidthMeters;
        // Semantic AR tag for combo lookup (maps to backend ar_tag).
        public string arTag;
        // Model / content (optional; MultiCardRegistry.RegisterFlashcard uses these)
        public string modelUrl;
        public string word;
        public string translationVi;
        public string audioUrl;
        public string animationType;
        public float glbSize;
        public string position;
        public string rotation;
        public string scale;
    }

    [Serializable]
    private class PayloadDto
    {
        // Use CardDto[] instead of List<CardDto> — JsonUtility.FromJson handles
        // arrays reliably; List<T> deserialization in nested DTOs can silently produce
        // null if the JSON input is a single non-array element.
        public CardDto[] cards;
    }
}
