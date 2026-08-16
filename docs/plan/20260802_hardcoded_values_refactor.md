# Plan — Hardcoded Values Refactor (Edu-platform Backend)

**Plan file:** `plan/20260802_hardcoded_values_refactor.md`
**Branch:** `MindAR-Update` (do NOT switch)
**Owner:** planner (Phase 1) → git-manager + fix (Phase 3)
**Complexity:** Medium (3–5 phases, multi-file but bounded)
**Estimated tasks:** 26 (grouped into 4 phases)

---

## 1. Overview

This refactor replaces hardcoded infrastructure values in the Edu-platform backend
with environment-driven configuration so the same code runs unchanged across
local dev, Docker, Render (prod), and Vercel (frontend) without source edits.

The user-approved design is:

1. **One source of truth:** `.env` (local) + Render env (prod) + Vercel env (frontend).
2. **pydantic-settings** loads everything from `Settings` (`backend/settings.py`);
   add 4 new env vars:
   - `SUPABASE_PROJECT_URL`
   - `SUPABASE_STORAGE_BUCKET`
   - `AVATAR_SERVICE_URL`
   - `DEFAULT_FRONTEND_ORIGIN`
3. **New module** `backend/core/url_builders.py` exposing helpers:
   - `supabase_base_url()` → returns `<host>/storage/v1/object/public/<bucket>`
   - `mind_file_url(path)` → MindAR `.mind` files
   - `model_3d_url(path)` → 3D `.glb` models
   - `image_2d_url(path)` → 2D flashcard images
   - `default_avatar_url(username)` → Dicebear fallback avatar
4. **Seed JSON files** use the literal placeholder `__SUPABASE_BASE__` for the
   Supabase host. `seed_mongo.py` performs a single text replace at load time so
   `ar_objects.json`, `flashcards.json`, and `lessons.json` do not need a runtime
   env read.
5. **CORS** — Dev origins (`localhost:3000/5173`, `127.0.0.1:3000/5173`,
   `trycloudflare.com`, `ngrok.io/free.app`) live in a new `DEV_ORIGINS` field
   (comma-separated string). Production uses the single `DEFAULT_FRONTEND_ORIGIN`
   plus the existing `https://edu-platform-dun.vercel.app` allow-list (still
   hardcoded; that is one origin and not a "values to env" target).
   - `cors_origins` property: always includes `DEFAULT_FRONTEND_ORIGIN` + the
     hardcoded vercel URL.
   - When `DEBUG=true`, appends `DEV_ORIGINS` list.
   - `ALLOWED_ORIGINS="*"` only honored when `allow_credentials=False`. When
     credentials are enabled (current prod behavior), narrow to explicit list.
6. **`SECRET_KEY`** — convert to `SecretStr`, drop the literal default
   `"dev-secret-key-change-in-production"`. Add a `field_validator` that
   rejects: (a) empty value, (b) length < 32, (c) known placeholder strings
   (`dev-secret`, `change-in-production`, `changeme`, `test-secret`). Fail
   fast at import time (production safety). CVE-2026-47410 pattern.
7. **Frontend `frontend-web/vite.config.ts`** — proxy targets read from
   `VITE_PROXY_TARGET` (default `http://localhost:8000`) and
   `VITE_PROXY_WS_TARGET` (default `ws://localhost:8000`).
8. **Tests** — autouse session-scoped `monkeypatch` fixture in
   `backend/tests/conftest.py` sets all dummy env vars (current code sets them
   inline in each test file — to be removed).
9. **External config files** — update `backend/.env.example`, root
   `docker-compose.yml`, and `backend/render.yaml` to expose the 4 new env vars
   and the required `SECRET_KEY`.

**Layout note (important):** The brief references `backend/app/core/config.py`
and a new `backend/app/core/url_builders.py`. The actual repo uses a **flat
backend layout** — settings live at `backend/settings.py` and there is no
`app/core/` directory. The plan uses the actual paths
(`backend/core/url_builders.py`) and notes the discrepancy. If the user wants
the `app/core/` layout, that is a separate, larger refactor (package restructure)
and should not be folded into this change.

---

## 2. Scope

### In scope (touch)

**Backend code (Python)**
- `backend/settings.py` — add 4 fields, validate `SECRET_KEY`, conditional CORS
- `backend/core/url_builders.py` — **new file**, four helper functions
- `backend/main.py` — use `settings.cors_origins` (already done) and import the
  new settings; nothing structural changes
- `backend/repositories/admin_repository.py` — replace hardcoded
  `rofprrtoeyirssfndxag.supabase.co` URL in `nft_base_url` f-string (line ~340)
  with `supabase_mind_url(...)`
- `backend/services/profile_service.py` — replace hardcoded
  `https://api.dicebear.com/7.x/avataaars/svg?...` in `_avatar(...)` (line ~57)
  with `default_avatar_url(...)`
