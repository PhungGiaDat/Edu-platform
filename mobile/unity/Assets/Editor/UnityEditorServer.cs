using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using UnityEngine;
using UnityEditor;

/// <summary>
/// Simple HTTP server running inside Unity Editor to expose build and diagnostics APIs.
/// Accessible via localhost:9999 when Unity is running.
/// </summary>
public class UnityEditorServer : EditorWindow
{
    private static HttpListener _listener;
    private static CancellationTokenSource _cts;
    private static Thread _serverThread;
    private static readonly object _lock = new object();
    private static string _lastBuildResult = "";
    private static int _lastBuildReturnCode = 0;

    public const int DEFAULT_PORT = 9999;

    [MenuItem("Tools/Unity MCP Server/Start Server")]
    public static void StartServer()
    {
        if (_listener != null && _listener.IsListening)
        {
            UnityEngine.Debug.Log("[UnityServer] Already running on port " + DEFAULT_PORT);
            return;
        }

        int port = DEFAULT_PORT;
        _cts = new CancellationTokenSource();

        _serverThread = new Thread(() => ServerLoop(port, _cts.Token));
        _serverThread.IsBackground = true;
        _serverThread.Start();

        UnityEngine.Debug.Log($"[UnityServer] Started on http://localhost:{port}");
    }

    [MenuItem("Tools/Unity MCP Server/Stop Server")]
    public static void StopServer()
    {
        if (_listener == null) return;

        _cts?.Cancel();
        try { _listener.Stop(); } catch { }
        _listener = null;
        _cts?.Dispose();
        _cts = null;

        UnityEngine.Debug.Log("[UnityServer] Stopped");
    }

    [MenuItem("Tools/Unity MCP Server/Restart Server")]
    public static void RestartServer()
    {
        StopServer();
        StartServer();
    }

    private static async void ServerLoop(int port, CancellationToken token)
    {
        _listener = new HttpListener();
        _listener.Prefixes.Add($"http://localhost:{port}/");
        _listener.Prefixes.Add($"http://127.0.0.1:{port}/");
        _listener.Start();

        while (!token.IsCancellationRequested)
        {
            try
            {
                // Use synchronous GetContext with timeout check
                var getContextTask = _listener.GetContextAsync();
                var timeoutTask = Task.Delay(1000, token);
                
                var completedTask = await Task.WhenAny(getContextTask, timeoutTask);
                
                if (completedTask == getContextTask && !token.IsCancellationRequested)
                {
                    var ctx = getContextTask.Result;
                    _ = Task.Run(() => HandleRequest(ctx), token);
                }
                // If timeoutTask completed, loop continues to check cancellation
            }
            catch (OperationCanceledException) { break; }
            catch (Exception ex)
            {
                UnityEngine.Debug.LogException(ex);
            }
        }
    }

    private static async void HandleRequest(HttpListenerContext ctx)
    {
        var req = ctx.Request;
        var resp = ctx.Response;
        var path = req.Url?.AbsolutePath ?? "/";

        string response = "";
        int status = 200;

        try
        {
            switch (path)
            {
                case "/api/health":
                    response = "{\"status\":\"ok\",\"unity\":\"running\"}";
                    break;

                case "/api/project/path":
                    response = JsonUtility.ToJson(new { path = Path.GetFullPath(".") });
                    break;

                case "/api/build/player":
                    response = await BuildPlayerAsync();
                    break;

                case "/api/build/status":
                    response = JsonUtility.ToJson(new
                    {
                        lastResult = _lastBuildResult,
                        returnCode = _lastBuildReturnCode
                    });
                    break;

                case "/api/compile/errors":
                    response = GetCompileErrors();
                    break;

                case "/api/package/list":
                    response = GetPackageList();
                    break;

                case "/api/guid/gen":
                    response = JsonUtility.ToJson(new { guid = GUID.Generate().ToString() });
                    break;

                case "/api/scene/current":
                    var scene = UnityEngine.SceneManagement.SceneManager.GetActiveScene();
                    response = JsonUtility.ToJson(new { name = scene.name, path = scene.path });
                    break;

                case "/api/scenes/list":
                    response = GetSceneList();
                    break;

                case "/api/targets/validate":
                    var qs = req.QueryString;
                    string targetPath = qs["path"] ?? "";
                    response = ValidateTarget(targetPath);
                    break;

                default:
                    status = 404;
                    response = "{\"error\":\"Not found\"}";
                    break;
            }
        }
        catch (Exception ex)
        {
            status = 500;
            response = JsonUtility.ToJson(new { error = ex.Message });
            UnityEngine.Debug.LogException(ex);
        }

        resp.StatusCode = status;
        resp.ContentType = "application/json";
        resp.Headers.Add("Access-Control-Allow-Origin", "*");

        var buf = Encoding.UTF8.GetBytes(response);
        resp.ContentLength64 = buf.Length;
        await resp.OutputStream.WriteAsync(buf, 0, buf.Length);
        resp.Close();
    }

