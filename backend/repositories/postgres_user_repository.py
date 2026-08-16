"""PostgreSQL user identity repository for FastAPI runtime paths."""

from __future__ import annotations

from dataclasses import dataclass
import json
from datetime import datetime
from typing import Any, Optional
from uuid import uuid4

from database.postgres_connection import postgres_pool


@dataclass
class PostgresUser:
    id: str
    email: str
    username: str
    hashed_password: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    is_active: bool = True
    is_verified: bool = False
    is_superuser: bool = False
    role: str = "learner"
    roles: list[str] | None = None
    active_pet: Optional[str] = None
    unlocked_pets: list[str] | None = None
    pet_preferences: Optional[dict[str, Any]] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    last_login: Optional[datetime] = None

    @classmethod
    def from_row(cls, row) -> "PostgresUser":
        data = dict(row)
        for key in ("roles", "pet_preferences"):
            if isinstance(data.get(key), str):
                data[key] = json.loads(data[key])
        data["active_pet"] = data.pop("active_pet_id", None)
        data["roles"] = list(data.get("roles") or [])
        data["unlocked_pets"] = list(data.pop("unlocked_pets", []) or [])
        allowed = set(cls.__dataclass_fields__)
        return cls(**{key: value for key, value in data.items() if key in allowed})


class PostgresUserRepository:
    async def _with_unlocks(self, row) -> Optional[PostgresUser]:
        if row is None:
            return None
        user = PostgresUser.from_row(row)
        unlocked_pets = await postgres_pool().fetchval(
            "SELECT coalesce(jsonb_agg(pet_id ORDER BY pet_id), '[]'::jsonb) FROM public.user_unlocked_pets WHERE user_id=$1",
            user.id,
        )
        if isinstance(unlocked_pets, str):
            unlocked_pets = json.loads(unlocked_pets)
        user.unlocked_pets = list(unlocked_pets or [])
        return user

    async def get_by_id(self, user_id: str) -> Optional[PostgresUser]:
        row = await postgres_pool().fetchrow("SELECT * FROM public.users WHERE id=$1", user_id)
        return await self._with_unlocks(row)

    async def get_by_login(self, username_or_email: str) -> Optional[PostgresUser]:
        row = await postgres_pool().fetchrow(
            "SELECT * FROM public.users WHERE username=$1 OR email=$1", username_or_email
        )
        return await self._with_unlocks(row)

    async def get_by_email(self, email: str) -> Optional[PostgresUser]:
        row = await postgres_pool().fetchrow("SELECT * FROM public.users WHERE email=$1", email)
        return await self._with_unlocks(row)

    async def get_by_username(self, username: str) -> Optional[PostgresUser]:
        row = await postgres_pool().fetchrow("SELECT * FROM public.users WHERE username=$1", username)
        return await self._with_unlocks(row)

    async def create(self, *, email: str, username: str, hashed_password: str, full_name: str | None) -> PostgresUser:
        user_id = uuid4().hex
        row = await postgres_pool().fetchrow(
            """INSERT INTO public.users
               (id,email,username,full_name,hashed_password,is_active,is_verified,is_superuser,role,roles,created_at)
               VALUES ($1,$2,$3,$4,$5,TRUE,FALSE,FALSE,'learner','[]'::jsonb,now()) RETURNING *""",
            user_id, email, username, full_name, hashed_password,
        )
        return await self._with_unlocks(row)  # type: ignore[arg-type]

    async def update_profile(self, user_id: str, updates: dict[str, Any]) -> Optional[PostgresUser]:
        row = await postgres_pool().fetchrow(
            """UPDATE public.users SET full_name=COALESCE($2,full_name),
               avatar_url=COALESCE($3,avatar_url), updated_at=now() WHERE id=$1 RETURNING *""",
            user_id, updates.get("full_name"), updates.get("avatar_url"),
        )
        return await self._with_unlocks(row)

    async def set_active_pet(self, user_id: str, pet_id: str | None) -> Optional[PostgresUser]:
        row = await postgres_pool().fetchrow(
            "UPDATE public.users SET active_pet_id=$2,updated_at=now() WHERE id=$1 RETURNING *", user_id, pet_id
        )
        return await self._with_unlocks(row)

    async def unlock_pet(self, user_id: str, pet_id: str) -> PostgresUser:
        await postgres_pool().execute(
            "INSERT INTO public.user_unlocked_pets(user_id,pet_id) VALUES($1,$2) ON CONFLICT DO NOTHING", user_id, pet_id
        )
        user = await self.get_by_id(user_id)
        if user is None:
            raise LookupError("User not found")
        return user