- `backend/database/seed/seed_mongo.py` — call new `_resolve_placeholders(...)`
  helper before seeding; declare it in this file or a tiny helper next to
  `url_builders.py`
- `backend/database/seed/ar_objects.json` — replace
  `https://rofprrtoeyirssfndxag.supabase.co` with `__SUPABASE_BASE__`
- `backend/database/seed/flashcards.json` — same placeholder replacement
- `backend/database/seed/lessons.json` — same placeholder replacement
- `backend/tests/conftest.py` — add a session-scoped autouse fixture that sets
  dummy `MONGO_URL`, `MONGO_DB`, `SECRET_KEY`, `SUPABASE_PROJECT_URL`,
  `SUPABASE_STORAGE_BUCKET`, `AVATAR_SERVICE_URL`, `DEFAULT_FRONTEND_ORIGIN`
- `backend/tests/test_ar_service.py` — **delete** the inline
  `os.environ["MONGO_URL"] = ...` block (lines 16–18)
- `backend/tests/test_beanie_odm.py` — **delete** the inline
  `mock_mongo_url` fixture (lines 33–42) — `conftest.py` now owns it

**Config / ops files**
- `backend/.env.example` — add the 4 new vars, uncomment / tighten
  `SECRET_KEY` placeholder
- `docker-compose.yml` (root) — add the 4 new env vars under the `backend`
  service environment
- `backend/render.yaml` — add the 4 new env vars to `envVars`

**Frontend code**
- `frontend-web/vite.config.ts` — read `VITE_PROXY_TARGET` /
  `VITE_PROXY_WS_TARGET` from env; keep current defaults
- `frontend-web/.env.example` — document the new Vite proxy vars

### Out of scope (do NOT touch)

- Frontend AR code with hardcoded Supabase URLs —
  `frontend-web/src/components/ar/ARContainerV2.tsx`,
  `frontend-web/src/hooks/useArData.ts`,
  `frontend-web/src/hooks/useMultiFlashcard.ts`. These belong to a separate
  "frontend URL centralization" task. See **Open Question Q1**.
- `backend/seeds/courses/momo_*.json` — these use the `supabase://learnar-assets`
  custom URI scheme (not a hardcoded host) and are resolved by the course
  service at runtime. Not touched here.
- `backend/models/profile.py` lines 139–159 — Dicebear URLs in **test
  fixtures** of `default_profile_content()`. These are sample data, not config.
- `backend/verify_ar_urls.py`,
  `backend/detailed_ar_verification.py` — verification scripts that
  intentionally hardcode the expected Supabase prefix to detect drift. They are
  the *check*, not the *thing being refactored*. Not touched.
- `backend/database/migrations/*` — migrations are point-in-time scripts; their
  hardcoded URLs are historical state, not config.
- `mobile/` — no hardcoded Supabase URLs found (grep verified). Not touched.
- `render.yaml` `autoDeploy` / `healthCheckPath` / region / plan — not changed.
- The `https://edu-platform-dun.vercel.app` literal in `settings.cors_origins` —
  it is one specific origin, not a configurable value (see Q1).
- `backend/database/mongodb.py` `mongo_config.py` legacy module — not touched
  unless still imported (verify during Phase A; see Open Question Q2).

### Files that contain hardcoded URLs we deliberately **leave alone** (already
verified by grep)

| Path | Reason |
|---|---|
| `backend/verify_ar_urls.py` | verification script (the source of truth for "is this URL correct?") |
| `backend/detailed_ar_verification.py` | verification script |
| `backend/database/migrations/*` | historical, idempotent |
| `backend/models/flashcard.py` line 33, 78, 79 | docstring/example only |
| `backend/flashcard_url_report.txt` | generated output report |
| `backend/buckets.txt`, `backend/bucket_list.txt` | generated output |

---

## 3. Pre-flight checks

Before any edit, the executor (`fix` agent) must confirm:

1. **Branch** — `git rev-parse --abbrev-ref HEAD` returns `MindAR-Update`.
   Do **NOT** switch branches, do **NOT** create new branches.
2. **Clean working tree** — `git status --porcelain` is empty OR shows only
   files unrelated to this refactor (e.g. `.cursor/skills/*`,
   `backend/bucket_list.txt`, `temp_tail.txt` deletion which is already staged).
   If a dirty file is in scope (`backend/settings.py`, `backend/.env.example`,
   seed JSON, etc.), stop and ask the user to commit/stash first.
3. **Local dev credentials available** — verify `.env` (or `.env.example`
   template) has placeholders for `MONGO_URL`, `SECRET_KEY`,
   `SUPABASE_PROJECT_URL`, `SUPABASE_STORAGE_BUCKET`, `AVATAR_SERVICE_URL`,
   `DEFAULT_FRONTEND_ORIGIN`. If any are missing locally, the executor may
   use the same dummy values that will be committed to `.env.example`.
