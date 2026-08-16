"""
FastAPI inference server for GOP (Goodness of Pronunciation) scoring.

Model: mHuBERT-147-ipa-ctc-ft (or DistilHuBERT) fine-tuned on speechocean762.
Runtime: ONNX Runtime (CPU, ~200-400 MB RAM peak).

Endpoints:
  POST /score         — score a single utterance (reference + audio)
  POST /score/batch  — batch scoring (list of {reference, audio_base64})
  GET  /health       — liveness probe
  GET  /metrics      — basic request counters + latency

API shape:
  Request  { reference_text: str, audio: bytes | base64, sample_rate?: int }
  Response { gop_score: float, phoneme_scores: list[float], words: list[dict] }
"""

from __future__ import annotations

import base64
import io
import logging
import os
import time
import warnings
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

import numpy as np
import onnxruntime as ort
import soundfile as sf
import torch
import torchaudio
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from scipy.spatial.distance import cdist

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s — %(message)s")
logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────
# Config
# ─────────────────────────────────────────────

MODEL_DIR = Path(os.getenv("MODEL_DIR", "/app/model"))
ONNX_PATH = MODEL_DIR / "model.onnx"
PROCESSOR_PATH = MODEL_DIR / "processor"
SAMPLE_RATE = 16_000
MAX_DURATION_S = 30.0  # max audio length to accept (seconds)

# ─────────────────────────────────────────────
# ONNX session
# ─────────────────────────────────────────────

def load_onnx_session() -> ort.InferenceSession:
    if not ONNX_PATH.exists():
        raise FileNotFoundError(
            f"ONNX model not found at {ONNX_PATH}. "
            "Mount /app/model with your fine-tuned model or set MODEL_DIR env."
        )
    sess_options = ort.SessionOptions()
    sess_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
    sess_options.intra_op_num_threads = int(os.getenv("OMP_NUM_THREADS", "2"))
    return ort.InferenceSession(str(ONNX_PATH), sess_options)


def load_processor():
    """Lazy-load the HuggingFace processor (tokenizer + feature extractor)."""
    from transformers import AutoProcessor
    return AutoProcessor.from_pretrained(str(PROCESSOR_PATH))


# Global — loaded once at startup
onnx_session: Optional[ort.InferenceSession] = None
processor = None


def startup():
    global onnx_session, processor
    logger.info("Loading ONNX model and processor at startup...")
    onnx_session = load_onnx_session()
    processor = load_processor()
    logger.info("Model ready.")


# ─────────────────────────────────────────────
# Audio preprocessing
# ─────────────────────────────────────────────

def load_audio_from_bytes(audio_bytes: bytes, target_sr: int = SAMPLE_RATE) -> np.ndarray:
    """Decode audio bytes → normalized float32 numpy array at target_sr."""
    try:
        # Try soundfile first (wav/flac/ogg)
        waveform, sr = sf.read(io.BytesIO(audio_bytes))
    except Exception:
        try:
            # Fall back to torchaudio (handles more formats)
            waveform, sr = torchaudio.load(io.BytesIO(audio_bytes))
            waveform = waveform.squeeze(0).numpy()
        except Exception as exc:
            raise ValueError(f"Could not decode audio: {exc}")

    # Resample if needed
    if sr != target_sr:
        resampler = torchaudio.transforms.Resample(orig_freq=sr, new_freq=target_sr)
        waveform = resampler(torch.from_numpy(waveform).unsqueeze(0)).squeeze(0).numpy()

    # Normalize to [-1, 1]
    if waveform.dtype != np.float32:
        waveform = waveform.astype(np.float32)
    max_abs = np.abs(waveform).max()
    if max_abs > 0:
        waveform = waveform / max_abs

    return waveform


def pad_or_truncate(waveform: np.ndarray, max_samples: int) -> np.ndarray:
    """Pad with zeros or truncate to max_samples."""
    if len(waveform) > max_samples:
        return waveform[:max_samples]
    pad_len = max_samples - len(waveform)
    return np.pad(waveform, (0, pad_len), mode="constant", constant_values=0)


