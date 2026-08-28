# Rebase Plan — `MindAR-Update` branch cleanup

**Date:** 2026-08-08 (revised after pre-flight)
**Status:** PLAN ONLY — do not execute in this session.
**Goal:** Drop the two debug-artifact commits (`3beccc1`, `dc6ca05`) and reword `88660aa` to incorporate the dirty-worktree safety fixes. Leave all other commits untouched. Recovery scenes + `UserSettings/` cleanup happen in **follow-up commits**, not via history rewrite.

**Branch:** `MindAR-Update` (verified `git rev-parse --abbrev-ref HEAD`)
**Remote:** `origin = github.com/PhungGata/Edu-platform` (personal repo — treat push authority accordingly)

---

## Revision History

| Version | Date | Change |
|---|---|---|
| v1 | 2026-08-08 | Initial plan — assumed `main` branch, unknown commit contents, broad drop list |
| **v2 (this file)** | 2026-08-08 | Pre-flight complete: branch is `MindAR-Update`, `0753235` is innocuous, recovery scenes and UserSettings cannot be drop-history-fixed because they are intermixed with legitimate work. Scope narrowed to only the two debug commits. |

---

## Pre-Flight Findings (Read-Only — Verified 2026-08-08)

### Branch state

- Current branch: `MindAR-Update` (not `main`)
- `origin` is a personal fork (`github.com/PhungGata/Edu-platform`) — force-push to `main` may be acceptable, but a PR is safer
- 15 commits between `88660aa~1` and HEAD

### Per-commit disposition

| Commit | Subject | Disposition | Reason |
|---|---|---|---|
| `88660aa` | `chore(db): enforce ar_objects validator with verified apply path` | **Reword** + fold in dirty-worktree safety fixes | Validator feature is legitimate; safety fixes (collMod single-call, no-destroy readback, error propagation, credential redaction) must ship atomically with it |
| `dc6ca05` | `chore(workspace): commit debug artifacts and test reports` | **Drop** | Pure debug artifacts, zero functional content |
| `3beccc1` | `chore(frontend): add debug assets and playwright test data` | **Drop** | Pure debug artifacts (`test-results/`, `playwright-report/`, debug screenshots) |
| `0753235` | `chore: add task commit message templates` | **Keep** (pick) | Innocuous — adds 2 txt files (`task-6-commit-msg.txt`, `task-7-commit-msg.txt`). No reason to drop |
| `e733c9e` | `feat(unity): add test scenes and recovery files` | **Keep** | Mixed: adds `ARTestScene.unity` + legitimate EditMode tests + `_Recovery/` scenes. **Cannot drop** without losing tests |
| `07b2dcf` | `chore(unity): add project settings and user preferences` | **Keep** | Mixed: adds Unity package docs + `com.unity.cloud.gltfast` scaffolding + `UserSettings/`. **Cannot drop** without losing legitimate Unity package setup |
| `c2129ae` | `feat: update AR models, flashcards and mobile Unity AR integration` | **Keep** | 153-file, 20,107-line legitimate feature commit (touches some UserSettings files but core is AR feature) |
| `cb745a8` | `feat: add Unity MCP tools integration` | **Keep** (Unity scope deferred — out of this rebase) | |
| `1e5b58f` | `chore(unity): add assembly definition meta files` | **Keep** (Unity scope deferred) | |
| `8c2736d`, `995bacd`, `aaa6b30`, `101ffe6`, `e69eb87`, `8e463fa` | Various docs/configs | **Keep** (no reason to drop) | |
| `83c68f0`, `bab9c60` | Unity AR components + assembly definitions | **Keep** (Unity scope deferred) | |

### Two cleanup targets that are NOT history-rewrite candidates

These two issues cannot be fixed by dropping commits because the offending files are mixed with legitimate work in those commits. They require **separate, follow-up commits** added at the tip of the rebased history:

