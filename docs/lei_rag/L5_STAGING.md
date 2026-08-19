# L5 — Staging / UAT Checklist

**Bạn làm phần thủ công. Tôi chuẩn bị script + config.**

---

## 1. Prerequisites (bạn cần chuẩn bị)

### 1a. Secrets
- [ ] **TokenRouter API Key** — tạo tài khoản tại `https://app.tokenrouter.ai` (hoặc provider bạn dùng)
- [ ] **Qdrant instance** — bạn đã có: `https://fixed-uuid.sa-east-1-0.aws.cloud.qdrant.io` (từ URL bạn cung cấp ở đầu session)
  - Tạo collection: `lexi_animals` với vector size phù hợp (thường 1536 cho OpenAI embeddings, 1024 cho text-embedding-3, hoặc kiểm tra Qdrant dashboard)
- [ ] **MongoDB** — chạy local: `docker compose up mongodb -d` HOẶC dùng MongoDB Atlas
- [ ] **PostgreSQL** — `POSTGRES_*` env vars (nếu `POSTGRES_CORE_ENABLED=true`)
- [ ] **Supabase** — `SUPABASE_PROJECT_URL` + service role key

### 1b. Seed Qdrant (nếu chưa có data)
```bash
# Chạy từ backend/ directory
cd backend
python -m scripts.ingest_animal_rag_dataset --dry-run
python -m scripts.ingest_animal_rag_dataset --apply
```
(Điều chỉnh script path theo cấu trúc thực tế)

---

## 2. Cấu hình Staging Env

Copy `backend/.env.example` → `staging/.env` và điền:

```bash
# ── Core ───────────────────────────────────────────────────────────────
SECRET_KEY=your-64-char-secret-key-here
DEBUG=true
PORT=8000

# ── Database ──────────────────────────────────────────────────────────
MONGO_URL=mongodb://localhost:27017
MONGO_DB=edu_platform

# ── PostgreSQL (nếu dùng) ─────────────────────────────────────────────
POSTGRES_URL=postgresql://user:pass@localhost:5432/eduplatform
POSTGRES_CORE_ENABLED=false

# ── Redis ──────────────────────────────────────────────────────────────
REDIS_URL=redis://localhost:6379/0

# ── Supabase ──────────────────────────────────────────────────────────
SUPABASE_PROJECT_URL=https://your-project.supabase.co
SUPABASE_STORAGE_BUCKET=AR_models

# ── TokenRouter (KEY NHẤT) ────────────────────────────────────────────
TOKENROUTER_API_KEY=tr_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
MODEL_PLANNER=qwen/qwen3.8-max-free
MODEL_GENERATOR=deepseek/deepseek-v4-pro-0813-free
MODEL_VALIDATOR=nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free
MODEL_FALLBACKS=qwen/qwen3.8-max-free,deepseek/deepseek-v4-pro-0813-free,nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free

# ── Qdrant (KEY NHẤT) ─────────────────────────────────────────────────
QDRANT_URL=https://fixed-uuid.sa-east-1-0.aws.cloud.qdrant.io
QDRANT_API_KEY=your_qdrant_api_key_here
QDRANT_COLLECTION_NAME=lexi_animals
QDRANT_RETRIEVAL_VERSION=v1

# ── CORS ───────────────────────────────────────────────────────────────
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
DEV_ORIGINS=http://localhost:3000,http://localhost:5173
```

---

## 3. Khởi động Backend

```bash
# Option A: Docker Compose (MongoDB + Redis + Backend)
docker compose --env-file staging/.env up mongodb redis backend -d
# Backend: http://localhost:8000

# Option B: Local Python (cần MongoDB + Redis đang chạy)
cd backend
cp staging/.env .env
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

---

## 4. Khởi động Mobile Web (Expo)

```bash
cd mobile/rn
# Copy credentials cho E2E
cp .env.e2e.example .env
# Điền LC11_WEB_EMAIL + LC11_WEB_PASSWORD vào .env

