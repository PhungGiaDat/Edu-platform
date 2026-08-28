# Hardcoded Values Refactor — Research Report

- **Date:** 2026-08-02
- **Author:** Researcher (subagent)
- **Branch:** `MindAR-Update` (unchanged)
- **Workspace:** `e:\University\Graduted Project\Edu-platform`
- **Scope:** Read-only research. No code modified. No commits made.

---

## 0. Critical context discovered during read

The user-supplied design references a file at `backend/app/core/config.py` and a `settings.py` "currently plain os.getenv". The current repo state **does not match** that premise:

- `backend/settings.py` (root of `backend/`, not `backend/app/core/`) **already uses pydantic-settings v2** (`BaseSettings` + `SettingsConfigDict` + `model_config`). It is the full, mature settings class with ~40 fields, Redis URL composition, CORS list parsing, etc.
- The actual `config.py` is the `Settings` class instantiated as `settings = Settings()` at module bottom (`backend/settings.py:149`).
- `backend/database/seed/seed_mongo.py` independently does `os.getenv("MONGO_URL")` and reads `backend/.env` directly (does not import `settings`). This is the **only real "plain os.getenv" pattern** left in the repo.

**Implication for the planner:** items 1, 6, 7 of the design are already partly done. The refactor is really about:
- (a) Make `seed_mongo.py` use the centralized `Settings` instance (or at least a shared "load env once" helper).
- (b) Bake the JSON placeholder pattern + URL builders + CORS-DEBUG gate + VITE_PROXY_TARGET + secret hardening + conftest fixture onto the existing pydantic-settings base — not into a new file.
- (c) Address the **large number of hidden hardcoded URLs** that the design does not cover (Section 9).

Treat the user prompt as "complete the refactor" rather than "start from scratch".

---

## 1. pydantic-settings vs plain os.getenv

### Current state
`backend/settings.py` already imports `pydantic_settings` and uses the v2 idiomatic style. No migration needed.

### Why pydantic-settings is the de-facto FastAPI choice
- Official FastAPI tutorial "Settings and Environment Variables" recommends `pydantic-settings` and shows the canonical `@lru_cache`-wrapped `get_settings()` dependency pattern.
  - Source: <https://fastapi.tiangolo.com/advanced/settings/>
- `pydantic-settings` ships with FastAPI's `all` extras; it's the path the FastAPI docs follow.
- Validates types at startup (booleans, ints, paths, `SecretStr`), reads `.env` automatically, supports prefix-based env files, and integrates with `@lru_cache` for DI-friendly singleton.

### Versions (Jan 2026 cutoff)
- Pydantic v2.x line is current; `pydantic-settings` v2.x is the corresponding settings package.
- `pydantic-settings` v2.0+ requires Pydantic v2. The two must be pinned together: `pydantic>=2,<3` and `pydantic-settings>=2,<3`.
- Source: <https://docs.pydantic.dev/latest/concepts/pydantic_settings/>

### Breaking changes v1 → v2 that affect this plan
| v1 | v2 | Effect on this repo |
|---|---|---|
| `from pydantic import BaseSettings` | `from pydantic_settings import BaseSettings, SettingsConfigDict` | Already done in `backend/settings.py:6`. |
| `class Config: env_file = ".env"` | `model_config = SettingsConfigDict(env_file=".env", ...)` | Already done at `backend/settings.py:93`. |
| `Field(env="KEY")` | `Field(validation_alias=AliasChoices("A","B"))` | Not used here — field names match env vars (case_sensitive=True). |
| `parse_env_var()` classmethod | removed — use custom settings sources | Not used here. |
| `orm_mode` | `from_attributes` | Not used here. |
| `allow_population_by_field_name` | `populate_by_name` | Not used here. |
| `keep_untouched` | `ignored_types` | Not used here. |

Source: <https://docs.pydantic.dev/latest/migration/> and <https://fixdevs.com/blog/pydantic-settings-not-working/>.

