# Hardcoded-Values Refactor — Changelog & Env Reference

**Branch:** `MindAR-Update`
**Date:** 2026-08-03
**Commits (5):**

| # | SHA (short) | Title |
|---|-------------|-------|
| 1 | `f373b64` | refactor(settings): add env-driven Supabase/avatar/frontend origin; harden SECRET_KEY |
| 2 | `8032dbd` | refactor(urls): add core/url_builders; replace 2 hardcoded Supabase/dicebear URLs |
| 3 | `063cccb` | refactor(seed): use `__SUPABASE_BASE__` placeholder + resolve at load time |
| 4 | `327fbc2` | refactor(tests+vite): centralize test env, env-driven Vite proxy |
| 5 | `732ba54` | fix(settings): narrow `ALLOWED_ORIGINS='*'` when credentials are required |

The full design lives at `plan/20260802_hardcoded_values_refactor.md`; the
supporting research is at `research/20260802_hardcoded_values_refactor.md`.

---

## What changed

### 1. Settings layer (`backend/settings.py`)

- **New required env vars:**
  - `SUPABASE_PROJECT_URL` — full Supabase project URL (no trailing slash).
    Used to compose public Storage URLs.
  - `DEFAULT_FRONTEND_ORIGIN` — the deployed Vercel frontend origin
    (no trailing slash). Used for production CORS.
- **New env vars with sensible defaults:**
  - `SUPABASE_STORAGE_BUCKET` — defaults to `AR_models`.
  - `AVATAR_SERVICE_URL` — defaults to Dicebear's `avataaars` endpoint.
  - `DEV_ORIGINS` — comma-separated list merged into `cors_origins` only
    when `DEBUG=true`. Defaults to `localhost:3000`, `localhost:5173`,
    `127.0.0.1:3000`, `127.0.0.1:5173`.
- **Hardened `SECRET_KEY`:**
  - Now typed as `pydantic.SecretStr` (no default).
  - New `field_validator` rejects, at import time:
    - Empty value.
    - Known leaked placeholders (`dev-secret-key-change-in-production`,
      `your-super-secret-key-change-this-in-production`, `dev-secret`,
      `change-in-production`, `changeme`, `test-secret`).
    - Any value shorter than 32 characters.
- **CORS rewrite (`cors_origins` property):**
  - Always includes `DEFAULT_FRONTEND_ORIGIN` + the canonical
    `https://edu-platform-dun.vercel.app`.
  - Merges any extra origins parsed from `ALLOWED_ORIGINS`.
  - Appends `DEV_ORIGINS` when `DEBUG=true`.
  - **Narrowing behaviour:** if `ALLOWED_ORIGINS='*'`, the list is always
    narrowed to the explicit set. This is required because `main.py` sets
    `allow_credentials=True`, and Starlette rejects `*` in that combination
    at startup.
- All consumers (`core/security.py`, `tests/test_api_auth_required.py`)
  now call `settings.SECRET_KEY.get_secret_value()` before passing the
  value to `jwt.encode` / `jwt.decode`.

### 2. URL builders (`backend/core/url_builders.py` — new file)

Module-level helpers, all reading from `settings`:

| Helper | Returns |
|--------|---------|
| `supabase_base_url()` | `{project}/storage/v1/object/public/{bucket}` |
| `mind_file_url(path)` | public URL for a MindAR `.mind` file |
| `model_3d_url(path)` | public URL for a 3D `.glb` model |
| `image_2d_url(path)` | public URL for a 2D flashcard image |
| `default_avatar_url(username)` | Dicebear avatar URL with `backgroundColor=b6e3f4` |
| `supabase_resolve_placeholders(obj)` | recursive `__SUPABASE_BASE__` replacer for JSON trees |

### 3. Hardcoded URL removals

| File | Before | After |
|------|--------|-------|
| `backend/repositories/admin_repository.py` line 340 | `f"https://rofprrtoeyirssfndxag.supabase.co/..."` | `mind_file_url(f"assets/mind-files/{ar_tag}.mind")` |
| `backend/services/profile_service.py` `_avatar` | inline Dicebear f-string | `default_avatar_url(username)` |

### 4. Seed JSON placeholder (`backend/database/seed/`)

