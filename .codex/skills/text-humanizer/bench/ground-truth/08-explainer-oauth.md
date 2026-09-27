# Ground truth — 08-explainer-oauth.md

Pre-registered 2026-07-10, before any benchmark arm ran.

| ID | Type | Claim (must survive) |
|----|------|----------------------|
| C1 | fact | OAuth 2.0 is the industry-standard protocol for delegated authorization |
| C2 | example | "Sign in with Google" is an example of OAuth in action |
| C3 | distinction | OAuth is about authorization (what you can access), not authentication (who you are) — the distinction and its direction must survive |
| C4 | claim | OAuth lets a third-party app access user resources without seeing the user's password |
| C5 | list | Four roles: resource owner (user), client (app), authorization server (issues tokens), resource server (hosts protected data) — all four with correct mappings |
| C6 | fact | Most common flow: Authorization Code flow |
| C7 | sequence | Flow order: redirect to authorization server → user consents → authorization code returned to client's redirect URI → client exchanges code + client secret for access token → client uses access token against resource server (order is a claim) |
| C8 | number+qualifier | Access tokens are typically short-lived, often expiring after one hour ("typically"/"often" qualifiers must survive) |
| C9 | fact | Refresh tokens let clients get new access tokens without re-prompting the user |
| C10 | fact | PKCE (Proof Key for Code Exchange) is for single-page applications; removes the need to store a client secret in the browser |

## Hard-failure triggers
- Authorization/authentication distinction swapped
- Any of the four roles dropped, renamed, or re-mapped
- Flow steps reordered or a step dropped
- "One hour" changed, or "often" hardened to "always" (strength change)
- PKCE expansion misspelled or its purpose changed
- New security advice added (e.g., "always use JWTs") that the source doesn't state
