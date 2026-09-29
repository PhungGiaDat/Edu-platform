# Piper and Kokoro CPU trial — 2026-09-29

Scope: run both engines, produce audio for listening, and measure CPU latency and process RAM. This trial does not select or deploy a production provider.

## Environment and method

- Windows 11, Python 3.12.10; CPU reports AMD64 Family 25 Model 80.
- Each engine ran in its own process, affinity restricted to logical CPUs `[0, 1]`. ONNX used CPUExecutionProvider, two intra-op threads, one inter-op thread, sequential execution.
- This is a local measurement, **not a benchmark of the user's Ubuntu 2-vCPU / 4-GB VPS**. CPU type, virtualization, other workloads and shared physical cores can change performance.
- Generated every sample once, then three more times with the model loaded; reported the median of those three calls. No audio cache. Model load time includes Python imports; operating-system disk cache was not cleared.
- Peak RSS sampled every 10 ms over model loading and generation. This measures the entire Python process, not model file size or whole-host memory. Host RAM was not capped at 4 GB.
- Isolated dependencies: `piper-tts==1.8.0`, `kokoro-onnx==0.6.1`, `onnxruntime==1.30.0`, `soundfile==0.14.0`, `psutil==7.2.2`.

## Results

| Measurement | Piper | Kokoro FP32 |
|---|---:|---:|
| Voice | en_US-lessac-medium; vi_VN-vais1000-medium | af_heart |
| Load both Piper voices / one Kokoro model | 7.082 s | 2.622 s |
| Peak process RSS | 309.6 MB | 505.6 MB |
| “Mom” warm median | 0.116 s | 1.537 s |
| “This is my mom.” warm median | 0.173 s | 2.042 s |
| “I love my dad.” warm median | 0.177 s | 1.997 s |
| “Who is this? Choose the correct picture.” warm median | 0.394 s | 2.890 s |
| “Bé hãy phát âm theo câu sau.” warm median | 0.264 s | Not supported by selected original Kokoro model |

English words/sentences include vocabulary from `backend/seeds/courses/momo_home_family.json`; the longer question is an illustrative quiz prompt. Piper output varies slightly between calls. Samples are mono PCM16 WAV, 22,050 Hz for Piper and 24,000 Hz for Kokoro.

Kokoro INT8 (`kokoro-v1.0.int8.onnx`, 114,119,327 bytes) was also tried. “Mom” took 19.517 / 18.243 / 18.149 seconds after the first call. That run was stopped and its observation retained. The publisher's FP32 model (`kokoro-v1.0.onnx`, 325,505,369 bytes) performed much better in the same environment. This does not establish that INT8 is slower on every CPU/runtime.

Interpretation: Piper is the stronger candidate for uncached, short learner prompts in this environment. Kokoro is a candidate for generating English audio in advance or serving cached files if the listener prefers its voice. RAM results alone do not establish VPS capacity or concurrency. Voice quality and pronunciation correctness still require human listening.

## Reproduce

Run from the repository root, using the existing user-scoped uv executable if uv is not on PATH:

```powershell
uv venv --python 3.12 frontend/test-artifacts/tts-comparison/.venv
uv pip install --python frontend/test-artifacts/tts-comparison/.venv/Scripts/python.exe piper-tts==1.8.0 kokoro-onnx==0.6.1 onnxruntime==1.30.0 soundfile==0.14.0 psutil==7.2.2
uv run --no-project --python frontend/test-artifacts/tts-comparison/.venv/Scripts/python.exe backend/benchmarks/compare_local_tts.py piper --download --models frontend/test-artifacts/tts-comparison/models --output frontend/test-artifacts/tts-comparison
uv run --no-project --python frontend/test-artifacts/tts-comparison/.venv/Scripts/python.exe backend/benchmarks/compare_local_tts.py kokoro --download --models frontend/test-artifacts/tts-comparison/models --output frontend/test-artifacts/tts-comparison
```

For Linux, use the isolated environment's `bin/python` instead of `Scripts/python.exe`. Run the engines sequentially, and separately from concurrent STT/benchmark workloads before drawing performance conclusions.

## Artifacts and verification

Local, ignored trial outputs live in `frontend/test-artifacts/tts-comparison/`:

- `listen.html`: standalone page with all ten audio clips embedded, English comparison and Vietnamese Piper samples, mobile layout, replay controls. No external TTS requests.
- `listen-web.html`: equivalent page using sibling WAV files, served during verification at `http://127.0.0.1:5174/test-artifacts/tts-comparison/listen-web.html`.
- `piper-result.json`, `kokoro-result.json`: per-sample runs, environment, RSS and model source URLs / SHA256 hashes.
- `kokoro-int8-observation.json`: incomplete INT8 trial and stop reason.
- Ten `.wav` files: every final file decoded, finite/non-silent audio, mono PCM16 checked by the runnable benchmark.
- `check-playback.mjs`, `playback-results.json`, `listen-chromium.png`, `listen-webkit.png`: actual audio playback in Playwright, responsive viewport 390 × 844.

Source compiles. **Chromium and WebKit both passed** the HTTP preview at 390 × 844: ten actual clips plus two replay actions per browser, each waiting for playback to start and the playhead to reach the end; no JavaScript/audio errors or horizontal overflow. Audio was not mocked. `playback-results.json` retains the events and completed actions.

The standalone data-URI page also played in Chromium. WebKit on this Windows host rejected file/data-URI playback, so its verification uses the HTTP page and sibling WAV files. Extra `ended` events during WebKit media initialization were excluded by requiring actual `playing`, ended/paused state and a playhead at the file duration. This preview evidence is not production lesson integration or physical iPhone/Android verification.

Production TTS has not been changed. VPS address/access remains necessary for a server benchmark; `ssh root@host` did not identify a configured local SSH alias.

Provider documentation: [Piper Python API](https://github.com/OHF-Voice/piper1-gpl/blob/main/docs/API_PYTHON.md), [Piper Vietnamese voice](https://huggingface.co/rhasspy/piper-voices/tree/main/vi/vi_VN/vais1000/medium), [Kokoro ONNX](https://github.com/thewh1teagle/kokoro-onnx).
