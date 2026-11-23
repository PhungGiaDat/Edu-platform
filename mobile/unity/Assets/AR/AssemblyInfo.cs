using System.Runtime.CompilerServices;

/// <summary>
/// Grants the EditMode test assembly access to internal members of ARRuntime
/// (e.g. ARSessionManager.HandleTrackedImagesChanged). This is the standard
/// Unity-recommended pattern for testing internal seams without leaking them
/// to runtime callers via `public`.
/// </summary>
[assembly: InternalsVisibleTo("EditModeTests")]