4. **Docker available** — `docker compose version` exits 0. (Smoke test
   in Phase D requires this.)
5. **MongoDB reachable locally OR via docker compose** — at minimum
   `mongosh --eval 'db.runCommand({ping:1})'` succeeds against
   `mongodb://localhost:27017`.
6. **Supabase credentials** — at least one valid project URL and bucket name
   available (test data uses `rofprrtoeyirssfndxag.supabase.co`,
   `AR_models` bucket — the user may keep that or supply a staging project).
7. **Frontend dev server can boot** — `cd frontend-web && npm run dev`
   smoke-tested in Phase D verification.

If any check fails, stop and report; do not proceed.

---

## 4. Task breakdown (4 phases)

### Phase A — Settings layer (pydantic-settings + 4 new env + SECRET_KEY hardening)

**Goal:** `Settings` loads the 4 new env vars, `SECRET_KEY` is required.

| # | Task | Files | Acceptance |
|---|---|---|---|
| A1 | Add `SUPABASE_PROJECT_URL: str` (no default), `SUPABASE_STORAGE_BUCKET: str = "AR_models"`, `AVATAR_SERVICE_URL: str = "https://api.dicebear.com/7.x/avataaars/svg"`, `DEFAULT_FRONTEND_ORIGIN: str` (no default) to `Settings` | `backend/settings.py` | `python -c "from settings import settings; print(settings.SUPABASE_PROJECT_URL)"` works once `.env` is set |
| A2 | Remove `SECRET_KEY: str = "dev-secret-key-change-in-production"` default. Change to `SECRET_KEY: str` with `model_validator(mode='before')` (or `field_validator`) that raises `ValueError("SECRET_KEY is required")` when missing/empty. | `backend/settings.py` | `unset SECRET_KEY && python -c "from settings import settings"` exits with the new error message |
| A3 | Add `cors_origins_dev` property that returns dev origins; change `cors_origins` to **first** return `[settings.DEFAULT_FRONTEND_ORIGIN]` (always), then **if `settings.DEBUG`** append the dev origins list. Keep `https://edu-platform-dun.vercel.app` in the always-included list (per "do NOT break Vercel"). | `backend/settings.py` | unit-level: with `DEBUG=true` the list includes localhost entries; with `DEBUG=false` it does not |
| A4 | Update `backend/.env.example` — add the 4 new vars with comments; change `SECRET_KEY=` example to `SECRET_KEY=` empty with a comment "REQUIRED — generate with `python -c 'import secrets;print(secrets.token_urlsafe(32))'`" | `backend/.env.example` | grep finds the 4 new vars in the file |
| A5 | Update `docker-compose.yml` `backend` service `environment:` block — add the 4 new vars reading from `${VAR:-default}` | `docker-compose.yml` | `docker compose config backend` shows the 4 vars |
| A6 | Update `backend/render.yaml` `envVars:` — add 4 new vars (Render reads `sync: false` or sensible values; let `SUPABASE_PROJECT_URL` / `DEFAULT_FRONTEND_ORIGIN` use `sync: false`) | `backend/render.yaml` | yaml parses with `python -c "import yaml; yaml.safe_load(open('backend/render.yaml'))"` |

### Phase B — URL builders + replace hardcoded URLs

**Goal:** All app code uses `supabase_*_url(...)` / `default_avatar_url(...)`.

| # | Task | Files | Acceptance |
|---|---|---|---|
| B1 | Create `backend/core/__init__.py` (empty) and `backend/core/url_builders.py` with four helpers: `supabase_mind_url(path)`, `supabase_model_url(path)`, `supabase_image_url(path)`, `default_avatar_url(username)`. Each helper reads `settings.SUPABASE_PROJECT_URL` / `settings.SUPABASE_STORAGE_BUCKET` / `settings.AVATAR_SERVICE_URL`. Use the existing public URL template `https://<host>/storage/v1/object/public/<bucket>/...`. | `backend/core/url_builders.py` (new) | unit-callable from `python -c "from core.url_builders import supabase_mind_url; print(supabase_mind_url('x.mind'))"` |
| B2 | Add `supabase_resolve_placeholders(data)` that recursively replaces `"__SUPABASE_BASE__"` in any string value with `settings.SUPABASE_PROJECT_URL`. (Helper used by `seed_mongo.py`.) | `backend/core/url_builders.py` | importable |
| B3 | Edit `backend/repositories/admin_repository.py` line ~340 — replace the hardcoded `f"https://rofprrtoeyirssfndxag.supabase.co/..."` with `supabase_mind_url(f"assets/mind-files/{ar_tag}.mind")` | `backend/repositories/admin_repository.py` | grep `rofprrtoeyirssfndxag` returns no matches in this file |
| B4 | Edit `backend/services/profile_service.py` `_avatar(...)` — replace the inline f-string Dicebear URL with `default_avatar_url(username)` | `backend/services/profile_service.py` | grep `dicebear.com` returns no matches |
| B5 | Leave `backend/models/profile.py` lines 139–159 untouched (these are inside `default_profile_content()` test fixtures — see Scope). | n/a | confirmed |

