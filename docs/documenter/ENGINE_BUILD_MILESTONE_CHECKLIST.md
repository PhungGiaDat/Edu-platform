# AR Food Education Engine — 7-Day Build Sprint Milestone Checklist

> **Document type:** PM-style milestone tracker and daily progress checklist  
> **Project:** AR food education platform (React Native + Unity + ARKit)  
> **Delivery target:** Local iOS demo only  
> **Planning baseline:** 1-month graduation-project deadline / 22 sprint days  
> **Last updated:** July 25, 2026  
> **Related execution detail:** [`ENGINE_BUILD_EXECUTION_CHECKLIST.md`](./ENGINE_BUILD_EXECUTION_CHECKLIST.md)

---

## How to Use This Tracker

1. Use the **Project Dashboard** and **Milestone Tracker** for the weekly project view.
2. Start each work session in the matching **Daily Standup and Checklist** section.
3. Check an item only after its **verification step** is complete. A task that is coded but not verified remains unchecked.
4. Update the **Status Update Log** at the end of every workday.
5. Update the **Burndown Tracker** using the number of open WBS tasks, not hours spent.
6. Record every blocker in the **Risks / Issues** area and assign a next action. Escalate anything that threatens the next milestone gate.
7. Treat M6 as a feature freeze. After M6, only defect fixes, documentation, demo preparation, and release-critical changes are allowed.
8. This plan intentionally excludes Firebase, Android, authentication, CI/CD, App Store submission, and production deployment.

### Status Legend

- 🟢 **Green:** On track; no material impact to the next gate.
- 🟡 **Amber:** At risk; recovery action is defined and the gate may still be met.
- 🔴 **Red:** Blocked or materially off track; escalation or scope decision is required.
- ⬜ **Not started:** Work has not begun.
- ✅ **Complete:** Verification and acceptance evidence are available.

### Schedule Baseline Note

The milestone target dates below are the authoritative dates supplied for this tracker. Day 22 is fixed to **August 22, 2026** for the final completion gate. Days 13–21 are reserved for stabilization, documentation, rehearsal, and contingency recovery before the one-day Mac/iOS release window. If the university counts working days differently, update the dates in the dashboard and status log without changing the WBS IDs.

---

# 1. Project Dashboard

| Field | Current value | Update notes |
|---|---|---|
| **Project name** | AR Food Education Platform — Engine Build | React Native + Unity + ARKit |
| **Project ID** | AR-FOOD-EDU-ENGINE-2026 | Replace if a university project code exists |
| **Project manager / owner** | `<Your Name>` | Student project owner unless delegated |
| **Overall status** | 🟡 Amber — sprint initialized / pre-flight in progress | Change after each daily review |
| **Start date** | Saturday, July 25, 2026 | Day 0 |
| **Target completion date** | Saturday, August 22, 2026 | M7 Demo Ready / local iOS demo |
| **Sprint baseline** | 22 sprint days / 1 month | See schedule baseline note above |
| **% complete** | 0% | Update from verified WBS tasks |
| **Days remaining** | 22 sprint days / 28 calendar days at kickoff | Recalculate daily |
| **Current milestone** | M0 — Kickoff / Foundation Audit | Gate target: July 25 |
| **Next milestone** | M1 — Foundation Complete | Gate target: July 27 |
| **Mac availability** | 1 day, reserved for final iOS build | Keep the Mac runbook ready before M7 |
| **Demo scope** | Local iPhone demo; existing web API; elephant and jungle assets | No store submission or production release |
| **Last status review** | July 25, 2026 | `<time>` |
| **Next status review** | July 26, 2026 | `<time>` |

### Scope Guardrails

- [x] Reuse the existing web API rather than building a new backend.
- [x] Reuse the existing elephant and jungle 3D assets.
- [x] Target iOS only for the demo build.
- [x] Reserve one Mac day for the final Unity/Xcode/device build.
- [ ] Confirm the final API base URL and offline mock fallback.
- [ ] Confirm the exact iPhone model and iOS version available for testing.
- [ ] Confirm the printed marker image and its physical size.
- [x] Exclude Firebase, Android, auth, CI/CD, App Store submission, and production deployment.

---

# 2. Milestone Tracker

Update **Status**, **% Complete**, **Risks**, and **Notes** at each gate review. A milestone is not complete until its WBS checklist and verification evidence are complete.

| ID | Name | Target Date | Owner | Status | % Complete | Risks | Notes |
|---|---|---:|---|---|---:|---|---|
| **M0** | Kickoff / Foundation Audit | Day 0 — Jul 25, 2026 | PM / Technical Lead | 🟡 In progress | 0% | Unknown repository health, API endpoint, asset paths, or Mac availability | Establish baseline, scope, owners, and risk register |
| **M1** | Foundation Complete | Day 2 — Jul 27, 2026 | RN + Unity Lead | ⬜ Not started | 0% | Dependency conflicts, unsupported Unity/AR packages, Windows-only validation gaps | RN tooling and Unity AR foundation are reproducible |
| **M2** | Unity AR Working | Day 4 — Jul 29, 2026 | Unity / AR Lead | ⬜ Not started | 0% | Image tracking configuration, model import, scene or script errors | Marker detection and elephant spawn are demonstrable in the available test path |
| **M3** | Bridge Functional | Day 6 — Jul 31, 2026 | Integration Lead | ⬜ Not started | 0% | RN/Unity package limitations, native iOS linking deferred to Mac day | RN-to-Unity and Unity-to-RN message contracts are defined and logged |
| **M4** | API Integrated | Day 8 — Aug 2, 2026 | RN / API Lead | ⬜ Not started | 0% | Existing endpoint changes, network access, missing offline behavior | API data reaches RN and the Unity payload path; mock fallback remains available |
| **M5** | UI Complete | Day 10 — Aug 4, 2026 | RN / UI Lead | ⬜ Not started | 0% | Navigation regressions, loading/error states, scope expansion | Food list, detail, and AR lesson flow are coherent and demoable |
| **M6** | Code Freeze | Day 12 — Aug 6, 2026 | PM + QA Lead | ⬜ Not started | 0% | Critical defects found late, unstable bridge, missing test evidence | Feature scope closes; only release-critical fixes are permitted afterward |
| **M7** | Demo Ready | Day 22 — Aug 22, 2026 | PM + Technical Lead | ⬜ Not started | 0% | One-day Mac window, signing/device issues, marker tracking or API outage | Working local iOS demo, backup path, documentation, rehearsal, and sign-off |

### Gate Review Record

| Gate | Planned review date | Actual review date | Decision | Evidence / link | Approver |
|---|---:|---:|---|---|---|
| M0 gate | Jul 25, 2026 | `<date>` | ⬜ Pass ⬜ Conditional ⬜ Replan | `<link or commit>` | `<name>` |
| M1 gate | Jul 27, 2026 | `<date>` | ⬜ Pass ⬜ Conditional ⬜ Replan | `<link or commit>` | `<name>` |
| M2 gate | Jul 29, 2026 | `<date>` | ⬜ Pass ⬜ Conditional ⬜ Replan | `<link or commit>` | `<name>` |
| M3 gate | Jul 31, 2026 | `<date>` | ⬜ Pass ⬜ Conditional ⬜ Replan | `<link or commit>` | `<name>` |
| M4 gate | Aug 2, 2026 | `<date>` | ⬜ Pass ⬜ Conditional ⬜ Replan | `<link or commit>` | `<name>` |
| M5 gate | Aug 4, 2026 | `<date>` | ⬜ Pass ⬜ Conditional ⬜ Replan | `<link or commit>` | `<name>` |
| M6 gate | Aug 6, 2026 | `<date>` | ⬜ Pass ⬜ Conditional ⬜ Replan | `<link or commit>` | `<name>` |
| M7 gate | Aug 22, 2026 | `<date>` | ⬜ Pass ⬜ Conditional ⬜ Replan | `<link or build artifact>` | `<name>` |

---

# 3. Milestone WBS Checklists

Each task includes an estimate and a verification step. Adjust estimates if evidence shows the task is larger than planned, but record the variance in the weekly report.

## M0 — Kickoff / Foundation Audit

