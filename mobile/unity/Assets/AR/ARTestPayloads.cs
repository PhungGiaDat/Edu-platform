using System;

/// <summary>
/// Shared test DTOs. Reusing the same field names as the production payload
/// mapper so we exercise the real code path, including JsonUtility edge cases.
/// </summary>
public static class ARTestPayloads
{
    [Serializable]
    public class ARExperiencePayloadPublic
    {
        public string qrId;
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

    [Serializable]
    public class ComboPayload { public string cardA; public string cardB; }

    [Serializable]
    public class PlaneDetectionPayload { public bool enabled; }
}