### Recommendation
- **Keep the existing `model_config = SettingsConfigDict(...)` style.** Do not rewrite the working class.
- Add a `field_validator` or `model_validator` for `SECRET_KEY` that fails closed (see Section 6).
- Replace `SECRET_KEY: str = "dev-secret-key-change-in-production"` with `SECRET_KEY: SecretStr` (no default) so Pydantic raises `ValidationError` at import time when unset.
- For `seed_mongo.py`, do **not** import `from settings import settings` (it would force a Mongo-connection scene). Instead, expose a tiny `load_env()` helper or have it read `MONGO_URL` from the same `.env` file via `python-dotenv` after `pydantic-settings` has already loaded it. Workaround: `os.environ["MONGO_URL"]` is already populated by `Settings()` construction, so `seed_mongo.py` can just call `os.getenv("MONGO_URL")` *after* `from settings import settings` (settings import is harmless even without a DB).
- For test isolation, see Section 8.

---

## 2. URL builder pattern for FastAPI

### Three patterns compared

| Pattern | Pros | Cons | Verdict |
|---|---|---|---|
| **A. Module-level functions** (`def asset_url(path: str) -> str: ...`) | Trivial to test, no state, easy to mock, works in Celery/seed scripts. | Loses discoverability — devs must `grep` to find all builders. | **Recommended.** |
| **B. Singleton class** (`class UrlBuilder: ...; urls = UrlBuilder()`) | Stateful, discoverable via `urls.asset_url`. | Hidden coupling to settings; harder to test in isolation; class imported everywhere. | Reject — pure functions are better here. |
| **C. Pydantic `BaseModel` "URL container"** | Type-safe, IDE autocomplete. | Overkill for a single Supabase bucket; couples URL building to serialization. | Reject for this scope. |

### Why module-level functions win
- Official FastAPI guidance is "use `Depends(get_settings)` + helper functions" — no class needed for URL composition.
- `seed_mongo.py` runs in a standalone script (no FastAPI app) and must be able to call the same builders. Module functions are trivially importable.
- The current `settings.py` already uses `@property` for `cors_origins` and `redis_url` — that style is consistent with module-level helpers.

### Recommended signature

```python
# backend/app/core/url_builders.py
from settings import settings

def supabase_base_url() -> str:
    """Return the canonical Supabase public base URL."""
    if not settings.SUPABASE_URL:
        raise RuntimeError("SUPABASE_URL is not set; cannot build asset URLs.")
    return settings.SUPABASE_URL.rstrip("/")

def asset_url(bucket: str, *path_parts: str) -> str:
    """Compose a public Supabase Storage URL."""
    return f"{supabase_base_url()}/storage/v1/object/public/{bucket}/" + "/".join(path_parts)

def mind_file_url(ar_tag: str) -> str:
    return asset_url("AR_models", "assets", "mind-files", f"{ar_tag}.mind")

def model_3d_url(filename: str) -> str:
    return asset_url("AR_models", "models", filename)

def image_2d_url(filename: str) -> str:
    return asset_url("AR_models", "frontend", "model2D", filename)
```

The seed script can then do `from app.core.url_builders import mind_file_url; url = mind_file_url("elephant_targets")` instead of the literal `https://.../elephant_targets.mind`.

### Important reference
- The `admin_repository.py:340` literal `f"https://rofprrtoeyirssfndxag.supabase.co/...mind-files/{ar_tag}.mind"` is the **production code path** that creates placeholder URLs. This is the single most important URL to refactor — it runs on every admin flashcard creation.

---

## 3. Seed JSON placeholder resolution

### Three options compared

| Option | Performance | Security | JSON-friendliness | Readability |
|---|---|---|---|---|
| `str.replace("PLACEHOLDER", value)` | Fast (single pass). | Safe (no eval). | Poor — must escape JSON `{` if mixing with `.format`. | Mediocre — `__SUPABASE_BASE__` is loud and grep-friendly. |
| `string.Template` (`t.substitute({"SUPABASE_BASE": url})`) | Slower (regex + callback). | Safe (no eval, no attribute access). | Good — `${SUPABASE_BASE}` doesn't collide with JSON `{`/`}`. | Excellent for config files. |
| `re.sub` with custom function | Slowest. | Safe if carefully written. | Good. | Poor. |

### Performance note
`string.Template` is "5–10× slower" than other formatting methods (Python string docs), but seed JSON is loaded **once** at startup. Performance is irrelevant. Source: <https://smarttldr.com/en/topic/python-template-strings/deep-dive>.

### Recommendation: `string.Template`
- Avoids accidental collision with JSON's `{` / `}` legal characters.
- Disabled string interpolation — cannot call `.format()` and accidentally execute attribute lookups.
- Pattern `__SUPABASE_BASE__` is loud and grep-friendly.