**Target:** Day 0 — July 25, 2026  
**Exit condition:** Scope, starting state, assets, API, Mac window, owners, and risks are documented.

- [ ] **M0.1 — Freeze demo scope and exclusions** — *30 min*
  - Confirm local iOS demo only, existing API reuse, existing elephant/jungle assets, and one Mac build day.
  - Record excluded work: Firebase, Android, auth, CI/CD, App Store, production deployment.
  - **Verification:** Scope Guardrails above are checked and any exception has a written decision.

- [ ] **M0.2 — Audit repository and build entry points** — *45 min*
  - Locate `package.json`, `App.tsx`, `src/`, `unity/`, `ios/`, and existing documentation.
  - Record the React Native, Unity, AR Foundation, and ARKit versions.
  - **Verification:** A clean starting-state note exists in the status log or project notes, including known build errors.

- [ ] **M0.3 — Confirm reusable assets and API contract** — *45 min*
  - Locate the elephant model, jungle scene, marker/reference image, and existing web API documentation or endpoint.
  - Verify the API can return at least one food record and identify required fields for the UI and Unity payload.
  - **Verification:** Asset paths and API base URL are recorded; a sample response or an explicit blocker is attached.

- [ ] **M0.4 — Establish schedule, owners, and risk register** — *30 min*
  - Confirm milestone owners and the one-day Mac reservation.
  - Create initial risks for dependency compatibility, native bridge linking, device testing, API availability, and marker tracking.
  - **Verification:** M0 status is reviewed; M1 start criteria and escalation owner are clear.

## M1 — Foundation Complete

**Target:** Day 2 — July 27, 2026  
**Exit condition:** RN tooling and Unity AR foundation are installed, documented, and pass basic checks.

- [ ] **M1.1 — Install and validate React Native dependencies** — *45 min*
  - Run the project install using the repository’s package manager.
  - Confirm Metro starts and TypeScript or the project’s available static check runs.
  - **Verification:** Dependency install completes without blocking errors; Metro status is reachable; no new TypeScript blocker remains.

- [ ] **M1.2 — Validate Unity project version and package baseline** — *45 min*
  - Open the Unity project and record the editor version.
  - Confirm AR Foundation, ARKit XR Plugin, and XR Management packages are present or schedule their installation.
  - **Verification:** Unity opens with no unresolved compilation errors and package versions are recorded.

- [ ] **M1.3 — Prepare iOS build notes and Mac runbook** — *30 min*
  - Document Windows-side limitations, Pod installation steps, camera permission requirements, bundle identifier, and expected Xcode work.
  - Confirm the Mac day, Xcode availability, Unity iOS Build Support, Apple signing access, and target iPhone.
  - **Verification:** A Mac-day checklist exists and every prerequisite has an owner or a red/amber risk.

- [ ] **M1.4 — Establish reproducible baseline evidence** — *30 min*
  - Capture RN/Metro output, Unity Console state, package manifests, and the current git status.
  - Record the baseline commit or working-tree state.
  - **Verification:** Another person can identify the exact starting point and reproduce the foundation checks.

## M2 — Unity AR Working

**Target:** Day 4 — July 29, 2026  
**Exit condition:** A food marker is configured and the elephant prefab can be spawned from tracked-image events.

- [ ] **M2.1 — Configure the food reference image library** — *45 min*
  - Select or confirm a high-contrast marker image and its physical size.
  - Add it to the Unity XR Reference Image Library with a stable identifier such as `apple`.
  - **Verification:** The library shows the image, identifier, and tracked dimensions without import errors.

- [ ] **M2.2 — Configure the AR scene** — *60 min*
  - Add or validate the AR Session, AR Session Origin, camera, and AR Tracked Image Manager.
  - Assign the reference image library and ensure the scene uses the intended tracking mode.
  - **Verification:** The scene saves cleanly and the Unity Console has no new red errors after reload.

- [ ] **M2.3 — Implement marker spawn and lifecycle logic** — *60 min*
  - Create or update `MarkerSpawner.cs` to instantiate the elephant on an added tracked image.
  - Handle updated and removed tracked images without duplicate or orphaned objects.
  - **Verification:** The script compiles, the prefab reference is assigned, and a deterministic `[AR]` spawn log is emitted.

- [ ] **M2.4 — Validate existing elephant and jungle assets** — *45 min*
  - Confirm the elephant model scale, orientation, materials, lighting, and anchor position.
  - Confirm the jungle scene remains usable as the AR presentation environment.
  - **Verification:** The model is visible and correctly oriented in the intended scene/test path; any visual defect is logged.

- [ ] **M2.5 — Produce Unity AR evidence** — *30 min*
  - Capture the scene hierarchy, inspector configuration, and the clean compile state.
  - Record the exact marker identifier and prefab used for the first demo path.
  - **Verification:** Evidence is linked from the M2 gate review record.

## M3 — Bridge Functional

**Target:** Day 6 — July 31, 2026  
**Exit condition:** RN and Unity have a documented message contract, working code-level send/receive paths, and logs suitable for Mac-day integration.

- [ ] **M3.1 — Create the React Native Unity view wrapper** — *60 min*
  - Add or validate a reusable `UnityARView` component.
  - Define typed props for the selected food and AR event callback.
  - **Verification:** Static checks pass and the component can render a Unity placeholder view without crashing the RN shell.

- [ ] **M3.2 — Add an AR screen integration point** — *30 min*
  - Render the Unity view from an `ARScreen` or equivalent screen.
  - Keep the selected food identifier configurable rather than permanently hard-coded.
  - **Verification:** The app reaches the AR screen and displays the placeholder/Unity surface in the available test environment.

- [ ] **M3.3 — Implement the Unity receive/send contract** — *60 min*
  - Create or update `RNBridge.cs` for RN-to-Unity commands and Unity-to-RN events.
  - Define message names, payload format, error behavior, and logging conventions.
  - **Verification:** Unity compiles and logs both a received test command and a generated marker event in editor-safe mode.

- [ ] **M3.4 — Prepare the native iOS event manager** — *45 min*
  - Create or stage the Objective-C/Objective-C++ event bridge required by the selected RN/Unity integration approach.
  - Document the file that must be added to the Xcode target on the Mac day.
  - **Verification:** The native file is present or its exact creation step is documented; no Windows-only assumption is hidden.

- [ ] **M3.5 — Verify bridge message examples and failure cases** — *45 min*
  - Test a food identifier, a representative JSON payload, a marker-found event, and malformed input.
  - Record expected logs for `[RN→Unity]` and `[Unity→RN]` directions.
  - **Verification:** The bridge contract can be handed to the person performing Xcode integration without interpretation.

## M4 — API Integrated

**Target:** Day 8 — August 2, 2026  
**Exit condition:** Food data loads from the existing API, supports offline fallback, and can be serialized into the Unity bridge payload.

- [ ] **M4.1 — Create a typed food API client** — *60 min*
  - Implement list and detail calls using the existing web API.
  - Include only the fields needed by the food UI and Unity payload.
  - **Verification:** Type checks pass and a real or fixture response maps to the `Food` type.

- [ ] **M4.2 — Configure the local API base URL safely** — *30 min*
  - Add the project’s supported environment configuration for the API base URL.
  - Record local network/device considerations for a physical iPhone.
  - **Verification:** The app reads the intended base URL without committing credentials or machine-specific secrets.

- [ ] **M4.3 — Add a food data hook or equivalent loading layer** — *45 min*
  - Implement loading, success, error, cancellation, and retry behavior for a selected food.
  - Avoid stale responses overwriting a newer selection.
  - **Verification:** Loading, success, error, and retry states can be triggered with a fixture or controlled endpoint.

- [ ] **M4.4 — Pass food data into Unity** — *45 min*
  - Serialize the agreed food payload and send it through the RN-to-Unity message contract.
  - Update Unity to receive, validate, and store the payload needed by the AR lesson.
  - **Verification:** Logs show the same food identifier and payload fields on both sides of the bridge.

- [ ] **M4.5 — Implement and verify offline mock fallback** — *45 min*
  - Add at least three representative food records for demo continuity.
  - Make API failure visible but non-fatal to the local demo flow.
  - **Verification:** With the API unavailable, the app still reaches the food list and AR lesson using mock data.

