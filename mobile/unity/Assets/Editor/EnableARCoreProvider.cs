#if UNITY_EDITOR
using System;
using System.Collections.Generic;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.XR.Management;
using UnityEngine;
using UnityEngine.XR.Management;

/// <summary>
/// Enables the ARCore XR plugin loader for the Android build target via the
/// XR Management API. Must run from the Editor menu or batchmode.
///
/// Avoids the field-type mismatch caused by hand-editing the YAML of
/// XRGeneralSettingsPerBuildTarget.asset.
/// </summary>
public static class EnableARCoreProvider
{
    private const string ARCoreLoaderTypeName = "UnityEngine.XR.ARCore.ARCoreLoader";

    /// <summary>
    /// Menu entry: Unity menu bar → EduPlatform → XR → Enable ARCore for Android
    /// </summary>
    [MenuItem("EduPlatform/XR/Enable ARCore for Android")]
    public static void EnableAndroidMenu()
    {
        try
        {
            var changed = ApplyAndroidARCore();
            if (changed)
                AssetDatabase.SaveAssets();
        }
        catch (Exception ex)
        {
            Debug.LogException(ex);
        }
    }

    /// <summary>
    /// Menu entry: Unity menu bar → EduPlatform → XR → Print Android XR State
    /// </summary>
    [MenuItem("EduPlatform/XR/Print Android XR State")]
    public static void PrintAndroidXRState()
    {
        try
        {
            DumpAndroidXRState();
        }
        catch (Exception ex)
        {
            Debug.LogException(ex);
        }
    }

    // -------------------------------------------------------------------------

    /// <summary>
    /// Programmatic entry: adds ARCoreLoader to the Android XR loader list
    /// if it is not already present.
    /// </summary>
    /// <returns>True if the XR config was changed; false if ARCore was already
    /// present or the settings could not be resolved.</returns>
    public static bool ApplyAndroidARCore()
    {
        var btGroup = BuildTargetGroup.Android;

        // --- load the persistent XRGeneralSettingsPerBuildTarget asset from disk ---
        var container = AssetDatabase.LoadAssetAtPath<XRGeneralSettingsPerBuildTarget>(
            "Assets/XR/XRGeneralSettingsPerBuildTarget.asset");
        if (container == null)
        {
            Debug.LogError("[EnableARCoreProvider] XRGeneralSettingsPerBuildTarget.asset not found at Assets/XR/.");
            return false;
        }

        // --- resolve or create XRGeneralSettings for Android ---
        var settings = container.SettingsForBuildTarget(btGroup);
        if (settings == null)
        {
            container.CreateDefaultSettingsForBuildTarget(btGroup);
            settings = container.SettingsForBuildTarget(btGroup);
            if (settings == null)
            {
                Debug.LogError("[EnableARCoreProvider] Could not create XRGeneralSettings for Android.");
                return false;
            }
            Debug.Log("[EnableARCoreProvider] Created XRGeneralSettings for Android.");
        }

        // --- resolve or create XRManagerSettings for Android ---
        var mgr = settings.Manager;
        if (mgr == null)
        {
            container.CreateDefaultManagerSettingsForBuildTarget(btGroup);
            mgr = settings.Manager;
            if (mgr == null)
            {
                Debug.LogError("[EnableARCoreProvider] Could not create XRManagerSettings for Android.");
                return false;
            }
            Debug.Log("[EnableARCoreProvider] Created XRManagerSettings for Android.");
        }

        // --- load ARCoreLoader asset ---
        var arCoreLoader = AssetDatabase.LoadAssetAtPath<XRLoader>(
            "Assets/XR/Loaders/ARCoreLoader.asset");
        if (arCoreLoader == null)
        {
            Debug.LogError("[EnableARCoreProvider] ARCoreLoader.asset not found at Assets/XR/Loaders/.");
            return false;
        }

        // --- check whether already present ---
        bool alreadyPresent = false;
        foreach (var l in mgr.activeLoaders)
        {
            if (l != null && l.GetType().FullName == ARCoreLoaderTypeName)
            {
                alreadyPresent = true;
                break;
            }
        }

        if (alreadyPresent)
        {
            Debug.Log("[EnableARCoreProvider] ARCoreLoader already present for Android — no change needed.");
            return false;
        }

        // --- add ARCoreLoader (loaders setter is the only write path available) ---
        var loaders = new List<XRLoader>(mgr.activeLoaders ?? Array.Empty<XRLoader>());
        loaders.Add(arCoreLoader);
#pragma warning disable CS0618 // mgr.loaders setter: no public alternative in XR Manager API
        mgr.loaders = loaders;
#pragma warning restore CS0618
        EditorUtility.SetDirty(mgr);
        EditorUtility.SetDirty(settings);
        EditorUtility.SetDirty(container);

        Debug.Log($"[EnableARCoreProvider] Added ARCoreLoader to Android XR loaders "
            + $"(total: {loaders.Count}).");
        return true;
    }

    private static void DumpAndroidXRState()
    {
        var btGroup = BuildTargetGroup.Android;
        var settings = XRGeneralSettingsPerBuildTarget.XRGeneralSettingsForBuildTarget(btGroup);
        if (settings == null)
        {
            Debug.Log("[EnableARCoreProvider] Android XR state: XRGeneralSettings = null");
            return;
        }
        var mgr = settings.Manager;
        if (mgr == null)
        {
            Debug.Log("[EnableARCoreProvider] Android XR state: XRManagerSettings = null (no loaders)");
            return;
        }
        var loaders = mgr.activeLoaders;
        if (loaders == null || loaders.Count == 0)
        {
            Debug.Log("[EnableARCoreProvider] Android XR state: loaders = []");
            return;
        }
        for (int i = 0; i < loaders.Count; i++)
        {
            var l = loaders[i];
            Debug.Log($"[EnableARCoreProvider] Android XR loader[{i}] = "
                + (l == null ? "null" : l.GetType().FullName));
        }
    }
}
#endif
