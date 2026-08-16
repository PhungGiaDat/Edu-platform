# Unity/AR Scope

This directory contains the Unity AR application and AR Foundation integration.

## Unity / AR Ownership

Native AR remains:
```
React Native -> Unity host -> AR Foundation -> image tracking -> runtime reference image library -> card registry -> GLTFast -> multi-card/combo -> semantic Unity event -> RN -> authenticated backend mutation
```

### Tracking Rules

- native tracking is **IMAGE TRACKING**
- QR identity is business/backend identity, not the native tracking target
- `.mind` is legacy MindAR-only data
- never infer physical tracking width from GLB/model dimensions
- never fallback `modelUrl -> referenceImageUrl`
- TrackableId is runtime/ephemeral identity

### Event Authority

- Unity emits **semantic events**; backend remains authoritative for rewards
- **Do NOT** persist XP in Unity
- Use `event_id` for idempotent retry semantics

### Parity Policy

**Do NOT** block native mobile AR development on Web/MindAR parity.

## Related Policies

See root `AGENTS.md` -> **Graduation Release Execution Policy** for the authoritative mobile-first direction.

Unity tool routing: `.cursor/rules/unity-tool-routing.mdc` / `CLAUDE.md` Section 5.

Unity evidence protocol: `.cursor/rules/unity-ar-evidence.mdc`.