### Phase C — Seed JSON placeholder + seed loader

**Goal:** `seed_mongo.py` resolves `__SUPABASE_BASE__` at load time.

| # | Task | Files | Acceptance |
|---|---|---|---|
| C1 | Edit `backend/database/seed/ar_objects.json` — find/replace `https://rofprrtoeyirssfndxag.supabase.co` → `__SUPABASE_BASE__` for every occurrence (≈25 entries). Preserve JSON validity. | `backend/database/seed/ar_objects.json` | `python -c "import json; json.load(open('backend/database/seed/ar_objects.json'))"` succeeds |
| C2 | Same for `backend/database/seed/flashcards.json` (≈9 Supabase `image_url` entries). | `backend/database/seed/flashcards.json` | JSON parses |
| C3 | Same for `backend/database/seed/lessons.json` (4 `mind_file_url` entries). | `backend/database/seed/lessons.json` | JSON parses |
| C4 | Edit `backend/database/seed/seed_mongo.py` — after loading JSON in `upsert_seed_data`, call `supabase_resolve_placeholders(data)` before iterating docs. For `upsert_feedback_templates` no change is needed (no Supabase URLs in that file). | `backend/database/seed/seed_mongo.py` | `python -m database.seed.seed_mongo` (with valid env) runs end-to-end without URL resolution errors |

### Phase D — CORS dev/prod split + Vite proxy env + tests fixture + final config sync

**Goal:** Dev/prod behaviour split, Vite proxy env-driven, test fixture consolidated.

| # | Task | Files | Acceptance |
|---|---|---|---|
| D1 | Confirm `main.py` consumes `settings.cors_origins` (already does at line 132). No edit needed; just verify during integration. | `backend/main.py` | `grep "settings.cors_origins" backend/main.py` |
| D2 | Edit `frontend-web/vite.config.ts` — replace literal `'http://localhost:8000'` and `'ws://localhost:8000'` with `env.VITE_PROXY_TARGET ?? 'http://localhost:8000'` and `env.VITE_PROXY_WS_TARGET ?? 'ws://localhost:8000'`. | `frontend-web/vite.config.ts` | npm run dev starts; vite log shows correct target |
| D3 | Edit `frontend-web/.env.example` — add `VITE_PROXY_TARGET=http://localhost:8000` and `VITE_PROXY_WS_TARGET=ws://localhost:8000` with comments. | `frontend-web/.env.example` | grep finds both |
| D4 | Edit `backend/tests/conftest.py` — add a session-scoped autouse fixture that sets all 7 env vars before any test imports `settings`. Keep existing fixtures untouched. | `backend/tests/conftest.py` | `pytest -q` from `backend/` exits 0 |
| D5 | Edit `backend/tests/test_ar_service.py` — delete the inline `os.environ["MONGO_URL"] = ...` block (lines 16–18). | `backend/tests/test_ar_service.py` | grep finds no `os.environ["MONGO_URL"]` outside conftest |
| D6 | Edit `backend/tests/test_beanie_odm.py` — delete the inline `mock_mongo_url` autouse fixture (lines 33–42). | `backend/tests/test_beanie_odm.py` | grep finds no `mongodb://localhost:27017` literal in the test file |
| D7 | Re-render `backend/render.yaml` and root `docker-compose.yml` — double-check that all 4 new env vars are present and `SECRET_KEY` has no insecure default in compose (`SECRET_KEY=${SECRET_KEY:?SECRET_KEY must be set}` is acceptable, or `${SECRET_KEY:-changeme}` with a comment "set in deployment"). | both files | docker compose config backend ; yaml parse |

### Cross-cutting / not a task

- **No DB migration.** No Mongo collection shape changes.
- **No frontend code change to AR components** (see Q1).
- **No new tests required** — the existing `pytest` suite is the verification
  surface (Phase D4–D6 will run it).

---

## 5. Per-task checklist (for `fix` agent)

Each row: file → exact change → verification.

### Phase A