## M5 — UI Complete

**Target:** Day 10 — August 4, 2026  
**Exit condition:** The food list → detail → AR lesson journey is navigable, understandable, and has complete loading/error states.

- [ ] **M5.1 — Wire the navigation stack** — *45 min*
  - Define routes for food list, food detail, and AR lesson.
  - Pass the selected food identifier through navigation rather than relying on a global hard-coded value.
  - **Verification:** A user can navigate forward and back through the full happy path.

- [ ] **M5.2 — Build the food list screen** — *90 min*
  - Show food name, image or fallback, category, loading state, error state, retry, and refresh behavior.
  - Keep the list usable with the mock data set.
  - **Verification:** At least three foods render and tapping a card opens the matching detail record.

- [ ] **M5.3 — Build the food detail screen** — *75 min*
  - Show the food description, hero image or fallback, nutrition facts, and AR call-to-action.
  - Keep long names and missing optional fields from breaking the layout.
  - **Verification:** Calories, protein, carbohydrates, and fat are visible for a fixture; the AR CTA carries the correct ID.

- [ ] **M5.4 — Complete the AR lesson screen** — *45 min*
  - Load the selected food, show a clear preparation/loading state, and render the Unity view.
  - Surface a useful error/retry state if the food or Unity surface is unavailable.
  - **Verification:** Different food IDs produce different selected-food state; the screen does not crash on missing data.

- [ ] **M5.5 — Apply visual consistency and demo polish** — *60 min*
  - Establish a small theme for background, card, primary action, accent, text, and muted labels.
  - Add spacing, readable hierarchy, accessible touch targets, and a clear AR call-to-action.
  - **Verification:** All three screens share the same visual language and remain legible on the target iPhone size.

## M6 — Code Freeze

**Target:** Day 12 — August 6, 2026  
**Exit condition:** The agreed feature set is complete, blocking defects are resolved or explicitly accepted, and the release candidate is frozen.

- [ ] **M6.1 — Run the complete happy-path smoke test** — *60 min*
  - Cold launch → food list → food detail → AR lesson → marker/Unity path → back navigation.
  - Record actual results, device/simulator, build state, and evidence.
  - **Verification:** The happy path passes without a red error overlay or unrecoverable navigation state.

- [ ] **M6.2 — Run edge-case and offline checks** — *60 min*
  - Test API unavailable, invalid food ID, missing image, long food name, rapid navigation, and repeated AR entry/exit.
  - **Verification:** Each case has a pass, defect ID, or accepted limitation in the bug log.

- [ ] **M6.3 — Triage and fix release-blocking defects** — *120 min*
  - Prioritize crashes, broken navigation, bridge contract failures, marker-spawn failures, and unusable loading/error states.
  - Defer cosmetic or non-demo scope changes.
  - **Verification:** Every critical/high defect is closed, retested, or has an approved workaround and owner.

- [ ] **M6.4 — Run static, performance, and console checks** — *45 min*
  - Run available TypeScript/lint/test commands and inspect Unity/Metro logs.
  - Check the food list render with the intended demo data volume and remove avoidable warnings.
  - **Verification:** Results and any accepted warnings are recorded; no known release blocker remains.

- [ ] **M6.5 — Freeze, tag, and back up the release candidate** — *45 min*
  - Mark the release candidate commit, archive current configuration notes, and create a source backup.
  - Record the exact changes allowed after freeze.
  - **Verification:** The frozen commit can be identified and restored; M7 work starts from this baseline.

## M7 — Demo Ready

**Target:** Day 22 — August 22, 2026  
**Exit condition:** A local iOS build runs on the target iPhone, demonstrates the end-to-end AR food lesson, and has a tested backup and sign-off.

- [ ] **M7.1 — Complete Mac-day synchronization and prerequisites** — *60 min*
  - Pull the frozen release candidate, install dependencies, install CocoaPods, start Metro, and open Unity/Xcode.
  - Confirm the target iPhone, Apple signing access, camera permission text, and bundle identifier.
  - **Verification:** The Mac environment opens the frozen source without dependency or signing blockers.

- [ ] **M7.2 — Export Unity for iOS and integrate Xcode** — *120 min*
  - Switch Unity to iOS, export the Unity Xcode project, and add the RN/Unity native bridge files to the correct target.
  - Validate bridging headers, build phases, Info.plist camera permission, and required frameworks/settings.
  - **Verification:** Xcode resolves the Unity and React Native symbols and produces a buildable target.

- [ ] **M7.3 — Build, install, and verify the real device AR flow** — *120 min*
  - Build and install on the target iPhone.
  - Test cold launch, food list, detail, AR camera permission, marker detection, elephant spawn, data flow, and back navigation.
  - **Verification:** The elephant appears on the printed marker and the full happy path completes on the physical device.

- [ ] **M7.4 — Create release backups and recovery paths** — *60 min*
  - Preserve the working source commit, installable local build or archive, marker image, screenshots, logs, and fallback video/demo evidence if available.
  - Keep an offline mock path ready if the API is unreliable.
  - **Verification:** The demo can be restored or explained from the backup without depending on an unavailable service.

- [ ] **M7.5 — Complete documentation and defense rehearsal** — *90 min*
  - Update user guide, architecture/data-flow notes, API integration notes, known issues, and demo script.
  - Rehearse the demo within the target time and practice the emergency fallback path.
  - **Verification:** A reviewer can follow the written launch steps and the timed rehearsal completes successfully.

- [ ] **M7.6 — Conduct final gate review and sign-off** — *30 min*
  - Review the DoD checklists, open risks, known limitations, evidence links, and schedule/budget variance.
  - Obtain PM, technical lead, and sponsor/advisor sign-off.
  - **Verification:** M7 status is set to ✅ Complete or a written conditional acceptance identifies the remaining action and owner.

---

# 4. Daily Standup and Checklist

Use one section per sprint day. The three questions are intentionally repeated so this file can be used as the daily working log rather than only as a plan.

## Day 0 — Kickoff / Pre-flight | July 25, 2026 | M0

**Standup**

- **What did I complete yesterday?** `<Day 0 kickoff — no previous sprint day>`
- **What will I do today?** Freeze scope, audit the repository, confirm assets/API, and reserve the Mac day.
- **Any blockers?** `<record blocker, owner, and next action>`
- **RAG status:** - [ ] 🟢 Green  - [ ] 🟡 Amber  - [ ] 🔴 Red

**Daily checklist**

- [ ] **D0.1 / M0.1 — Confirm scope and exclusions** — *30 min* — **Verify:** Scope Guardrails are checked and no excluded feature is in the sprint backlog.
- [ ] **D0.2 / M0.2 — Audit repository entry points and versions** — *45 min* — **Verify:** RN, Unity, AR package, iOS, and documentation paths are recorded.
- [ ] **D0.3 / M0.3 — Locate elephant, jungle, marker, and API** — *45 min* — **Verify:** Asset paths and API base URL/sample response are recorded.
- [ ] **D0.4 / M0.4 — Confirm owners, Mac availability, and risks** — *30 min* — **Verify:** Initial risk register and next-day plan exist.
- [ ] **D0.5 — Update dashboard and status log** — *10 min* — **Verify:** Dashboard % complete, current milestone, and next review are current.

**End-of-day notes:** `<actual progress / evidence / variance>`

## Day 1 — Foundation setup | July 26, 2026 | M1

**Standup**

- **What did I complete yesterday?** `<notes>`
- **What will I do today?** Install and validate RN tooling; open Unity and establish the AR package baseline.
- **Any blockers?** `<notes>`
- **RAG status:** - [ ] 🟢 Green  - [ ] 🟡 Amber  - [ ] 🔴 Red

**Daily checklist**