### Recommended 5-line snippet

```python
from string import Template
import json

def _resolve_placeholders(text: str, **subs: str) -> str:
    """Replace __FOO__ placeholders in JSON text before parsing."""
    return Template(text).safe_substitute({k: v for k, v in subs.items() if v})

# usage:
raw = open(file_path, encoding="utf-8").read()
text = _resolve_placeholders(raw, SUPABASE_BASE=settings.SUPABASE_URL)
data = json.loads(text)
```

(Using `safe_substitute` so missing envs leave the placeholder visible instead of crashing — easier to diagnose in logs.)

### Apply location
`backend/database/seed/seed_mongo.py` — wrap the `json.load(f)` call inside `upsert_seed_data` and `upsert_feedback_templates`. Pass `SUPABASE_BASE` (= `settings.SUPABASE_URL`) and `API_V1_PREFIX` (for any future placeholder use).

---

## 4. CORS dev-only origins

### Current state
`backend/settings.py:114-141` `cors_origins` property already builds a list from `ALLOWED_ORIGINS` (comma-separated) and merges with always-allowed defaults (`localhost:3000`, `localhost:5173`, `https://edu-platform-dun.vercel.app`). The "always-allowed" list is a hardcoded constant baked into the Python class — this is item the design wants to fix.

### FastAPI support
`CORSMiddleware.allow_origins` accepts a **list of origins** built however you like. The Starlette middleware (which FastAPI re-exports) iterates the list per request. Source: <https://fastapi.tiangolo.com/tutorial/cors/>.

### Recommendation
- Add a `DEV_ORIGINS` list to `Settings` (comma-separated, like `ALLOWED_ORIGINS`).
- Build the final list in `cors_origins` (or rename to `effective_cors_origins`) with the rule:
  - If `DEBUG=true` → include `DEV_ORIGINS` parsed values.
  - Always include the prod `ALLOWED_ORIGINS` list.
  - Wildcard `"*"` still honored if explicitly set.
- Wire it into `main.py:130-136` — no changes needed there since it already reads `settings.cors_origins`.

### Recommended snippet

```python
# In Settings:
DEV_ORIGINS: str = "http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173"

@property
def effective_cors_origins(self) -> list[str]:
    if self.ALLOWED_ORIGINS == "*":
        return ["*"]
    prod = [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]
    if self.DEBUG:
        dev = [o.strip() for o in self.DEV_ORIGINS.split(",") if o.strip()]
        return list(dict.fromkeys(prod + dev))  # preserve order, dedupe
    return prod
```

### Note on `allow_credentials=True` + `"*"`
If `ALLOWED_ORIGINS="*"`, the Uvicorn/Starlette stack will reject the combination with `allow_credentials=True`. The current code already has this latent bug. The refactor should NOT introduce `"*"` back into `effective_cors_origins` when `allow_credentials=True`. Either:
- explicitly enumerate origins when credentials are required, or
- set `allow_credentials=False` if `"*"` is ever used.

This is not strictly part of the design but is the kind of bug the refactor should not ignore.

---

## 5. VITE_PROXY_TARGET

### Vite convention confirmed
- Vite exposes env variables to client code **only if prefixed with `VITE_`**. Source: <https://vite.dev/guide/env-and-mode.html>.
- `server.proxy` is configured in `vite.config.ts` and accepts string shorthand or `ProxyOptions`. Source: <https://vite.dev/config/server-options.html#server-proxy>.

### Current state
`frontend-web/vite.config.ts:78-100` has hardcoded `target: 'http://localhost:8000'` in three proxy entries (`/api`, `/assets/model2D`, `/ws`). These are dev-server-only redirects.

### Recommended `vite.config.ts` snippet

```typescript
import { defineConfig, loadEnv } from 'vite'
// ...
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())
  const proxyTarget = env.VITE_PROXY_TARGET || 'http://localhost:8000'
  const wsProxyTarget = env.VITE_WS_PROXY_TARGET || proxyTarget.replace(/^http/, 'ws')

  return {
    // ...
    server: {
      proxy: {
        '/api': { target: proxyTarget, changeOrigin: true, secure: false, rewrite: (p) => p.replace(/^\/api/, '') },
        '/assets/model2D': { target: proxyTarget, changeOrigin: true, secure: false },
        '/ws': { target: wsProxyTarget, changeOrigin: true, ws: true, secure: false },
      },
    },
  }
})
```

