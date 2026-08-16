# GOP Scoring Service — Deployment Guide

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│  Fine-tuning (your GPU machine / Google Colab / Kaggle) │
│  python finetune/gop_train.py                          │
│  → checkpoints/final/model.onnx + processor/           │
└────────────────────────┬──────────────────────────────┘
                         │ copy model files
                         ▼
┌─────────────────────────────────────────────────────────┐
│  Serving (any CPU Docker host)                         │
│  serve/app.py + ONNX Runtime                          │
│  HuggingFace Spaces CPU Basic (RECOMMENDED)  ← FREE   │
│  Render Free (0.1 CPU, 512 MB RAM — marginal)         │
└─────────────────────────────────────────────────────────┘
```

---

## 1. Fine-tuning

### Prerequisites

```bash
pip install -r finetune/requirements.txt
```

Fine-tuning requires a GPU. Options:

| Provider | GPU | Cost | Notes |
|---|---|---|---|
| Google Colab | T4 (free) / A100 (Pro) | Free / $9.99/mo | Best free option |
| Kaggle | T4 x2 | Free (weekly limit) | Good alternative |
| Modal | A10G | ~$2/hr with spot | Requires setup |
| Your local RTX 3080+ | ~10 GB VRAM | Electricity | Full control |

### Run fine-tuning

```bash
python finetune/gop_train.py \
  --output_dir ./checkpoints \
  --num_epochs 10 \
  --per_device_train_batch_size 8 \
  --learning_rate 1e-3 \
  --max_duration_seconds 10.0
```

**Expected outputs:**
- `checkpoints/final/` — PyTorch model + processor (for further training)
- `checkpoints/final/model.onnx` — ONNX export (~97 MB)

### Quick sanity check (no GPU needed)

```python
# Check RAM usage with ONNX inference on CPU
import onnxruntime as ort
import numpy as np
import tracemalloc

tracemalloc.start()
sess = ort.InferenceSession("checkpoints/final/model.onnx")
dummy = np.random.randn(1, 160_000).astype(np.float32)  # 10s audio
_ = sess.run(None, {sess.get_inputs()[0].name: dummy})
current, peak = tracemalloc.get_traced_memory()
tracemalloc.stop()
print(f"Peak RAM: {peak / 1024 / 1024:.1f} MB")
```

---

## 2. Export ONNX model

After fine-tuning, export to ONNX for serving:

```bash
python -c "
from transformers import AutoProcessor
import torch

# Load your fine-tuned model
from finetune.gop_train import CTCHuBERTModel
processor = AutoProcessor.from_pretrained('ntu-spml/mHuBERT-147-ipa-ctc-ft')
model = CTCHuBERTModel('ntu-spml/mHuBERT-147-ipa-ctc-ft', num_labels=len(processor.tokenizer))
model.load_state_dict(torch.load('checkpoints/final/pytorch_model.bin'))

# Export
model.eval()
torch.onnx.export(
    model, (torch.randn(1, 160_000),),
    'checkpoints/final/model.onnx',
    input_names=['input_values'],
    output_names=['logits'],
    dynamic_axes={'input_values': {0: 'batch', 1: 'audio_samples'}},
    opset_version=14,
)
processor.save_pretrained('checkpoints/final/processor')
print('Exported!')
"
```

---

## 3. Deploy to HuggingFace Spaces (Recommended — Free)

HuggingFace Spaces CPU Basic gives you **16 GB RAM, 2 CPU cores, $0/month**. Far better than Render free.

### Steps

1. Create a HuggingFace Space at https://huggingface.co/new-space
   - SDK: **Docker**
   - Hardware: **CPU Basic**

2. Copy these files into your Space repo:
   ```
   /
   ├── Dockerfile
   ├── serve/
   │   ├── app.py
   │   └── model/           ← your fine-tuned ONNX model + processor
   │       ├── model.onnx
   │       └── processor/
   │           ├── tokenizer.json
   │           ├── tokenizer_config.json
   │           └── special_tokens_map.json
   └── README.md
   ```

3. The Space will auto-build the Docker image and start the server.

4. Your API will be live at `https://your-username-gop-scoring.hf.space/score`

