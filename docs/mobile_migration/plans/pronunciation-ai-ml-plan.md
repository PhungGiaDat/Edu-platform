# Pronunciation AI — ML Workstream Plan

## Status
draft

## Goal
Plan the ML pronunciation scoring pipeline from existing baseline to production: dataset definition, model fine-tuning, evaluation, calibration, and RN integration.

## Relationship to Other Artifacts

| Document | Role |
|---------|------|
| `spec/pronunciation-ai-spec.md` | Product behavior (UX, scoring bands) |
| `backend/services/pronunciation_evaluator.py` | Existing scoring engine |
| `backend/services/speech_processing_service.py` | Existing Whisper STT |
| `backend/models/pronunciation.py` | Existing data models |
| `plan/20260627_ai_pronunciation_evaluation_system.md` | Legacy plan (carry forward) |

---

## PRON-A0: Existing Pipeline Reconnaissance

**Goal**: Inspect current backend ML pipeline and document baseline.

### Inspect Repository Evidence

**Backend — Pronunciation Evaluator** (`backend/services/pronunciation_evaluator.py`):
- Not yet read — must inspect before proceeding
- Expected to contain: `PronunciationEvaluator` class, `evaluate_from_audio()`, `evaluate_from_transcription()`, score calculation

**Backend — Speech Processing** (`backend/services/speech_processing_service.py`):
- Uses `faster-whisper` for STT
- `transcribe_audio(audio_data, file_extension, language)` → `(text, confidence)`
- Language models: `base.en`, `base`, `tiny`

**Backend — Pronunciation Models** (`backend/models/pronunciation.py`):
- `PronunciationAttemptDocument` (user_id, flashcard_qr_id, spoken_text, score, feedback, audio_url, ...)
- Collection: `pronunciation_attempts`

**Backend — TTS Service** (`backend/services/tts_service.py`):
- Coqui XTTS v2 primary, Google Cloud TTS fallback
- `generate_speech(text, language, speed)` → audio bytes

**Backend — Feedback Service** (`backend/services/feedback_service.py`):
- Dynamic feedback templates from database
- Gemini AI feedback generation

### Current Gaps (Expected)

Based on existing evidence in `pronunciation_enhanced.py` and `pronunciation.py`:
1. No fine-tuned child pronunciation model — uses generic Whisper
2. Score calculation is Levenshtein-based (simple string similarity)
3. No phoneme-level scoring for children's English
4. No child audio dataset
5. No offline evaluation framework
6. No child-friendly score calibration (bands vs raw 0–100)

### Deliverable

Document: `pronunciation-ai-ml-plan.md` (this file) — updated with actual evidence from PRON-A0 inspection.

---

## PRON-A1: Dataset Definition

**Goal**: Define the dataset contract for child pronunciation data.

### Dataset Purpose

- **Primary**: Evaluate child (ages 4–8) English pronunciation against expected vocabulary
- **Secondary**: Fine-tune or adapt STT model for child voices
- **NOT**: Automatic speech recognition general capability (use Whisper base for this)

### Dataset Schema

```python
@dataclass
class PronunciationSample:
    sample_id: str                    # UUID
    word_id: str                      # Links to vocabulary item
    target_word: str                  # Expected pronunciation text
    language: str = "en"
    
    # Audio
    audio_path: str                   # Path to audio file
    duration_seconds: float
    speaker_id: str                   # Anonymized: "child_001"
    age_range: str                    # "4-5", "6-7", "8+"
    
    # Labels
    transcription: str                # Expert transcription (what child said)
    phoneme_labels: List[PhonemeLabel]  # Per-phoneme correctness
    overall_score: int                # 0-100 human rating
    quality_flags: List[str]           # ["clear", "noisy", "muffled"]
    
    # Recording conditions
    recording_device: str             # "iphone_14", "android_pixel", "webcam"
    noise_level: str                  # "quiet", "moderate", "loud"
    
    # Split
    split: str                       # "train", "dev", "test" (no speaker leakage)
```

### Dataset Size Estimate

| Tier | Samples | Scope |
|------|---------|-------|
| MVP dataset | 500 | 100 words × 5 speakers × 1 age group |
| V1 dataset | 2,000 | 200 words × 5 speakers × 2 age groups |
| V2 dataset | 10,000 | Full vocabulary × 10 speakers × 5 devices |

### Vocabulary Coverage