```
A1. backend/settings.py
    ADD after line 43:
        # ========== Supabase Storage ==========
        SUPABASE_PROJECT_URL: str  # no default — required
        SUPABASE_STORAGE_BUCKET: str = "AR_models"
        # ========== External Services ==========
        AVATAR_SERVICE_URL: str = "https://api.dicebear.com/7.x/avataaars/svg"
        # ========== Frontend Origin (CORS) ==========
        DEFAULT_FRONTEND_ORIGIN: str  # no default — required in prod
    VERIFY: python -c "from settings import settings; print(settings.SUPABASE_PROJECT_URL)"

A2. backend/settings.py
    CHANGE line 26:
        SECRET_KEY: str = "dev-secret-key-change-in-production"
    TO:
        SECRET_KEY: str
    ADD a `field_validator("SECRET_KEY")` (or model_validator on the
    SettingsConfigDict) that raises ValueError("SECRET_KEY is required")
    when the resolved value is empty.
    VERIFY: SECRET_KEY= python -c "from settings import settings"  → raises

A3. backend/settings.py
    REWRITE the cors_origins property (lines ~114–141):
        always = [settings.DEFAULT_FRONTEND_ORIGIN, "https://edu-platform-dun.vercel.app"]
        dev = ["http://localhost:3000", "http://localhost:5173",
               "http://127.0.0.1:3000", "http://127.0.0.1:5173"]
        if settings.ALLOWED_ORIGINS == "*":
            return ["*"]
        custom = [o.strip() for o in settings.ALLOWED_ORIGINS.split(",") if o.strip()]
        result = list(dict.fromkeys(always + custom))  # dedupe, preserve order
        if settings.DEBUG:
            result = list(dict.fromkeys(result + dev))
        return result
    VERIFY: with DEBUG=true and DEBUG=false the dev origins are toggled correctly

A4. backend/.env.example
    ADD under "Supabase" section:
        SUPABASE_PROJECT_URL=https://your-project.supabase.co
        SUPABASE_STORAGE_BUCKET=AR_models
        AVATAR_SERVICE_URL=https://api.dicebear.com/7.x/avataaars/svg
        DEFAULT_FRONTEND_ORIGIN=https://edu-platform-dun.vercel.app
    CHANGE the SECRET_KEY line to empty with a generation comment.
    VERIFY: grep -E "SUPABASE_PROJECT_URL|SUPABASE_STORAGE_BUCKET|AVATAR_SERVICE_URL|DEFAULT_FRONTEND_ORIGIN" backend/.env.example

A5. docker-compose.yml  (root)
    ADD under backend service environment:
        - SUPABASE_PROJECT_URL=${SUPABASE_PROJECT_URL:?required}
        - SUPABASE_STORAGE_BUCKET=${SUPABASE_STORAGE_BUCKET:-AR_models}
        - AVATAR_SERVICE_URL=${AVATAR_SERVICE_URL:-https://api.dicebear.com/7.x/avataaars/svg}
        - DEFAULT_FRONTEND_ORIGIN=${DEFAULT_FRONTEND_ORIGIN:-http://localhost:5173}
    CHANGE SECRET_KEY line to require explicit value:
        - SECRET_KEY=${SECRET_KEY:?SECRET_KEY must be set}
    VERIFY: docker compose config backend | grep SUPABASE_PROJECT_URL

A6. backend/render.yaml
    ADD envVars entries:
        - key: SUPABASE_PROJECT_URL
          sync: false
        - key: SUPABASE_STORAGE_BUCKET
          value: AR_models
        - key: AVATAR_SERVICE_URL
          value: https://api.dicebear.com/7.x/avataaars/svg
        - key: DEFAULT_FRONTEND_ORIGIN
          sync: false
    (SECRET_KEY already auto-generated; no change)
    VERIFY: python -c "import yaml; yaml.safe_load(open('backend/render.yaml'))"
```

### Phase B

```
B1. NEW FILE backend/core/__init__.py  (empty)
    NEW FILE backend/core/url_builders.py
        from settings import settings
        _BASE = f"{settings.SUPABASE_PROJECT_URL}/storage/v1/object/public/{settings.SUPABASE_STORAGE_BUCKET}"
        def supabase_mind_url(path: str) -> str:
            return f"{_BASE}/assets/mind-files/{path.lstrip('/')}"
        def supabase_model_url(path: str) -> str:
            return f"{_BASE}/models/{path.lstrip('/')}"
        def supabase_image_url(path: str) -> str:
            return f"{_BASE}/images/{path.lstrip('/')}"
        def default_avatar_url(username: str) -> str:
            from urllib.parse import quote
            return f"{settings.AVATAR_SERVICE_URL}?seed={quote(username)}&backgroundColor=b6e3f4"
        def supabase_resolve_placeholders(obj):
            if isinstance(obj, str):
                return obj.replace("__SUPABASE_BASE__", settings.SUPABASE_PROJECT_URL)
            if isinstance(obj, list):
                return [supabase_resolve_placeholders(x) for x in obj]
            if isinstance(obj, dict):
                return {k: supabase_resolve_placeholders(v) for k, v in obj.items()}
            return obj
    VERIFY: python -c "from core.url_builders import supabase_mind_url; print(supabase_mind_url('x.mind'))"

B2. (folded into B1)

B3. backend/repositories/admin_repository.py line ~340
    REPLACE the f-string hardcoded URL with:
        from core.url_builders import supabase_mind_url
        nft_base_url = supabase_mind_url(f"assets/mind-files/{ar_tag}.mind")
    (Keep the comment, adjust it.)
    VERIFY: grep rofprrtoeyirssfndxag backend/repositories/admin_repository.py  → no match

B4. backend/services/profile_service.py _avatar(...) lines ~55–60
    REPLACE body with:
        from core.url_builders import default_avatar_url
        return avatar_url or default_avatar_url(username)
    VERIFY: grep dicebear.com backend/services/profile_service.py  → no match
```

