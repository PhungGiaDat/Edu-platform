"""Shared SQLAlchemy metadata for PostgreSQL persistence mappings.

Pydantic contracts stay under :mod:`models`; this module is only for database
identity and relationship mapping.
"""

from sqlalchemy import MetaData
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    # Supabase resolves unqualified learner-core tables through the verified
    # default search path ("$user", public, extensions).  Keeping metadata
    # unqualified matches PostgreSQL reflection's default-schema identity.
    metadata = MetaData()
