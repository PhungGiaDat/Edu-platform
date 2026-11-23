"""
TTS Service - CPU Piper with optional Coqui XTTS / Google Cloud fallbacks

Provides high-quality AI voice generation for pronunciation practice.
Supports Vietnamese language with natural, kid-friendly voices.

Features:
- Piper for English and Vietnamese, with models packaged in the server image
- Coqui XTTS v2 for high-quality offline TTS (open source)
- Google Cloud TTS as cloud fallback
- Caching to reduce API calls
- Audio format conversion
"""
import asyncio
import io
import hashlib
import logging
import os
import importlib.util
import json
import math
import threading
import uuid
import wave
from typing import Optional, Tuple
from pathlib import Path
from dataclasses import dataclass

logger = logging.getLogger(__name__)

# Lazy loading for heavy dependencies
_xtts_model = None
_model_lock = asyncio.Lock()
_piper_models = {}
# ponytail: serialize native CPU synthesis on the 2-vCPU VPS; revisit for higher concurrency.
_piper_lock = threading.Lock()
_PIPER_VOICES = {"en": "en_US-lessac-medium", "vi": "vi_VN-vais1000-medium"}

# Cache directory for generated audio
CACHE_DIR = Path.home() / ".cache" / "tts"
CACHE_DIR.mkdir(parents=True, exist_ok=True)


@dataclass
class TTSResult:
    """Result of TTS generation."""
    audio_data: bytes
    sample_rate: int
    duration_seconds: float
    text: str
    source: str  # 'piper', 'xtts', 'google', or 'cache'


class TTSError(Exception):
    """Custom exception for TTS failures."""
    pass


class TTSUnavailableError(TTSError):
    """Raised when no TTS provider is available."""
    pass


async def _get_xtts_model():
    """
    Lazily load Coqui XTTS v2 model on first use.
    
    Returns:
        XTTS model instance or None if not available
    """
    global _xtts_model
    
    async with _model_lock:
        if _xtts_model is not None:
            return _xtts_model
        
        try:
            from TTS.api import TTS
            
            logger.info("[TTS] Loading Coqui XTTS v2 model...")
            # Use XTTS v2 for best quality multi-lingual TTS
            _xtts_model = TTS("tts_models/multilingual/multi-dataset/xtts_v2", gpu=False)
            logger.info("[TTS] Coqui XTTS v2 model loaded successfully")
            return _xtts_model
            
        except ImportError:
            logger.warning(
                "[TTS] Coqui TTS not installed. "
                "Install with: pip install TTS"
            )
            return None
        except Exception as e:
            logger.error(f"[TTS] Failed to load XTTS model: {e}")
            return None


def _get_cache_key(text: str, language: str, speaker_id: str = "default", speed: float = 1.0) -> str:
    """Generate cache key for TTS audio."""
    content = f"{text}:{language}:{speaker_id}:{speed}"
    return hashlib.md5(content.encode()).hexdigest()