Add to `frontend-web/.env.example`:
```
VITE_PROXY_TARGET=http://localhost:8000
VITE_WS_PROXY_TARGET=ws://localhost:8000
```

### Why two env vars
`loadEnv` already passes the env to the config object before evaluation. Vite's `proxy` target accepts any string. The existing `loadEnv` call on line 7 already gives us `env.VITE_PROXY_TARGET` — no extra wiring needed.

---

## 6. SECRET_KEY hardening

### Current state
`backend/settings.py:26` `SECRET_KEY: str = "dev-secret-key-change-in-production"` — has a default. `backend/.env.example:22` ships a placeholder. `backend/render.yaml:35` uses `generateValue: true` (Render auto-generates). The Docker compose file uses `${SECRET_KEY:-dev-secret-key-change-in-production}` — fallthrough to a dev string.

This is a **security gap**. The current default is well-known to anyone who has read the public GitHub repo and equals what's in `.env.example`.

### Industry consensus (as of CVE-2026-47410 et al.)
- **Fail-closed at import time** when the secret is the default placeholder, regardless of any environment variable.
- Use `SecretStr` so the value never accidentally logs.
- Document the remediation in the error message.

Source: <https://github.com/advisories/ghsa-3qg8-5g3r-79v5> (CVE-2026-47410) — same pattern, same risk class.

### Recommended implementation

```python
from pydantic import SecretStr, field_validator

class Settings(BaseSettings):
    SECRET_KEY: SecretStr  # required, no default

    @field_validator("SECRET_KEY", mode="before")
    @classmethod
    def _block_known_defaults(cls, v):
        s = v.get_secret_value() if isinstance(v, SecretStr) else str(v)
        FORBIDDEN = {
            "dev-secret-key-change-in-production",
            "your-super-secret-key-change-this-in-production",
            "change-me-in-production",
            "",
        }
        if s in FORBIDDEN:
            raise ValueError(
                "SECRET_KEY is set to a known default placeholder. "
                "Generate a fresh value with: python -c 'import secrets; print(secrets.token_urlsafe(32))' "
                "and set it in your .env / Render dashboard / Docker compose."
            )
        if len(s) < 32:
            raise ValueError(
                f"SECRET_KEY must be at least 32 characters (got {len(s)}). "
                "Generate a new one with secrets.token_urlsafe(32)."
            )
        return v
```

For dev convenience, allow `DEBUG=true` to short-circuit the length check (NOT the placeholder check). Render's `generateValue: true` will produce a 64-char hex string automatically.

### Error message to ship
```
RuntimeError: SECRET_KEY is set to a known default placeholder.
Generate a fresh value with:
    python -c "import secrets; print(secrets.token_urlsafe(32))"
and set it in your .env / Render dashboard / Docker compose.
Refusing to start in production with a leaked secret.
```

### Migration impact
- The `docker-compose.yml` line `SECRET_KEY=${SECRET_KEY:-dev-secret-key-change-in-production}` MUST be changed to `SECRET_KEY=${SECRET_KEY:?SECRET_KEY must be set}` (fail-fast in Docker).
- `backend/.env.example` must remove the existing `SECRET_KEY=...` line OR change it to a comment pointing at the generate command.
- All tests that currently rely on the default must set `SECRET_KEY` via `conftest.py` (see Section 8).

### Consumers
Search for `settings.SECRET_KEY` and `os.getenv("SECRET_KEY")` — both forms exist. The validator must trigger before any `from settings import settings` consumer uses the value.

---

## 7. Production deploy risk — env vars Render must have

### Render dashboard env vars that must be set BEFORE first deploy

Cross-referenced from `backend/render.yaml`, `backend/settings.py`, `backend/.env.example`, and `docker-compose.yml`.

