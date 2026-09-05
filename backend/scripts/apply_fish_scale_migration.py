"""Apply the fish001 scale migration to Supabase PostgreSQL.

Usage:
    python -m scripts.apply_fish_scale_migration

Requires DATABASE_URL in environment or .env file.
Run from backend/ directory.
"""

import asyncio
import sys
from pathlib import Path

import asyncpg

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from settings import settings


MIGRATION_SQL = """
-- 20260904_01_ar_fish_scale_cat_combo_animation.sql
-- fish: shrink to food-sized. Viewer treats scale as uniform scalar (parseScale
-- takes the first numeric component), so use a single-tuple value.
UPDATE public.ar_objects
SET scale = '0.35 0.35 0.35',
    updated_at = NOW()
WHERE ar_tag = 'fish001';

-- cat: bind combo_animation to CAT_EAT (cat-specific clip name in ragdollcat_mobile_v1.glb).
UPDATE public.ar_objects
SET combo_animation = 'CAT_EAT',
    updated_at = NOW()
WHERE ar_tag = 'cat001';
"""


async def main() -> None:
    database_url = settings.DATABASE_URL.get_secret_value() if settings.DATABASE_URL else None
    if not database_url:
        raise SystemExit("DATABASE_URL is not configured — cannot connect to Supabase PostgreSQL")

    print("[apply_fish_scale] Connecting to Supabase PostgreSQL...")
    conn = await asyncpg.connect(
        database_url,
        statement_cache_size=0,
        ssl="require",
    )
    try:
        # Show current state
        before = await conn.fetchrow(
            "SELECT ar_tag, scale, combo_animation FROM public.ar_objects WHERE ar_tag IN ('fish001', 'cat001')"
        )
        print(f"[before] fish001 scale={before['scale']}, cat001 combo_animation={before['combo_animation']}")

        # Apply migration
        await conn.execute(MIGRATION_SQL)
        print("[apply_fish_scale] Migration SQL executed.")

        # Verify
        rows = await conn.fetch(
            "SELECT ar_tag, scale, combo_animation FROM public.ar_objects WHERE ar_tag IN ('fish001', 'cat001') ORDER BY ar_tag"
        )
        for row in rows:
            print(f"[verify] {row['ar_tag']}: scale={row['scale']}, combo_animation={row['combo_animation']}")

        fish_scale = next((r['scale'] for r in rows if r['ar_tag'] == 'fish001'), None)
        cat_combo = next((r['combo_animation'] for r in rows if r['ar_tag'] == 'cat001'), None)

        if fish_scale == '0.35 0.35 0.35' and cat_combo == 'CAT_EAT':
            print("[OK] fish001 scale → 0.35 0.35 0.35")
            print("[OK] cat001 combo_animation → CAT_EAT")
        else:
            raise SystemExit(f"[FAIL] Unexpected values — fish001 scale={fish_scale}, cat001 combo_animation={cat_combo}")

    finally:
        await conn.close()


if __name__ == '__main__':
    asyncio.run(main())
