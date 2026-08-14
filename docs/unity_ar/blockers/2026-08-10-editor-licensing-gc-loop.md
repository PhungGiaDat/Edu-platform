## Status
investigating

## Blocks
- Live Unity Editor verification after P0 (P1-T001 runtime image library, P1-T002 combo playtest)

## Symptom
After a completed 6-second PlayMode capture and a redundant filtered EditMode test request, Besty UnitySkills REST ports 8090/8091 remained listening but stopped returning `/health` or job results for more than five minutes.

Unity Editor log evidence at the same time:
- repeated `Curl error 35: Cert verify failed` (UnityTls error code 7)
- repeated `Licensing::Client` 404 entitlement errors
- `Account API did not become accessible within 30 seconds`
- repeated asset-GC cycles with reported heap growth from ~0.4 GB through >7 GB

The Unity process is alive; the port listener is alive. This is not a missing-server/cold-start condition.

## Hypotheses (ranked)
1. Unity AI Assistant / account licensing retry loop is saturating the Editor main thread and allocating aggressively — directly evidenced by Editor.log.
2. A redundant filtered test request was accepted while the server was busy and added work behind the licensing loop.

## Tried
- Backed off for 15s, 90s, then 120s; `/health` still timed out.
- Confirmed PID 10112 and ports 8090/8091 remain alive/listening.
- Unity MCP registry briefly showed the project instance, but live MCP calls returned `No Unity Editor instances`, so it was not a viable fallback.
- Did not cold-start a second instance because the project editor PID is live (per Unity CLI routing rules).

## Resolution
Still active after Editor restart (verified 2026-08-10 23:xx UTC+7).

Fresh evidence:
- `GET /health?live=1`: responsive (`status: ok`, mode `bypass`, main-thread idle 26 ms, no compilation/reload pending).
- Unity Console: 17 entries, 0 errors (`console_get_stats`); `debug_get_errors`: 0.
- Current `Editor.log`: repeated `Licensing::Client` entitlement 404s, UnityTls certificate verification failures, and `Account API did not become accessible within 30 seconds`.
- Unity main process: approximately 10.3 GB private memory / 5.4 GB working set.
- Unity managed memory: 2130.8 MB allocated, 2622.4 MB reserved, Mono heap 1180.3 MB.

The REST listener recovered, but the underlying licensing/certificate + memory-growth condition did not. Per P1 stop criteria, live-Editor-dependent P1 verification remains blocked until the environment/license loop is remediated. Do not repeatedly retry Play Mode/XR Simulation while this evidence persists.