| Render key | Source | Type | Render config today | Required by pydantic-settings? | Notes |
|---|---|---|---|---|---|
| `PYTHON_VERSION` | `render.yaml:26` | Literal | `3.12.0` | n/a | OK. |
| `MONGO_URL` | `render.yaml:28` | `sync: false` | empty | **Required** (no default) | User must set manually in Render dashboard. |
| `MONGO_DB` | `render.yaml:31` | Literal | `eduplatform` | Optional (default `eduplatform`) | OK. |
| `SECRET_KEY` | `render.yaml:34` | `generateValue: true` | auto-generated | **Required** (after refactor) | OK after refactor. |
| `DEBUG` | `render.yaml:37` | Literal | `false` | Optional | OK. |
| `ALLOWED_ORIGINS` | `render.yaml:40` | Literal | `"*"` | Optional | **Should be** the actual Vercel URL in production. |
| `WORKERS` | `render.yaml:43` | Literal | `1` | Optional | OK. |
| `HOST`, `PORT` | not in `render.yaml` | optional | n/a | Render sets `PORT` automatically. | OK. |
| `REDIS_URL` or `REDIS_HOST`+`REDIS_PORT` | `.env.example:70-77` | optional | not set in render.yaml | Optional | App has fallback to in-memory cache. |
| `SUPABASE_URL` | `.env.example:63` | optional | not set | Optional | Used only by `url_builders.py` after refactor. |
| `SUPABASE_SERVICE_ROLE_KEY` | `.env.example:64` | optional | not set | Optional | Only needed for upload scripts. |
| `GOOGLE_API_KEY` | `.env.example:55` | optional | not set | Optional | AI features gate. |
| `OPENAI_API_KEY` | `.env.example:58` | optional | not set | Optional | Not currently used. |
| `SUPABASE_REDIS_BACKUP_ENABLED` | settings.py:90 | optional | not set | Optional | Toggle. |

### Required (must be set in Render dashboard before deploy)
1. `MONGO_URL` — currently `sync: false` (correct). User must paste their Atlas connection string.
2. `SECRET_KEY` — Render auto-generates via `generateValue: true`. After the refactor, the validator will reject any other source that supplies a default.

### Recommended (should be set in Render dashboard)
3. `ALLOWED_ORIGINS` — currently `"*"` literal. Should be set to the actual Vercel URL: `https://edu-platform-dun.vercel.app` (and any additional frontends). The hardcoded fallback in `settings.py:123-128` covers this if the user forgets, but the literal `"*"` collides with `allow_credentials=True` per Starlette docs.

### Risk after refactor
- If the user copies `backend/.env.example` to Render settings, the `SECRET_KEY=your-super-secret-key-change-this-in-production` placeholder will be rejected at startup. **This is intended**, but Render's `generateValue: true` already overrides it.
- If `MONGO_URL` is empty, the existing app crashes at `Settings()` construction (Pydantic ValidationError). The error message is technical. The refactor should add a `model_validator` that gives a clearer "Set MONGO_URL in your Render dashboard before deploying" message.

### Frontend (Vercel) env vars to set
The frontend's `vercel.json` rewrite rules (line 12, 16) reference `https://api.eduplatform.example.com/api/$1` — this is a **placeholder** that was never updated to the real Render URL. The actual runtime config is `edu-platform-api-do20.onrender.com` (per `frontend-web/index.html:22` and `frontend-web/vercel.json:54`).

**This is a hidden bug** the design did not address. The frontend actually bypasses the Vercel rewrite in practice because `getApiBase()` reads `VITE_API_BASE` directly (a full URL), not a relative path. The `vercel.json` rewrites are dead code unless a user explicitly sets `VITE_API_BASE=/`.

### Recommended action
- Either delete the dead `vercel.json` rewrites, or change them to point to the real Render URL: `https://edu-platform-api-do20.onrender.com/api/$1`.
- Document the choice in `docs/deployment.md`.

---

## 8. Test fixture pattern for shared env

### Current state
`backend/tests/conftest.py` (138 lines) has no `MONGO_URL` setup. Each test file does its own `os.environ["MONGO_URL"] = "mongodb://localhost:27017"` at module top:
- `backend/tests/test_beanie_odm.py:37`
- `backend/tests/test_ar_service.py:17`

These top-level `os.environ` assignments are **module-level side effects** — they run at import time, not at test time, and are not undone. This works because `pytest` collects modules top-to-bottom, but it's fragile.

### Options compared

| Pattern | Pros | Cons | Verdict |
|---|---|---|---|
| **A. `monkeypatch` fixture (autouse)** in `conftest.py` | Auto-applies to every test, auto-undone, isolated. | Must be `autouse=True` or imported. | **Recommended.** |
| **B. `os.environ` at module top of each test file** | Simple, no setup needed. | Hard to debug, not undone, leaks across tests. | Reject. |
| **C. `pytest-env` plugin reading `pyproject.toml`** | Declarative, version-controlled. | Adds a new dependency. | Acceptable alternative but monkeypatch is sufficient. |