- Target vocabulary: all words in backend courses (Animals, Food, Nature, Family, School)
- ~200–500 target words across all courses
- Each word needs 5–10 samples for fine-tuning

### Quality Requirements

- **Audio format**: WAV or MP3, 16kHz mono, minimum 16-bit
- **Duration**: 0.5s – 5s per sample
- **Noise**: prefer quiet recordings; label noisy samples
- **Speaker diversity**: minimum 5 distinct speakers per age group for MVP
- **Age range**: 4–8 years old (primary target)

### Split Strategy (Speaker Leakage Prevention)

```
train/     — speakers: child_001–child_080
dev/       — speakers: child_081–child_090
test/      — speakers: child_091–child_100
```

**Critical**: No speaker appears in more than one split. Test WER/accuracy is measured on held-out speakers only.

### Data Sources

| Source | Pros | Cons |
|--------|------|------|
| Collected from learners (consent) | Realistic | Requires consent pipeline, cleanup |
| Crowdsourced (adult actors) | Fast | May not capture child voice characteristics |
| Synthetic (TTS + noise) | Unlimited | Doesn't capture child phonetics |
| Existing web recordings | Real data | May not have consent, variable quality |

**Recommendation**: Start with crowdsourced adult actors (quick baseline), evolve to child recordings with consent pipeline for V2.

### Deliverable

Pronunciation dataset specification: `docs/mobile_migration/plans/pronunciation-dataset-spec.md`.

---

## PRON-A2: Data Cleaning / Labeling

**Goal**: Prepare raw audio data for training.

### Pipeline

```
Raw audio recordings
    ↓
Format validation (16kHz mono WAV)
    ↓
Silence trimming (VAD-based)
    ↓
Noise quality filter (SNR estimation)
    ↓
Manual transcription (for ground truth)
    ↓
Phoneme-level labeling (optional for MVP)
    ↓
Quality review
    ↓
Dataset split
    ↓
Upload to training storage
```

### Transcription Guidelines

- Transcribe what the child said, not what they meant to say
- Include common child speech patterns (e.g., "w" for "r", "t" for "k")
- Flag unclear recordings for exclusion

### Phoneme Labeling (V2)

For phoneme-level scoring, label at IPA level:
- Mark which phonemes were pronounced correctly
- Mark common substitution patterns (th→f, r→w)

### Deliverable

Labeled dataset ready for training (uploaded to training storage or HuggingFace dataset).

---

## PRON-A3 / P-FT-0 / P-FT-1: Dataset Audit + Baseline Model Evaluation

**Goal (P-FT-0)**: Audit child/adult speech data before any training work begins.

### P-FT-0 — Dataset Audit

Audit the existing or planned dataset for:
- Vocabulary/phoneme coverage against target words
- Label quality (transcription accuracy, phoneme labels)
- Train/dev/test split and speaker leakage
- Freeze evaluation sets (never touch for training or hyperparameter tuning)

### P-FT-1 — Baseline Model Evaluation

**Goal (P-FT-1)**: Evaluate primary candidate model (e.g., mHuBERT IPA/CTC) on frozen child and adult evaluation sets. Measure WER/PER, model behavior, latency, and error breakdown.

### Baseline Evaluation

Run PRON-A0 reconnaissance to get current WER on held-out child speech:
```
Baseline WER = (S + D + I) / N
where S=substitutions, D=deletions, I=insertions, N=total reference words
```

### Post-Adaptation Targets (P-AI-1 gates, NOT prerequisites)

| Metric | Target | Notes |
|--------|--------|-------|
| WER (child speech) | < 30% | Post-adaptation gate (P-AI-1) |
| WER (adult speech) | < 10% | Post-adaptation gate (P-AI-1) |
| Latency (p95) | < 2s | Per pronunciation attempt |

**Critical distinction:** These WER targets are post-adaptation goals and P-AI-1 acceptance criteria. The baseline evaluation itself does NOT need to already meet these targets. A valid baseline is one that is reproducible and well-characterized, regardless of its raw performance.

### Deliverable

- P-FT-0: Dataset audit report
- P-FT-1: Baseline evaluation report (WER/PER, latency, error breakdown)

---

## PRON-A4 / P-FT-2 / P-FT-3: Adaptation Strategy + Child-Speech Model Adaptation

**Goal (P-FT-2)**: Compare appropriate adaptation strategies empirically. Do NOT pre-select LoRA.