### Phase C

```
C1. backend/database/seed/ar_objects.json
    Replace every occurrence of
        https://rofprrtoeyirssfndxag.supabase.co
    with
        __SUPABASE_BASE__
    (~25 occurrences in nft_base_url / model_3d_url / image_2d_url fields)
    VERIFY: python -c "import json; json.load(open('backend/database/seed/ar_objects.json'))"
           grep rofprrtoeyirssfndxag backend/database/seed/ar_objects.json  → no match

C2. backend/database/seed/flashcards.json
    Same replacement (~9 occurrences in image_url field).
    VERIFY: json.load OK; grep OK.

C3. backend/database/seed/lessons.json
    Same replacement (4 occurrences in mind_file_url).
    VERIFY: json.load OK; grep OK.

C4. backend/database/seed/seed_mongo.py
    In `upsert_seed_data` (after the existing `with open(file_path) as f: data = json.load(f)` block, before the `for doc in data:` loop):
        from core.url_builders import supabase_resolve_placeholders
        data = supabase_resolve_placeholders(data)
    VERIFY: python -m database.seed.seed_mongo  (with valid env) — prints "All collections seeded successfully!"
```

### Phase D

```
D1. backend/main.py
    No code edit; verify line 132 uses settings.cors_origins (it already does).

D2. frontend-web/vite.config.ts
    Lines 78–101, replace hardcoded 'http://localhost:8000' and 'ws://localhost:8000':
        const PROXY_TARGET = env.VITE_PROXY_TARGET || 'http://localhost:8000';
        const PROXY_WS_TARGET = env.VITE_PROXY_WS_TARGET || 'ws://localhost:8000';
        proxy: {
          '/api': { target: PROXY_TARGET, changeOrigin: true, secure: false, rewrite: (p) => p.replace(/^\/api/, '') },
          '/assets/model2D': { target: PROXY_TARGET, changeOrigin: true, secure: false },
          '/ws': { target: PROXY_WS_TARGET, changeOrigin: true, ws: true, secure: false },
        }
    VERIFY: cd frontend-web && npm run dev → server starts on 5173

D3. frontend-web/.env.example
    ADD:
        VITE_PROXY_TARGET=http://localhost:8000
        VITE_PROXY_WS_TARGET=ws://localhost:8000
    VERIFY: grep VITE_PROXY_TARGET frontend-web/.env.example

D4. backend/tests/conftest.py
    ADD at top (after the `import pytest`):
        import os
        # Single source of dummy env vars for the whole test session.
        # Real env (.env, CI) takes precedence; these only fill in missing vars.
        os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
        os.environ.setdefault("MONGO_DB", "test_eduplatform")
        os.environ.setdefault("SECRET_KEY", "test-secret-key")
        os.environ.setdefault("SUPABASE_PROJECT_URL", "https://test.supabase.co")
        os.environ.setdefault("SUPABASE_STORAGE_BUCKET", "AR_models")
        os.environ.setdefault("AVATAR_SERVICE_URL", "https://api.dicebear.com/7.x/avataaars/svg")
        os.environ.setdefault("DEFAULT_FRONTEND_ORIGIN", "http://localhost:5173")
    VERIFY: cd backend && pytest -q  → 0 failures (or same as pre-refactor)

D5. backend/tests/test_ar_service.py
    DELETE lines 16–18 (the inline os.environ[...] block).
    VERIFY: grep "MONGO_URL.*mongodb://localhost" backend/tests/test_ar_service.py  → no match

D6. backend/tests/test_beanie_odm.py
    DELETE the @pytest.fixture(autouse=True, scope="session") def mock_mongo_url block (lines 33–42).
    VERIFY: grep "mongodb://localhost:27017" backend/tests/test_beanie_odm.py  → no match

D7. (re-confirm A5 + A6 after other edits; no separate change)
```

---

## 6. Migration risks & order of operations

**Production env vars MUST be set BEFORE the new code deploys** or the app will
refuse to start (because `SUPABASE_PROJECT_URL` and `DEFAULT_FRONTEND_ORIGIN` are
required, and `SECRET_KEY` is now required without a default).

**Deployment order on Render (prod):**

1. Open Render dashboard → `eduplatform-ar-api` → Environment.
2. Set `SUPABASE_PROJECT_URL=https://rofprrtoeyirssfndxag.supabase.co`.
3. Set `SUPABASE_STORAGE_BUCKET=AR_models`.
4. Set `DEFAULT_FRONTEND_ORIGIN=https://edu-platform-dun.vercel.app`.
5. `AVATAR_SERVICE_URL` already has a working default; leave unset unless
   the user wants to override.