# Khởi động Expo web
npx expo start --web --no-dev --minify --offline
# URL: http://127.0.0.1:8081
```

---

## 5. UAT Manual Test Cases

### 5a. GET /api/v1/chat/models
```bash
curl -s http://localhost:8000/api/v1/chat/models | python -m json.tool
```
**Expected:** `{"models": [...3 entries...], "defaults": {"planner": "...", "generator": "...", "validator": "..."}}`

### 5b. POST /api/v1/chat/rag (no override)
```bash
curl -s -X POST http://localhost:8000/api/v1/chat/rag \
  -H "Content-Type: application/json" \
  -d '{"question": "What is an elephant?"}' | python -m json.tool
```
**Expected:** `{"response": "...", "sources": [...], "session_id": "...", "agent_trace": [...]}`  
**Kiểm tra:**
- [ ] `response` có nội dung (không phải error message)
- [ ] `agent_trace` chứa `planner:done`, `generator:done`, `validator:done`
- [ ] `sources` có animal word + score (nếu Qdrant có data)

### 5c. POST /api/v1/chat/rag (model override)
```bash
curl -s -X POST http://localhost:8000/api/v1/chat/rag \
  -H "Content-Type: application/json" \
  -d '{"question": "What is a tiger?", "generator_model": "deepseek/deepseek-v4-pro-0813-free"}' \
  | python -m json.tool
```
**Expected:** `agent_trace` chứa `generator:done model=deepseek/...`

### 5d. Session stability
Gửi 2 request cùng `session_id`:
```bash
curl -s -X POST http://localhost:8000/api/v1/chat/rag \
  -H "Content-Type: application/json" \
  -d '{"question": "Tell me about lions", "session_id": "test-session-1"}' > /tmp/r1.json
curl -s -X POST http://localhost:8000/api/v1/chat/rag \
  -H "Content-Type: application/json" \
  -d '{"question": "Tell me about tigers", "session_id": "test-session-1"}' > /tmp/r2.json
# So sánh session_id
python -c "import json; r1=json.load(open('/tmp/r1.json')); r2=json.load(open('/tmp/r2.json')); print('Same session:', r1['session_id']==r2['session_id'])"
```
**Expected:** `Same session: True`

### 5e. Mobile App — Model Picker
1. Mở app → Sign in → click "Lexi" tab
2. Click "⚙️ Models" button
3. Modal mở → thấy 3 role: Planner, Generator, Validator
4. Click một model khác trong Generator
5. Click "Xong" → đóng modal
6. Gửi câu hỏi: "What is a cat?"
7. Chờ response (3-10s)
8. Click "▼ Debug" → thấy agent_trace

**Expected:**
- [ ] "⚙️ Models" button visible
- [ ] Modal hiển thị đúng
- [ ] AI response hiển thị
- [ ] Debug panel expand/collapse được

### 5f. Session Restore
1. Gửi message → có session
2. Pull-to-refresh để reset (hoặc navigate away)
3. Quay lại Lexi tab
4. Thấy banner "Phiên được khôi phục" nếu có session cũ

---

## 6. Smoke Test Script (copy-paste vào terminal)

```bash
#!/bin/bash
BASE="http://localhost:8000/api/v1"

echo "=== L5 UAT Smoke Test ==="

echo -e "\n[1] GET /chat/models"
curl -s "$BASE/chat/models" | python -m json.tool | head -20

echo -e "\n[2] POST /chat/rag (no override)"
curl -s -X POST "$BASE/chat/rag" \
  -H "Content-Type: application/json" \
  -d '{"question": "What is an elephant?"}' | python -m json.tool

echo -e "\n[3] POST /chat/rag (with generator override)"
curl -s -X POST "$BASE/chat/rag" \
  -H "Content-Type: application/json" \
  -d '{"question": "What is a tiger?", "generator_model": "deepseek/deepseek-v4-pro-0813-free"}' \
  | python -m json.tool | grep -E '"agent_trace"|"response"'

echo -e "\n=== Done ==="
```

Save as `scripts/l5_uat_smoke.sh` và chạy:
```bash
chmod +x scripts/l5_uat_smoke.sh
./scripts/l5_uat_smoke.sh
```
