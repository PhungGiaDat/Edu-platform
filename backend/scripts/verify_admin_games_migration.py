"""Verify the admin games migration state on Supabase PostgreSQL."""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from settings import settings  # noqa: E402
import asyncpg  # noqa: E402


async def main() -> None:
    url = settings.DATABASE_URL.get_secret_value()
    conn = await asyncpg.connect(url, statement_cache_size=0)
    try:
        topics = await conn.fetch(
            "SELECT slug, name_vi FROM public.game_topics ORDER BY sort_order")
        for t in topics:
            print("topic:", t["slug"], "->", t["name_vi"])
        cols = await conn.fetch(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_name='courses' AND column_name='is_template'")
        print("is_template column present:", len(cols) == 1)
        gcount = await conn.fetchval("SELECT count(*) FROM public.games")
        print("games rows:", gcount)
        vcount = await conn.fetchval("SELECT count(*) FROM public.game_vocab_items")
        print("vocab rows:", vcount)
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
