# MindAR compiler options

The official MindAR compiler lives at
https://hiukim.github.io/mind-ar-js-doc/tools/compile and exposes the
following knobs.

## Web UI fields

| Field         | Default | Purpose                                          |
| ------------- | ------- | ------------------------------------------------ |
| Images        | (file)  | One or more input JPG/PNG/WebP                    |
| Output name   | `targets` | Stem of the output `.mind` file                |
| Filter type   | `0`     | Feature extraction profile (0=default, 1=fast)   |

## CLI equivalents

| CLI flag         | Notes                                             |
| ---------------- | ------------------------------------------------- |
| `--input`        | Directory of images or list of file paths         |
| `--output`       | Output path (without extension); `.mind` added   |
| `--filter`       | `0` (default, higher quality) or `1` (fast)       |

## Output file format

The `.mind` file is a protobuf-encoded binary bundle. MindAR loads it via
`fetch()` and parses internally. It's typically ~150–300KB per target.

## Index semantics

`targetIndex` is **the order images were supplied**, 0-based:

| Source file order | targetIndex |
| ----------------- | ----------- |
| poster-01.jpg     | 0           |
| poster-02.jpg     | 1           |
| poster-03.jpg     | 2           |

Renaming files doesn't change indices; reordering them does. If the
compiler sees an alphabetical sort by default, don't rely on it.

## Manifest convention

When the MCP tool compiles with `emitManifest: true`, the manifest is
written next to the `.mind` file as `manifest.json`:

```json
{
  "version": 1,
  "compiledAt": "2026-08-04T10:00:00Z",
  "compilerVersion": "1.2.5",
  "filterType": 0,
  "targets": [
    {
      "index": 0,
      "name": "apple",
      "source": "apple.jpg",
      "width": 1024,
      "height": 1024,
      "fileSize": 184320
    }
  ]
}
```

The consumer (`MindARThree` runtime code) can read this to map human
names to indices, avoiding magic numbers.

## Cache invalidation

The `.mind` is content-addressed. Cache it keyed on:

1. SHA-256 of the sorted list of source files (names + contents)
2. Compiler version
3. Filter type

If any change, recompile.

## Building a CI workflow

```yaml
- name: Compile MindAR targets
  run: |
    node scripts/validate-targets.mjs targets/source
    npx mindar-compiler \
      --input targets/source \
      --output public/targets/targets.mind
- uses: actions/upload-artifact@v4
  with:
    name: mindar-targets
    path: public/targets/
```