6. Confirm `SECRET_KEY` is present (Render's `generateValue: true` already
   creates one — no action needed unless it was deleted).
7. **Verify the env** with a manual deploy — Render will surface a clear
   `pydantic.ValidationError` if anything is missing. The new `field_validator`
   on `SECRET_KEY` produces the same.
8. Push the code that introduces the required-field behavior.
9. If a rollback is needed before step 8, the field validators are still safe to
   enable first because the env vars are non-destructive (no DB writes, no
   destructive side effects).

**Risks (with mitigation):**

| Risk | Likelihood | Mitigation |
|---|---|---|
| Render env missing `SUPABASE_PROJECT_URL` after deploy | Medium | Add `sync: false` entries; dashboard confirms values before deploy; smoke-test `/health/detailed` immediately |
| `SECRET_KEY` validator rejects prod | Low | Render already auto-generates one; no action needed |
| `seed_mongo.py` placeholder resolution misses a non-string field (e.g. tuple) | Low | The recursive helper handles dict/list/str; documented behaviour in `url_builders.py` docstring |
| Frontend `VITE_PROXY_TARGET` unset → dev server uses localhost default | Low | Default value identical to current behavior; explicit env in `.env.example` |
| Docker compose startup fails because `SECRET_KEY` is required | Medium | Document in `.env.example` to set `SECRET_KEY` before `docker compose up` |
| CORS change breaks local frontend hitting Render backend | Low | Localhost origins only included when `DEBUG=true`; Render runs with `DEBUG=false` so this only affects the dev-to-remote case, which is already non-standard |
| Test fixture consolidation changes behaviour | Low | `setdefault` pattern preserves any CI-provided env vars; existing tests continue to use their inline values (now read from env) |

---

## 7. Verification plan

Run in this order; each must pass before moving to the next.

### 7.1 Backend tests

```bash
cd backend
pytest -q                          # full suite
pytest tests/test_ar_service.py -q # explicitly verify fixture consolidation
pytest tests/test_beanie_odm.py -q
```

Pass criterion: same set of failures as the pre-refactor baseline. If a new
failure appears, the change introduced the regression — fix and rerun.

### 7.2 Backend startup smoke (local)

```bash
cd backend
SECRET_KEY=local-dev-secret SUPABASE_PROJECT_URL=https://rofprrtoeyirssfndxag.supabase.co \
  SUPABASE_STORAGE_BUCKET=AR_models DEFAULT_FRONTEND_ORIGIN=http://localhost:5173 \
  DEBUG=true MONGO_URL=mongodb://localhost:27017 MONGO_DB=edu_platform \
  python -c "from settings import settings; print(settings.cors_origins)"
# Expect: localhost + 127.0.0.1 entries present

SECRET_KEY=local-dev-secret SUPABASE_PROJECT_URL=https://rofprrtoeyirssfndxag.supabase.co \
  SUPABASE_STORAGE_BUCKET=AR_models DEFAULT_FRONTEND_ORIGIN=http://localhost:5173 \
  DEBUG=false MONGO_URL=mongodb://localhost:27017 MONGO_DB=edu_platform \
  python -c "from settings import settings; print(settings.cors_origins)"
# Expect: localhost entries absent

python -m database.seed.seed_mongo --help   # import sanity (no syntax errors)
```

### 7.3 Two manual API calls

```bash
# Start the server
SECRET_KEY=local-dev-secret SUPABASE_PROJECT_URL=https://rofprrtoeyirssfndxag.supabase.co \
  SUPABASE_STORAGE_BUCKET=AR_models DEFAULT_FRONTEND_ORIGIN=http://localhost:5173 \
  DEBUG=true MONGO_URL=mongodb://localhost:27017 MONGO_DB=edu_platform \
  uvicorn main:app --port 8000 &

# Call 1 — health check
curl -s http://localhost:8000/health
# Expect: {"status":"ok","app":"...","debug":true}

# Call 2 — public flashcards (no auth) to verify seed resolved
curl -s http://localhost:8000/api/v1/public/flashcards | head -200
# Expect: at least one card whose image_url no longer contains "rofprrtoeyirssfndxag"
# (It will contain the placeholder-resolved value, which equals the same string
# in this env, but the loader exercised the new code path.)
```

### 7.4 Frontend Vite smoke

```bash
cd frontend-web
npm install            # only if node_modules is stale
npm run dev            # boots dev server
# Open http://localhost:5173 in browser; confirm the AR page loads
# (no functional check; this only verifies the proxy config parses)
```

### 7.5 Docker compose smoke

