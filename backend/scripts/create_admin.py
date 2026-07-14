"""Dry-run-first, idempotent admin account provisioning and privilege repair."""
import argparse
import asyncio
import os
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from core.security import get_password_hash
from database.connection import close_database_connection, connect_to_database
from models.user_mongo import UserDocument


def required_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise RuntimeError(f"Required environment variable {name} is not set")
    return value


async def provision(*, apply: bool, reset_password: bool) -> int:
    email = required_env("ADMIN_EMAIL")
    username = required_env("ADMIN_USERNAME")
    password = os.getenv("ADMIN_PASSWORD", "")

    await connect_to_database()
    try:
        by_email = await UserDocument.find_one(UserDocument.email == email)
        by_username = await UserDocument.find_one(UserDocument.username == username)
        if by_email and by_username and str(by_email.id) != str(by_username.id):
            raise RuntimeError("ADMIN_EMAIL and ADMIN_USERNAME belong to different accounts")

        user = by_email or by_username
        action = "repair" if user else "create"
        if (not user or reset_password) and not password:
            raise RuntimeError(
                "ADMIN_PASSWORD is required when creating an admin or resetting its password"
            )
        print(f"Plan: {action} admin account '{username}' ({email}); apply={apply}")
        if not apply:
            print("Dry run only. Re-run with --apply after reviewing the target environment.")
            return 0

        if user:
            user.is_superuser = True
            user.is_active = True
            user.is_verified = True
            user.role = "admin"
            user.roles = sorted(set((user.roles or []) + ["admin"]))
            if reset_password:
                user.hashed_password = get_password_hash(password)
            await user.save()
        else:
            user = UserDocument(
                email=email,
                username=username,
                hashed_password=get_password_hash(password),
                is_active=True,
                is_verified=True,
                is_superuser=True,
                role="admin",
                roles=["admin"],
            )
            await user.insert()

        print(f"Admin account {action} completed; password was not printed.")
        return 0
    finally:
        await close_database_connection()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true", help="Apply the reviewed change")
    parser.add_argument(
        "--reset-password",
        action="store_true",
        help="Replace an existing account password from ADMIN_PASSWORD (requires --apply)",
    )
    args = parser.parse_args()
    if args.reset_password and not args.apply:
        parser.error("--reset-password requires --apply")
    return asyncio.run(provision(apply=args.apply, reset_password=args.reset_password))


if __name__ == "__main__":
    raise SystemExit(main())