| File | Change |
|------|--------|
| `ar_objects.json` | 67 hardcoded URLs → `__SUPABASE_BASE__` |
| `flashcards.json` | 8 hardcoded URLs → `__SUPABASE_BASE__` |
| `lessons.json` | 4 hardcoded URLs → `__SUPABASE_BASE__` |
| `seed_mongo.py` | `upsert_seed_data()` now calls `supabase_resolve_placeholders(data)` after `json.load` |

The placeholder substitutes the **full host** (including `https://`), so a
seeded URL like `__SUPABASE_BASE__/storage/v1/...` resolves to
`https://rofprrtoeyirssfndxag.supabase.co/storage/v1/...`.

### 5. Frontend Vite proxy (`frontend-web/vite.config.ts`)

- Reads `VITE_PROXY_TARGET` / `VITE_PROXY_WS_TARGET` via `loadEnv`.
- Defaults preserve the previous hardcoded `http://localhost:8000` /
  `ws://localhost:8000` so existing local dev workflows are unchanged.

### 6. Tests fixture (`backend/tests/conftest.py`)

- Module-level `os.environ.setdefault` installs dummy env at conftest load
  time so top-level `from settings import settings` inside test files sees
  the values.
- `pytest_configure` removes optional keys (`GOOGLE_API_KEY`,
  `OPENAI_API_KEY`, …).
- Autouse `_dummy_env` `monkeypatch` re-asserts the values per test
  (auto-reverted on teardown).
- `backend/tests/test_ar_service.py` and `backend/tests/test_beanie_odm.py`
  no longer set env vars inline — the consolidated fixture owns it.

### 7. Deployment / config files

- `backend/.env.example` — added `SUPABASE_PROJECT_URL`,
  `SUPABASE_STORAGE_BUCKET`, `AVATAR_SERVICE_URL`,
  `DEFAULT_FRONTEND_ORIGIN`, `DEV_ORIGINS`. `SECRET_KEY=` is now blank
  with a generation comment.
- `docker-compose.yml` — `SECRET_KEY` now `${SECRET_KEY:?required}` and
  `SUPABASE_PROJECT_URL` same. The 4 new env vars wired into the backend
  service.
- `backend/render.yaml` — added `SUPABASE_PROJECT_URL` (sync:false),
  `SUPABASE_STORAGE_BUCKET` (literal), `AVATAR_SERVICE_URL` (literal),
  `DEFAULT_FRONTEND_ORIGIN` (sync:false).
- `frontend-web/.env.example` — added `VITE_PROXY_TARGET` and
  `VITE_PROXY_WS_TARGET` with localhost defaults.

---

## Env var reference (post-refactor)

### Backend (Python / FastAPI)

| Var | Required? | Default | Source | Purpose |
|-----|-----------|---------|--------|---------|
| `MONGO_URL` | yes | — | `.env` / Render dashboard (sync:false) / docker-compose | MongoDB connection string |
| `MONGO_DB` | no | `eduplatform` | `.env` | MongoDB database name |
| `SECRET_KEY` | yes | — | generated; Render auto-generates (`generateValue: true`); local: `python -c "import secrets; print(secrets.token_urlsafe(32))"` | JWT signing — must be ≥32 chars and not a known placeholder |
| `SUPABASE_PROJECT_URL` | yes | — | `.env` / Render dashboard (sync:false) | Full Supabase project URL (`https://xxx.supabase.co`) |
| `SUPABASE_STORAGE_BUCKET` | no | `AR_models` | `.env` / Render literal | Public bucket holding AR assets |
| `AVATAR_SERVICE_URL` | no | `https://api.dicebear.com/7.x/avataaars/svg` | `.env` / Render literal | Avatar service base URL |
| `DEFAULT_FRONTEND_ORIGIN` | yes | — | `.env` / Render dashboard (sync:false) | Deployed Vercel frontend origin (no trailing slash) |
| `DEV_ORIGINS` | no | `http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173` | `.env` | Dev-only CORS origins; applied when `DEBUG=true` |
| `DEBUG` | no | `false` | `.env` / Render literal (`false`) | Toggles dev CORS + verbose logs |
| `ALLOWED_ORIGINS` | no | `*` | `.env` / Render literal | Extra CORS origins (comma-separated). `'*'` is narrowed to explicit list because `allow_credentials=True`. |
| `ALGORITHM` | no | `HS256` | `.env` | JWT algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | no | `30` | `.env` | JWT lifetime |
| `REDIS_*` | no | see `.env.example` | `.env` | Redis connection settings |
| `GOOGLE_API_KEY` | no | — | `.env` | Optional — Gemini for AI content |
| `OPENAI_API_KEY` | no | — | `.env` | Optional |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | no | — | `.env` | Optional — kept for legacy upload scripts |