# ─────────────────────────────────────────────
# Inference
# ─────────────────────────────────────────────

def run_inference(input_values: np.ndarray) -> np.ndarray:
    """
    Run ONNX inference.
    input_values: float32 array, shape (1, n_samples)
    Returns: logits array, shape (1, time_steps, vocab_size)
    """
    ort_inputs = {onnx_session.get_inputs()[0].name: input_values.astype(np.float32)}
    ort_outputs = onnx_session.run(None, ort_inputs)
    return ort_outputs[0]  # logits


def logits_to_phoneme_ids(logits: np.ndarray) -> np.ndarray:
    """Greedy CTC decode — argmax per time step, then collapse repeats."""
    vocab_size = logits.shape[-1]
    probs = logits[0]  # (time, vocab)
    ids = np.argmax(probs, axis=-1)

    # Collapse repeats, remove blank (index 0)
    collapsed = []
    prev = -1
    for idx in ids:
        if idx != prev:
            if idx != 0:  # blank in CTC is 0
                collapsed.append(int(idx))
            prev = idx
    return np.array(collapsed, dtype=np.int64)


# ─────────────────────────────────────────────
# GOP scoring
# ─────────────────────────────────────────────

def compute_gop(
    audio: np.ndarray,
    reference_text: str,
    processor,
    onnx_session: ort.InferenceSession,
    sample_rate: int = SAMPLE_RATE,
) -> dict:
    """
    Compute Goodness of Pronunciation (GOP) score.

    Algorithm:
    1. Encode reference text → expected phoneme IDs (CTC targets).
    2. Run ASR model on audio → predicted phoneme IDs.
    3. Align reference with predictions using CTC prefix-beam decode.
    4. Per-phoneme score = log P(predicted | reference) / len(reference).

    Returns:
      {
        "gop_score": float,           # 0–100 overall score
        "phoneme_scores": list[float],  # per-phoneme scores
        "alignment": list[dict],        # {ref_phoneme, pred_phoneme, score}
        "num_reference_phonemes": int,
        "num_correct_phonemes": int,
      }
    """
    max_samples = int(MAX_DURATION_S * sample_rate)
    audio_padded = pad_or_truncate(audio, max_samples)

    # Prepare input
    inputs = processor(
        torch.from_numpy(audio_padded).unsqueeze(0),
        sampling_rate=sample_rate,
        return_tensors="np",
    )
    input_values = inputs["input_values"].astype(np.float32)

    # Forward pass
    logits = run_inference(input_values)  # (1, T, V)

    # Decode predicted phonemes
    pred_ids = logits_to_phoneme_ids(logits)
    pred_phonemes = [processor.tokenizer.decode([pid]) for pid in pred_ids]

    # Encode reference text
    ref_encoding = processor.tokenizer(
        reference_text,
        return_tensors="pt",
        padding=True,
        truncation=True,
    )
    ref_ids = ref_encoding["input_ids"].squeeze(0).tolist()

    # Remove special tokens (pad, cls, sep)
    ref_ids_clean = [
        i for i in ref_ids
        if i not in {processor.tokenizer.pad_token_id, processor.tokenizer.cls_token_id, processor.tokenizer.sep_token_id}
    ]
    ref_phonemes = [processor.tokenizer.decode([i]) for i in ref_ids_clean]

    # ── GOP alignment (simplified Needleman–Wunsch, CTC-friendly) ──
    alignment = _align_phonemes(ref_phonemes, pred_phonemes)

    # ── Per-phoneme log-likelihood scores ──
    # Use frame-level posterior probabilities from the model
    frame_probs = torch.softmax(torch.from_numpy(logits), dim=-1).numpy()

    phoneme_scores = []
    aligned_correct = 0
    for entry in alignment:
        ref = entry["ref"]
        pred = entry["pred"]
        # If the predicted phoneme matches the reference, score = posterior probability
        if pred == ref:
            # Find the frame range for this phoneme (simplified: uniform split)
            n_ref = len(ref_phonemes)
            n_frames = frame_probs.shape[1]
            frames_per_phoneme = max(1, n_frames // max(n_ref, 1))
            ph_idx = processor.tokenizer.convert_tokens_to_ids(ref) \
                if isinstance(ref, str) else ref

            # Average posterior over assigned frames
            start_frame = entry.get("frame_start", 0)
            end_frame = entry.get("frame_end", frames_per_phoneme)
            end_frame = min(end_frame, n_frames)
            if end_frame > start_frame:
                avg_prob = float(frame_probs[0, start_frame:end_frame, ph_idx].mean())
            else:
                avg_prob = 0.0

            score = max(0.0, min(100.0, avg_prob * 100))
            aligned_correct += 1
        else:
            score = 0.0
        phoneme_scores.append(score)
        entry["score"] = round(score, 2)

    # Overall GOP: mean of per-phoneme scores
    gop_score = round(float(np.mean(phoneme_scores)) if phoneme_scores else 0.0, 2)

    return {
        "gop_score": gop_score,
        "phoneme_scores": [round(s, 2) for s in phoneme_scores],
        "alignment": alignment,
        "num_reference_phonemes": len(ref_phonemes),
        "num_correct_phonemes": aligned_correct,
        "accuracy_pct": round(100 * aligned_correct / max(len(ref_phonemes), 1), 1),
    }


def _align_phonemes(ref: list[str], pred: list[str]) -> list[dict]:
    """
    Simple DP alignment between reference and predicted phoneme sequences.
    Returns a list of {ref, pred, score} entries (unaligned phonemes get '' pred).
    """
    n, m = len(ref), len(pred)
    # Cost matrix: 0 if match, 1 if mismatch, 2 if gap
    INF = 9999
    dp = [[INF] * (m + 1) for _ in range(n + 1)]
    dp[0][0] = 0
    for i in range(1, n + 1):
        dp[i][0] = i * 2
    for j in range(1, m + 1):
        dp[0][j] = j * 2

    for i in range(1, n + 1):
        for j in range(1, m + 1):
            cost = 0 if ref[i - 1] == pred[j - 1] else 1
            dp[i][j] = min(
                dp[i - 1][j] + 2,     # gap in pred
                dp[i][j - 1] + 2,     # gap in ref
                dp[i - 1][j - 1] + cost,
            )

    # Backtrack
    i, j = n, m
    aligned_ref, aligned_pred = [], []
    while i > 0 or j > 0:
        if i > 0 and j > 0:
            cost = 0 if ref[i - 1] == pred[j - 1] else 1
            if dp[i][j] == dp[i - 1][j - 1] + cost:
                aligned_ref.append(ref[i - 1])
                aligned_pred.append(pred[j - 1])
                i -= 1
                j -= 1
                continue
        if i > 0 and dp[i][j] == dp[i - 1][j] + 2:
            aligned_ref.append(ref[i - 1])
            aligned_pred.append("")
            i -= 1
        else:
            aligned_ref.append("")
            aligned_pred.append(pred[j - 1] if j > 0 else "")
            j -= 1

    return [
        {"ref": r, "pred": p}
        for r, p in zip(reversed(aligned_ref), reversed(aligned_pred))
    ]


# ─────────────────────────────────────────────
# FastAPI app
# ─────────────────────────────────────────────

app = FastAPI(
    title="GOP Scoring API",
    description="Goodness of Pronunciation scoring for English learners",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request / response models
class ScoreRequest(BaseModel):
    reference_text: str
    audio_base64: Optional[str] = None  # base64-encoded audio (alternative to file upload)
    sample_rate: Optional[int] = 16000


class ScoreResponse(BaseModel):
    gop_score: float
    phoneme_scores: list[float]
    num_reference_phonemes: int
    num_correct_phonemes: int
    accuracy_pct: float
    alignment: list[dict]
    processing_time_ms: float


class BatchItem(BaseModel):
    reference_text: str
    audio_base64: str


class BatchScoreRequest(BaseModel):
    items: list[BatchItem]


# ── Metrics ──
_request_count = 0
_error_count = 0
_total_latency_ms = 0.0


@app.on_event("startup")
async def startup_event():
    startup()


@app.get("/health")
async def health():
    return {"status": "ok", "model_loaded": onnx_session is not None}


@app.get("/metrics")
async def metrics():
    avg_ms = _total_latency_ms / max(_request_count, 1)
    return {
        "requests_total": _request_count,
        "errors_total": _error_count,
        "avg_latency_ms": round(avg_ms, 1),
    }


@app.post("/score", response_model=ScoreResponse)
async def score_endpoint(
    file: UploadFile = File(...),
    reference_text: str = Form(...),
    sample_rate: int = Form(16000),
):
    """
    Score a single audio file against a reference text.

    Args:
      file:       WAV/MP3/OGG audio file (multipart/form-data)
      reference_text: Expected English transcription / phoneme string
      sample_rate:    Audio sample rate (default 16000)

    Returns:
      ScoreResponse with gop_score, per-phoneme scores, and alignment.
    """
    global _request_count, _error_count, _total_latency_ms

    t0 = time.perf_counter()
    _request_count += 1

    try:
        if onnx_session is None or processor is None:
            raise HTTPException(status_code=503, detail="Model not loaded yet")

        audio_bytes = await file.read()
        if len(audio_bytes) == 0:
            raise HTTPException(status_code=400, detail="Empty audio file")

        # Decode audio
        waveform = load_audio_from_bytes(audio_bytes, target_sr=sample_rate)

        # Score
        result = compute_gop(
            audio=waveform,
            reference_text=reference_text,
            processor=processor,
            onnx_session=onnx_session,
            sample_rate=sample_rate,
        )

        latency_ms = (time.perf_counter() - t0) * 1000
        _total_latency_ms += latency_ms

        return ScoreResponse(
            gop_score=result["gop_score"],
            phoneme_scores=result["phoneme_scores"],
            num_reference_phonemes=result["num_reference_phonemes"],
            num_correct_phonemes=result["num_correct_phonemes"],
            accuracy_pct=result["accuracy_pct"],
            alignment=result["alignment"],
            processing_time_ms=round(latency_ms, 1),
        )

    except HTTPException:
        _error_count += 1
        raise
    except Exception as exc:
        _error_count += 1
        logger.exception("Error during scoring")
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/score/batch", response_model=list[ScoreResponse])
async def score_batch_endpoint(req: BatchScoreRequest):
    """
    Batch scoring — reference + base64-encoded audio per item.

    {
      "items": [
        {"reference_text": "hello", "audio_base64": "..."},
        ...
      ]
    }
    """
    global _request_count, _error_count, _total_latency_ms
    t0 = time.perf_counter()
    _request_count += len(req.items)

    try:
        if onnx_session is None or processor is None:
            raise HTTPException(status_code=503, detail="Model not loaded yet")

        results = []
        for item in req.items:
            audio_bytes = base64.b64decode(item.audio_base64)
            waveform = load_audio_from_bytes(audio_bytes)
            result = compute_gop(
                audio=waveform,
                reference_text=item.reference_text,
                processor=processor,
                onnx_session=onnx_session,
            )
            results.append(ScoreResponse(
                gop_score=result["gop_score"],
                phoneme_scores=result["phoneme_scores"],
                num_reference_phonemes=result["num_reference_phonemes"],
                num_correct_phonemes=result["num_correct_phonemes"],
                accuracy_pct=result["accuracy_pct"],
                alignment=result["alignment"],
                processing_time_ms=0.0,  # batch-level latency reported separately
            ))

        latency_ms = (time.perf_counter() - t0) * 1000
        _total_latency_ms += latency_ms
        return results

    except HTTPException:
        _error_count += 1
        raise
    except Exception as exc:
        _error_count += 1
        logger.exception("Batch scoring error")
        raise HTTPException(status_code=500, detail=str(exc))