### P-FT-2 — Adaptation Strategy Experiment

Compare candidate strategies based on evidence. Candidates include (non-exhaustive):
- Frozen backbone + task head
- Partial fine-tuning (freeze lower layers)
- Full fine-tuning
- PEFT / LoRA (if justified by evidence)
- Model distillation
- Smaller backbone architectures

Selection criteria: measured WER/PER on dev set, compute cost, inference latency, catastrophic forgetting risk.

**Critical constraint:** LoRA MUST NOT be assumed. Strategy selection is evidence-driven.

### P-FT-3 — Child-Speech Model Adaptation

**Goal (P-FT-3)**: Train the selected approach from P-FT-2. Produce reproducible checkpoint and config.

### Dataset Usage

- Training: train split only
- Validation: dev split (for hyperparameter tuning)
- Test: held-out test split (for final evaluation)

### Compute Requirements

| Tier | GPU | Duration | Cost Estimate |
|------|-----|----------|----------------|
| MVP (500 samples) | 1x A100 40GB | ~1 hour | $2-3 |
| V1 (2,000 samples) | 1x A100 40GB | ~4 hours | $8-12 |
| V2 (10,000 samples) | 2x A100 80GB | ~12 hours | $40-60 |

### Deliverable

- P-FT-2: Strategy comparison report with recommendation
- P-FT-3: Fine-tuned/reproduced model checkpoint + training logs.


---

## P-FT-4: Pronunciation Scoring

**Goal**: Implement/evaluate GOP (Goodness of Pronunciation) or equivalent phoneme-level scoring. Output stable raw pronunciation scores.

### Scorer Requirements

The scorer operates on model phoneme output (not raw text). Pipeline:


- Phoneme-level: must operate at phoneme granularity, not just word/character
- Stable: raw score is reproducible across invocations
- Versioned: model version, scorer version, calibration version all tracked

### Deliverable

GOP or equivalent implementation producing stable raw pronunciation scores.

---

## P-FT-5: Calibration

**Goal**: Map raw pronunciation scores to normalized scores. Derive/configure GREAT / GOOD TRY / TRY AGAIN bands. Version calibration/thresholds.

### Calibration Process

1. Collect raw score distributions from P-FT-4 on held-out dev/test set
2. Map to child-friendly bands based on evidence (not guesses)
3. Thresholds MUST NOT be hard-coded (e.g., 80/50) — derived from evaluation
4. Version: calibration config is versioned alongside model and scorer versions

### Acceptance

P-AI-2 is gated on evidence that calibrated bands produce child-appropriate feedback distributions. Not gated on arbitrary numeric thresholds.

### Deliverable

Calibration config with versioned thresholds for GREAT / GOOD TRY / TRY AGAIN.

---

## P-FT-6: Export / Optimization

**Goal**: Export adapted model to serving-ready format. Optimize if quality is acceptable.

### Steps

1. PyTorch checkpoint → ONNX export
2. Evaluate ONNX quality vs PyTorch (WER/PER must not regress)
3. INT8 quantization only if quality remains acceptable; full precision if not
4. Produce reproducible export config

### Deliverable

ONNX model + export config. INT8 only if quality verified.

---

## P-FT-7: Serving Benchmark

**Goal**: Characterize serving performance before integration.

### Metrics

| Metric | Target |
|--------|--------|
| Idle RAM | measured |
| Loaded RAM | measured |
| Peak inference RAM | measured |
| Cold start | measured |
| p50 / p95 latency | measured |
| Repeated-request stability | no memory growth over sustained load |
| Container / model footprint | measured |

### Deliverable

Benchmark report with all metrics above.

---

## P-FT-8: Scoring Service

**Goal**: Expose real pronunciation scoring service/API. Keep RN independent of ML implementation.

### Requirements

- Real pronunciation scoring (not mock)
- Version fields: model version, scoring version, calibration version
- RN does not couple to specific ML implementation
- Backend handles all ML; RN receives only structured output

### Deliverable

Production-ready  with real scoring.

---

## P-FT-9: Pilot Support

**Goal**: Support real-device / pilot evaluation. Analyze pronunciation/scoring failures.

### Requirements

- Analyze pronunciation and scoring failures from pilot sessions
- Do NOT automatically retain child audio for training without explicit consent and policy (PRON-B0 gate)
- Document failure patterns for next iteration

