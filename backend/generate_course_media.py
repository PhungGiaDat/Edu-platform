"""
Generate demo media files for generated course manifests.

This creates lightweight local SVG/WAV placeholders for image, sticker, and
audio assets referenced by course seed JSON files. If SUPABASE_URL and
SUPABASE_SERVICE_ROLE_KEY are configured, it uploads generated files to the
learnar-assets bucket and marks uploaded asset references as ready in the seed.

Video assets are intentionally left pending unless a real video file already
exists at the generated local path. This avoids uploading invalid .mp4 files.
"""

from __future__ import annotations

import json
import math
import os
import wave
from pathlib import Path
from typing import Any, Dict, Iterable, Tuple
from urllib import request
from urllib.error import HTTPError, URLError

from dotenv import load_dotenv


ROOT = Path(__file__).resolve().parent
SEED_DIR = ROOT / "seeds" / "courses"
OUT_DIR = ROOT / "generated" / "learnar-assets"
BUCKET = os.getenv("LEARNAR_ASSETS_BUCKET", "learnar-assets")


def iter_assets(value: Any) -> Iterable[Dict[str, Any]]:
    if isinstance(value, dict):
        if {"bucket", "path", "type", "status"}.issubset(value.keys()):
            yield value
        for child in value.values():
            yield from iter_assets(child)
    elif isinstance(value, list):
        for child in value:
            yield from iter_assets(child)


def svg_text(label: str, color: str = "#6EB9FF") -> str:
    safe = label.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="{color}"/>
      <stop offset="100%" stop-color="#FFD93D"/>
    </linearGradient>
  </defs>
  <rect width="960" height="540" rx="48" fill="url(#bg)"/>
  <circle cx="160" cy="140" r="74" fill="#ffffff" opacity=".42"/>
  <circle cx="800" cy="410" r="110" fill="#ffffff" opacity=".34"/>
  <rect x="145" y="172" width="670" height="196" rx="42" fill="#ffffff" opacity=".88"/>
  <text x="480" y="292" text-anchor="middle" font-family="Arial, sans-serif" font-size="64" font-weight="800" fill="#1f2937">{safe}</text>
</svg>
"""


def write_wav(path: Path, seconds: float = 0.55, frequency: float = 660.0) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    rate = 16_000
    frames = int(rate * seconds)
    with wave.open(str(path), "w") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(rate)
        for i in range(frames):
            sample = int(12_000 * math.sin(2 * math.pi * frequency * (i / rate)))
            wav.writeframesraw(sample.to_bytes(2, byteorder="little", signed=True))


def local_path(asset: Dict[str, Any]) -> Path:
    return OUT_DIR / asset["path"]


def ensure_file(asset: Dict[str, Any]) -> Tuple[bool, Path | None, bool]:
    if asset.get("bucket") != BUCKET:
        return False, None, False
    path = local_path(asset)
    asset_type = asset.get("type")
    changed = False
    if asset_type in {"image", "sticker"}:
        if path.suffix.lower() != ".svg":
            path = path.with_suffix(".svg")
            new_path = str(path.relative_to(OUT_DIR)).replace("\\", "/")
            changed = asset["path"] != new_path
            asset["path"] = new_path
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(svg_text(Path(asset["path"]).stem), encoding="utf-8")
        return True, path, changed
    if asset_type == "audio":
        if path.suffix.lower() != ".wav":
            path = path.with_suffix(".wav")
            new_path = str(path.relative_to(OUT_DIR)).replace("\\", "/")
            changed = asset["path"] != new_path
            asset["path"] = new_path
        write_wav(path)
        return True, path, changed
    return path.exists(), path if path.exists() else None, False


def upload_file(supabase_url: str, key: str, asset: Dict[str, Any], path: Path) -> bool:
    url = f"{supabase_url.rstrip('/')}/storage/v1/object/{asset['bucket']}/{asset['path']}"
    content_type = "image/svg+xml" if path.suffix == ".svg" else "audio/wav" if path.suffix == ".wav" else "application/octet-stream"
    req = request.Request(
        url,
        data=path.read_bytes(),
        method="POST",
        headers={
            "Authorization": f"Bearer {key}",
            "apikey": key,
            "Content-Type": content_type,
            "x-upsert": "true",
        },
    )
    try:
        with request.urlopen(req, timeout=30) as response:
            return 200 <= response.status < 300
    except (HTTPError, URLError, TimeoutError) as exc:
        print(f"upload failed: {asset['path']} ({exc})")
        return False


def main() -> None:
    load_dotenv(ROOT / ".env")
    supabase_url = os.getenv("SUPABASE_URL")
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    can_upload = bool(supabase_url and service_key)
    generated = 0
    uploaded = 0

    for seed_path in sorted(SEED_DIR.glob("*.json")):
        payload = json.loads(seed_path.read_text(encoding="utf-8"))
        changed = False
        for asset in iter_assets(payload):
            ok, path, asset_changed = ensure_file(asset)
            changed = changed or asset_changed
            if not ok or not path:
                continue
            generated += 1
            if can_upload and upload_file(supabase_url, service_key, asset, path):
                asset["status"] = "ready"
                uploaded += 1
                changed = True
        if changed:
            seed_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    mode = "uploaded" if can_upload else "generated-local-only"
    print(f"{mode}: generated={generated}, uploaded={uploaded}, output={OUT_DIR}")


if __name__ == "__main__":
    main()