1. **Recovery scenes** — `mobile/unity/Assets/_Recovery/{0.unity, 0 (1).unity, 0 (2).unity}` and their `.meta` files
   - **Location in history:** introduced in `e733c9e` (cannot drop that commit — see above)
   - **Fix:** separate commit that runs `git rm -r mobile/unity/Assets/_Recovery` and documents why
   - **Risk:** any code or asset reference that points to these scenes will break

2. **UserSettings/** — 6 tracked files (`EditorUserSettings.asset`, layouts, search indices)
   - **Location in history:** introduced in `07b2dcf` and modified in `c2129ae` (cannot drop either)
   - **Fix:** separate commit that runs `git rm -r --cached mobile/unity/UserSettings/` and adds the path to `.gitignore`
   - **Risk:** any developer who relied on a tracked `EditorUserSettings.asset` to share editor preferences will lose that

---

## Updated Execution Plan

### Phase 1: Pre-rebase safety (must complete before any rebase)

```bash
cd "e:\University\Graduted Project\Edu-platform"

# 1. Backup branch capturing current dirty state
git checkout -b emergency-backup-2026-08-08

# 2. Confirm we're still on the backup branch's source
git log --oneline -1   # should show HEAD on MindAR-Update

# 3. Stash ONLY tracked-file modifications (NOT the untracked test files
#    we just staged — see note below)
git stash push -m "pre-rebase-dirty-worktree-2026-08-08" -- \
    .gitignore \
    backend/database/migrations/apply_ar_objects_validator.py \
    backend/database/migrations/repair_ar_objects_consistency.py \
    frontend-web/public/ar-viewer.html \
    frontend-web/src/components/ar/ARContainerV2.tsx \
    frontend-web/src/core/types/ARMessages.ts \
    frontend-web/src/pages/LearnARV2.tsx \
    mobile/unity/Assets/Scripts/Interactions/ComboManager.cs \
    mobile/unity/Packages/manifest.json \
    mobile/unity/Packages/packages-lock.json

# 4. Snapshot the staged test files (they are already in the index but
#    we'll re-stage them after the rebase to be safe)
mkdir -p /tmp/rebase-safety
cp backend/tests/test_validator_apply_safety.py /tmp/rebase-safety/
cp backend/tests/test_repair_cas_safety.py /tmp/rebase-safety/

# 5. Return to MindAR-Update
git checkout MindAR-Update
```

**Note on staged test files:** The two safety test files are currently **staged for commit but not committed**. After Phase 1, the index still contains them. The plan below commits them **first** as a non-rebase change, then does the rebase.

**STOP conditions** (do not proceed if any are true):
- `git stash list` shows zero entries after step 3 (something didn't stash)
- `git diff --cached --stat` shows nothing after Phase 2 (the staged tests were lost)
- `git status --short` shows unexpected modifications outside the stashed paths

### Phase 2: Commit the safety tests (BEFORE the rebase)

```bash
cd "e:\University\Graduted Project\Edu-platform"

# These are already staged from the previous session
git status --short backend/tests/

# Confirm: expect
#   A  backend/tests/test_validator_apply_safety.py
#   A  backend/tests/test_repair_cas_safety.py

git commit -m "test(db): add safety regression tests for ar_objects validator + repair

Pins down four audit-flagged bugs:

1. Validator readback MUST use listCollections, NOT collMod with empty
   validator (which destroys the rule).
2. create_index failures MUST propagate as non-zero exit (not silently
   logged).
3. MONGO_URL credentials MUST be redacted from CLI logs.
4. CAS filter MUST only constrain fields the repair actually touches
   (over-permissive filters silently drop repairs).

Also adds the strict-serializer gate test (test_apply_action_error_
requires_audit_invalid_count_zero) so a future refactor cannot
accidentally promote validationAction from warn to error without the
required --audit-invalid-count=0 evidence.

Coverage: 7 tests in test_validator_apply_safety.py, 6 tests in
test_repair_cas_safety.py. Full backend suite: 288 passed, 1 skipped,
0 failures (was 281 before these tests)."
```

**Sanity check:**
```bash
git log --oneline -1
# Expected: new commit with the safety test subject

cd backend && python -m pytest tests/test_validator_apply_safety.py tests/test_repair_cas_safety.py -v
# Expected: 13 passed
```

### Phase 3: Stash the dirty worktree (now that tests are committed)

```bash
cd "e:\University\Graduted Project\Edu-platform"

# Stash the tracked-file modifications (and deletions)
git stash push -m "pre-rebase-dirty-worktree-2026-08-08-round2" -- \
    .gitignore \
    backend/database/migrations/apply_ar_objects_validator.py \
    backend/database/migrations/repair_ar_objects_consistency.py \
    frontend-web/public/ar-viewer.html \
    frontend-web/src/components/ar/ARContainerV2.tsx \
    frontend-web/src/core/types/ARMessages.ts \
    frontend-web/src/pages/LearnARV2.tsx \
    frontend-web/src/utils/mergeMindTargets.ts \
    frontend-web/src/utils/mindTargetMerge.test.ts \
    mobile/unity/Assets/Scripts/Interactions/ComboManager.cs \
    mobile/unity/Packages/manifest.json \
    mobile/unity/Packages/packages-lock.json
```

**Sanity check:**
```bash
git status --short
# Expected: only ?? plan/ files (untracked, intentional)
git stash list
# Expected: stash@{0} = round1 (already-applied to backup branch), stash@{1} = round2
```

### Phase 4: Interactive rebase

```bash
cd "e:\University\Graduted Project\Edu-platform"

# 4a. Open the rebase todo file
git rebase -i 88660aa~1
```

In the editor, the rebase todo will show all 15 commits. Mark them:

```gitrebase
# Mark dc6ca05 as drop
drop dc6ca05 chore(workspace): commit debug artifacts and test reports

# Mark 3beccc1 as drop
drop 3beccc1 chore(frontend): add debug assets and playwright test data

# Reword 88660aa to incorporate the safety fixes
reword 88660aa chore(db): enforce ar_objects validator with verified apply path

# Keep everything else (pick is default)
pick 0753235 chore: add task commit message templates
pick cb745a8 feat: add Unity MCP tools integration
pick e733c9e feat(unity): add test scenes and recovery files
pick 07b2dcf chore(unity): add project settings and user preferences
pick c2129ae feat: update AR models, flashcards and mobile Unity AR integration
pick 1e5b58f chore(unity): add assembly definition meta files
pick 8c2736d docs: add research documents
pick 995bacd docs: add development reports and debugging logs
pick aaa6b30 docs: add implementation plans for various features
pick 101ffe6 docs: add Superpowers SDD documentation and reports
pick e69eb87 docs: add root CLAUDE.md with project guidelines
pick 8e463fa feat: add Cursor and Claude AI assistant configs
```

For the reword, change the subject to:
```
chore(db): enforce ar_objects validator with audited safety path
```

And replace the body with:
```
Installs the catalog/legacy discriminator on ar_objects via collMod
with a JSON Schema validator, and creates the partial unique index
on (mind_catalog_id, mind_target_index) scoped to tracking_mode=catalog.

Safety properties verified by tests/test_validator_apply_safety.py
and tests/test_repair_cas_safety.py:

* collMod is issued exactly once (no destructive readback).
* Post-apply readback uses listCollections, never collMod with
  empty validator (which would silently remove enforcement).
* create_index failures propagate as non-zero exit, not silent skip.
* MONGO_URL credentials are redacted from CLI logs.
* CAS filters only constrain fields the repair actually touches.
* --action=error requires --audit-invalid-count=0 (strict-serializer
  gate).
```

Save and exit. Git will pause for the reword, then continue.

### Phase 5: Post-rebase cleanup

```bash
cd "e:\University\Graduted Project\Edu-platform"

# 1. Restore the dirty worktree
git stash pop
# Expected: stash@{1} pops (round2). If conflicts, resolve manually.
# Likely conflicts: the validator file was modified by the safety fixes
# AND the dirty worktree has its own safety fixes. The reworded commit
# already has the fixes; popping will report "already applied" or
# "needs merge". Resolve by accepting the reworded version.

# 2. Confirm safety tests still pass
cd backend && python -m pytest tests/test_validator_apply_safety.py tests/test_repair_cas_safety.py -v
# Expected: 13 passed

# 3. Confirm validator feature still works (dry-run)
python -m database.migrations.apply_ar_objects_validator --action warn
# Expected: exits 0, prints JSON plan

cd ..
```

### Phase 6: Follow-up cleanup commits (NOT part of rebase)

These commits land **after** the rebase, on the rebased branch tip:

```bash
cd "e:\University\Graduted Project\Edu-platform"

# Commit A: remove recovery scenes
git rm -r mobile/unity/Assets/_Recovery
git status
# Expected: shows staged deletions for _Recovery/0.unity, 0 (1).unity,
# 0 (2).unity, and their .meta files

git commit -m "chore(unity): remove _Recovery/ scratch scenes

These scenes were created during interactive Unity editor sessions
to debug MindAR tracking and were committed in e733c9e alongside
legitimate EditMode tests. They are not referenced by any gameplay
code or asset; removing them keeps the Assets/ tree focused on
shipped scenes only.

Verified by: grep -r '_Recovery' mobile/unity/Assets/ returns nothing."

# Commit B: untrack UserSettings/
git rm -r --cached mobile/unity/UserSettings/
# Confirm .gitignore is updated (already done in dirty worktree)
cat .gitignore | grep -i usersettings
# Expected: matches "mobile/unity/UserSettings/" or "/UserSettings/"

git commit -m "chore(unity): untrack UserSettings/ and add to .gitignore

UserSettings/ contains per-developer editor state (Layouts/,
EditorUserSettings.asset, Search.index). Standard Unity convention
is to ignore it — each developer should have their own. These files
were force-added in 07b2dcf and modified in c2129ae; untracking
them removes per-machine noise from the diff.

Verified by: git ls-files mobile/unity/UserSettings/ returns empty
after this commit."
```

### Phase 7: Verify

```bash
cd "e:\University\Graduted Project\Edu-platform"

# 1. Confirm the two debug commits are gone from history
git log --oneline -- frontend-web/test-results 2>&1
# Expected: empty (the test-results dir is untracked)
git log --oneline -- frontend-web/playwright-report 2>&1
# Expected: empty

# 2. Confirm test-results/ and playwright-report/ are not tracked
git ls-files frontend-web/test-results 2>&1
# Expected: empty
git ls-files frontend-web/playwright-report 2>&1
# Expected: empty

# 3. Confirm 88660aa has been reworded
git log --oneline -1 --grep="audited safety path"
# Expected: a commit matching the new subject

# 4. Confirm the dirty worktree is intact (or expected to be modified
#    by the safety fixes)
git status --short
# Expected: M/D entries for the same set of files as before the rebase,
# with apply_ar_objects_validator.py possibly showing as already-applied
# (because the reworded commit includes the fixes).

# 5. Full backend suite
cd backend && python -m pytest tests/ -q
# Expected: 288+ passed, 0 failures

# 6. Confirm _Recovery/ is no longer tracked
cd ..
git ls-files 'mobile/unity/Assets/_Recovery' 2>&1
# Expected: empty

# 7. Confirm UserSettings/ is no longer tracked
git ls-files mobile/unity/UserSettings/ 2>&1
# Expected: empty

# 8. Confirm gitignore contains UserSettings/
grep -i 'UserSettings' .gitignore
# Expected: match
```

### Phase 8: Push

```bash
cd "e:\University\Graduted Project\Edu-platform"

# Pre-push: review the rebased history
git log --oneline 88660aa~1..HEAD
# Expected: 13 commits (was 15 — dropped dc6ca05 + 3beccc1),
# plus 1 commit for reworded 88660aa + 2 follow-up cleanup commits
# + 1 commit for the safety tests = 17 commits total
# (some reflowing may change the exact count)

# Force-push with lease (refuses if remote has commits you don't have)
git push --force-with-lease origin MindAR-Update
```

**WARNING:** `--force` is destructive. `--force-with-lease` is safer. NEVER use `--force`.

If the remote is `main` (not `MindAR-Update`), a PR is required:
```bash
git push origin MindAR-Update
# Open PR on GitHub
```

---

## Rollback Plan

If anything goes wrong during the rebase:

```bash
# 1. Abort the in-progress rebase
git rebase --abort

# 2. Restore from backup branch
git checkout emergency-backup-2026-08-08
git checkout -b mindar-update-recovery

# 3. Restore untracked files from snapshot
cp -r /tmp/rebase-safety/* backend/tests/   # if tests were lost

# 4. Restore the stash
git stash list   # identify the right stash
git stash pop    # or `git stash pop stash@{N}`

# 5. Once stable, decide whether to retry the rebase or escalate
```

Worst case: lose an hour, not the changes. The backup branch + `/tmp/rebase-safety/` snapshot are insurance.

---

## Updated Estimated Time

| Phase | Duration | Risk |
|---|---|---|
| Pre-flight (already done) | 0 min | Done |
| Phase 1: backup branch + stash (round1) | 3 min | Low |
| Phase 2: commit safety tests | 2 min | Low (tests already pass) |
| Phase 3: stash (round2) | 3 min | Low |
| Phase 4: interactive rebase | 10–20 min | Medium |
| Phase 5: restore dirty worktree + verify | 10 min | Low |
| Phase 6: follow-up cleanup commits | 5 min | Low |
| Phase 7: verify | 5 min | Low |
| Phase 8: push | 5 min | Low if CI green |

**Total: 45–60 minutes.** Down from the v1 estimate of 1.5–2.5 hours because the scope is much smaller.

---

## Open Questions (revised)

These were open in v1; this version resolves most of them. Remaining open items:

1. **Resolved**: `0753235` is innocuous — keep.
2. **Resolved**: recovery scenes are `mobile/unity/Assets/_Recovery/` (introduced in `e733c9e`) — fix via follow-up commit, not history rewrite.
3. **Resolved**: UserSettings introduced in `07b2dcf`, modified in `c2129ae` — fix via follow-up commit, not history rewrite.
4. **Still open**: Push authority — is `--force-with-lease` to `MindAR-Update` acceptable, or do you need a PR? This depends on whether the remote branch is protected.
5. **Still open**: Is there anything in the `_Recovery/` scenes referenced by other code or assets? If yes, dropping them will break something and needs a different approach. **Run this verification before Phase 6:**
   ```bash
   cd "e:\University\Graduted Project\Edu-platform"
   grep -r "_Recovery" mobile/unity/Assets/ --include='*.cs' --include='*.unity' --include='*.prefab' --include='*.asset'
   # Expected: empty (no references)
   ```
6. **Still open**: Does any developer rely on a tracked `EditorUserSettings.asset`? If yes, untracking it will lose their preferences. **Verify before Phase 6:**
   ```bash
   cd "e:\University\Graduted Project\Edu-platform"
   git log --oneline --format='%H %s %an' -- mobile/unity/UserSettings/ | head -10
   # Expected: only the two commits we already know about (07b2dcf, c2129ae)
   ```

---

## After the Rebase

1. Run the **deploy-staging prep** (separate deliverable, original Item #9)
2. Mark this plan as DONE: `mv plan/20260808_REBASE_PLAN.md plan/20260808_REBASE_PLAN.md.done`
3. Delete the `emergency-backup-2026-08-08` branch after 7 days of verified stability:
   ```bash
   git branch -d emergency-backup-2026-08-08
   git push origin --delete emergency-backup-2026-08-08
   ```
4. Confirm the follow-up cleanup commits landed (recovery scenes removed, UserSettings/ untracked)

---

**Status:** PLAN v2. Pre-flight complete. Awaiting: push-authority question (4), recovery-scene reference verification (5), and UserSettings-developer-dependency verification (6) before execution.