### Frontend (Vite)

| Var | Required? | Default | Purpose |
|-----|-----------|---------|---------|
| `VITE_API_BASE` | no | `http://localhost:8000` | Backend HTTP base |
| `VITE_WS_URL` | no | `ws://localhost:8000` | Backend WebSocket URL |
| `VITE_PROXY_TARGET` | no | `http://localhost:8000` | **New.** Vite dev-server `/api` and `/assets/model2D` proxy target |
| `VITE_PROXY_WS_TARGET` | no | `ws://localhost:8000` | **New.** Vite dev-server `/ws` proxy target |
| `VITE_APP_ENV` | no | `development` | App environment |
| `VITE_PUBLIC_HOST` | no | — | Public host for CORS |
| `VITE_ENABLE_AI` / `VITE_ENABLE_AR` | no | `true` / `true` | Feature flags |
| `VITE_SENTRY_DSN` | no | — | Optional Sentry client DSN |

---

## Operator notes

### Local dev

```bash
cd backend
cp .env.example .env
# fill MONGO_URL + SECRET_KEY (generate!) + SUPABASE_PROJECT_URL + DEFAULT_FRONTEND_ORIGIN
DEBUG=true python -m uvicorn main:app --port 8000
```

### Docker

```bash
echo "SECRET_KEY=$(python -c 'import secrets; print(secrets.token_urlsafe(32))')" > .env
echo "SUPABASE_PROJECT_URL=https://your-project.supabase.co" >> .env
echo "DEFAULT_FRONTEND_ORIGIN=http://localhost:5173" >> .env
docker compose up -d backend
```

`docker-compose.yml` fails fast (`${VAR:?required}`) if `SECRET_KEY` or
`SUPABASE_PROJECT_URL` is unset.

### Render

Before the first deploy after this change, ensure the Render dashboard has
`SUPABASE_PROJECT_URL` and `DEFAULT_FRONTEND_ORIGIN` set. `SECRET_KEY` is
already auto-generated (`generateValue: true`).

### Rollback

`git revert 732ba54..f373b64` is safe — no DB migration, no destructive
side effect, all new env vars are additive and unused by the pre-refactor
code.

---

## Verification status

| Check | Result |
|-------|--------|
| `pytest -q` (with env) | **200 passed** (matches baseline) |
| `pytest -q` (no env) | **200 passed** (conftest fixture provides all required vars) |
| `python -c "from settings import settings; print(settings.cors_origins)"` DEBUG=true | includes localhost + 127.0.0.1 |
| `python -c "from settings import settings; print(settings.cors_origins)"` DEBUG=false | excludes dev origins |
| `python -c "from core.url_builders import mind_file_url; print(mind_file_url('test.mind'))"` | returns full Supabase URL |
| `python -c "from core.url_builders import supabase_resolve_placeholders; ..."` | resolves `__SUPABASE_BASE__` to settings value |
| Backend startup smoke (`uvicorn main:app`) | succeeds settings import + route registration; **DB connection fails locally** because no MongoDB is running — pre-existing condition, not a regression |
| `vite.config.ts` parse + env var presence | PASS (proxy targets env-driven; defaults preserved) |
| `frontend-web/.env.example` | contains both `VITE_PROXY_*` entries with defaults |

---

## Deferred / out of scope (per plan)

- **Q1** — frontend AR components still hardcode the Supabase host
  (`ARContainerV2.tsx`, `useArData.ts`, `useMultiFlashcard.ts`). Backend
  refactor does not make these worse. Requires a separate plan covering QR
  payload format + cache strategy + how MindAR's `.mind` URL is encoded.
- **Q3** — `https://edu-platform-dun.vercel.app` is kept hardcoded in
  `cors_origins` (one specific origin, not a config value). If env-driven
  is preferred, add a second var.
- **Q4** — Dicebear `backgroundColor=b6e3f4` is folded into
  `default_avatar_url(username)`. Add `AVATAR_BACKGROUND_COLOR` env if
  configurable later.
- `vercel.json` rewrite rules reference the placeholder
  `https://api.eduplatform.example.com` (never updated to the real Render
  URL). Out of scope for this refactor.

---

**Branch:** `MindAR-Update`
**Local commits:** 5 (not pushed)
**Plan:** `plan/20260802_hardcoded_values_refactor.md`