### Recommendation
Use `monkeypatch` autouse fixture in `backend/tests/conftest.py`:

```python
# backend/tests/conftest.py — add at top
import pytest

@pytest.fixture(autouse=True)
def _dummy_env(monkeypatch):
    """Set dummy env vars for every test so Settings() can construct."""
    monkeypatch.setenv("MONGO_URL", "mongodb://localhost:27017")
    monkeypatch.setenv("MONGO_DB", "test_eduplatform")
    # 32+ char dummy secret (validator requires this after refactor)
    monkeypatch.setenv("SECRET_KEY", "x" * 64)
    # Optional services disabled by default
    monkeypatch.delenv("GOOGLE_API_KEY", raising=False)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.delenv("SUPABASE_URL", raising=False)
    monkeypatch.delenv("SUPABASE_SERVICE_ROLE_KEY", raising=False)
```

After this lands, **remove** the `os.environ["MONGO_URL"] = ...` lines from `test_beanie_odm.py` and `test_ar_service.py`.

### Source
- Monkeypatch docs: <https://docs.pytest.org/en/latest/how-to/monkeypatch.html> (conftest autouse pattern is officially documented).
- pytest-env alternative: <https://github.com/pytest-dev/pytest-env>.

---

## 9. Hidden hardcoded URLs the design did NOT cover

This is the most important section. The design's `url_builders.py` covers only the seed JSON files. The repo has hardcoded URLs in **at least 10 other locations**. The planner MUST add these to the refactor scope.

### A. Seed JSON files (in scope of design but not exhaustive)

| File | What | Lines |
|---|---|---|
| `backend/database/seed/flashcards.json` | 8 hardcoded `https://rofprrtoeyirssfndxag.supabase.co/...` image URLs | 283, 300, 317, 334, 351, 368, 385, 402 |
| `backend/database/seed/ar_objects.json` | 50+ hardcoded Supabase URLs (mind files, glb models, model2D images) | entire file |
| `backend/database/seed/lessons.json` | 4 hardcoded `mind_file_url` values | 7, 19, 31, 44 |

### B. Production code paths (NOT in design scope — must be added)

| File | What | Lines | Risk |
|---|---|---|---|
| `backend/repositories/admin_repository.py` | `f"https://rofprrtoeyirssfndxag.supabase.co/.../mind-files/{ar_tag}.mind"` | 340 | **High** — runs every time an admin creates a flashcard. Will silently break if Supabase project URL changes. |
| `backend/services/profile_service.py` | `https://api.dicebear.com/7.x/avataaars/svg?seed=...` | 58 | Should be config: `DEFAULT_AVATAR_BASE_URL`. |
| `backend/models/profile.py` | Same dicebear URL in 3 example/default avatars | 139, 148, 157 | Default placeholder — not user-facing, but pollutes grep results. |
| `backend/detailed_ar_verification.py` | Hardcoded `EXPECTED_PREFIX = "https://rofprrtoeyirssfndxag.supabase.co/..."` | 21 | One-off verification script; tolerable. |
| `backend/verify_ar_urls.py` | Same as above | 26 | One-off verification script; tolerable. |
| `backend/generate_course_media.py` | Already uses `SUPABASE_URL` env var correctly | 105, 129, 131 | **Reference pattern** — already correct. |
| `backend/models/flashcard.py` | Docstring example `https://<project>.supabase.co/...` | 33, 78, 79 | Docstring only — not user-facing. |

### C. Frontend hardcoded URLs (NOT in design scope — must be added)

