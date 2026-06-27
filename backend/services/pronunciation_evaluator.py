"""
Pronunciation Evaluator Service - AI-powered pronunciation analysis

Provides comprehensive pronunciation evaluation using:
- Phonetic analysis of spoken audio
- Comparison with reference pronunciation
- Detailed feedback generation
- Score calculation (0-100)

Features:
- Uses Whisper for transcription
- AI-powered phonetic analysis
- Vietnamese language support
- Kid-friendly feedback generation
"""
import asyncio
import io
import logging
from typing import Optional, List, Dict, Any, Tuple
from dataclasses import dataclass
from pathlib import Path

logger = logging.getLogger(__name__)

# Lazy load Whisper for phonetic analysis
_whisper_model = None
_model_lock = asyncio.Lock()


@dataclass
class PhonemeAnalysis:
    """Analysis of individual phonemes in pronunciation."""
    expected: str
    spoken: str
    is_match: bool
    confidence: float
    suggestion: Optional[str] = None


@dataclass
class PronunciationEvaluation:
    """Complete pronunciation evaluation result."""
    score: int  # 0-100
    grade: str  # 'excellent', 'good', 'needs_practice'
    stars: int  # 1-3
    transcription: str
    confidence: float
    phoneme_analysis: List[PhonemeAnalysis]
    feedback: str
    feedback_emoji: str
    areas_for_improvement: List[str]
    strengths: List[str]
    suggestions: List[str]
    language: str
    source: str  # 'ai', 'phonetic', 'whisper'


class EvaluationError(Exception):
    """Custom exception for evaluation failures."""
    pass


async def _get_whisper_model():
    """Lazily load Whisper model for transcription."""
    global _whisper_model
    
    async with _model_lock:
        if _whisper_model is not None:
            return _whisper_model
        
        try:
            from faster_whisper import WhisperModel
            
            logger.info("[Evaluator] Loading Whisper model for evaluation...")
            _whisper_model = WhisperModel(
                "base",  # base model for better accuracy
                device="cpu",
                compute_type="int8",
                cpu_threads=2,
            )
            logger.info("[Evaluator] Whisper model loaded")
            return _whisper_model
            
        except ImportError:
            logger.warning("[Evaluator] faster-whisper not installed")
            return None
        except Exception as e:
            logger.error(f"[Evaluator] Failed to load Whisper: {e}")
            return None