- [ ] **D1.1 / M1.1 — Install project dependencies** — *45 min* — **Verify:** Install completes without a blocking error.
- [ ] **D1.2 / M1.1 — Run Metro and the available static check** — *30 min* — **Verify:** Metro is reachable and the static check result is recorded.
- [ ] **D1.3 / M1.2 — Open Unity and record package/editor versions** — *45 min* — **Verify:** Unity opens without unresolved compile errors.
- [ ] **D1.4 / M1.3 — Draft iOS notes and Mac-day prerequisite list** — *30 min* — **Verify:** Xcode, CocoaPods, signing, iPhone, and camera-permission assumptions have owners.
- [ ] **D1.5 — Commit or record baseline evidence** — *15 min* — **Verify:** Starting commit/working-tree state and screenshots/logs are linked.

**End-of-day notes:** `<actual progress / evidence / variance>`

## Day 2 — Foundation gate | July 27, 2026 | M1

**Standup**

- **What did I complete yesterday?** `<notes>`
- **What will I do today?** Close foundation gaps and pass the M1 gate.
- **Any blockers?** `<notes>`
- **RAG status:** - [ ] 🟢 Green  - [ ] 🟡 Amber  - [ ] 🔴 Red

**Daily checklist**

- [ ] **D2.1 / M1.2 — Resolve Unity package or compile issues** — *60 min* — **Verify:** Unity Console has no new red errors after reload.
- [ ] **D2.2 / M1.1 — Resolve RN dependency or Metro issues** — *60 min* — **Verify:** RN shell boots through the agreed smoke path.
- [ ] **D2.3 / M1.4 — Capture reproducible foundation evidence** — *30 min* — **Verify:** Another person can reproduce the foundation checks.
- [ ] **D2.4 — Review M1 exit criteria with technical lead** — *20 min* — **Verify:** M1 gate record is Pass, Conditional, or Replan with an owner.
- [ ] **D2.5 — Start M2 marker-library preparation** — *30 min* — **Verify:** Marker candidate and identifier are selected.

**End-of-day notes:** `<actual progress / evidence / variance>`

## Day 3 — Unity image-tracking setup | July 28, 2026 | M2

**Standup**

- **What did I complete yesterday?** `<notes>`
- **What will I do today?** Configure the reference image library, AR session, and tracked-image manager.
- **Any blockers?** `<notes>`
- **RAG status:** - [ ] 🟢 Green  - [ ] 🟡 Amber  - [ ] 🔴 Red

**Daily checklist**

- [ ] **D3.1 / M2.1 — Configure the food reference image library** — *45 min* — **Verify:** Image identifier and physical size appear in the inspector.
- [ ] **D3.2 / M2.2 — Configure AR Session and tracked-image manager** — *60 min* — **Verify:** Scene saves and reloads without red errors.
- [ ] **D3.3 / M2.4 — Validate elephant prefab and scene scale** — *45 min* — **Verify:** Elephant is visible, correctly oriented, and appropriately scaled.
- [ ] **D3.4 — Capture Unity configuration evidence** — *20 min* — **Verify:** Scene hierarchy and inspector screenshots are linked to M2.

**End-of-day notes:** `<actual progress / evidence / variance>`

## Day 4 — Unity AR gate | July 29, 2026 | M2

**Standup**

- **What did I complete yesterday?** `<notes>`
- **What will I do today?** Finish marker spawn/lifecycle logic and pass the Unity AR gate.
- **Any blockers?** `<notes>`
- **RAG status:** - [ ] 🟢 Green  - [ ] 🟡 Amber  - [ ] 🔴 Red

**Daily checklist**

- [ ] **D4.1 / M2.3 — Implement tracked-image spawn logic** — *60 min* — **Verify:** `MarkerSpawner.cs` compiles and the prefab reference is assigned.
- [ ] **D4.2 / M2.3 — Handle tracked-image updates and removals** — *45 min* — **Verify:** No duplicate or orphaned elephant objects are created in the test path.
- [ ] **D4.3 / M2.5 — Add deterministic AR logs and evidence** — *20 min* — **Verify:** Marker identifier and spawn event are visible in logs or documented editor evidence.
- [ ] **D4.4 — Review M2 gate** — *20 min* — **Verify:** M2 gate decision and any device-only limitation are recorded.
- [ ] **D4.5 — Prepare bridge message names** — *25 min* — **Verify:** RN→Unity and Unity→RN message names are listed before bridge coding.

**End-of-day notes:** `<actual progress / evidence / variance>`

## Day 5 — RN/Unity bridge implementation | July 30, 2026 | M3

**Standup**

- **What did I complete yesterday?** `<notes>`
- **What will I do today?** Build the RN Unity view wrapper and Unity message receiver/sender.
- **Any blockers?** `<notes>`
- **RAG status:** - [ ] 🟢 Green  - [ ] 🟡 Amber  - [ ] 🔴 Red

**Daily checklist**

- [ ] **D5.1 / M3.1 — Create or validate `UnityARView`** — *60 min* — **Verify:** Static checks pass and the placeholder view renders.
- [ ] **D5.2 / M3.2 — Add the AR screen integration point** — *30 min* — **Verify:** App reaches the AR screen without a crash.
- [ ] **D5.3 / M3.3 — Implement `RNBridge.cs` receive/send paths** — *60 min* — **Verify:** Unity logs a received command and generated event.
- [ ] **D5.4 / M3.4 — Stage the native iOS bridge file** — *45 min* — **Verify:** Xcode target-add step is documented for Mac day.
- [ ] **D5.5 — Write bridge payload examples** — *20 min* — **Verify:** Test messages and expected logs are recorded.

**End-of-day notes:** `<actual progress / evidence / variance>`

## Day 6 — Bridge gate and contract verification | July 31, 2026 | M3

**Standup**

- **What did I complete yesterday?** `<notes>`
- **What will I do today?** Verify the bridge contract, malformed-input behavior, and M3 gate readiness.
- **Any blockers?** `<notes>`
- **RAG status:** - [ ] 🟢 Green  - [ ] 🟡 Amber  - [ ] 🔴 Red

**Daily checklist**

- [ ] **D6.1 / M3.5 — Test RN→Unity food identifier message** — *30 min* — **Verify:** Unity receives and logs the expected identifier.
- [ ] **D6.2 / M3.5 — Test Unity→RN marker event** — *30 min* — **Verify:** RN receives the event shape defined in the contract.
- [ ] **D6.3 / M3.5 — Test malformed or missing payload behavior** — *30 min* — **Verify:** Invalid input fails safely and creates a useful log.
- [ ] **D6.4 — Document Mac-only bridge integration steps** — *20 min* — **Verify:** Native file, target membership, and framework steps are explicit.
- [ ] **D6.5 — Review M3 gate** — *20 min* — **Verify:** M3 status and known iOS-only limitation are approved.

**End-of-day notes:** `<actual progress / evidence / variance>`

## Day 7 — API client foundation | August 1, 2026 | M4

**Standup**

- **What did I complete yesterday?** `<notes>`
- **What will I do today?** Define the typed API client, environment configuration, and response mapping.
- **Any blockers?** `<notes>`
- **RAG status:** - [ ] 🟢 Green  - [ ] 🟡 Amber  - [ ] 🔴 Red

**Daily checklist**

- [ ] **D7.1 / M4.1 — Create typed food list/detail client** — *60 min* — **Verify:** Fixture or real response maps to the required `Food` fields.
- [ ] **D7.2 / M4.2 — Add local API base URL configuration** — *30 min* — **Verify:** App reads the base URL without committing secrets.
- [ ] **D7.3 / M4.1 — Record API assumptions and unavailable fields** — *20 min* — **Verify:** API integration notes identify required and optional fields.
- [ ] **D7.4 — Run static checks after API changes** — *20 min* — **Verify:** Static-check result is recorded with no new blocker.

**End-of-day notes:** `<actual progress / evidence / variance>`

## Day 8 — API integration gate | August 2, 2026 | M4

**Standup**

- **What did I complete yesterday?** `<notes>`
- **What will I do today?** Complete the hook, Unity payload, offline fallback, and M4 gate.
- **Any blockers?** `<notes>`
- **RAG status:** - [ ] 🟢 Green  - [ ] 🟡 Amber  - [ ] 🔴 Red

**Daily checklist**