### Deliverable

Pilot failure analysis report.

---


---

## PRON-B0: Child Audio Privacy (DECISION REQUIRED)

**DECISION_REQUIRED — PRON-DQ-2**

Because the application serves children, explicit privacy decisions are required:

| Concern | Options | Status |
|---------|---------|--------|
| Recording retention | Do not store / Store for retry / Store for training | DECISION_REQUIRED |
| Parental consent | Not required / Consent before recording / Consent for training | DECISION_REQUIRED |
| Training data eligibility | No recordings / Consent-gated / All eligible | DECISION_REQUIRED |
| Deletion policy | Delete after scoring / 30 days / Indefinite | DECISION_REQUIRED |

**Interim policy (before PRON-DQ-2 resolves)**:
- Raw recordings processed in-memory by Whisper, discarded immediately
- Only transcription text and score persisted to MongoDB
- No audio blobs stored in `pronunciation_attempts`

---

## Workstream Summary

| Phase | Title | Deliverable | Status |
|-------|-------|-------------|--------|
| PRON-A0 | Pipeline reconnaissance | Baseline evaluation report | pending |
| PRON-A1 | Dataset definition | Dataset spec | pending |
| PRON-A2 | Data cleaning/labeling | Labeled dataset | pending |
| P-FT-0 | Dataset audit | Audit report: coverage, split, leakage | pending |
| P-FT-1 | Baseline model evaluation | WER/PER baseline, model behavior | pending |
| P-FT-2 | Adaptation strategy experiment | Strategy recommendation (evidence-driven) | pending |
| P-FT-3 | Child-speech model adaptation | Fine-tuned checkpoint + config | pending |
| P-FT-4 | Pronunciation scoring | GOP or equivalent; stable raw scores | pending |
| P-FT-5 | Calibration | Calibrated thresholds + GREAT/GOOD TRY/TRY AGAIN | pending |
| P-FT-6 | Export / optimization | ONNX, INT8 if quality acceptable | pending |
| P-FT-7 | Serving benchmark | RAM, latency, footprint | pending |
| P-FT-8 | Scoring service | Real pronunciation scoring API | pending |
| P-FT-9 | Pilot support | Real-device evaluation + failure analysis | pending |
| PRON-A6 | ~~Score calibration~~ | **Replaced by P-FT-4/5** | — |
| PRON-A7 | ~~Backend integration~~ | **Replaced by P-FT-8** | — |
| PRON-A8 | ~~RN UX integration~~ | **Moved to P-AI-3 (product lane)** | — |
| PRON-A9 | ~~Pilot evaluation~~ | **Replaced by P-FT-9** | — |
| PRON-B0 | Privacy decisions | DECISION_REQUIRED | pending |

> **Note:** `PRON-A*` labels are retained for backward reference. New fine-tuning workstream uses `P-FT-*`. Product/evaluation gates remain `P-AI-*`.

---

## Dependencies

```
P-AI-1 (baseline eval)
    ↓
P-FT-0 (dataset audit) → P-FT-1 (baseline eval) → P-FT-2 (strategy exp) → P-FT-3 (adaptation)
    ↓                                                                       ↓
P-FT-4 (GOP scoring) ←──────────────────────────────────────────────────────┘
    ↓
P-FT-5 (calibration)
    ↓
P-AI-2 (score calibration gate) ←──────────────────────────┐
    ↓                                                     │
P-FT-6 (export/optimize) → P-FT-7 (benchmark) → P-FT-8 (service)
    ↓                                                     ↓
R7 / RN integration                              ←─────────┘
    ↓
P-AI-3 (pronunciation UX gate) → P-AI-4 (pilot eval gate)
```

**Scoring separation preserved:** model / phoneme output → GOP or equivalent scoring → calibration → normalized score → GREAT / GOOD TRY / TRY AGAIN. Fine-tuning MUST NOT directly learn UI feedback bands.

**Parallelization:** P-FT-0 and P-FT-1 can run concurrently (audit spec vs baseline eval). P-FT-5 calibration depends on P-FT-4 scoring evidence, not on fine-tuning quality.

---

## Resource Requirements

| Resource | Estimate |
|----------|----------|
| ML Engineer time | 4–6 weeks full-time |
| Data collection | 2–4 weeks |
| GPU compute | $100–500 total |
| Pilot participants | 10–20 children |