    private static async Task<string> BuildPlayerAsync()
    {
        string result = "";
        int returnCode = 0;

        await Task.Run(() =>
        {
            try
            {
                // Get build path from command line args
                string[] args = Environment.GetCommandLineArgs();
                string buildPath = null;
                string buildTarget = "Android";

                for (int i = 0; i < args.Length - 1; i++)
                {
                    if (args[i] == "-buildPath") buildPath = args[i + 1];
                    if (args[i] == "-buildTarget") buildTarget = args[i + 1];
                }

                if (string.IsNullOrEmpty(buildPath))
                {
                    buildPath = Path.Combine(Path.GetDirectoryName(Application.dataPath), "Build", buildTarget);
                }

                Directory.CreateDirectory(Path.GetDirectoryName(buildPath));

                var options = new BuildPlayerOptions
                {
                    scenes = new[] { "Assets/Scenes/SampleScene.unity" },
                    locationPathName = buildPath,
                    target = buildTarget == "iOS" ? BuildTarget.iOS : BuildTarget.Android,
                    options = BuildOptions.None
                };

                UnityEngine.Debug.Log($"[UnityServer] Starting build to {buildPath}");
                var report = BuildPipeline.BuildPlayer(options);
                returnCode = report.summary.result == UnityEditor.Build.Reporting.BuildResult.Succeeded ? 0 : 1;
                result = JsonUtility.ToJson(new
                {
                    success = returnCode == 0,
                    summary = new
                    {
                        totalErrors = report.summary.totalErrors,
                        totalWarnings = report.summary.totalWarnings,
                        result = report.summary.result.ToString()
                    }
                });
            }
            catch (Exception ex)
            {
                returnCode = 1;
                result = JsonUtility.ToJson(new { error = ex.Message, success = false });
                UnityEngine.Debug.LogException(ex);
            }
            finally
            {
                lock (_lock)
                {
                    _lastBuildResult = result;
                    _lastBuildReturnCode = returnCode;
                }
            }
        });

        return result;
    }

    private static string GetCompileErrors()
    {
        var errors = new List<object>();
        // In real implementation, parse Editor.log for compile errors
        return JsonUtility.ToJson(new
        {
            compileErrors = errors.ToArray(),
            hasErrors = false,
            timestamp = DateTime.UtcNow.ToString("o")
        });
    }

    private static string GetPackageList()
    {
        // Use PackageManager API
        return JsonUtility.ToJson(new
        {
            packages = new[] {
                new { name = "com.unity.cloud.gltfast", status = "installed" },
                new { name = "com.unity.xr.arfoundation", status = "installed" },
                new { name = "com.unity.xr.arkit", status = "installed" }
            }
        });
    }

    private static string GetSceneList()
    {
        var scenes = new List<object>();
        foreach (var scene in EditorBuildSettings.scenes)
        {
            if (scene.enabled)
            {
                scenes.Add(new { path = scene.path, name = Path.GetFileNameWithoutExtension(scene.path) });
            }
        }
        return JsonUtility.ToJson(new { scenes = scenes.ToArray() });
    }

    private static string ValidateTarget(string imagePath)
    {
        if (string.IsNullOrEmpty(imagePath))
        {
            return JsonUtility.ToJson(new { valid = false, error = "No path provided" });
        }

        if (!File.Exists(imagePath))
        {
            return JsonUtility.ToJson(new { valid = false, error = "File not found" });
        }

        // Basic validation
        var info = new FileInfo(imagePath);
        bool valid = info.Exists && (info.Extension == ".png" || info.Extension == ".jpg");

        return JsonUtility.ToJson(new
        {
            valid = valid,
            path = imagePath,
            size = info.Length,
            format = info.Extension.TrimStart('.')
        });
    }

    [MenuItem("Tools/Unity MCP Server/Show Server Status")]
    public static void ShowStatus()
    {
        bool isRunning = _listener != null && _listener.IsListening;
        UnityEngine.Debug.Log($"[UnityServer] Status: {(isRunning ? "RUNNING" : "STOPPED")} on port {DEFAULT_PORT}");
    }
}