- [ ] **D8.1 / M4.3 — Implement food loading/error/retry behavior** — *45 min* — **Verify:** Loading, success, error, cancellation, and retry states are testable.
- [ ] **D8.2 / M4.4 — Serialize selected food into the bridge** — *45 min* — **Verify:** RN and Unity logs show matching identifiers and payload fields.
- [ ] **D8.3 / M4.5 — Add three-record offline mock fallback** — *45 min* — **Verify:** App still reaches the food list and AR flow with the API unavailable.
- [ ] **D8.4 / M4.1 — Write API integration notes** — *20 min* — **Verify:** Endpoint, environment, mock behavior, and known limitations are documented.
- [ ] **D8.5 — Review M4 gate** — *20 min* — **Verify:** M4 gate decision and evidence link are recorded.

**End-of-day notes:** `<actual progress / evidence / variance>`

## Day 9 — UI and navigation implementation | August 3, 2026 | M5

**Standup**

- **What did I complete yesterday?** `<notes>`
- **What will I do today?** Build the navigation stack, food list, and food detail screens.
- **Any blockers?** `<notes>`
- **RAG status:** - [ ] 🟢 Green  - [ ] 🟡 Amber  - [ ] 🔴 Red

**Daily checklist**

- [ ] **D9.1 / M5.1 — Wire food list, detail, and AR routes** — *45 min* — **Verify:** Forward/back navigation works with a selected ID.
- [ ] **D9.2 / M5.2 — Build the food list screen** — *90 min* — **Verify:** At least three foods render with loading/error/retry states.
- [ ] **D9.3 / M5.3 — Build the food detail screen** — *75 min* — **Verify:** Description and all required nutrition facts render.
- [ ] **D9.4 — Add image and missing-field fallbacks** — *30 min* — **Verify:** Missing optional fields do not crash or break the layout.

**End-of-day notes:** `<actual progress / evidence / variance>`

## Day 10 — UI completion gate | August 4, 2026 | M5

**Standup**

- **What did I complete yesterday?** `<notes>`
- **What will I do today?** Complete the AR lesson screen, visual consistency, and M5 gate.
- **Any blockers?** `<notes>`
- **RAG status:** - [ ] 🟢 Green  - [ ] 🟡 Amber  - [ ] 🔴 Red

**Daily checklist**

- [ ] **D10.1 / M5.4 — Connect the selected food to the AR screen** — *45 min* — **Verify:** Different food IDs produce the correct selected state.
- [ ] **D10.2 / M5.5 — Apply shared theme and visual hierarchy** — *60 min* — **Verify:** List, detail, and AR screens look like one product.
- [ ] **D10.3 / M5.4 — Add AR loading, error, and retry states** — *30 min* — **Verify:** No-data and unavailable-Unity cases are recoverable.
- [ ] **D10.4 — Run end-to-end RN happy path** — *30 min* — **Verify:** List → detail → AR → back navigation works in the available test environment.
- [ ] **D10.5 — Review M5 gate** — *20 min* — **Verify:** M5 decision and open UI defects are recorded.

**End-of-day notes:** `<actual progress / evidence / variance>`

## Day 11 — Integration hardening | August 5, 2026 | M6

**Standup**

- **What did I complete yesterday?** `<notes>`
- **What will I do today?** Run integration smoke tests and fix release-blocking issues before freeze.
- **Any blockers?** `<notes>`
- **RAG status:** - [ ] 🟢 Green  - [ ] 🟡 Amber  - [ ] 🔴 Red

**Daily checklist**

- [ ] **D11.1 / M6.1 — Run cold-start and happy-path smoke test** — *60 min* — **Verify:** App reaches AR without a red error overlay.
- [ ] **D11.2 / M6.2 — Test offline and invalid-data behavior** — *45 min* — **Verify:** Mock fallback and error UI work as designed.
- [ ] **D11.3 / M6.3 — Triage defects by demo impact** — *30 min* — **Verify:** Every discovered defect has severity, owner, and next action.
- [ ] **D11.4 / M6.3 — Fix critical/high defects** — *90 min* — **Verify:** Each fix is retested against the original reproduction.
- [ ] **D11.5 — Prepare the release candidate checklist** — *20 min* — **Verify:** Remaining M6 exit criteria are visible and assigned.

**End-of-day notes:** `<actual progress / evidence / variance>`

## Day 12 — Code freeze gate | August 6, 2026 | M6

**Standup**

- **What did I complete yesterday?** `<notes>`
- **What will I do today?** Complete regression checks, freeze the release candidate, and start stabilization-only work.
- **Any blockers?** `<notes>`
- **RAG status:** - [ ] 🟢 Green  - [ ] 🟡 Amber  - [ ] 🔴 Red

**Daily checklist**

- [ ] **D12.1 / M6.1 — Complete full smoke-test evidence** — *60 min* — **Verify:** Happy path result, environment, and evidence are recorded.
- [ ] **D12.2 / M6.2 — Complete edge-case test matrix** — *45 min* — **Verify:** Every case is pass, defect ID, or accepted limitation.
- [ ] **D12.3 / M6.4 — Run static and console checks** — *45 min* — **Verify:** No release-blocking compile, lint, or runtime warnings remain.
- [ ] **D12.4 / M6.5 — Tag and back up release candidate** — *30 min* — **Verify:** Frozen commit and restore path are recorded.
- [ ] **D12.5 — Review M6 gate and change-control rule** — *20 min* — **Verify:** M6 is Pass/Conditional/Replan and post-freeze changes are restricted.

**End-of-day notes:** `<actual progress / evidence / variance>`

## Day 13 — Stabilization baseline | August 7, 2026 | M7 preparation

**Standup**

- **What did I complete yesterday?** `<notes>`
- **What will I do today?** Confirm the frozen baseline, close documentation gaps, and prepare the release evidence pack.
- **Any blockers?** `<notes>`
- **RAG status:** - [ ] 🟢 Green  - [ ] 🟡 Amber  - [ ] 🔴 Red

**Daily checklist**

- [ ] **D13.1 / M6.5 — Verify frozen commit and working-tree state** — *20 min* — **Verify:** No unplanned feature changes are present.
- [ ] **D13.2 / M7.5 — Create the evidence index** — *45 min* — **Verify:** Build, screenshots, logs, test results, and docs each have a link or owner.
- [ ] **D13.3 / M7.5 — Draft user launch and demo steps** — *45 min* — **Verify:** A reviewer can follow the local demo instructions without oral explanation.
- [ ] **D13.4 — Update risk register and recovery actions** — *30 min* — **Verify:** Every red/amber risk has a mitigation and trigger.

**End-of-day notes:** `<actual progress / evidence / variance>`

## Day 14 — Risk burn-down | August 8, 2026 | M7 preparation

**Standup**

- **What did I complete yesterday?** `<notes>`
- **What will I do today?** Reduce the highest risks: native linking, API availability, marker tracking, and device readiness.
- **Any blockers?** `<notes>`
- **RAG status:** - [ ] 🟢 Green  - [ ] 🟡 Amber  - [ ] 🔴 Red

**Daily checklist**

- [ ] **D14.1 / M7.1 — Validate Mac prerequisite checklist** — *30 min* — **Verify:** Each prerequisite has a confirmed status, owner, or fallback.
- [ ] **D14.2 / M7.2 — Review native bridge integration instructions** — *45 min* — **Verify:** Xcode file locations, target membership, and permissions are unambiguous.
- [ ] **D14.3 / M7.3 — Prepare marker and device test kit** — *30 min* — **Verify:** Printed marker, target device, charging cable, and test script are available or assigned.
- [ ] **D14.4 / M7.4 — Validate offline demo recovery path** — *30 min* — **Verify:** Mock data path and backup artifacts are usable without the API.

**End-of-day notes:** `<actual progress / evidence / variance>`

## Day 15 — Documentation completion | August 9, 2026 | M7 preparation

**Standup**

- **What did I complete yesterday?** `<notes>`
- **What will I do today?** Complete the technical and user-facing documentation needed for the graduation demo.
- **Any blockers?** `<notes>`
- **RAG status:** - [ ] 🟢 Green  - [ ] 🟡 Amber  - [ ] 🔴 Red

**Daily checklist**

