"""Create or repair a superuser (role=admin) in Supabase PostgreSQL.

Usage:
    $env:ADMIN_EMAIL="admin@example.com"
    $env:ADMIN_USERNAME="admin"
    $env:ADMIN_PASSWORD="secret123"
    python -m scripts.create_admin_pg

Idempotent: promotes existing account if found (by email or username),
otherwise creates a new one.
"""
import asyncio
import os
import sys
from pathlib import Path

import asyncpg

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from core.security import get_password_hash  # noqa: E402
from settings import settings  # noqa: E402


async def main() -> None:
    email = os.getenv("ADMIN_EMAIL", "").strip()
    username = os.getenv("ADMIN_USERNAME", "").strip()
    password = os.getenv("ADMIN_PASSWORD", "").strip()
    if not email or not username or not password:
        raise SystemExit("ADMIN_EMAIL, ADMIN_USERNAME and ADMIN_PASSWORD are required")

    url = settings.DATABASE_URL.get_secret_value()
    conn = await asyncpg.connect(url, statement_cache_size=0)
    try:
        pwd_hash = get_password_hash(password)
        existing = await conn.fetchrow(
            "SELECT id FROM public.users WHERE email=$1 OR username=$2",
            email, username,
        )
        if existing:
            await conn.execute(
                """UPDATE public.users
                      SET is_superuser=TRUE, is_active=TRUE, is_verified=TRUE,
                          role='admin', hashed_password=$2, updated_at=now()
                    WHERE id=$1""",
                existing["id"], pwd_hash,
            )
            print(f"Promoted existing user {existing['id']} to superuser/admin")
        else:
            new_id = await conn.fetchval(
                """INSERT INTO public.users
                       (id, email, username, hashed_password, full_name,
                        is_active, is_verified, is_superuser, role)
                   VALUES (gen_random_uuid()::text, $1, $2, $3, $4,
                           TRUE, TRUE, TRUE, 'admin')
                   RETURNING id""",
                email, username, pwd_hash, "Administrator",
            )
            print(f"Created superuser admin {new_id}")
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
