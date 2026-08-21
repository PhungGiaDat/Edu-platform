#!/usr/bin/env python3
"""
Upload 3D models (ragdollcat) to Supabase Storage under 3dmodel/ folder
Auto-organizes files into correct categories
"""

import os
import sys
import json
import requests
from pathlib import Path
from dotenv import load_dotenv
import urllib3
# Suppress SSL warnings
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Load env
env_path = Path(__file__).parent.parent / "backend" / ".env"
load_dotenv(env_path)

SUPABASE_URL = os.getenv("SUPABASE_PROJECT_URL")
SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
BUCKET = "AR_models"

if not SUPABASE_URL or not SERVICE_KEY:
    print("ERROR: Missing SUPABASE_PROJECT_URL or SUPABASE_SERVICE_ROLE_KEY")
    sys.exit(1)


def upload_file(local_path: str, remote_path: str, retries: int = 3) -> dict:
    """Upload file to Supabase Storage with retry logic for large files."""
    url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{remote_path}"

    headers = {
        "Authorization": f"Bearer {SERVICE_KEY}",
        "Content-Type": "model/gltf-binary",
        "x-upsert": "true",
    }

    for attempt in range(retries):
        try:
            with open(local_path, "rb") as f:
                file_data = f.read()

            response = requests.post(
                url, headers=headers, data=file_data, timeout=300, verify=False
            )

            if response.status_code in (200, 201):
                public_url = f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{remote_path}"
                return {
                    "success": True,
                    "local": local_path,
                    "remote": remote_path,
                    "public_url": public_url,
                    "size_bytes": len(file_data),
                }
            else:
                return {
                    "success": False,
                    "local": local_path,
                    "remote": remote_path,
                    "error": response.text,
                    "status": response.status_code,
                }
        except (requests.exceptions.SSLError, requests.exceptions.ConnectionError) as e:
            if attempt < retries - 1:
                print(f"    Retry {attempt + 1}/{retries} after error: {e}")
                continue
            return {
                "success": False,
                "local": local_path,
                "remote": remote_path,
                "error": str(e),
            }

    return {"success": False, "error": "All retries failed"}


def upload_ragdoll_models():
    """Upload ragdoll GLB files to 3dmodel/ folder."""
    project_root = Path(__file__).parent.parent
    ragdoll_dir = project_root / "3DModels" / "ragdollcat"

    if not ragdoll_dir.exists():
        print(f"ERROR: {ragdoll_dir} not found")
        return []

    results = []

    # Upload each GLB file to 3dmodel/ folder
    glb_files = [
        ("ragdollcat_runtime_master.glb", "3dmodel/ragdollcat_master.glb"),
        ("ragdollcat_runtime_mobile.glb", "3dmodel/ragdollcat_mobile.glb"),
    ]

    print(f"Uploading {len(glb_files)} ragdollcat GLB files to {BUCKET}/3dmodel/...")
    print("=" * 70)

    for local_name, remote_path in glb_files:
        local_path = ragdoll_dir / local_name
        if not local_path.exists():
            print(f"SKIP: {local_name} not found")
            continue

        size_mb = local_path.stat().st_size / (1024 * 1024)
        print(f"  Uploading {local_name} ({size_mb:.2f} MB) -> {remote_path}")

        result = upload_file(str(local_path), remote_path)
        results.append(result)

        if result["success"]:
            print(f"  OK: {result['public_url']}")
        else:
            print(f"  FAIL: {result.get('error', 'Unknown error')}")

    return results


def main():
    print("=" * 70)
    print("Upload 3D Models to Supabase Storage")
    print("=" * 70)
    print(f"Bucket: {BUCKET}")
    print(f"Supabase: {SUPABASE_URL}")
    print()

    results = upload_ragdoll_models()

    # Save results
    output_file = Path(__file__).parent.parent / "docs" / "upload_ragdoll_results.json"
    output_file.parent.mkdir(parents=True, exist_ok=True)
    with open(output_file, "w") as f:
        json.dump({"uploaded": results}, f, indent=2)

    print()
    print("=" * 70)
    print(f"Results saved to: {output_file}")
    print(f"Success: {sum(1 for r in results if r['success'])}/{len(results)}")
    print("=" * 70)

    # Print public URLs for database update
    print("\nPublic URLs:")
    for r in results:
        if r["success"]:
            print(f"  {r['remote']}")
            print(f"    -> {r['public_url']}")


if __name__ == "__main__":
    main()