- [ ] **D15.1 / M7.5 — Update architecture and data-flow documentation** — *60 min* — **Verify:** RN ↔ Unity ↔ ARKit ↔ web API responsibilities are documented.
- [ ] **D15.2 / M7.5 — Update API integration and offline-mode notes** — *30 min* — **Verify:** Endpoint, payload, fallback, and limitations match the frozen code.
- [ ] **D15.3 / M7.5 — Update known issues and troubleshooting notes** — *30 min* — **Verify:** Camera, marker, API, and native-build recovery steps are included.
- [ ] **D15.4 — Obtain a documentation review** — *30 min* — **Verify:** Reviewer feedback is resolved or recorded as an accepted limitation.

**End-of-day notes:** `<actual progress / evidence / variance>`

## Day 16 — QA regression round | August 10, 2026 | M7 preparation

**Standup**

- **What did I complete yesterday?** `<notes>`
- **What will I do today?** Repeat the regression matrix from the frozen baseline and confirm no stabilization work regressed the demo.
- **Any blockers?** `<notes>`
- **RAG status:** - [ ] 🟢 Green  - [ ] 🟡 Amber  - [ ] 🔴 Red

**Daily checklist**

- [ ] **D16.1 / M6.1 — Repeat the RN happy path** — *45 min* — **Verify:** List, detail, AR entry, and back navigation pass.
- [ ] **D16.2 / M6.2 — Repeat offline and invalid-data cases** — *45 min* — **Verify:** Fallback and error states remain recoverable.
- [ ] **D16.3 / M3.5 — Repeat bridge message checks** — *45 min* — **Verify:** Message names, payload shape, and logs still match the contract.
- [ ] **D16.4 — Update bug log and regression evidence** — *30 min* — **Verify:** Each result is linked to a test case or defect ID.

**End-of-day notes:** `<actual progress / evidence / variance>`

## Day 17 — Demo script and rehearsal 1 | August 11, 2026 | M7 preparation

**Standup**

- **What did I complete yesterday?** `<notes>`
- **What will I do today?** Write and time the end-to-end demo script, including the fallback path.
- **Any blockers?** `<notes>`
- **RAG status:** - [ ] 🟢 Green  - [ ] 🟡 Amber  - [ ] 🔴 Red

**Daily checklist**

- [ ] **D17.1 / M7.5 — Finalize the 7-minute demo narrative** — *45 min* — **Verify:** Script covers problem, food flow, AR marker, architecture, and closing.
- [ ] **D17.2 / M7.5 — Rehearse the primary demo path** — *45 min* — **Verify:** Timed rehearsal completes within the agreed duration.
- [ ] **D17.3 / M7.4 — Rehearse API-offline fallback** — *30 min* — **Verify:** Presenter can switch to mock data without improvising technical steps.
- [ ] **D17.4 — Record rehearsal issues and actions** — *20 min* — **Verify:** Every issue has a fix, workaround, or accepted limitation.

**End-of-day notes:** `<actual progress / evidence / variance>`

## Day 18 — Device and marker readiness | August 12, 2026 | M7 preparation

**Standup**

- **What did I complete yesterday?** `<notes>`
- **What will I do today?** Prepare the physical demo environment and confirm marker quality and operating instructions.
- **Any blockers?** `<notes>`
- **RAG status:** - [ ] 🟢 Green  - [ ] 🟡 Amber  - [ ] 🔴 Red

**Daily checklist**

- [ ] **D18.1 / M7.3 — Print and inspect the marker** — *20 min* — **Verify:** Marker is the expected size, high contrast, clean, and undamaged.
- [ ] **D18.2 / M7.3 — Prepare device settings checklist** — *30 min* — **Verify:** Camera permission, battery, storage, connectivity, and notification settings are listed.
- [ ] **D18.3 / M7.4 — Assemble physical and digital backups** — *30 min* — **Verify:** Source, build/archive, marker, screenshots, and fallback video are copied to the chosen backup location.
- [ ] **D18.4 / M7.5 — Update presenter runbook** — *30 min* — **Verify:** Setup, launch, marker distance/lighting, and emergency steps are explicit.

**End-of-day notes:** `<actual progress / evidence / variance>`

## Day 19 — Clean-room readiness rehearsal | August 13, 2026 | M7 preparation

**Standup**

- **What did I complete yesterday?** `<notes>`
- **What will I do today?** Simulate the final build handoff from the frozen source and identify any missing instructions or artifacts.
- **Any blockers?** `<notes>`
- **RAG status:** - [ ] 🟢 Green  - [ ] 🟡 Amber  - [ ] 🔴 Red

**Daily checklist**

- [ ] **D19.1 / M7.1 — Walk the Mac-day runbook in order** — *45 min* — **Verify:** No step depends on undocumented knowledge or unavailable tooling.
- [ ] **D19.2 / M7.2 — Verify all expected native files and settings** — *30 min* — **Verify:** The Xcode integration checklist names every file, target, permission, and setting.
- [ ] **D19.3 / M7.3 — Review physical-device test cases** — *30 min* — **Verify:** Test cases cover camera permission, marker detection, data flow, and recovery.
- [ ] **D19.4 — Log and resolve readiness gaps** — *45 min* — **Verify:** Each gap is closed or has an assigned fallback before Day 21.

**End-of-day notes:** `<actual progress / evidence / variance>`

## Day 20 — Final change review | August 14, 2026 | M7 preparation

**Standup**

- **What did I complete yesterday?** `<notes>`
- **What will I do today?** Confirm that no feature expansion is needed and close only release-critical preparation gaps.
- **Any blockers?** `<notes>`
- **RAG status:** - [ ] 🟢 Green  - [ ] 🟡 Amber  - [ ] 🔴 Red

**Daily checklist**

- [ ] **D20.1 / M6.5 — Review post-freeze changes** — *30 min* — **Verify:** Every change since the freeze is release-critical and documented.
- [ ] **D20.2 / M7.5 — Confirm documentation matches the release candidate** — *45 min* — **Verify:** File paths, commands, screenshots, and known issues are current.
- [ ] **D20.3 / M7.4 — Verify backup integrity and naming** — *30 min* — **Verify:** Backup artifacts can be found and opened from the recovery location.
- [ ] **D20.4 — Recalculate schedule and risk status** — *20 min* — **Verify:** M7 readiness is Green/Amber/Red with a specific recovery action.

**End-of-day notes:** `<actual progress / evidence / variance>`

## Day 21 — Mac-day final preparation | August 15, 2026 | M7 preparation

**Standup**

- **What did I complete yesterday?** `<notes>`
- **What will I do today?** Prepare the frozen source, credentials/access, device, marker, and exact run order for the one-day Mac build.
- **Any blockers?** `<notes>`
- **RAG status:** - [ ] 🟢 Green  - [ ] 🟡 Amber  - [ ] 🔴 Red

**Daily checklist**

- [ ] **D21.1 / M7.1 — Confirm Mac access and time window** — *15 min* — **Verify:** Start/end time, location, contact, and backup plan are confirmed.
- [ ] **D21.2 / M7.1 — Package frozen source and setup instructions** — *30 min* — **Verify:** Mac operator can start from the intended commit and follow the runbook.
- [ ] **D21.3 / M7.2 — Pre-fill bundle, camera, and signing values** — *20 min* — **Verify:** No placeholder value is unknown on build day.
- [ ] **D21.4 / M7.3 — Print final test script and marker checklist** — *20 min* — **Verify:** Physical test steps are ready beside the target iPhone.
- [ ] **D21.5 — Conduct go/no-go review for M7** — *30 min* — **Verify:** Go/no-go decision and contingency path are recorded.

**End-of-day notes:** `<actual progress / evidence / variance>`

## Day 22 — Final iOS build and demo-ready gate | August 22, 2026 | M7

**Standup**

- **What did I complete yesterday?** `<notes>`
- **What will I do today?** Use the one Mac day to build, install, verify, back up, rehearse, and obtain final sign-off.
- **Any blockers?** `<notes>`
- **RAG status:** - [ ] 🟢 Green  - [ ] 🟡 Amber  - [ ] 🔴 Red

**Daily checklist**