| File | What | Lines | Risk |
|---|---|---|---|
| `frontend-web/src/components/ar/ARContainerV2.tsx` | 5 hardcoded Supabase URLs (palm/elephant/combo) | 69-73 | **High** — runs in prod. If bucket URL changes, jungle combo breaks. |
| `frontend-web/src/hooks/useArData.ts` | 2 hardcoded Supabase URLs (palm fallback) | 9-10 | **Medium** — fallback path. |
| `frontend-web/src/hooks/useMultiFlashcard.ts` | 6 hardcoded Supabase URLs | 17-22 | **High** — runs in prod. |
| `frontend-web/src/hooks/useSafeGLTF.ts` | `https://www.gstatic.com/draco/versioned/decoders/1.5.6/` | 64 | External CDN — should be env var. |
| `frontend-web/src/hooks/useProfileData.ts` | `https://api.dicebear.com/7.x/avataaars/svg` | 109 | Profile avatars. |
| `frontend-web/src/services/GamificationService.ts` | `http://localhost:8000/api` fallback | 3 | **Wrong env var name** — uses `VITE_API_URL` but frontend convention is `VITE_API_BASE`. |
| `frontend-web/src/config.ts` | `localhost:8000`, `localhost:8000` (ws) fallbacks | 22, 50 | Acceptable as dev fallback but should warn loudly. |
| `frontend-web/src/pages/Profile.tsx` | `https://api.dicebear.com/7.x/avataaars/svg?seed=...` | 41 | Profile default. |
| `frontend-web/src/pages/FlashcardPage.tsx` | `https://cdn.pixabay.com/photo/2016/11/14/...` | 49 | Test/dev placeholder image. |
| `frontend-web/index.html` | `<link rel="preconnect" href="https://edu-platform-api-do20.onrender.com">` | 22, 23 | **Hardcoded prod URL** in HTML. |
| `frontend-web/vercel.json` | `https://api.eduplatform.example.com` (placeholder), `https://edu-platform-api-do20.onrender.com` (real) | 12, 16, 54 | `vercel.json` placeholder never updated. |
| `frontend-web/src/lib/combo/combo-db.json` | 10 hardcoded `https://example.com/...` | 7-48 | Sample/dev data — acceptable. |
| `frontend-web/src/index.css` | `https://fonts.googleapis.com/css2?...` | 2 | External CDN — acceptable. |
| `frontend-web/src/pages/LandingPage.tsx` | `https://fonts.googleapis.com/css2?...` | 195 | External CDN — acceptable. |

### D. Test stubs (low priority, mention only)

| File | What | Notes |
|---|---|---|
| `backend/tests/test_ar_service.py` | `https://x.com/m.glb` etc. | Test fixtures — leave as-is. |
| `backend/tests/test_semantic_migration.py` | `https://example.com/...` | Same. |
| `backend/tests/test_profile_service.py` | `https://example.com/avatar.png` | Same. |
| `frontend-web/src/__tests__/pages/FlashcardEditor.test.tsx` | `https://example.com/image.png` | Same. |
| `frontend-web/src/pages/admin/CourseEditor.tsx` | `placeholder="https://example.com/..."` in form fields | UI placeholder only. |

### E. Mobile app (out of scope — flag for future task)

| File | What | Notes |
|---|---|---|
| `mobile/rn/src/services/api.ts` | `http://localhost:8000` fallback | Mobile uses `EXPO_PUBLIC_API_URL`, not in design scope. |
| `mobile/rn/scripts/phase0-smoke.ts` | `http://localhost:8000` fallback | Same. |

### F. Docker compose — change required

`docker-compose.yml:63`:
```yaml
- SECRET_KEY=${SECRET_KEY:-dev-secret-key-change-in-production}
```
Must become:
```yaml
- SECRET_KEY=${SECRET_KEY:?SECRET_KEY must be set in .env or shell environment}
```
Same fallthrough pattern at line 65 (`ALLOWED_ORIGINS`) and 66 (`GOOGLE_API_KEY`) can also be tightened, but those are optional vars.

### G. Suggested env vars to ADD to `settings.py` to cover all the above

| New Settings field | Where it's used | Replace literal |
|---|---|---|
| `SUPABASE_BASE_URL` | All `url_builders.py` callers | `https://rofprrtoeyirssfndxag.supabase.co` |
| `SUPABASE_STORAGE_BUCKET` (default `"AR_models"`) | URL builders | `AR_models` |
| `DICEBEAR_BASE_URL` (default `"https://api.dicebear.com/7.x/avataaars/svg"`) | Profile service + frontend | Dicebear URL |
| `DRACO_DECODER_URL` (default `"https://www.gstatic.com/draco/versioned/decoders/1.5.6/"`) | `useSafeGLTF.ts` | Google Draco CDN |
| `BACKEND_PUBLIC_URL` (default from Render env) | `index.html` preconnect link | `edu-platform-api-do20.onrender.com` |
| `VITE_PROXY_TARGET` (no default) | `vite.config.ts` | `localhost:8000` |
| `VITE_WS_PROXY_TARGET` (no default) | `vite.config.ts` | `ws://localhost:8000` |

