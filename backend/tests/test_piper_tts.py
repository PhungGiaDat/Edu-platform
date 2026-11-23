"""Piper provider contracts without native synthesis or downloaded models."""
import asyncio
import importlib.util
import io
import os
from pathlib import Path
import sys
import struct
from types import ModuleType
from unittest.mock import AsyncMock, Mock
import wave

import pytest


service_path = Path(__file__).resolve().parents[1] / "services" / "tts_service.py"
spec = importlib.util.spec_from_file_location("piper_tts_under_test", service_path)
assert spec and spec.loader
tts = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = tts
spec.loader.exec_module(tts)


def pcm_wav():
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as audio:
        audio.setnchannels(1)
        audio.setsampwidth(2)
        audio.setframerate(16000)
        audio.writeframes(b"\0\0" * 8000)
    return buffer.getvalue()


@pytest.fixture
def service(tmp_path, monkeypatch):
    model_dir = tmp_path / "models"
    model_dir.mkdir()
    for name in ("en_US-lessac-medium", "vi_VN-vais1000-medium"):
        (model_dir / f"{name}.onnx").write_bytes(b"model-v1")
        (model_dir / f"{name}.onnx.json").write_text("{}", encoding="utf-8")
    monkeypatch.setenv("PIPER_MODEL_DIR", str(model_dir))
    monkeypatch.setenv("PIPER_THREADS", "2")
    monkeypatch.setattr(tts, "CACHE_DIR", tmp_path / "cache")
    tts.CACHE_DIR.mkdir()
    monkeypatch.setattr(tts.TTSService, "_check_google_tts", lambda self: None)
    monkeypatch.setattr(tts, "_get_xtts_model", AsyncMock(return_value=None))
    return tts.TTSService()


def install_provider(service, monkeypatch):
    assert hasattr(service, "_piper_available_languages"), "Piper availability provider is missing"
    assert hasattr(service, "_piper_generate"), "Piper native synthesis boundary is missing"
    monkeypatch.setattr(service, "_piper_available_languages", lambda: ["en", "vi"])
    synthesize = Mock(side_effect=lambda text, language, speed: tts.TTSResult(
        audio_data=pcm_wav(), sample_rate=16000, duration_seconds=0.5, text=text, source="piper",
    ))
    monkeypatch.setattr(service, "_piper_generate", synthesize)
    return synthesize


@pytest.mark.parametrize("language,normalized,text", [
    ("en-US", "en", "This is my mom."),
    ("vi-VN", "vi", "Bé hãy đọc theo nhé."),
])
def test_piper_first_normalizes_locale_and_returns_valid_wav(service, monkeypatch, language, normalized, text):
    synthesize = install_provider(service, monkeypatch)
    result = asyncio.run(service.generate_speech(text, language=language))
    synthesize.assert_called_once_with(text, normalized, 1.0)
    assert result.source == "piper"
    with wave.open(io.BytesIO(result.audio_data), "rb") as audio:
        assert audio.getframerate() == result.sample_rate == 16000
        assert audio.getnframes() / audio.getframerate() == result.duration_seconds == 0.5
    tts._get_xtts_model.assert_not_called()


def test_piper_status_preserves_provider_fields(service, monkeypatch):
    install_provider(service, monkeypatch)
    status = asyncio.run(service.get_status())
    assert status["available"] is True
    assert status["piper_available"] is True
    assert status["piper_languages"] == ["en", "vi"]
    assert status["xtts_available"] is False
    assert status["google_tts_available"] is False
    assert status["cache_enabled"] is True
    assert status["cache_dir"] == str(tts.CACHE_DIR)
    assert "en" in status["supported_languages"]


def test_cached_wav_metadata_and_speed_are_not_reused_incorrectly(service, monkeypatch):
    synthesize = install_provider(service, monkeypatch)
    first = asyncio.run(service.generate_speech("Hello", speed=1.0))
    cached = asyncio.run(service.generate_speech("Hello", speed=1.0))
    assert synthesize.call_count == 1
    assert cached.audio_data == first.audio_data
    assert cached.sample_rate == 16000
    assert cached.duration_seconds == 0.5
    asyncio.run(service.generate_speech("Hello", speed=0.8))
    assert synthesize.call_count == 2
    synthesize.assert_called_with("Hello", "en", 0.8)


