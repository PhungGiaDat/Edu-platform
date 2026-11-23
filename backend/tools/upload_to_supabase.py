"""
Supabase Asset Upload Tool
Uploads staged course assets to Supabase Storage bucket and verifies their existence.

Usage:
    python backend/tools/upload_to_supabase.py --bucket learnar-assets --source frontend/public/learnar-assets/courses
"""

from __future__ import annotations

import argparse
import json
import mimetypes
import os
import sys
import time
from pathlib import Path
from typing import NamedTuple
import urllib.error
import urllib.request
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent.parent
ENV_PATH = ROOT / "backend" / ".env"


def get_mime_type(path: Path) -> str:
    suffix = path.suffix.lower()
    mapping = {
        ".webp": "image/webp",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".svg": "image/svg+xml",
        ".gif": "image/gif",
        ".wav": "audio/wav",
        ".mp3": "audio/mpeg",
        ".mp4": "video/mp4",
        ".json": "application/json",
    }
    return mapping.get(suffix) or mimetypes.guess_type(str(path))[0] or "application/octet-stream"


def upload_file_to_supabase(
    supabase_url: str,
    service_key: str,
    bucket: str,
    local_file: Path,
    remote_path: str,
    max_retries: int = 3,
) -> tuple[bool, str]:
    url = f"{supabase_url.rstrip('/')}/storage/v1/object/{bucket}/{remote_path}"
    content_type = get_mime_type(local_file)
    headers = {
        "Authorization": f"Bearer {service_key}",
        "apikey": service_key,
        "Content-Type": content_type,
        "x-upsert": "true",
    }

    if not local_file.exists():
        return False, f"File not found: {local_file}"

    data = local_file.read_bytes()

    for attempt in range(1, max_retries + 1):
        req = urllib.request.Request(url, data=data, method="POST", headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                status = resp.status
            if status in (200, 201):
                return True, f"Uploaded ({status})"
            if status == 409:
                return True, "Already exists (409)"
            return False, f"HTTP {status}"
        except urllib.error.HTTPError as exc:
            body = exc.read().decode("utf-8", errors="replace")[:200]
            if exc.code == 409:
                return True, "Already exists (409)"
            if attempt < max_retries:
                time.sleep(1 * attempt)
                continue
            return False, f"HTTP {exc.code}: {body}"
        except Exception as exc:
            if attempt < max_retries:
                time.sleep(1 * attempt)
                continue
            return False, str(exc)

    return False, "Max retries exceeded"


def verify_public_url(public_url: str, max_retries: int = 3) -> tuple[bool, int, int]:
    for attempt in range(1, max_retries + 1):
        try:
            req = urllib.request.Request(public_url, method="HEAD")
            with urllib.request.urlopen(req, timeout=15) as resp:
                size = int(resp.headers.get("Content-Length", 0))
                return True, resp.status, size
        except urllib.error.HTTPError as exc:
            if attempt < max_retries:
                time.sleep(1)
                continue
            return False, exc.code, 0
        except Exception:
            if attempt < max_retries:
                time.sleep(1)
                continue
            return False, 0, 0
    return False, 0, 0


def main() -> None:
    parser = argparse.ArgumentParser(description="Upload assets to Supabase Storage")
    parser.add_argument("--bucket", default="learnar-assets", help="Target Supabase bucket")
    parser.add_argument("--source", default="frontend/public/learnar-assets/courses", help="Local directory of assets")
    parser.add_argument("--verify-only", action="store_true", help="Verify remote objects without uploading")
    args = parser.parse_args()

    if ENV_PATH.exists():
        load_dotenv(ENV_PATH, override=True)

    supabase_url = os.environ.get("SUPABASE_PROJECT_URL") or os.environ.get("SUPABASE_URL")
    service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

    if not supabase_url or not service_key:
        print("ERROR: SUPABASE_PROJECT_URL and SUPABASE_SERVICE_ROLE_KEY must be set in backend/.env")
        sys.exit(1)

    source_dir = ROOT / args.source
    if not source_dir.exists():
        print(f"ERROR: Source directory not found: {source_dir}")
        sys.exit(1)

    print(f"Bucket : {args.bucket}")
    print(f"Source : {source_dir}")
    print(f"Target : {supabase_url}/storage/v1/object/{args.bucket}/")
    print("=" * 70)

    # Discover all files to upload
    files_to_upload: list[tuple[Path, str]] = []
    for file_path in sorted(source_dir.rglob("*")):
        if file_path.is_file():
            # Remote path relative to learnar-assets root
            # E.g. courses/momo-home-family-english-5-7/...
            rel_path = file_path.relative_to(source_dir.parent).as_posix()
            files_to_upload.append((file_path, rel_path))

    print(f"Discovered {len(files_to_upload)} files to process.\n")

    results = []
    for local_file, remote_path in files_to_upload:
        public_url = f"{supabase_url.rstrip('/')}/storage/v1/object/public/{args.bucket}/{remote_path}"
        if not args.verify_only:
            ok, msg = upload_file_to_supabase(supabase_url, service_key, args.bucket, local_file, remote_path)
            upload_status = "OK" if ok else f"FAILED: {msg}"
        else:
            upload_status = "SKIPPED (verify-only)"

        # Verify object existence over HTTP
        exists, http_code, size = verify_public_url(public_url)

        res_item = {
            "local_file": str(local_file.relative_to(ROOT)).replace("\\", "/"),
            "remote_path": remote_path,
            "public_url": public_url,
            "upload_status": upload_status,
            "verified_exists": exists,
            "http_code": http_code,
            "size_bytes": size or local_file.stat().st_size,
        }
        results.append(res_item)
        print(f"[{res_item['upload_status']}] {remote_path} -> HTTP {http_code} ({res_item['size_bytes']} B)")

    print("\n" + "=" * 70)
    uploaded_count = sum(1 for r in results if r["verified_exists"])
    print(f"Verified Objects in Supabase: {uploaded_count}/{len(results)}")
    
    out_json = ROOT / "docs" / "supabase_course_assets_upload_report.json"
    out_json.parent.mkdir(parents=True, exist_ok=True)
    out_json.write_text(json.dumps(results, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Report written to: {out_json}")


if __name__ == "__main__":
    main()
