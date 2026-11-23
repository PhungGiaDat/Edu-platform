"""Alembic ownership rules for incremental SQLAlchemy adoption."""

from database.orm_base import Base


def managed_table_names() -> set[str]:
    return {
        table.name for table in Base.metadata.tables.values()
        if table.schema in {None, "public"} and table.info.get("alembic_managed", True)
    }


def include_name(name: str | None, type_: str, parent_names: dict[str, str | None]) -> bool:
    """Reflect only the public tables currently represented in ORM metadata."""
    if type_ == "schema":
        return name in {None, "public"}
    if type_ == "table":
        return name in managed_table_names() | {"alembic_version"}
    return True


def include_object(object_, name: str | None, type_: str, reflected: bool, compare_to) -> bool:
    return not (type_ == "table" and object_.info.get("alembic_managed") is False)