### Summary count of action items beyond the design
- **5 backend Python files** with hardcoded Supabase/dicebear URLs (`admin_repository.py`, `profile_service.py`, `models/profile.py`, `detailed_ar_verification.py`, `verify_ar_urls.py`) — at least 4 of these are production code paths.
- **7 frontend files** with hardcoded URLs (`ARContainerV2.tsx`, `useArData.ts`, `useMultiFlashcard.ts`, `useSafeGLTF.ts`, `useProfileData.ts`, `GamificationService.ts`, `Profile.tsx`, `FlashcardPage.tsx`).
- **2 frontend config files** with hardcoded prod URLs (`index.html`, `vercel.json`).
- **1 docker-compose.yml** with dev-secret fallthrough.
- **2 test files** with module-level `os.environ` stubs that should be moved to conftest.

The design's `url_builders.py` only addresses the seed JSON. The refactor will be incomplete without Section 9 additions.

---

## 10. Documentation URLs the implementation team will need

- pydantic-settings v2 docs: <https://docs.pydantic.dev/latest/concepts/pydantic_settings/>
- pydantic v1→v2 migration (BaseSettings moved): <https://docs.pydantic.dev/latest/migration/>
- FastAPI Settings: <https://fastapi.tiangolo.com/advanced/settings/>
- FastAPI CORS: <https://fastapi.tiangolo.com/tutorial/cors/>
- Vite env vars: <https://vite.dev/guide/env-and-mode.html>
- Vite server.proxy: <https://vite.dev/config/server-options.html#server-proxy>
- pytest monkeypatch: <https://docs.pytest.org/en/latest/how-to/monkeypatch.html>
- pytest-env (alternative): <https://github.com/pytest-dev/pytest-env>
- Python `string.Template`: <https://docs.python.org/3/library/string.html>
- CVE-2026-47410 (JWT fails-closed at import): <https://github.com/advisories/ghsa-3qg8-5g3r-79v5>
- Pydantic `SecretStr` block: <https://docs.pydantic.dev/latest/api/types/#secretstr>

---

## 11. Summary of recommendations (one per section)

1. **pydantic-settings:** Already in use. Keep `model_config` style. Add `field_validator` for `SECRET_KEY`.
2. **URL builder:** Module-level functions in `backend/app/core/url_builders.py`, not a class. Add `supabase_base_url()`, `asset_url()`, `mind_file_url()`, `model_3d_url()`, `image_2d_url()`.
3. **JSON placeholder:** `string.Template` with `safe_substitute`. Pattern `__SUPABASE_BASE__`. 5-line snippet in `seed_mongo.py`.
4. **CORS dev origins:** Add `DEV_ORIGINS` to `Settings`, build `effective_cors_origins` property that conditionally merges when `DEBUG=true`. Watch the `allow_credentials=True + "*"` constraint.
5. **VITE_PROXY_TARGET:** Use `loadEnv` in `vite.config.ts` to read `VITE_PROXY_TARGET` (default `http://localhost:8000`). Add `VITE_WS_PROXY_TARGET` separately for the `/ws` proxy.
6. **SECRET_KEY hardening:** `SecretStr`, no default, validator rejects known defaults + lengths < 32, fail-closed at import. Update `docker-compose.yml` to use `${SECRET_KEY:?}`.
7. **Render env vars:** `MONGO_URL` (manual), `SECRET_KEY` (auto-generated — OK), `ALLOWED_ORIGINS` (must be set to real Vercel URL — currently `*` is unsafe with `allow_credentials=True`).
8. **Test env:** Move `MONGO_URL` setup from module-level `os.environ` lines into `conftest.py` autouse `monkeypatch` fixture. Add 64-char dummy `SECRET_KEY`.
9. **Hidden hardcoded URLs:** See Section 9. The design does NOT cover 5 backend Python files, 7 frontend files, 2 frontend config files, and 1 docker-compose line. Recommend adding `SUPABASE_BASE_URL`, `DICEBEAR_BASE_URL`, `DRACO_DECODER_URL`, `BACKEND_PUBLIC_URL`, `VITE_PROXY_TARGET` to `Settings` and refactoring all the call sites.
10. **Breaking changes v1→v2:** Already applied to this repo. No code migration needed. `pydantic-settings` v2 + Pydantic v2 must be pinned together: `pydantic>=2,<3` and `pydantic-settings>=2,<3`.
