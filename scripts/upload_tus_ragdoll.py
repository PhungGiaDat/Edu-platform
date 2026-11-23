#!/usr/bin/env python3
"""
Upload 3D models (ragdollcat) via TUS resumable upload protocol
Used for large files (>50MB)
"""

import os
import sys
import json
import base64
import requests
from pathlib import Path
from dotenv import load_dotenv
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

env_path = Path(__file__).parent.parent / "backend" / ".env"
load_dotenv(env_path)

SUPABASE_URL = os.getenv("SUPABASE_PROJECT_URL")
SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
BUCKET = "AR_models"

if not SUPABASE_URL or not SERVICE_KEY:
    print("ERROR: Missing env vars")
    sys.exit(1)


def encode_metadata(**kwargs) -> str:
    """Encode TUS metadata as base64 key value pairs."""
    parts = []
    for key, value in kwargs.items():
        encoded_value = base64.b64encode(str(value).encode("utf-8")).decode("ascii")
        parts.append(f"{key} {encoded_value}")
    return ",".join(parts)


def upload_via_tus(local_path: str, remote_path: str) -> dict:
    """Upload via Supabase TUS endpoint (handles large files)."""
    file_size = os.path.getsize(local_path)

    url = f"{SUPABASE_URL}/storage/v1/upload/resumable"

    base_headers = {
        "Authorization": f"Bearer {SERVICE_KEY}",
        "x-upsert": "true",
    }

    # Step 1: Create upload session
    metadata_str = encode_metadata(
        bucketName=BUCKET,
        objectName=remote_path,
        contentType="model/gltf-binary",
    )

    session_headers = {
        **base_headers,
        "Tus-Resumable": "1.0.0",
        "Upload-Length": str(file_size),
        "Upload-Metadata": metadata_str,
    }

    print(f"  Creating TUS session for {remote_path} ({file_size / 1024 / 1024:.2f} MB)...")
    response = requests.post(url, headers=session_headers, timeout=30, verify=False)

    if response.status_code != 201:
        return {"success": False, "error": f"Session creation failed: {response.status_code} {response.text[:200]}"}

    upload_url = response.headers.get("Location")
    if not upload_url:
        return {"success": False, "error": "No upload URL returned"}

    # Step 2: Upload file in chunks
    chunk_size = 6 * 1024 * 1024  # 6MB chunks

    with open(local_path, "rb") as f:
        offset = 0
        while offset < file_size:
            chunk = f.read(chunk_size)
            if not chunk:
                break

            chunk_headers = {
                **base_headers,
                "Tus-Resumable": "1.0.0",
                "Upload-Offset": str(offset),
                "Content-Type": "application/offset+octet-stream",
            }

            chunk_response = requests.patch(upload_url, headers=chunk_headers, data=chunk, timeout=120, verify=False)

            if chunk_response.status_code != 204:
                return {"success": False, "error": f"Chunk upload failed at offset {offset}: {chunk_response.status_code}"}

            offset += len(chunk)
            progress = (offset / file_size) * 100
            print(f"\r  Progress: {progress:.1f}% ({offset / 1024 / 1024:.2f} MB / {file_size / 1024 / 1024:.2f} MB)", end="", flush=True)

    print()

    public_url = f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{remote_path}"
    return {
        "success": True,
        "local": local_path,
        "remote": remote_path,
        "public_url": public_url,
        "size_bytes": file_size,
    }


def main():
    project_root = Path(__file__).parent.parent
    ragdoll_dir = project_root / "3DModels" / "ragdollcat"

    if not ragdoll_dir.exists():
        print(f"ERROR: {ragdoll_dir} not found")
        sys.exit(1)

    files = [
        ("ragdollcat_runtime_master.glb", "3dmodel/ragdollcat_master.glb"),
        ("ragdollcat_runtime_mobile.glb", "3dmodel/ragdollcat_mobile.glb"),
    ]

    results = []
    for local_name, remote_path in files:
        local_path = ragdoll_dir / local_name
        if not local_path.exists():
            print(f"SKIP: {local_name}")
            continue

        print(f"\nUploading {local_name} -> {remote_path}")
        result = upload_via_tus(str(local_path), remote_path)
        results.append(result)

        if result["success"]:
            print(f"  OK: {result['public_url']}")
        else:
            print(f"  FAIL: {result.get('error')}")

    # Save results
    output_file = project_root / "docs" / "upload_ragdoll_results.json"
    with open(output_file, "w") as f:
        json.dump({"uploaded": results}, f, indent=2)

    print(f"\n{'=' * 70}")
    print(f"Results: {sum(1 for r in results if r['success'])}/{len(results)} succeeded")
    print(f"Saved to: {output_file}")

    # Print public URLs
    print("\nPublic URLs:")
    for r in results:
        if r["success"]:
            print(f"  {r['public_url']}")


if __name__ == "__main__":
    main()