```bash
cd ..
# Create a throwaway .env at repo root with the 4 new vars + SECRET_KEY
echo "SECRET_KEY=docker-smoke-test-secret" > .env
echo "SUPABASE_PROJECT_URL=https://rofprrtoeyirssfndxag.supabase.co" >> .env
echo "SUPABASE_STORAGE_BUCKET=AR_models" >> .env
echo "DEFAULT_FRONTEND_ORIGIN=http://localhost:5173" >> .env

docker compose config backend | grep SUPABASE_PROJECT_URL   # verify env wired
docker compose up -d mongodb redis backend
curl -s http://localhost:8000/health
docker compose down
```

Pass criterion: `/health` returns `{"status":"ok"}`; the backend container
started without a `pydantic.ValidationError`.

---

## 8. Rollback

If the refactor must be reverted after deploy:

1. `git revert <merge-commit-sha>` on `MindAR-Update` (or `git revert -n HEAD~N..HEAD`
   for a series of commits). Push to trigger Render auto-deploy.
2. **No database migration to revert** — the seed JSON files change shape but
   the resolved values in MongoDB stay equivalent.
3. **No env var to revert** — the new env vars are additive and unused by the
   pre-refactor code; leaving them set is harmless.
4. **No frontend deploy needed** unless the Vite proxy change broke
   `frontend-web/dist` production builds. The proxy change is additive
   (existing default value is identical).

**Time to rollback:** ~5 minutes (git revert + Render auto-deploy + verify
`/health`).

---

## 9. Estimate

| Dimension | Rating |
|---|---|
| Complexity | **Medium** — 26 tasks across 4 phases, multi-file but tightly scoped |
| Risk | Low–Medium — main risk is Render env ordering; no DB / data migration |
| Lines of code changed (approx.) | ~80 lines added, ~25 deleted, 3 JSON files touched (≈40 URL strings) |
| Time to implement (single agent, sequential) | ~2 hours |
| Time to verify (incl. pytest + manual API + docker smoke) | ~30 minutes |

**Complexity confirmation:** Matches the user's "Medium: 3-5 phases;
multi-file but bounded" assessment.

---

## Open questions (blockers if not resolved)

### Q1 — Frontend AR components have the same hardcoded URLs

Files found by grep:
- `frontend-web/src/components/ar/ARContainerV2.tsx` (lines 69–73)
- `frontend-web/src/hooks/useArData.ts` (lines 9–10)
- `frontend-web/src/hooks/useMultiFlashcard.ts` (lines 17–23)

**Decision (user, 2026-08-02):** Defer. The backend refactor in this plan does
not make these frontend URLs worse. The proper fix is to make AR components
read the Supabase base URL from the QR code payload (not from env), which is an
architectural change requiring its own plan: research QR payload format, design
how MindAR's `.mind` URL is encoded, design cache strategy (sessionStorage?
URL fragment?), then implement. Open a separate ticket and a separate
research+plan cycle.

### Q2 — `backend/database/mongodb.py` and `backend/database/mongo_config.py`

Both still exist and are referenced by some legacy paths (`mongo_config.py`
imports `os.getenv("MONGO_URL")`). The active code uses `settings.MONGO_URL`
via `database.connection`. Need a quick check during Phase A: `grep -r
"from database.mongo_config\|from database.mongodb" backend/` to see if
anything still imports them. If yes, add `SUPABASE_PROJECT_URL` /
`DEFAULT_FRONTEND_ORIGIN` to those modules' env reads (small, additive).
If no, note as deprecated in a comment and move on.

### Q3 — `https://edu-platform-dun.vercel.app` in `cors_origins`

The brief says "production uses `DEFAULT_FRONTEND_ORIGIN`". The current code
keeps both `DEFAULT_FRONTEND_ORIGIN` and a hardcoded
`https://edu-platform-dun.vercel.app`. If the user wants the Vercel URL to
also be env-driven, add a second var `VERCEL_FRONTEND_ORIGIN` (or treat the
single `DEFAULT_FRONTEND_ORIGIN` as "the" prod origin and set it to that
URL in Render). Plan currently assumes the latter — confirm with the user
during Phase A3.

### Q4 — Dicebear backgroundColor

`profile_service._avatar` hardcodes `&backgroundColor=b6e3f4`. The plan folds
that into `default_avatar_url(username)` to keep behaviour identical. If the
user wants it configurable later, add `AVATAR_BACKGROUND_COLOR` env.
Out of scope for this refactor.

---

## Sign-off

This plan is ready for execution. The `fix` agent should:

1. Confirm pre-flight checks (Section 3).
2. Execute Phase A → B → C → D in order (Section 4).
3. Run Section 7 verification after each phase, not just at the end.
4. Open a `git-manager` PR at the end (`MindAR-Update` → `MindAR-Update`
   self-merge is acceptable for this refactor; the user will deploy from the
   branch head).
5. Flag any of the Open Questions that block execution (Q1, Q3) before
   starting Phase A.