class PronunciationEvaluator:
    """
    AI-powered pronunciation evaluation service.
    
    Provides:
    - Speech-to-text transcription
    - Phonetic analysis
    - Score calculation (0-100)
    - Kid-friendly feedback generation
    """
    
    # Score thresholds
    EXCELLENT_THRESHOLD = 90
    GOOD_THRESHOLD = 70
    NEEDS_PRACTICE_THRESHOLD = 50
    
    # Phoneme mappings for common languages
    PHONEME_MAP = {
        "en": {
            # English phonemes
            "th": ["θ", "ð"],
            "sh": ["ʃ"],
            "ch": ["tʃ"],
            "ng": ["ŋ"],
            "ae": ["æ"],
            "ee": ["iː"],
            "oo": ["uː"],
        },
        "vi": {
            # Vietnamese phonemes (approximation)
            "ă": ["ă"],
            "â": ["â"],
            "ê": ["ê"],
            "ô": ["ô"],
            "ơ": ["ơ"],
            "ư": ["ư"],
            "ng": ["ŋ"],
            "nh": ["ɲ"],
            "ch": ["c"],
            "tr": ["t̚"],
        },
    }
    
    def __init__(self):
        self._ai_service = None
        self._feedback_templates = self._load_feedback_templates()
    
    def _load_feedback_templates(self) -> Dict[str, Any]:
        """Load feedback templates for different scenarios."""
        return {
            "excellent": {
                "messages": [
                    "Perfect pronunciation! You're amazing!",
                    "Excellent work! Keep it up!",
                    "Fantastic! You're a pronunciation star!",
                    "Outstanding! You're getting better every day!",
                ],
                "emoji": ["🌟", "🎉", "🏆", "⭐"],
            },
            "good": {
                "messages": [
                    "Good job! Almost perfect!",
                    "Nice work! A little more practice!",
                    "Great try! You're doing well!",
                    "Well done! Keep practicing!",
                ],
                "emoji": ["👍", "💪", "🎯", "✨"],
            },
            "needs_practice": {
                "messages": [
                    "Good try! Let's practice more!",
                    "Keep going! You'll get it!",
                    "Nice effort! Try again!",
                    "You're learning! Don't give up!",
                ],
                "emoji": ["🌈", "💖", "🎈", "🌻"],
            },
        }
    
    async def _get_ai_service(self):
        """Lazy load AI service."""
        if self._ai_service is None:
            from services.ai_service import get_ai_service
            self._ai_service = get_ai_service()
        return self._ai_service
    
    def _calculate_similarity(self, str1: str, str2: str) -> float:
        """Calculate string similarity using Levenshtein distance."""
        if str1 == str2:
            return 1.0
        if not str1 or not str2:
            return 0.0
        
        m, n = len(str1), len(str2)
        dp = [[0] * (n + 1) for _ in range(m + 1)]
        
        for i in range(m + 1):
            dp[i][0] = i
        for j in range(n + 1):
            dp[0][j] = j
        
        for i in range(1, m + 1):
            for j in range(1, n + 1):
                if str1[i-1] == str2[j-1]:
                    dp[i][j] = dp[i-1][j-1]
                else:
                    dp[i][j] = 1 + min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])
        
        distance = dp[m][n]
        max_len = max(m, n)
        return 1 - (distance / max_len)
    
    def _normalize_text(self, text: str) -> str:
        """Normalize text for comparison."""
        import re
        # Remove punctuation and convert to lowercase
        text = re.sub(r'[^\w\s]', '', text.lower())
        # Normalize whitespace
        text = ' '.join(text.split())
        return text
    
    def _analyze_phonemes(self, expected: str, spoken: str, language: str) -> List[PhonemeAnalysis]:
        """Perform phonetic analysis between expected and spoken text."""
        expected_lower = expected.lower()
        spoken_lower = spoken.lower()
        
        # Get phoneme patterns for language
        phoneme_map = self.PHONEME_MAP.get(language, {})
        
        # Simple word-level comparison
        expected_words = expected_lower.split()
        spoken_words = spoken_lower.split()
        
        analyses = []
        
        # Compare each expected word
        for exp_word in expected_words:
            # Find best matching spoken word
            best_match = None
            best_similarity = 0
            
            for spk_word in spoken_words:
                similarity = self._calculate_similarity(exp_word, spk_word)
                if similarity > best_similarity:
                    best_similarity = similarity
                    best_match = spk_word
            
            if best_match:
                is_match = best_similarity >= 0.8
                suggestion = None
                
                if not is_match:
                    # Generate suggestion based on phoneme patterns
                    if language == "vi":
                        suggestion = self._get_vietnamese_suggestion(exp_word, best_match)
                    else:
                        suggestion = self._get_english_suggestion(exp_word, best_match)
                
                analyses.append(PhonemeAnalysis(
                    expected=exp_word,
                    spoken=best_match,
                    is_match=is_match,
                    confidence=best_similarity,
                    suggestion=suggestion,
                ))
            else:
                analyses.append(PhonemeAnalysis(
                    expected=exp_word,
                    spoken="[not detected]",
                    is_match=False,
                    confidence=0.0,
                    suggestion="Try speaking more clearly",
                ))
        
        return analyses
    
    def _get_vietnamese_suggestion(self, expected: str, spoken: str) -> str:
        """Generate pronunciation suggestion for Vietnamese."""
        suggestions = []
        
        # Check tone markers
        tone_markers = "àáảãạầấẩẫậèéẻẽẹìíỉĩịòóỏõọùúủũụừứửữựỳýỷỹỵ"
        
        for i, (e, s) in enumerate(zip(expected, spoken)):
            if e != s:
                if e in tone_markers:
                    suggestions.append(f"Focus on the tone at position {i+1}")
                elif e in "ăâêôơư":
                    suggestions.append(f"Pronounce the '{e}' sound carefully")
        
        if not suggestions:
            suggestions.append("Listen to the audio again and try to match the rhythm")
        
        return ". ".join(suggestions[:2])
    
    def _get_english_suggestion(self, expected: str, spoken: str) -> str:
        """Generate pronunciation suggestion for English."""
        suggestions = []
        
        # Check for common English pronunciation issues
        if "th" in expected and not any(c in spoken for c in ["θ", "ð"]):
            suggestions.append("Try to put your tongue between your teeth for 'th' sound")
        
        if expected.endswith("ing") and not spoken.endswith("ing"):
            suggestions.append("Make sure to use the '-ing' ending clearly")
        
        if expected.startswith("wh") and not spoken.startswith("wh"):
            suggestions.append("The 'wh' should sound like blowing out a candle")
        
        if "r" in expected and "r" not in spoken:
            suggestions.append("Don't forget the 'r' sound")
        
        if "l" in expected and "l" not in spoken:
            suggestions.append("Remember to include the 'l' sound")
        
        if not suggestions:
            suggestions.append("Try to say the word more slowly")
        
        return ". ".join(suggestions[:2])
    
    def _get_grade(self, score: int) -> str:
        """Convert score to grade."""
        if score >= self.EXCELLENT_THRESHOLD:
            return "excellent"
        elif score >= self.GOOD_THRESHOLD:
            return "good"
        elif score >= self.NEEDS_PRACTICE_THRESHOLD:
            return "needs_practice"
        else:
            return "needs_practice"
    
    def _get_stars(self, score: int) -> int:
        """Convert score to star rating."""
        if score >= self.EXCELLENT_THRESHOLD:
            return 3
        elif score >= self.GOOD_THRESHOLD:
            return 2
        else:
            return 1
    
    async def evaluate_from_audio(
        self,
        audio_data: bytes,
        target_text: str,
        language: str = "en",
        file_extension: str = ".webm",
    ) -> PronunciationEvaluation:
        """
        Evaluate pronunciation from audio data.
        
        Args:
            audio_data: Raw audio bytes
            target_text: Expected text to be pronounced
            language: Language code (en, vi)
            file_extension: Audio format
            
        Returns:
            PronunciationEvaluation with detailed analysis
        """
        loop = asyncio.get_event_loop()
        
        # Step 1: Transcribe audio using Whisper
        model = await _get_whisper_model()
        if model is None:
            raise EvaluationError("Transcription model not available")
        
        # Save audio to temp file for Whisper
        import tempfile
        temp_path = None
        
        try:
            with tempfile.NamedTemporaryFile(suffix=file_extension, delete=False) as f:
                f.write(audio_data)
                temp_path = f.name
            
            # Transcribe in thread pool
            segments, info = await loop.run_in_executor(
                None,
                lambda: model.transcribe(
                    temp_path,
                    language=language if language != "auto" else None,
                    beam_size=3,
                    vad_filter=True,
                )
            )
            
            # Collect transcription
            text_parts = []
            for segment in segments:
                text_parts.append(segment.text.strip())
            
            transcribed_text = " ".join(text_parts)
            
            # Calculate confidence
            confidence = 0.5
            if info.avg_logprob:
                confidence = min(1.0, max(0.0, 1.0 + info.avg_logprob))
            
        finally:
            if temp_path and Path(temp_path).exists():
                Path(temp_path).unlink()
        
        # Step 2: Calculate score
        return await self.evaluate_from_transcription(
            transcribed_text=transcribed_text,
            target_text=target_text,
            confidence=confidence,
            language=language,
        )
    
    async def evaluate_from_transcription(
        self,
        transcribed_text: str,
        target_text: str,
        confidence: float = 1.0,
        language: str = "en",
    ) -> PronunciationEvaluation:
        """
        Evaluate pronunciation from transcribed text.
        
        Args:
            transcribed_text: What was actually said
            target_text: Expected text
            confidence: Transcription confidence
            language: Language code
            
        Returns:
            PronunciationEvaluation with detailed analysis
        """
        # Normalize texts
        target_normalized = self._normalize_text(target_text)
        transcribed_normalized = self._normalize_text(transcribed_text)
        
        # Calculate base similarity score
        similarity = self._calculate_similarity(target_normalized, transcribed_normalized)
        
        # Apply confidence weighting
        base_score = similarity * confidence * 100
        
        # Kid-friendly bonus: If they're close, give them credit
        if similarity >= 0.7:
            base_score = min(100, base_score + 10)
        
        # Apply penalty for empty transcription
        if not transcribed_normalized:
            base_score = 0
        
        final_score = max(0, min(100, int(base_score)))
        
        # Perform phonetic analysis
        phoneme_analysis = self._analyze_phonemes(
            expected=target_normalized,
            spoken=transcribed_normalized,
            language=language,
        )
        
        # Generate feedback
        grade = self._get_grade(final_score)
        stars = self._get_stars(final_score)
        
        # Get kid-friendly feedback
        template = self._feedback_templates.get(grade, self._feedback_templates["needs_practice"])
        import random
        feedback = random.choice(template["messages"])
        feedback_emoji = random.choice(template["emoji"])
        
        # Try to get AI-enhanced feedback
        ai_feedback = await self._get_ai_feedback(target_text, transcribed_text, final_score, grade)
        if ai_feedback:
            feedback = ai_feedback.get("message", feedback)
            feedback_emoji = ai_feedback.get("emoji", feedback_emoji)
        
        # Generate suggestions
        areas_for_improvement = self._get_areas_for_improvement(phoneme_analysis, language)
        strengths = self._get_strengths(phoneme_analysis, final_score)
        suggestions = self._get_suggestions(phoneme_analysis, grade, language)
        
        return PronunciationEvaluation(
            score=final_score,
            grade=grade,
            stars=stars,
            transcription=transcribed_text,
            confidence=confidence,
            phoneme_analysis=phoneme_analysis,
            feedback=feedback,
            feedback_emoji=feedback_emoji,
            areas_for_improvement=areas_for_improvement,
            strengths=strengths,
            suggestions=suggestions,
            language=language,
            source="ai",
        )
    
    async def _get_ai_feedback(
        self,
        target_text: str,
        spoken_text: str,
        score: int,
        grade: str,
    ) -> Optional[Dict[str, Any]]:
        """Get AI-enhanced feedback using Gemini."""
        try:
            ai_service = await self._get_ai_service()
            if not ai_service.llm:
                return None
            
            result = await ai_service.analyze_pronunciation(
                text=target_text,
                audio_transcription=spoken_text,
                score=score,
            )
            
            import json
            import re
            
            raw = result.get("feedback", "")
            cleaned = re.sub(r"```[a-z]*", "", raw).strip()
            
            try:
                parsed = json.loads(cleaned)
                return parsed
            except json.JSONDecodeError:
                return None
                
        except Exception as e:
            logger.warning(f"[Evaluator] AI feedback failed: {e}")
            return None
    
    def _get_areas_for_improvement(
        self,
        phoneme_analysis: List[PhonemeAnalysis],
        language: str,
    ) -> List[str]:
        """Identify areas that need improvement."""
        areas = []
        
        problem_phonemes = [p for p in phoneme_analysis if not p.is_match]
        
        if len(problem_phonemes) > 2:
            areas.append("Focus on pronouncing each word clearly")
        
        if language == "vi":
            areas.append("Pay attention to Vietnamese tones")
        else:
            areas.append("Work on clear vowel sounds")
        
        return areas if areas else ["Keep practicing to improve clarity"]
    
    def _get_strengths(self, phoneme_analysis: List[PhonemeAnalysis], score: int) -> List[str]:
        """Identify pronunciation strengths."""
        strengths = []
        
        if score >= 90:
            strengths.append("Excellent word accuracy")
            strengths.append("Clear pronunciation")
        elif score >= 70:
            strengths.append("Good overall pronunciation")
            strengths.append("Most words are clear")
        else:
            strengths.append("Good attempt")
        
        matched_phonemes = [p for p in phoneme_analysis if p.is_match]
        if matched_phonemes:
            strengths.append(f"{len(matched_phonemes)} word(s) pronounced correctly")
        
        return strengths
    
    def _get_suggestions(
        self,
        phoneme_analysis: List[PhonemeAnalysis],
        grade: str,
        language: str,
    ) -> List[str]:
        """Generate specific improvement suggestions."""
        suggestions = []
        
        # Add suggestions based on phoneme analysis
        for phoneme in phoneme_analysis:
            if phoneme.suggestion:
                suggestions.append(phoneme.suggestion)
        
        # Add general suggestions based on grade
        if grade == "excellent":
            suggestions.append("Try a more difficult word next!")
        elif grade == "good":
            suggestions.append("Practice the words you missed")
            suggestions.append("Listen to the audio again carefully")
        else:
            suggestions.append("Start by listening to the word several times")
            suggestions.append("Try saying each syllable slowly")
            suggestions.append("Record yourself and compare with the original")
        
        # Language-specific suggestions
        if language == "vi":
            suggestions.append("Remember: Vietnamese has 6 tones - each changes the meaning!")
        elif language == "en":
            suggestions.append("English tip: Focus on vowel sounds and endings")
        
        return suggestions[:4]  # Limit to 4 suggestions
    
    async def get_status(self) -> dict:
        """Get evaluator service status."""
        model = await _get_whisper_model()
        
        return {
            "available": model is not None,
            "model_loaded": model is not None,
            "model_type": "whisper-base",
            "supported_languages": ["en", "vi", "auto"],
        }


def get_pronunciation_evaluator() -> PronunciationEvaluator:
    """Factory function for FastAPI dependency injection."""
    return PronunciationEvaluator()
