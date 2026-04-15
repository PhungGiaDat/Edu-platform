# backend/services/speech_processing_service.py
"""
Speech Processing Service - Server-side speech-to-text using faster-whisper

Provides fallback speech recognition for browsers that don't support Web Speech API
(Safari, Firefox). Uses CTranslate2-optimized Whisper for CPU-efficient transcription.

Memory-optimized for free tier deployment (~150MB RAM usage).
"""
import asyncio
import io
import tempfile
import os
from typing import Optional, Tuple
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

# Lazy load faster-whisper to avoid import errors if not installed
_whisper_model = None
_model_lock = asyncio.Lock()

# Rate limiting state
_active_transcriptions = 0
_transcription_lock = asyncio.Lock()
MAX_CONCURRENT_TRANSCRIPTIONS = 2


class TranscriptionError(Exception):
    """Custom exception for transcription failures."""
    pass


class RateLimitError(Exception):
    """Raised when too many concurrent transcriptions are in progress."""
    pass


async def _get_whisper_model():
    """
    Lazily load the Whisper model on first use.
    Uses 'tiny' model for minimal memory footprint (~75MB).
    
    Returns:
        WhisperModel instance or None if faster-whisper not installed
    """
    global _whisper_model
    
    async with _model_lock:
        if _whisper_model is not None:
            return _whisper_model
        
        try:
            from faster_whisper import WhisperModel
            
            # Use 'tiny' model for CPU deployment
            # Options: tiny, base, small, medium, large-v2
            # tiny = ~75MB VRAM, base = ~142MB, small = ~466MB
            logger.info("[Speech] Loading Whisper 'tiny' model for CPU...")
            
            _whisper_model = WhisperModel(
                "tiny",
                device="cpu",
                compute_type="int8",  # Quantized for lower memory
                cpu_threads=2,        # Limit threads for shared hosting
                download_root=str(Path.home() / ".cache" / "whisper"),
            )
            
            logger.info("[Speech] Whisper model loaded successfully")
            return _whisper_model
            
        except ImportError:
            logger.warning(
                "[Speech] faster-whisper not installed. "
                "Server-side transcription unavailable. "
                "Run: pip install faster-whisper"
            )
            return None
        except Exception as e:
            logger.error(f"[Speech] Failed to load Whisper model: {e}")
            return None


class SpeechProcessingService:
    """
    Service for server-side speech-to-text transcription.
    
    Features:
    - Lazy model loading (only loads when first used)
    - Rate limiting (max 2 concurrent transcriptions)
    - Memory-optimized for free tier deployment
    - Graceful degradation if model unavailable
    """
    
    def __init__(self):
        self._supported_formats = {".webm", ".wav", ".mp3", ".ogg", ".m4a", ".flac"}
    
    async def is_available(self) -> bool:
        """Check if speech processing is available."""
        model = await _get_whisper_model()
        return model is not None
    
    async def transcribe_audio(
        self,
        audio_data: bytes,
        file_extension: str = ".webm",
        language: str = "en",
    ) -> Tuple[str, float]:
        """
        Transcribe audio data to text.
        
        Args:
            audio_data: Raw audio bytes
            file_extension: Audio format extension (e.g., ".webm", ".wav")
            language: Expected language code (default: "en" for English)
            
        Returns:
            Tuple of (transcribed_text, confidence_score)
            
        Raises:
            RateLimitError: If too many concurrent transcriptions
            TranscriptionError: If transcription fails
        """
        global _active_transcriptions
        
        # Rate limiting check
        async with _transcription_lock:
            if _active_transcriptions >= MAX_CONCURRENT_TRANSCRIPTIONS:
                raise RateLimitError(
                    f"Too many concurrent transcriptions. Max: {MAX_CONCURRENT_TRANSCRIPTIONS}"
                )
            _active_transcriptions += 1
        
        try:
            return await self._do_transcribe(audio_data, file_extension, language)
        finally:
            async with _transcription_lock:
                _active_transcriptions -= 1
    
    async def _do_transcribe(
        self,
        audio_data: bytes,
        file_extension: str,
        language: str,
    ) -> Tuple[str, float]:
        """Internal transcription logic."""
        
        # Validate format
        if file_extension.lower() not in self._supported_formats:
            raise TranscriptionError(
                f"Unsupported audio format: {file_extension}. "
                f"Supported: {', '.join(self._supported_formats)}"
            )
        
        # Get model
        model = await _get_whisper_model()
        if model is None:
            raise TranscriptionError(
                "Speech processing unavailable. faster-whisper not installed."
            )
        
        # Write audio to temp file (faster-whisper requires file path)
        temp_path = None
        try:
            with tempfile.NamedTemporaryFile(
                suffix=file_extension,
                delete=False,
            ) as temp_file:
                temp_file.write(audio_data)
                temp_path = temp_file.name
            
            # Run transcription in thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            segments, info = await loop.run_in_executor(
                None,
                lambda: model.transcribe(
                    temp_path,
                    language=language if language != "auto" else None,
                    beam_size=3,           # Lower beam size for speed
                    best_of=1,             # Single pass for speed
                    temperature=0.0,       # Greedy decoding
                    vad_filter=True,       # Filter out silence
                    vad_parameters=dict(
                        min_silence_duration_ms=500,
                    ),
                ),
            )
            
            # Collect all segments
            text_parts = []
            total_confidence = 0.0
            segment_count = 0
            
            for segment in segments:
                text_parts.append(segment.text.strip())
                # Whisper returns log probability, convert to confidence
                if segment.avg_logprob:
                    # avg_logprob is typically -0.5 to 0 for good transcriptions
                    # Convert to 0-1 scale
                    confidence = min(1.0, max(0.0, 1.0 + segment.avg_logprob))
                    total_confidence += confidence
                    segment_count += 1
            
            transcribed_text = " ".join(text_parts).strip()
            avg_confidence = (
                total_confidence / segment_count if segment_count > 0 else 0.5
            )
            
            logger.info(
                f"[Speech] Transcribed: '{transcribed_text[:50]}...' "
                f"(confidence: {avg_confidence:.2f}, language: {info.language})"
            )
            
            return transcribed_text, avg_confidence
            
        except Exception as e:
            logger.error(f"[Speech] Transcription failed: {e}")
            raise TranscriptionError(f"Transcription failed: {str(e)}")
        finally:
            # Clean up temp file
            if temp_path and os.path.exists(temp_path):
                try:
                    os.unlink(temp_path)
                except Exception:
                    pass
    
    async def get_status(self) -> dict:
        """
        Get current service status.
        Useful for health checks and debugging.
        """
        global _active_transcriptions
        
        model_loaded = _whisper_model is not None
        model_available = await self.is_available()
        
        return {
            "available": model_available,
            "model_loaded": model_loaded,
            "model_name": "whisper-tiny" if model_available else None,
            "active_transcriptions": _active_transcriptions,
            "max_concurrent": MAX_CONCURRENT_TRANSCRIPTIONS,
            "supported_formats": list(self._supported_formats),
        }


def get_speech_processing_service() -> SpeechProcessingService:
    """Factory function for FastAPI dependency injection."""
    return SpeechProcessingService()
