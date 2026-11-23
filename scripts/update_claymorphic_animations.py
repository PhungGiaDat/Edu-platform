#!/usr/bin/env python3
"""
Update claymorphic-animals-001 targets with correct animations.
Model ragdollcat_mobile.glb has multiple animations for different animals.
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

if not SUPABASE_URL or not SERVICE_KEY:
    print("ERROR: Missing env vars")
    sys.exit(1)

# All animations available in ragdollcat_mobile.glb
# Each animal has IDLE, and some have EAT animations
ALL_ANIMATIONS = [
    "CAT_IDLE", "CAT_MEOW", "CAT_EAT",
    "FISH_IDLE", "FISH_SWIM",
    "RABBIT_IDLE", "RABBIT_JUMP", "RABBIT_EAT",
    "ELEPHANT_IDLE", "ELEPHANT_SPRAY", "ELEPHANT_EAT",
    "PANDA_IDLE", "PANDA_EAT",
    "TIGER_IDLE", "TIGER_ROAR", "TIGER_EAT",
]

# Claymorphic targets with their animations
CLAYMORPHIC_TARGETS = {
    "cat001": {
        "description": "Claymorphic cat for AR vocabulary learning",
        "animations": ["CAT_IDLE", "CAT_MEOW", "CAT_EAT"],
        "default_animation": "CAT_IDLE",
    },
    "fish001": {
        "description": "Claymorphic fish for AR vocabulary learning",
        "animations": ["FISH_IDLE", "FISH_SWIM"],
        "default_animation": "FISH_IDLE",
    },
    "rabbit001": {
        "description": "Claymorphic rabbit for AR vocabulary learning",
        "animations": ["RABBIT_IDLE", "RABBIT_JUMP", "RABBIT_EAT"],
        "default_animation": "RABBIT_IDLE",
    },
    "carrot001": {
        "description": "Claymorphic carrot for AR vocabulary learning",
        "animations": ["CARROT_IDLE"],
        "default_animation": "CARROT_IDLE",
    },
    "elephant001": {
        "description": "Claymorphic elephant for AR vocabulary learning",
        "animations": ["ELEPHANT_IDLE", "ELEPHANT_SPRAY", "ELEPHANT_EAT"],
        "default_animation": "ELEPHANT_IDLE",
    },
    "grass001": {
        "description": "Claymorphic grass for AR vocabulary learning",
        "animations": ["GRASS_SWAY"],
        "default_animation": "GRASS_SWAY",
    },
    "panda001": {
        "description": "Claymorphic panda for AR vocabulary learning",
        "animations": ["PANDA_IDLE", "PANDA_EAT"],
        "default_animation": "PANDA_IDLE",
    },
    "bamboo001": {
        "description": "Claymorphic bamboo for AR vocabulary learning",
        "animations": ["BAMBOO_SWAY"],
        "default_animation": "BAMBOO_SWAY",
    },
    "tiger001": {
        "description": "Claymorphic tiger for AR vocabulary learning",
        "animations": ["TIGER_IDLE", "TIGER_ROAR", "TIGER_EAT"],
        "default_animation": "TIGER_IDLE",
    },
    "meat001": {
        "description": "Claymorphic meat for AR vocabulary learning",
        "animations": ["MEAT_IDLE"],
        "default_animation": "MEAT_IDLE",
    },
}

def update_ar_objects():
    """Update ar_objects with animation arrays."""
    # First, add new columns if not exists
    add_columns_sql = """
    ALTER TABLE public.ar_objects
    ADD COLUMN IF NOT EXISTS animations TEXT[],
    ADD COLUMN IF NOT EXISTS default_animation TEXT;
    """

    response = requests.post(
        f"{SUPABASE_URL}/rest/v1/rpc/exec",
        headers={
            "apikey": SERVICE_KEY,
            "Authorization": f"Bearer {SERVICE_KEY}",
            "Content-Type": "application/json",
        },
        json={"query": add_columns_sql},
        verify=False,
    )

    print("Columns check/creation:", response.status_code)

    # Update each target
    results = []
    for qr_id, data in CLAYMORPHIC_TARGETS.items():
        payload = {
            "description": data["description"],
            "animations": data["animations"],
            "default_animation": data["default_animation"],
            "mind_catalog_id": "animal-combo-v1",  # Rename catalog
        }

        response = requests.patch(
            f"{SUPABASE_URL}/rest/v1/ar_objects?ar_tag=eq.{qr_id}",
            headers={
                "apikey": SERVICE_KEY,
                "Authorization": f"Bearer {SERVICE_KEY}",
                "Content-Type": "application/json",
                "Prefer": "return=minimal",
            },
            json=payload,
            verify=False,
        )

        results.append({
            "qr_id": qr_id,
            "status": response.status_code,
            "animations": data["animations"],
        })
        print(f"  {qr_id}: {response.status_code} - {data['animations']}")

    return results


def update_ar_combinations():
    """Update ar_combinations with animation from ragdollcat model."""
    updates = {
        "clay_cat_fish": {"animation": "CAT_EAT", "phrase": "Meow! The cat eats fish!"},
        "clay_rabbit_carrot": {"animation": "RABBIT_EAT", "phrase": "Hop! The rabbit eats carrot!"},
        "clay_elephant_grass": {"animation": "ELEPHANT_EAT", "phrase": "The elephant eats grass!"},
        "clay_panda_bamboo": {"animation": "PANDA_EAT", "phrase": "Yum! The panda eats bamboo!"},
        "clay_tiger_meat": {"animation": "TIGER_EAT", "phrase": "Roar! The tiger eats meat!"},
    }

    results = []
    for combo_id, data in updates.items():
        payload = {
            "model_3d_url": "https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/3dmodel/ragdollcat_mobile.glb",
            "animation": data["animation"],
            "phrase": data["phrase"],
        }

        response = requests.patch(
            f"{SUPABASE_URL}/rest/v1/ar_combinations?combo_id=eq.{combo_id}",
            headers={
                "apikey": SERVICE_KEY,
                "Authorization": f"Bearer {SERVICE_KEY}",
                "Content-Type": "application/json",
                "Prefer": "return=minimal",
            },
            json=payload,
            verify=False,
        )

        results.append({
            "combo_id": combo_id,
            "status": response.status_code,
            "animation": data["animation"],
        })
        print(f"  {combo_id}: {response.status_code} - {data['animation']}")

    return results


def main():
    print("=" * 70)
    print("Update Claymorphic Animations")
    print("=" * 70)

    print("\n1. Updating ar_objects...")
    ar_results = update_ar_objects()

    print("\n2. Updating ar_combinations...")
    combo_results = update_ar_combinations()

    # Save results
    output = {
        "ar_objects_updated": ar_results,
        "combinations_updated": combo_results,
        "catalog_renamed": "claymorphic-v1 -> animal-combo-v1",
    }

    output_file = Path(__file__).parent.parent / "docs" / "claymorphic_animations_update.json"
    output_file.parent.mkdir(parents=True, exist_ok=True)
    with open(output_file, "w") as f:
        json.dump(output, f, indent=2)

    print(f"\n{'=' * 70}")
    print(f"Results saved to: {output_file}")
    print(f"ar_objects updated: {sum(1 for r in ar_results if r['status'] in (200, 204))}/{len(ar_results)}")
    print(f"combinations updated: {sum(1 for r in combo_results if r['status'] in (200, 204))}/{len(combo_results)}")
    print("=" * 70)


if __name__ == "__main__":
    main()