def test_model_directory_identity_invalidates_cached_voice(service, monkeypatch, tmp_path):
    synthesize = install_provider(service, monkeypatch)
    asyncio.run(service.generate_speech("Hello"))
    other_models = tmp_path / "other-voice"
    other_models.mkdir()
    (other_models / "en_US-lessac-medium.onnx").write_bytes(b"different-model")
    (other_models / "en_US-lessac-medium.onnx.json").write_text("{}", encoding="utf-8")
    monkeypatch.setenv("PIPER_MODEL_DIR", str(other_models))
    asyncio.run(service.generate_speech("Hello"))
    assert synthesize.call_count == 2


def test_unsupported_language_never_uses_english_piper(service, monkeypatch):
    synthesize = install_provider(service, monkeypatch)
    with pytest.raises(tts.TTSUnavailableError):
        asyncio.run(service.generate_speech("Bonjour", language="fr"))
    synthesize.assert_not_called()


def test_cache_write_failure_preserves_generated_audio(service, monkeypatch):
    install_provider(service, monkeypatch)
    write_bytes = Path.write_bytes
    def deny_cache_write(path, data):
        write_bytes(path, data[:8])
        raise PermissionError("cache is read-only")
    monkeypatch.setattr(Path, "write_bytes", deny_cache_write)
    result = asyncio.run(service.generate_speech("Hello"))
    assert result.source == "piper"
    assert result.audio_data == pcm_wav()
    assert list(tts.CACHE_DIR.iterdir()) == []


@pytest.mark.parametrize("text,speed", [
    ("x" * 501, 1.0),
    ("Hello", 0.0),
    ("Hello", float("nan")),
    ("Hello", float("inf")),
])
def test_invalid_input_is_rejected_before_native_synthesis(service, monkeypatch, text, speed):
    synthesize = install_provider(service, monkeypatch)
    with pytest.raises(tts.TTSError):
        asyncio.run(service.generate_speech(text, speed=speed))
    synthesize.assert_not_called()
    assert list(tts.CACHE_DIR.iterdir()) == []


def zero_rate_wav():
    data = bytearray(pcm_wav())
    struct.pack_into("<I", data, 24, 0)
    return bytes(data)


@pytest.mark.parametrize("corrupted_audio", [
    b"not a WAV file",
    pcm_wav()[:44],
    zero_rate_wav(),
], ids=["garbage", "header-only", "zero-rate"])
def test_corrupted_cache_is_regenerated_as_valid_wav(service, monkeypatch, corrupted_audio):
    synthesize = install_provider(service, monkeypatch)
    first = asyncio.run(service.generate_speech("Hello"))
    cache_files = list(tts.CACHE_DIR.glob("*.wav"))
    assert len(cache_files) == 1
    cache_files[0].write_bytes(corrupted_audio)

    regenerated = asyncio.run(service.generate_speech("Hello"))

    assert synthesize.call_count == 2
    assert regenerated.source == "piper"
    assert regenerated.audio_data == first.audio_data == cache_files[0].read_bytes()
    assert regenerated.sample_rate == 16000
    assert regenerated.duration_seconds == 0.5


def test_cache_bypass_and_cached_output_path_are_respected(service, monkeypatch, tmp_path):
    synthesize = install_provider(service, monkeypatch)
    first = asyncio.run(service.generate_speech("Hello"))
    output = tmp_path / "sample.wav"
    cached = asyncio.run(service.generate_speech("Hello", output_path=str(output)))
    assert output.read_bytes() == cached.audio_data == first.audio_data
    assert synthesize.call_count == 1
    asyncio.run(service.generate_speech("Hello", use_cache=False))
    assert synthesize.call_count == 2


def test_availability_requires_native_package_and_complete_model_pair(service, monkeypatch):
    assert hasattr(service, "_piper_available_languages"), "Piper availability provider is missing"
    package = ModuleType("piper")
    package.__spec__ = importlib.util.spec_from_loader("piper", loader=None)
    monkeypatch.setitem(sys.modules, "piper", package)
    assert service._piper_available_languages() == ["en", "vi"]
    models = Path(os.environ["PIPER_MODEL_DIR"])
    (models / "vi_VN-vais1000-medium.onnx.json").unlink()
    assert service._piper_available_languages() == ["en"]
    monkeypatch.setitem(sys.modules, "piper", None)
    assert service._piper_available_languages() == []
