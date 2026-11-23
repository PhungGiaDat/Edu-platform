"""Centralized URL builders for Supabase assets, avatars, and external services.

All app code that needs to compose a public Supabase Storage URL, an avatar URL,
or any other infrastructure URL should call one of the helpers in this module
instead of building the URL by hand with a hardcoded hostname.

The single source of truth is :class:`settings.Settings` (see ``backend/settings.py``).
"""
from __future__ import annotations

from typing import Any
from urllib.parse import quote


def supabase_base_url() -> str:
    """Return the canonical Supabase public storage base URL.

    Combines ``SUPABASE_PROJECT_URL`` (e.g. ``https://xxx.supabase.co``) with
    ``/storage/v1/object/public/<SUPABASE_STORAGE_BUCKET>``.

    Raises ``RuntimeError`` if either variable is missing — that should never
    happen because ``Settings`` requires them, but a defensive guard helps when
    the module is imported in tests or one-off scripts.
    """
    from settings import settings  # local import — avoid module-load DB imports

    project = (settings.SUPABASE_PROJECT_URL or "").rstrip("/")
    bucket = settings.SUPABASE_STORAGE_BUCKET
    if not project or not bucket:
        raise RuntimeError(
            "SUPABASE_PROJECT_URL and SUPABASE_STORAGE_BUCKET must be set to "
            "build Supabase asset URLs."
        )
    return f"{project}/storage/v1/object/public/{bucket}"


def mind_file_url(path: str) -> str:
    """Return a public URL for a MindAR ``.mind`` file.

    ``path`` is relative to the storage bucket root and typically starts with
    ``assets/mind-files/`` (callers may pass the bare filename as well — both
    work because the helper does not prepend a fixed prefix).
    """
    return f"{supabase_base_url()}/{path.lstrip('/')}"


def model_3d_url(path: str) -> str:
    """Return a public URL for a 3D model (``.glb``).

    ``path`` is relative to the storage bucket root and typically starts with
    ``models/``.
    """
    return f"{supabase_base_url()}/{path.lstrip('/')}"


def image_2d_url(path: str) -> str:
    """Return a public URL for a 2D flashcard image.

    ``path`` is relative to the storage bucket root and typically starts with
    ``images/``.
    """
    return f"{supabase_base_url()}/{path.lstrip('/')}"


def default_avatar_url(username: str) -> str:
    """Return a fallback avatar URL for the given username.

    Uses the configured ``AVATAR_SERVICE_URL`` (defaults to Dicebear's avataaars
    endpoint) and includes a background color hint for visual consistency.
    """
    from settings import settings  # local import — keep the module import-cheap

    base = (settings.AVATAR_SERVICE_URL or "").rstrip("/")
    if not base:
        raise RuntimeError("AVATAR_SERVICE_URL must be set to build avatar URLs.")
    return f"{base}?seed={quote(username)}&backgroundColor=b6e3f4"


def supabase_resolve_placeholders(obj: Any) -> Any:
    """Recursively replace ``__SUPABASE_BASE__`` placeholders in a JSON-like structure.

    Seed JSON files use the literal placeholder ``__SUPABASE_BASE__`` in URL
    fields so that no host is hardcoded. ``seed_mongo.py`` (or any loader)
    should call this helper after parsing the JSON, before writing to MongoDB.

    The placeholder substitutes the **full** Supabase host (including the
    ``https://`` scheme), so a seeded URL like::

        "__SUPABASE_BASE__/storage/v1/object/public/AR_models/x.mind"

    becomes::

        "https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/x.mind"

    Handles ``dict``, ``list``, and ``str``. Returns other types unchanged.
    """
    from settings import settings  # local import — see above

    base = settings.SUPABASE_PROJECT_URL.rstrip("/")

    if isinstance(obj, str):
        return obj.replace("__SUPABASE_BASE__", base)
    if isinstance(obj, list):
        return [supabase_resolve_placeholders(item) for item in obj]
    if isinstance(obj, dict):
        return {key: supabase_resolve_placeholders(value) for key, value in obj.items()}
    return obj
