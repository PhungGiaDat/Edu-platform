# Task 13: Vendor A-Frame 1.4.2 and MindAR 1.2.5 Locally

> **Plan reference:** extends `2026-08-06-shared-mind-persistent-viewer.md` Task 6 scope
> **Spec reference:** `docs/superpowers/specs/2026-08-06-shared-mind-persistent-viewer-design.md` — "Local QR Decoder" section

## Goal

Replace CDN URLs for A-Frame and MindAR with locally vendored copies in `static/vendor/`, removing CDN availability from the AR bootstrap critical path.

## Motivation

- Offline/corporate network resilience (no CDN dependency)
- CSP (Content Security Policy) compliance — avoid dynamic script loading from third-party origins
- Consistency with jsQR vendor (Task 6) — all AR runtime dependencies now local

## Files changed

| File | Action |
|------|--------|
| `frontend-web/public/static/vendor/aframe-1.4.2.min.js` | Create — downloaded from CDN |
| `frontend-web/public/static/vendor/mindar-image-aframe-1.2.5.prod.js` | Create — downloaded from CDN |
| `frontend-web/public/ar-viewer.html` | Modify — replace 2 CDN URLs |
| `frontend-web/src/__tests__/arViewerBootstrapContract.test.ts` | Modify — assert local paths |

## Step 1: Download A-Frame 1.4.2

```powershell
# Download to static/vendor/
$url = "https://aframe.io/releases/1.4.2/aframe.min.js"
$out = "frontend-web/public/static/vendor/aframe-1.4.2.min.js"
Invoke-WebRequest -Uri $url -OutFile $out
```

Verify: file exists, non-zero size.

## Step 2: Download MindAR A-Frame 1.2.5 prod

```powershell
$url = "https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-aframe.prod.js"
$out = "frontend-web/public/static/vendor/mindar-image-aframe-1.2.5.prod.js"
Invoke-WebRequest -Uri $url -OutFile $out
```

Verify: file exists, non-zero size.

## Step 3: Update `ar-viewer.html`

Replace lines 304–305 (CDN URLs) with local paths:

```js
// Before:
await loadScript('https://aframe.io/releases/1.4.2/aframe.min.js', 'aframe', deadlineAt);
await loadScript('https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-aframe.prod.js', 'mindar', deadlineAt);

// After:
await loadScript('/static/vendor/aframe-1.4.2.min.js', 'aframe', deadlineAt);
await loadScript('/static/vendor/mindar-image-aframe-1.2.5.prod.js', 'mindar', deadlineAt);
```

## Step 4: Update `arViewerBootstrapContract.test.ts`

Replace lines 18–19:

```ts
// Before:
expect(viewerHtml).toContain("loadScript('https://aframe.io/releases/1.4.2/aframe.min.js', 'aframe'");
expect(viewerHtml).toContain("loadScript('https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-aframe.prod.js', 'mindar'");

// After:
expect(viewerHtml).toContain("'/static/vendor/aframe-1.4.2.min.js'");
expect(viewerHtml).toContain("'/static/vendor/mindar-image-aframe-1.2.5.prod.js'");
```

Also add assertion that CDN URLs are no longer present (negative test):

```ts
expect(viewerHtml).not.toContain('aframe.io/releases');
expect(viewerHtml).not.toContain('cdn.jsdelivr.net/npm/mind-ar');
```

## Step 5: Run contract test

```bash
cd frontend-web
npm.cmd test -- src/__tests__/arViewerBootstrapContract.test.ts
```

Expected: PASS.

## Step 6: Verify all vendor files parse

```bash
node --check frontend-web/public/static/vendor/aframe-1.4.2.min.js
node --check frontend-web/public/static/vendor/mindar-image-aframe-1.2.5.prod.js
```

Expected: exit 0 for both.

## Step 7: Commit

```bash
git add frontend-web/public/static/vendor/aframe-1.4.2.min.js \
        frontend-web/public/static/vendor/mindar-image-aframe-1.2.5.prod.js \
        frontend-web/public/ar-viewer.html \
        frontend-web/src/__tests__/arViewerBootstrapContract.test.ts
git commit -m "feat(ar): vendor A-Frame and MindAR locally, remove CDN bootstrap dependency"
```

## Verification checklist

- [ ] `aframe-1.4.2.min.js` exists in `static/vendor/` and is non-zero size
- [ ] `mindar-image-aframe-1.2.5.prod.js` exists in `static/vendor/` and is non-zero size
- [ ] `ar-viewer.html` contains no `aframe.io/releases` URL
- [ ] `ar-viewer.html` contains no `cdn.jsdelivr.net/npm/mind-ar` URL
- [ ] `arViewerBootstrapContract.test.ts` passes
- [ ] Both JS files pass `node --check`
- [ ] `ar-scanner.html` still uses its own script loading (no unintended changes)