- [ ] **D22.1 / M7.1 — Sync source and install Mac dependencies** — *60 min* — **Verify:** Frozen source opens; dependencies, CocoaPods, Metro, Unity, and Xcode are ready.
- [ ] **D22.2 / M7.2 — Export Unity iOS project and integrate native bridge** — *120 min* — **Verify:** Xcode target includes the required Unity/RN bridge files and settings.
- [ ] **D22.3 / M7.3 — Build and install on the target iPhone** — *90 min* — **Verify:** App launches and camera permission flow completes.
- [ ] **D22.4 / M7.3 — Verify end-to-end physical AR demo** — *60 min* — **Verify:** Food selection, data flow, marker detection, elephant spawn, and navigation all pass.
- [ ] **D22.5 / M7.4 — Archive build and copy backups** — *45 min* — **Verify:** Installable build/archive, frozen source, marker, screenshots, and fallback artifacts are preserved.
- [ ] **D22.6 / M7.5 — Run final timed rehearsal** — *30 min* — **Verify:** The demo completes within the target time and the emergency path is known.
- [ ] **D22.7 / M7.6 — Complete sign-off and close status log** — *30 min* — **Verify:** DoD, gate review, risks, variance, and three sign-off placeholders are completed.

**End-of-day notes:** `<final build result / evidence / remaining limitations>`

---

# 5. Weekly Status Report Template

Complete one report at the end of each reporting week. Use actual hours and actual dates; do not silently replace a missed milestone with a new date.

## Weekly Report Form

**Reporting period:** `<start date> – <end date>`  
**Prepared by:** `<name>`  
**Overall RAG:** - [ ] 🟢 Green  - [ ] 🟡 Amber  - [ ] 🔴 Red  
**Overall completion:** `<__%>`  
**Hours planned / actual:** `<__ / __>`  
**Next gate:** `<milestone and date>`

### Summary

`<What changed this week? Is the project on track for the next gate and final demo?>`

### Milestones Hit

- [ ] `<milestone / date / evidence / gate decision>`
- [ ] `<milestone / date / evidence / gate decision>`
- [ ] `<milestone / date / evidence / gate decision>`

### Risks / Issues

| ID | Risk or issue | Impact | Probability | Owner | Mitigation / next action | Due date | Status |
|---|---|---|---|---|---|---:|---|
| R-___ | `<description>` | Low / Med / High | Low / Med / High | `<name>` | `<action>` | `<date>` | 🟢 / 🟡 / 🔴 |
| R-___ | `<description>` | Low / Med / High | Low / Med / High | `<name>` | `<action>` | `<date>` | 🟢 / 🟡 / 🔴 |

### Plans for Next Week

- [ ] `<priority 1 — WBS ID and expected verification>`
- [ ] `<priority 2 — WBS ID and expected verification>`
- [ ] `<priority 3 — WBS ID and expected verification>`
- [ ] `<decision or escalation required>`

### Budget / Schedule Variance

| Measure | Baseline | Actual / forecast | Variance | Explanation / recovery action |
|---|---:|---:|---:|---|
| Hours | `<__>` | `<__>` | `<+/- __>` | `<notes>` |
| Sprint days | `<__>` | `<__>` | `<+/- __>` | `<notes>` |
| Mac-day usage | `1 day` | `<planned / used>` | `<notes>` | `<notes>` |
| Scope items | `M0–M7` | `<current>` | `<notes>` | `<notes>` |

### Weekly Acceptance

- [ ] Summary reviewed with project owner.
- [ ] Risks have owners and dates.
- [ ] Next-week plan is achievable within remaining time.
- [ ] Variance is explained and recovery action is agreed.
- [ ] Milestone tracker and status log are updated.

## Week 1 Report — Foundation through Bridge

**Planned period:** July 25–31, 2026  
**Expected gates:** M0, M1, M2, M3

- **Summary:** `<notes>`
- **Milestones hit:** `<M0/M1/M2/M3 status and evidence>`
- **Risks/issues:** `<notes>`
- **Plans for next week:** API, UI, integration, and M6 test preparation.
- **Budget/schedule variance:** `<notes>`

## Week 2 Report — API, UI, and Code Freeze

**Planned period:** August 1–6, 2026  
**Expected gates:** M4, M5, M6

- **Summary:** `<notes>`
- **Milestones hit:** `<M4/M5/M6 status and evidence>`
- **Risks/issues:** `<notes>`
- **Plans for next week:** Stabilization, documentation, and Mac-day readiness.
- **Budget/schedule variance:** `<notes>`

## Week 3 Report — Stabilization and Evidence

**Planned period:** August 7–12, 2026  
**Expected focus:** M7 preparation, QA regression, documentation, rehearsal

- **Summary:** `<notes>`
- **Milestones hit:** `<stabilization outcomes>`
- **Risks/issues:** `<notes>`
- **Plans for next week:** Clean-room readiness, final backup, and go/no-go.
- **Budget/schedule variance:** `<notes>`

## Week 4 Report — Final Readiness and Demo Gate

**Planned period:** August 13–22, 2026  
**Expected gate:** M7

- **Summary:** `<notes>`
- **Milestones hit:** `<M7 status and build evidence>`
- **Risks/issues:** `<notes>`
- **Plans for next week:** `<post-demo or submission actions, if any>`
- **Budget/schedule variance:** `<notes>`

---

# 6. Definition of Done (DoD)

Complete every checkbox for each deliverable. If a criterion is intentionally not applicable, check it only after recording the reason in the Notes column.

## DoD — Unity Scripts

| Criterion | Complete | Evidence / notes |
|---|---|---|
| Code written | - [ ] | `<MarkerSpawner.cs / RNBridge.cs / other paths>` |
| Code reviewed | - [ ] | `<reviewer / date / commit>` |
| Tests passing | - [ ] | `<Unity compile, editor test, device result>` |
| Documentation updated | - [ ] | `<architecture / bridge / known issues link>` |
| Stakeholder demo | - [ ] | `<date / audience / result>` |
| Sign-off received | - [ ] | `<name / date>` |

## DoD — React Native Components

| Criterion | Complete | Evidence / notes |
|---|---|---|
| Code written | - [ ] | `<UnityARView, screens, hooks, navigation paths>` |
| Code reviewed | - [ ] | `<reviewer / date / commit>` |
| Tests passing | - [ ] | `<static checks, smoke tests, edge cases>` |
| Documentation updated | - [ ] | `<user flow / component / API notes>` |
| Stakeholder demo | - [ ] | `<date / audience / result>` |
| Sign-off received | - [ ] | `<name / date>` |

## DoD — RN ↔ Unity Bridge

| Criterion | Complete | Evidence / notes |
|---|---|---|
| Code written | - [ ] | `<RN wrapper, Unity receiver/sender, native manager>` |
| Code reviewed | - [ ] | `<reviewer / date / commit>` |
| Tests passing | - [ ] | `<message contract, payload, malformed input, device test>` |
| Documentation updated | - [ ] | `<message names / payload schema / Mac integration steps>` |
| Stakeholder demo | - [ ] | `<date / audience / result>` |
| Sign-off received | - [ ] | `<name / date>` |

## DoD — iOS Build

| Criterion | Complete | Evidence / notes |
|---|---|---|
| Code written | - [ ] | `<iOS native changes / Info.plist / project settings>` |
| Code reviewed | - [ ] | `<reviewer / date / commit>` |
| Tests passing | - [ ] | `<Xcode build, install, physical-device AR happy path>` |
| Documentation updated | - [ ] | `<Mac runbook / launch guide / known issues>` |
| Stakeholder demo | - [ ] | `<date / audience / result>` |
| Sign-off received | - [ ] | `<name / date>` |

## DoD — Documentation

| Criterion | Complete | Evidence / notes |
|---|---|---|
| Code written | - [ ] | `<N/A or documentation-supporting examples/configuration>` |
| Code reviewed | - [ ] | `<reviewer / date>` |
| Tests passing | - [ ] | `<commands and launch steps verified>` |
| Documentation updated | - [ ] | `<user guide / architecture / API / bug log>` |
| Stakeholder demo | - [ ] | `<documentation walkthrough date>` |
| Sign-off received | - [ ] | `<name / date>` |

## Project-Level Demo Acceptance

