# ============================================================
# Dockerfile — GOP Scoring ONNX Inference Server
# ============================================================
# Suitable for:
#   ✓ HuggingFace Spaces CPU Basic  (16 GB RAM, 2 CPU)  ← RECOMMENDED
#   ✓ Render Free                    (0.1 CPU, 512 MB RAM — marginal, test first)
#   ✓ Render Starter $7/mo           (0.5 CPU, 1 GB RAM — safer)
#   ✓ Any Docker host with CPU
#
# NOT suitable for: Render free if RAM peak > ~400 MB (measure with `docker stats`)
#
# Build:  docker build -t gop-scoring .
# Run:    docker run -p 8000:8000 --init gop-scoring
# ============================================================

FROM python:3.10-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    # Use ONNX Runtime CPU — no GPU needed for inference
    ORT_TENSORRT_ENABLE=0 \
    ORT_CUDA_ENABLE=0

WORKDIR /app

# ── 1.  Install ONNX Runtime (CPU only) + FastAPI + deps ──
RUN pip install --no-cache-dir --quiet \
    onnxruntime \
    fastapi \
    uvicorn[standard] \
    python-multipart \
    httpx \
    librosa>=0.10.0 \
    soundfile>=0.12.0 \
    scipy>=1.12.0 \
    torch \
    torchaudio \
    transformers \
    pydantic \
    python-dotenv

# ── 2.  Copy model + app ──
# The ONNX model and processor/tokenizer files are copied at build time.
# You can also mount them at runtime:
#   docker run -v $(pwd)/model:/app/model -p 8000:8000 gop-scoring
COPY serve/model/           ./model/
COPY serve/app.py           ./app.py

# ── 3.  Expose + entrypoint ──
EXPOSE 8000

# Run via tini so we get proper signal handling (no zombie processes)
RUN apt-get update && apt-get install -y --no-install-recommends tini && rm -rf /var/lib/apt/lists/*
ENTRYPOINT ["/usr/bin/tini", "--", "uvicorn"]
CMD ["app:app", "--host", "0.0.0.0", "--port", "8000"]
