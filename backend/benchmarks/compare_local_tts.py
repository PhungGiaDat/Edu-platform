"""CPU-only Piper/Kokoro trial; does not import or modify the application.

Install in a separate venv: piper-tts kokoro-onnx soundfile psutil.
Run each provider in a separate process so their memory measurements do not mix:
  python backend/benchmarks/compare_local_tts.py piper --models PATH --output PATH
  python backend/benchmarks/compare_local_tts.py kokoro --models PATH --output PATH
Use --download to fetch missing model files from their publishers.
"""
import argparse
import hashlib
import importlib.metadata
import json
import platform
import statistics
import threading
import time
import urllib.request
import wave
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("provider", choices=("piper", "kokoro"))
    parser.add_argument("--models", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--threads", type=int, default=2)
    parser.add_argument("--repeats", type=int, default=3)
    parser.add_argument("--download", action="store_true")
    parser.add_argument("--kokoro-model", default="kokoro-v1.0.onnx")
    args = parser.parse_args()
    if args.threads < 1 or args.repeats < 1:
        parser.error("threads and repeats must be positive")
    args.output.mkdir(parents=True, exist_ok=True)
    args.models.mkdir(parents=True, exist_ok=True)

    piper_base = "https://huggingface.co/rhasspy/piper-voices/resolve/main/"
    kokoro_base = "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.1/"
    if args.provider == "piper":
        files = {
            name + suffix: piper_base + folder + name + suffix
            for name, folder in (
                ("en_US-lessac-medium", "en/en_US/lessac/medium/"),
                ("vi_VN-vais1000-medium", "vi/vi_VN/vais1000/medium/"),
            )
            for suffix in (".onnx", ".onnx.json")
        }
    else:
        files = {name: kokoro_base + name for name in (args.kokoro_model, "voices-v1.0.bin")}
    for name, url in files.items():
        path = args.models / name
        if not path.exists() and args.download:
            print(f"Downloading {name}", flush=True)
            partial = path.with_suffix(path.suffix + ".part")
            urllib.request.urlretrieve(url, partial)
            partial.replace(path)
        if not path.exists():
            parser.error(f"Missing {path}; use --download")

    import psutil

    process = psutil.Process()
    if hasattr(process, "cpu_affinity"):
        process.cpu_affinity(process.cpu_affinity()[:args.threads])
    peak_rss = [process.memory_info().rss]
    stop = threading.Event()

    def monitor():
        while not stop.wait(0.01):
            peak_rss[0] = max(peak_rss[0], process.memory_info().rss)

    watcher = threading.Thread(target=monitor, daemon=True)
    watcher.start()
    print(f"Loading {args.provider} on {args.threads} CPU threads", flush=True)
    load_start = time.perf_counter()
    import onnxruntime as ort
    import soundfile as sf
    import numpy as np

    options = ort.SessionOptions()
    options.intra_op_num_threads = args.threads
    options.inter_op_num_threads = 1
    options.execution_mode = ort.ExecutionMode.ORT_SEQUENTIAL

    def session(name):
        return ort.InferenceSession(str(args.models / name), sess_options=options,
                                    providers=["CPUExecutionProvider"])

    def checksum(name):
        with (args.models / name).open("rb") as source:
            return hashlib.file_digest(source, "sha256").hexdigest()

    if args.provider == "piper":
        from piper import PiperVoice
        from piper.config import PiperConfig

        voices = {}
        for language, name in (("en", "en_US-lessac-medium"), ("vi", "vi_VN-vais1000-medium")):
            config = json.loads((args.models / (name + ".onnx.json")).read_text(encoding="utf-8"))
            voices[language] = PiperVoice(session(name + ".onnx"), PiperConfig.from_dict(config))

        def synthesize(text, language, path):
            with wave.open(str(path), "wb") as output:
                voices[language].synthesize_wav(text, output)

        voice_names = {"en": "en_US-lessac-medium", "vi": "vi_VN-vais1000-medium"}
    else:
        from kokoro_onnx import Kokoro

        model = Kokoro.from_session(session(args.kokoro_model),
                                    str(args.models / "voices-v1.0.bin"))

        def synthesize(text, language, path):
            samples, rate = model.create(text, voice="af_heart", speed=1.0, lang="en-us")
            sf.write(str(path), samples, rate, subtype="PCM_16")

        voice_names = {"en": "af_heart"}

    report = {
        "provider": args.provider, "platform": platform.platform(),
        "processor": platform.processor(), "threads": args.threads,
        "host_total_ram_mb": round(psutil.virtual_memory().total / 1024**2, 1),
        "host_available_ram_mb": round(psutil.virtual_memory().available / 1024**2, 1),
        "affinity": process.cpu_affinity() if hasattr(process, "cpu_affinity") else None,
        "load_seconds": round(time.perf_counter() - load_start, 3),
        "loaded_rss_mb": round(process.memory_info().rss / 1024**2, 1),
        "versions": {name: importlib.metadata.version(name) for name in
                     ("piper-tts", "kokoro-onnx", "onnxruntime", "psutil", "soundfile")},
        "models": [{"name": name, "url": url, "bytes": (args.models / name).stat().st_size,
                    "sha256": checksum(name)}
                   for name, url in files.items()],
        "unsupported_languages": ["vi"] if args.provider == "kokoro" else [], "samples": [],
    }
    print(f"Loaded in {report['load_seconds']} seconds; RSS {report['loaded_rss_mb']} MB", flush=True)
    texts = [
        ("mom", "en", "Mom"),
        ("sentence", "en", "This is my mom."),
        ("dad", "en", "I love my dad."),
        ("question", "en", "Who is this? Choose the correct picture."),
        ("instruction", "vi", "Bé hãy phát âm theo câu sau."),
        ("family", "vi", "Đây là mẹ của em. Em yêu gia đình của mình."),
    ]
    for name, language, text in texts:
        if language not in voice_names:
            continue
        path = args.output / f"{args.provider}-{name}.wav"
        timings = []
        # First call is recorded separately; repeated calls exercise a loaded model, without cache.
        for _ in range(args.repeats + 1):
            started = time.perf_counter()
            synthesize(text, language, path)
            timings.append(time.perf_counter() - started)
        samples, rate = sf.read(str(path))
        assert samples.size and np.isfinite(samples).all() and np.max(np.abs(samples)) > 0.001, path
        with wave.open(str(path), "rb") as audio:
            assert audio.getsampwidth() == 2 and audio.getnchannels() == 1, path
            duration = audio.getnframes() / audio.getframerate()
        warm = statistics.median(timings[1:])
        row = {"id": name, "text": text, "language": language, "voice": voice_names[language],
               "file": path.name, "sample_rate": rate, "audio_seconds": round(duration, 3),
               "first_seconds": round(timings[0], 3), "warm_seconds": round(warm, 3),
               "warm_runs_seconds": [round(t, 3) for t in timings[1:]],
               "real_time_factor": round(warm / duration, 3)}
        report["samples"].append(row)
        print(json.dumps(row, ensure_ascii=True), flush=True)
    stop.set()
    watcher.join()
    report["peak_rss_mb"] = round(max(peak_rss[0], process.memory_info().rss) / 1024**2, 1)
    (args.output / f"{args.provider}-result.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"{args.provider}: peak RSS {report['peak_rss_mb']} MB", flush=True)


if __name__ == "__main__":
    main()