- [ ] The local iOS build installs and launches on the target iPhone.
- [ ] Food list, food detail, and AR lesson screens work in sequence.
- [ ] Existing web API data loads, or the documented mock fallback works.
- [ ] RN sends the selected food payload to Unity.
- [ ] Unity sends a marker/interaction event back to RN or emits the documented device log.
- [ ] The elephant model appears over the printed food marker.
- [ ] Camera permission and recovery behavior are documented.
- [ ] Backup source/build/marker/demo artifacts are available.
- [ ] The timed demo rehearsal passes.

---

# 7. Status Update Log

Add one row at the end of each day. Use concise facts: what changed, what happens next, and what is blocked.

| Date | Milestone | Status Update | Next Steps | Blockers |
|---|---|---|---|---|
| Day 0 / Jul 25 | M0 | `<update>` | `<next steps>` | `<blockers>` |
| Day 1 / Jul 26 | M1 | `<update>` | `<next steps>` | `<blockers>` |
| Day 2 / Jul 27 | M1 | `<update>` | `<next steps>` | `<blockers>` |
| Day 3 / Jul 28 | M2 | `<update>` | `<next steps>` | `<blockers>` |
| Day 4 / Jul 29 | M2 | `<update>` | `<next steps>` | `<blockers>` |
| Day 5 / Jul 30 | M3 | `<update>` | `<next steps>` | `<blockers>` |
| Day 6 / Jul 31 | M3 | `<update>` | `<next steps>` | `<blockers>` |
| Day 7 / Aug 1 | M4 | `<update>` | `<next steps>` | `<blockers>` |
| Day 8 / Aug 2 | M4 | `<update>` | `<next steps>` | `<blockers>` |
| Day 9 / Aug 3 | M5 | `<update>` | `<next steps>` | `<blockers>` |
| Day 10 / Aug 4 | M5 | `<update>` | `<next steps>` | `<blockers>` |
| Day 11 / Aug 5 | M6 | `<update>` | `<next steps>` | `<blockers>` |
| Day 12 / Aug 6 | M6 | `<update>` | `<next steps>` | `<blockers>` |
| Day 13 / Aug 7 | M7 prep | `<update>` | `<next steps>` | `<blockers>` |
| Day 14 / Aug 8 | M7 prep | `<update>` | `<next steps>` | `<blockers>` |
| Day 15 / Aug 9 | M7 prep | `<update>` | `<next steps>` | `<blockers>` |
| Day 16 / Aug 10 | M7 prep | `<update>` | `<next steps>` | `<blockers>` |
| Day 17 / Aug 11 | M7 prep | `<update>` | `<next steps>` | `<blockers>` |
| Day 18 / Aug 12 | M7 prep | `<update>` | `<next steps>` | `<blockers>` |
| Day 19 / Aug 13 | M7 prep | `<update>` | `<next steps>` | `<blockers>` |
| Day 20 / Aug 14 | M7 prep | `<update>` | `<next steps>` | `<blockers>` |
| Day 21 / Aug 15 | M7 prep | `<update>` | `<next steps>` | `<blockers>` |
| Day 22 / Aug 22 | M7 | `<final update>` | `<post-demo next steps>` | `<blockers or accepted limitations>` |

---

# 8. Burndown Tracker

**Baseline:** 40 WBS tasks across M0–M7. The planned line below is a guide; update the **Actual remaining** column from checked WBS items. The count should reach zero only when the WBS task is verified, not merely coded.

| Sprint day | Planned date | Planned remaining | Actual remaining | Daily note |
|---:|---:|---:|---:|---|
| 0 | Jul 25 | 40 | `<__>` | Kickoff baseline |
| 1 | Jul 26 | 37 | `<__>` | Foundation setup |
| 2 | Jul 27 | 34 | `<__>` | M1 gate |
| 3 | Jul 28 | 31 | `<__>` | Marker library / scene |
| 4 | Jul 29 | 27 | `<__>` | M2 gate |
| 5 | Jul 30 | 24 | `<__>` | Bridge implementation |
| 6 | Jul 31 | 20 | `<__>` | M3 gate |
| 7 | Aug 1 | 18 | `<__>` | API client |
| 8 | Aug 2 | 15 | `<__>` | M4 gate |
| 9 | Aug 3 | 12 | `<__>` | List/detail UI |
| 10 | Aug 4 | 9 | `<__>` | M5 gate |
| 11 | Aug 5 | 6 | `<__>` | Integration hardening |
| 12 | Aug 6 | 4 | `<__>` | M6 code freeze |
| 13 | Aug 7 | 4 | `<__>` | Stabilization baseline |
| 14 | Aug 8 | 3 | `<__>` | Risk burn-down |
| 15 | Aug 9 | 3 | `<__>` | Documentation |
| 16 | Aug 10 | 2 | `<__>` | Regression round |
| 17 | Aug 11 | 2 | `<__>` | Rehearsal 1 |
| 18 | Aug 12 | 2 | `<__>` | Device/marker readiness |
| 19 | Aug 13 | 1 | `<__>` | Clean-room readiness |
| 20 | Aug 14 | 1 | `<__>` | Final change review |
| 21 | Aug 15 | 1 | `<__>` | Mac-day go/no-go |
| 22 | Aug 22 | 0 | `<__>` | M7 final demo gate |

### Planned Burndown Shape

```text
Tasks remaining
40 |■■■■■■■■■■■■■■■■■■■■
35 |■■■■■■■■■■■■■■■■■
30 |■■■■■■■■■■■■■■■■
25 |■■■■■■■■■■■■■
20 |■■■■■■■■■■
15 |■■■■■■■■
10 |■■■■■
 5 |■■
 0 | 
   +----+----+----+----+----+----+---->
   D0   D4   D8   D12  D16  D20  D22
```

**Burndown rule:** If actual remaining is above the planned line for two consecutive updates, mark the project Amber and document a recovery action. If a critical path item is blocked with no workaround, mark Red and escalate before starting unrelated scope.

---

# 9. Sign-off and Closure

## Final Sign-off Checklist

- [ ] M0–M7 gate decisions are recorded.
- [ ] All release-critical WBS tasks are checked.
- [ ] Unity Scripts DoD is complete.
- [ ] React Native Components DoD is complete.
- [ ] RN ↔ Unity Bridge DoD is complete.
- [ ] iOS Build DoD is complete.
- [ ] Documentation DoD is complete.
- [ ] Physical-device demo evidence is attached or linked.
- [ ] Backup build/source/marker/fallback artifacts are available.
- [ ] Known limitations are written and accepted.
- [ ] Final schedule and budget/hour variance are reviewed.
- [ ] The status log and burndown are up to date.

## Approval Record

### Project Manager

- **Name:** `<name>`
- **Decision:** - [ ] Approved  - [ ] Approved with conditions  - [ ] Not approved
- **Conditions / comments:** `<notes>`
- **Signature / initials:** `<signature>`
- **Date:** `<date>`

### Technical Lead

- **Name:** `<name>`
- **Decision:** - [ ] Approved  - [ ] Approved with conditions  - [ ] Not approved
- **Conditions / comments:** `<notes>`
- **Signature / initials:** `<signature>`
- **Date:** `<date>`

### Sponsor / Advisor / Professor

- **Name:** `<name>`
- **Decision:** - [ ] Approved  - [ ] Approved with conditions  - [ ] Not approved
- **Conditions / comments:** `<notes>`
- **Signature / initials:** `<signature>`
- **Date:** `<date>`

---

## Decision and Change Log

| Date | Decision / change | Reason | Impact on scope, schedule, or risk | Approved by |
|---|---|---|---|---|
| Jul 25, 2026 | Local iOS demo only; reuse API and existing assets | Graduation-project time and hardware constraints | Removes Firebase, Android, auth, CI/CD, App Store work | `<name>` |
| `<date>` | `<decision>` | `<reason>` | `<impact>` | `<name>` |
| `<date>` | `<decision>` | `<reason>` | `<impact>` | `<name>` |

---

**Document owner:** `<Your Name>`  
**Project status:** 🟡 Amber at kickoff  
**Target:** M7 Demo Ready — August 22, 2026  
**Next action:** Complete the Day 0 M0 audit and update the dashboard before starting M1.