### Verify with curl

```bash
curl -X POST "https://your-username-gop-scoring.hf.space/score" \
  -F "reference_text=hello world" \
  -F "file=@test_audio.wav"
```

---

## 4. Deploy to Render (Alternative)

Render free has **0.1 CPU, 512 MB RAM** — marginal for this model.

### Measure RAM first

```bash
# Build and run locally
docker build -t gop-scoring .
docker run --rm -it --memory=512m --memory-reservation=256m \
  -p 8000:8000 \
  -v $(pwd)/checkpoints/final/model:/app/model \
  gop-scoring

# In another terminal, measure peak RAM
docker stats --no-stream
```

- If peak RAM < 400 MB → Render free works.
- If peak RAM > 450 MB → Use HF Spaces (safer) or Render Starter ($7/mo).

### Render setup

1. Create a **Web Service** on Render
2. Connect your GitHub repo
3. Set:
   - **Root Directory:** `backend/gop_scoring`
   - **Build Command:** (Dockerfile handles it)
   - **Start Command:** (Dockerfile handles it)
4. Add environment variable: `MODEL_DIR=/app/model`
5. Mount the model via a Render Disk or copy it into the repo

---

## 5. Environment variables

| Variable | Default | Description |
|---|---|---|
| `MODEL_DIR` | `/app/model` | Path to ONNX model + processor |
| `OMP_NUM_THREADS` | `2` | ONNX threading (match CPU cores) |
| `MAX_DURATION_S` | `30.0` | Max audio duration in seconds |
| `ORT_TENSORRT_ENABLE` | `0` | Disable TensorRT (CPU only) |
| `ORT_CUDA_ENABLE` | `0` | Disable CUDA (CPU only) |

---

## 6. API Reference

### POST /score

```bash
curl -X POST "http://localhost:8000/score" \
  -F "reference_text=hello world" \
  -F "file=@audio.wav"
```

**Response:**
```json
{
  "gop_score": 78.5,
  "phoneme_scores": [100.0, 82.3, 65.1, 91.0],
  "num_reference_phonemes": 4,
  "num_correct_phonemes": 3,
  "accuracy_pct": 75.0,
  "alignment": [
    {"ref": "h", "pred": "h", "score": 100.0},
    {"ref": "ə", "pred": "ə", "score": 82.3},
    {"ref": "l", "pred": "r", "score": 0.0},
    {"ref": "oʊ", "pred": "oʊ", "score": 91.0}
  ],
  "processing_time_ms": 143.2
}
```

### POST /score/batch

```json
{
  "items": [
    {"reference_text": "hello", "audio_base64": "BASE64_AUDIO..."},
    {"reference_text": "world", "audio_base64": "BASE64_AUDIO..."}
  ]
}
```

### GET /health

```json
{"status": "ok", "model_loaded": true}
```

---

## 7. Integrate into your backend

```python
import httpx

async def score_pronunciation(audio_bytes: bytes, reference_text: str):
    async with httpx.AsyncClient(timeout=30.0) as client:
        files = {"file": ("audio.wav", audio_bytes, "audio/wav")}
        data = {"reference_text": reference_text}
        resp = await client.post(
            "https://your-gop-service.hf.space/score",
            files=files,
            data=data,
        )
        resp.raise_for_status()
        return resp.json()["gop_score"]
```

---

## 8. Notes & Gotchas

- **Cold start on HF Spaces:** ~10-30s first request after idle. HF Spaces are much more stable than Render free (2 days vs 15 min idle).
- **Cold start on Render free:** 30-60s. Not suitable for real-time UX.
- **Audio format:** Server accepts WAV, MP3, OGG, FLAC via soundfile/torchaudio.
- **Sample rate:** Auto-detected and resampled to 16 kHz.
- **No GPU needed for inference:** ONNX Runtime CPU is fast enough for sub-500ms latency on 10s audio with this model size.