class TTSService:
    """
    Text-to-Speech service supporting multiple providers.
    
    Provider priority:
    1. Piper (offline, bounded CPU inference for English and Vietnamese)
    2. Coqui XTTS v2 (optional)
    3. Google Cloud TTS (optional)
    """
    
    # Supported languages
    SUPPORTED_LANGUAGES = {
        "en": "English",
        "vi": "Vietnamese", 
        "zh": "Chinese",
        "ja": "Japanese",
        "ko": "Korean",
        "es": "Spanish",
        "fr": "French",
        "de": "German",
    }
    
    # Language code mappings
    LANGUAGE_CODES = {
        "en": "en",
        "vi": "vi",
        "english": "en",
        "vietnamese": "vi",
    }
    
    def __init__(self):
        self._cache_enabled = True
        self._google_tts_available = False
        self._check_google_tts()
    
    def _check_google_tts(self):
        """Check if Google Cloud TTS is available."""
        try:
            from settings import settings
            if settings.GOOGLE_APPLICATION_CREDENTIALS or settings.GOOGLE_TTS_API_KEY:
                self._google_tts_available = True
                logger.info("[TTS] Google Cloud TTS available")
        except Exception:
            pass
    
    def _normalize_language(self, language: str) -> str:
        """Normalize language code."""
        language = language.lower().replace("_", "-")
        return self.LANGUAGE_CODES.get(language, language.split("-")[0])

    def _piper_model_path(self, language: str) -> Path:
        directory = Path(os.environ.get("PIPER_MODEL_DIR", str(Path(__file__).resolve().parents[1] / "tts_models")))
        return directory / f"{_PIPER_VOICES[language]}.onnx"

    def _piper_available_languages(self) -> list:
        if importlib.util.find_spec("piper") is None:
            return []
        return [language for language in _PIPER_VOICES
                if self._piper_model_path(language).is_file()
                and Path(str(self._piper_model_path(language)) + ".json").is_file()]

    def _piper_identity(self, language: str) -> str:
        model = self._piper_model_path(language).resolve()
        config = Path(str(model) + ".json")
        return f"piper:{model}:{model.stat().st_mtime_ns}:{config.stat().st_mtime_ns}"

    def _piper_generate(self, text: str, language: str, speed: float) -> TTSResult:
        """Runs in a worker thread; native models stay loaded for subsequent requests."""
        from piper import PiperVoice
        from piper.config import PiperConfig, SynthesisConfig
        import onnxruntime as ort

        with _piper_lock:
            identity = self._piper_identity(language)
            if identity not in _piper_models:
                path = self._piper_model_path(language)
                options = ort.SessionOptions()
                options.intra_op_num_threads = max(1, int(os.environ.get("PIPER_THREADS", "2")))
                options.inter_op_num_threads = 1
                options.execution_mode = ort.ExecutionMode.ORT_SEQUENTIAL
                session = ort.InferenceSession(str(path), sess_options=options,
                                               providers=["CPUExecutionProvider"])
                config = json.loads(Path(str(path) + ".json").read_text(encoding="utf-8"))
                _piper_models[identity] = PiperVoice(session, PiperConfig.from_dict(config))
            buffer = io.BytesIO()
            with wave.open(buffer, "wb") as output:
                _piper_models[identity].synthesize_wav(
                    text, output, SynthesisConfig(length_scale=1.0 / speed))
            return self._wav_result(buffer.getvalue(), text, "piper")

    def _wav_result(self, data: bytes, text: str, source: str) -> TTSResult:
        with wave.open(io.BytesIO(data), "rb") as audio:
            rate = audio.getframerate()
            frames = audio.getnframes()
            if rate <= 0 or frames <= 0:
                raise wave.Error("Invalid WAV sample rate or empty audio")
            expected_bytes = frames * audio.getnchannels() * audio.getsampwidth()
            if len(audio.readframes(frames)) != expected_bytes:
                raise wave.Error("Incomplete WAV frame payload")
            duration = frames / rate
        return TTSResult(data, rate, duration, text, source)

    def _save_cache(self, cache_key: str, data: bytes) -> None:
        destination = self._get_cache_path(cache_key)
        temporary = destination.with_suffix(f".{uuid.uuid4().hex}.tmp")
        try:
            temporary.write_bytes(data)
            temporary.replace(destination)
        except OSError as error:
            logger.warning("[TTS] Cannot save audio cache: %s", error)
        finally:
            try:
                temporary.unlink(missing_ok=True)
            except OSError:
                logger.debug("[TTS] Cannot remove temporary cache file: %s", temporary)
    
    def _get_cache_path(self, cache_key: str) -> Path:
        """Get cache file path for a cache key."""
        return CACHE_DIR / f"{cache_key}.wav"
    
    def _check_cache(self, cache_key: str) -> Optional[Path]:
        """Check if cached audio exists."""
        if not self._cache_enabled:
            return None
        
        cache_path = self._get_cache_path(cache_key)
        if cache_path.exists():
            logger.debug(f"[TTS] Cache hit: {cache_key}")
            return cache_path
        return None
    
    async def is_available(self) -> bool:
        """Check if TTS service is available (any provider)."""
        if self._piper_available_languages():
            return True
        # Check XTTS
        xtts = await _get_xtts_model()
        if xtts:
            return True
        
        # Check Google TTS
        return self._google_tts_available
    
    async def generate_speech(
        self,
        text: str,
        language: str = "en",
        output_path: Optional[str] = None,
        speed: float = 1.0,
        use_cache: bool = True,
    ) -> TTSResult:
        """
        Generate speech audio from text.
        
        Args:
            text: Text to convert to speech
            language: Language code (en, vi, etc.)
            output_path: Optional path to save audio file
            speed: Speech speed multiplier (0.5 - 2.0)
            use_cache: Whether to use caching
            
        Returns:
            TTSResult with audio data and metadata
            
        Raises:
            TTSUnavailableError: No TTS provider available
            TTSError: Generation failed
        """
        if not text or not text.strip():
            raise TTSError("Cannot generate speech from empty text")
        if len(text) > 500 or not math.isfinite(speed) or not 0.5 <= speed <= 2.0:
            raise TTSError("TTS requires at most 500 characters and speed between 0.5 and 2.0")
        
        normalized_lang = self._normalize_language(language)
        piper_available = normalized_lang in self._piper_available_languages()
        identity = self._piper_identity(normalized_lang) if piper_available else "legacy"
        cache_key = _get_cache_key(text, normalized_lang, identity, speed)
        
        # Check cache first
        if use_cache:
            cached_path = self._check_cache(cache_key)
            if cached_path:
                try:
                    result = self._wav_result(cached_path.read_bytes(), text, "cache")
                except (OSError, EOFError, wave.Error):
                    logger.warning("[TTS] Ignoring unreadable audio cache: %s", cached_path)
                else:
                    if output_path:
                        Path(output_path).write_bytes(result.audio_data)
                    return result

        if piper_available:
            try:
                result = await asyncio.to_thread(self._piper_generate, text, normalized_lang, speed)
            except Exception as error:
                logger.warning("[TTS] Piper synthesis failed: %s", error)
            else:
                if use_cache:
                    self._save_cache(cache_key, result.audio_data)
                if output_path:
                    Path(output_path).write_bytes(result.audio_data)
                return result
        
        # Try XTTS first (higher quality, offline)
        xtts = await _get_xtts_model()
        if xtts:
            try:
                return await self._generate_xtts(
                    text, normalized_lang, speed, output_path, cache_key if use_cache else None
                )
            except Exception as e:
                logger.warning(f"[TTS] XTTS generation failed: {e}, trying Google TTS")
        
        # Fall back to Google Cloud TTS
        if self._google_tts_available:
            return await self._generate_google_tts(text, normalized_lang, speed, output_path)
        
        raise TTSUnavailableError(
            "No TTS provider available. Install Piper and its voice models."
        )
    
    async def _generate_xtts(
        self,
        text: str,
        language: str,
        speed: float,
        output_path: Optional[str],
        cache_key: Optional[str],
    ) -> TTSResult:
        """Generate speech using Coqui XTTS v2."""
        loop = asyncio.get_event_loop()
        
        try:
            model = await _get_xtts_model()
            if model is None:
                raise TTSError("XTTS model not available")
            
            logger.info(f"[TTS] Generating speech for: '{text[:50]}...' ({language})")
            
            # Run generation in thread pool
            wav_bytes = await loop.run_in_executor(
                None,
                lambda: self._xtts_generate(model, text, language, speed)
            )
            
            # Convert numpy array to bytes
            import numpy as np
            
            # Save to cache if enabled
            if cache_key:
                cache_path = self._get_cache_path(cache_key)
                try:
                    import scipy.io.wavfile as wavfile
                    wavfile.write(cache_path, 24000, wav_bytes)
                    logger.debug(f"[TTS] Saved to cache: {cache_path}")
                except Exception as e:
                    logger.warning(f"[TTS] Failed to save cache: {e}")
            
            # Save to output path if provided
            if output_path:
                import scipy.io.wavfile as wavfile
                wavfile.write(output_path, 24000, wav_bytes)
            
            # Convert to MP3/OGG for web playback
            audio_data = self._convert_to_web_format(wav_bytes, 24000)
            
            duration = len(wav_bytes) / 24000 if len(wav_bytes) > 0 else 0
            
            return TTSResult(
                audio_data=audio_data,
                sample_rate=24000,
                duration_seconds=duration,
                text=text,
                source="xtts",
            )
            
        except Exception as e:
            logger.error(f"[TTS] XTTS generation failed: {e}")
            raise TTSError(f"XTTS generation failed: {e}")
    
    def _xtts_generate(self, model, text: str, language: str, speed: float) -> any:
        """Synchronous XTTS generation (runs in thread pool)."""
        try:
            # Generate with XTTS
            # For multilingual, we can specify the language
            wav = model.tts(
                text=text,
                language=language,
                speed=speed,
            )
            return wav
        except Exception as e:
            logger.error(f"[TTS] XTTS tts() failed: {e}")
            raise
    
    async def _generate_google_tts(
        self,
        text: str,
        language: str,
        speed: float,
        output_path: Optional[str],
    ) -> TTSResult:
        """Generate speech using Google Cloud TTS."""
        try:
            from google.cloud import texttospeech_v1 as tts
            from settings import settings
            
            # Map language codes for Google TTS
            google_lang_map = {
                "en": "en-US",
                "vi": "vi-VN",
                "zh": "zh-CN",
                "ja": "ja-JP",
                "ko": "ko-KR",
            }
            
            google_lang = google_lang_map.get(language, f"{language}-{language.upper()}")
            
            # Configure voice
            voice = tts.VoiceSelectionParams(
                language_code=google_lang,
                ssml_gender=tts.SsmlVoiceGender.FEMALE,
            )
            
            # Configure audio
            audio_config = tts.AudioConfig(
                audio_encoding=tts.AudioEncoding.MP3,
                speaking_rate=min(2.0, max(0.25, speed)),
            )
            
            # Synthesis input
            synthesis_input = tts.SynthesisInput(text=text)
            
            # Get credentials
            if settings.GOOGLE_APPLICATION_CREDENTIALS:
                client = tts.TextToSpeechAsyncClient.from_service_account_json(
                    settings.GOOGLE_APPLICATION_CREDENTIALS
                )
            else:
                client = tts.TextToSpeechAsyncClient()
            
            logger.info(f"[TTS] Generating Google TTS for: '{text[:50]}...' ({google_lang})")
            
            response = await client.synthesize_speech(
                input=synthesis_input,
                voice=voice,
                audio_config=audio_config,
            )
            
            audio_data = response.audio_content
            
            # Save to output path if provided
            if output_path:
                with open(output_path, "wb") as out:
                    out.write(audio_data)
            
            # Estimate duration (roughly 150 words per minute)
            word_count = len(text.split())
            duration = (word_count / 150) * 60 / speed
            
            return TTSResult(
                audio_data=audio_data,
                sample_rate=24000,
                duration_seconds=duration,
                text=text,
                source="google",
            )
            
        except ImportError:
            logger.warning("[TTS] Google Cloud TTS library not installed")
            raise TTSError("Google Cloud TTS not available")
        except Exception as e:
            logger.error(f"[TTS] Google TTS generation failed: {e}")
            raise TTSError(f"Google TTS generation failed: {e}")
    
    def _convert_to_web_format(self, wav_data: any, sample_rate: int) -> bytes:
        """Convert WAV audio to web-compatible format."""
        import io
        import scipy.io.wavfile as wavfile
        
        # Create in-memory WAV file
        buffer = io.BytesIO()
        wavfile.write(buffer, sample_rate, wav_data)
        buffer.seek(0)
        
        return buffer.getvalue()
    
    async def generate_vietnamese_speech(
        self,
        text: str,
        speed: float = 1.0,
    ) -> TTSResult:
        """
        Generate Vietnamese speech with optimized settings.
        
        Vietnamese has tonal qualities that require careful TTS handling.
        Uses the configured Vietnamese voice.
        """
        return await self.generate_speech(
            text=text,
            language="vi",
            speed=speed,
        )
    
    async def generate_english_speech(
        self,
        text: str,
        speed: float = 1.0,
    ) -> TTSResult:
        """Generate English speech with optimized settings."""
        return await self.generate_speech(
            text=text,
            language="en",
            speed=speed,
        )
    
    async def get_status(self) -> dict:
        """Get TTS service status."""
        piper_languages = self._piper_available_languages()
        xtts_available = await _get_xtts_model() is not None
        
        return {
            "available": bool(piper_languages) or xtts_available or self._google_tts_available,
            "piper_available": bool(piper_languages),
            "piper_languages": piper_languages,
            "xtts_available": xtts_available,
            "google_tts_available": self._google_tts_available,
            "supported_languages": list(self.SUPPORTED_LANGUAGES.keys()),
            "cache_enabled": self._cache_enabled,
            "cache_dir": str(CACHE_DIR),
        }
    
    async def clear_cache(self) -> int:
        """Clear the TTS cache and return number of files deleted."""
        if not CACHE_DIR.exists():
            return 0
        
        count = 0
        for file in CACHE_DIR.glob("*.wav"):
            try:
                file.unlink()
                count += 1
            except Exception:
                pass
        
        logger.info(f"[TTS] Cleared {count} cached audio files")
        return count


def get_tts_service() -> TTSService:
    """Factory function for FastAPI dependency injection."""
    return TTSService()
