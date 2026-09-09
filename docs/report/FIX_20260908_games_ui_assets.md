# FIX — Games pages UI + assets — 2026-09-08

**Scope:** mobile-web games (Khu chơi) — GamesPage hub + DragMatch + MemoryPairs + ColorAnimal
**Verification level:** RUNTIME_VERIFIED (local dev servers + Playwright, 375×812)

## Issues found (Phase 1 investigation)

| ID | Issue | Root cause |
|----|-------|-----------|
| A-1 | Broken-image icons in DragMatch tiles (bird, rabbit in `drag-match-375.png` capture 02:52) | Manifest paths point at Supabase `learnar-assets` bucket that was **never populated** (50 paths probed: 0 sign successfully; 47/50 also missing locally). Screenshot predated the 56/56 chibi-PNG fetch (commit 47a13b5, 01:22). Notebook words outside the 56 seed words still 404 today. |
| A-2 | Supabase sign API returns in-band errors (`signedURL: null`) — old code already skipped these, but no defense existed for "signs OK but object 404s" | Sign API does not guarantee object existence across project versions |
| U-1 | DragMatch: image column (~140px/card) vs word column (~76px/card) drift → rows misaligned, last row clipped | Two independent flex columns with different card heights |
| U-2 | Theme header 118px rendered near-white on all 3 games (gradient overlay .45→1 buried the background art) | Overlay opacity too high |
| U-3 | ColorAnimal Vietnamese names nearly unreadable ("sư tử", "con voi") | `grayLight` #CBD5E1 on white, ~1.6:1 contrast |

## Fixes

| ID | File | Change |
|----|------|--------|
| F1 | `backend/services/games_vocab_service.py` | New `_filter_broken_images()`: concurrent `asyncio.gather` HEAD-check of every signed URL (8s timeout), broken URLs dropped → caller falls back to local. Plus local `learnar-assets` fallback in `get_game_vocab` when the file ships in `frontend/public/learnar-assets/` (mom/dad/baby real course art). |
| F2 | `DragMatchGame.tsx`, `MemoryPairsGame.tsx` | `<img>` onError chain: storage URL → local chibi PNG (`localGameCardUrl()`) → **topic emoji placeholder** (`🐾🏠🌿🍎`) — never a broken-image icon. Applied to board tiles + drag ghost. |
| F3 | `DragMatchGame.tsx` | Two flex columns → CSS grid `grid-template-columns: auto 1fr` with interleaved `Fragment` rows: image row ↔ word row locked together. Word cards min-height 64px, images fixed 96px. |
| F4 | All 3 games | Header gradient `rgba(255,248,238,.45)/1` → `.12`/`.55 @55%`/`backgroundBase` — theme art now visible, bottom blends into page. |
| F5 | `ColorAnimalGame.tsx` | Translation text `mediumGray` + weight 700; chip icon `coralLight` → `coralDark`. |

## Verification

- `tsc --noEmit` clean; backend import + syntax clean
- `pytest tests/test_games_vocab_service.py` → **7/7 pass**
- Full backend suite: 759 pass / 11 fail — all 11 pre-existing (momo/beanie/seed/profile, from prior uncommitted work; 0 games-related)
- Frontend suite: 391 pass / 9 fail — all 9 pre-existing (ARContainerV2, debugOverlay, assetRecovery, Sentry, MindAR viewer; 0 games-related)
- Live API check (local backend :8002): `/api/v1/games/vocab?topic=animals` returns all-local PNG URLs; static 200 for bird/rabbit PNG + mom.png learnar-asset
- Playwright screenshots (375×812, admin session): `docs/report/ui-audit/{games-hub,games-topic,drag-match,memory-pairs,color-animal}-after.png` — images render, rows aligned, theme headers visible, translations readable

## Known leftovers (not in scope)

1. ~~Supabase `learnar-assets` bucket is empty~~ → **RESOLVED (2026-09-08, user-approved scope B → upgraded to Storage-first)**: bucket `learnar-assets` created public-read; `scripts/upload_game_media_to_storage.py` uploaded all 63 media files (56 chibi cards + 4 theme bgs + 3 course files); manifest regenerated with `storage_path` schema (`scripts/rebuild_game_vocab_manifest.py`); service returns plain CDN URLs (no signing). **Verified live**: browser loads all game images from `supabase.co/storage/...` CDN (Playwright network log: 8/8 requests); frontend local files remain as offline fallback via the onError chain.
2. Notebook words with no art show topic emoji (graceful; custom art = future admin-CRUD scope)
3. `vite.config.ts` hmr clientPort 443 assumes tunnel deployment — causes local HMR ws noise (cosmetic)
4. Roadmap (Bước 2, post-release): admin CRUD for vocab media — upload via admin UI straight to Storage, vocab read from Postgres → fully dynamic content, no repo/deploy needed to add words
