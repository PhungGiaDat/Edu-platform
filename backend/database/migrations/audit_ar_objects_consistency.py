"""Read-only MongoDB consistency audit for the ``ar_objects`` collection.

The audit never mutates the collection. It accepts raw Mongo dictionaries and a
mapping of ``ar_tag -> (catalog_id, target_index)`` and produces a stable
:class:`AuditReport` describing each document's classification and any issues
that block a deterministic catalog-or-legacy contract.
"""

from __future__ import annotations

from collections import Counter
from dataclasses import asdict, dataclass, field
from datetime import datetime
from enum import Enum
from hashlib import sha256
from typing import Iterable, Mapping


class IssueCode(str, Enum):
    TRACKING_MODE_MISSING = "TRACKING_MODE_MISSING"
    TRACKING_MODE_INVALID = "TRACKING_MODE_INVALID"
    CATALOG_ID_PARTIAL = "CATALOG_ID_PARTIAL"
    CATALOG_INDEX_TYPE_INVALID = "CATALOG_INDEX_TYPE_INVALID"
    CATALOG_INDEX_NEGATIVE = "CATALOG_INDEX_NEGATIVE"
    CATALOG_MAPPING_MISMATCH = "CATALOG_MAPPING_MISMATCH"
    CATALOG_URL_DUPLICATED = "CATALOG_URL_DUPLICATED"
    DUPLICATE_AR_TAG = "DUPLICATE_AR_TAG"
    DUPLICATE_CATALOG_INDEX = "DUPLICATE_CATALOG_INDEX"
    LEGACY_URL_MISSING = "LEGACY_URL_MISSING"
    MODEL_URL_EMPTY = "MODEL_URL_EMPTY"
    GLB_SIZE_INVALID = "GLB_SIZE_INVALID"
    TRANSFORM_ENCODING_MIXED = "TRANSFORM_ENCODING_MIXED"
    TIMESTAMP_TYPE_INVALID = "TIMESTAMP_TYPE_INVALID"
    UNKNOWN_AR_TAG = "UNKNOWN_AR_TAG"


@dataclass(frozen=True)
class DocumentAudit:
    ar_tag: str
    redacted_id: str
    classification: str
    issues: tuple[str, ...]


@dataclass(frozen=True)
class AuditReport:
    total: int
    valid_catalog: int
    valid_legacy: int
    invalid: int
    documents: tuple[DocumentAudit, ...] = field(default_factory=tuple)

    def to_dict(self) -> dict:
        return asdict(self)


def _redact_id(value: object) -> str:
    return sha256(str(value).encode("utf-8")).hexdigest()[:12]


def _transform_encoding(value: object) -> str:
    if isinstance(value, str):
        return "json-string"
    if isinstance(value, Mapping):
        return "object"
    if isinstance(value, (list, tuple)):
        return "array"
    return type(value).__name__


def audit_documents(
    documents: Iterable[Mapping[str, object]],
    catalog_targets: Mapping[str, tuple[str, int]],
) -> AuditReport:
    rows = [dict(document) for document in documents]
    tag_counts = Counter(str(row.get("ar_tag", "")) for row in rows)
    catalog_key_counts = Counter(
        (row.get("mind_catalog_id"), row.get("mind_target_index"))
        for row in rows
        if isinstance(row.get("mind_catalog_id"), str)
        and isinstance(row.get("mind_target_index"), int)
        and not isinstance(row.get("mind_target_index"), bool)
    )

    audits: list[DocumentAudit] = []
    valid_catalog = 0
    valid_legacy = 0

    for row in rows:
        issues: set[IssueCode] = set()
        ar_tag = str(row.get("ar_tag", ""))
        mode = row.get("tracking_mode")
        expected = catalog_targets.get(ar_tag)

        if mode is None:
            issues.add(IssueCode.TRACKING_MODE_MISSING)
        elif mode not in {"catalog", "legacy"}:
            issues.add(IssueCode.TRACKING_MODE_INVALID)

        has_catalog_id = bool(row.get("mind_catalog_id"))
        has_catalog_index = row.get("mind_target_index") is not None
        index = row.get("mind_target_index")

        if has_catalog_id != has_catalog_index:
            issues.add(IssueCode.CATALOG_ID_PARTIAL)
        if has_catalog_index and (not isinstance(index, int) or isinstance(index, bool)):
            issues.add(IssueCode.CATALOG_INDEX_TYPE_INVALID)
        elif isinstance(index, int) and index < 0:
            issues.add(IssueCode.CATALOG_INDEX_NEGATIVE)

        if expected is not None:
            if (row.get("mind_catalog_id"), index) != expected:
                issues.add(IssueCode.CATALOG_MAPPING_MISMATCH)
            if "nft_base_url" in row:
                issues.add(IssueCode.CATALOG_URL_DUPLICATED)
        elif mode == "catalog" or mode is None:
            issues.add(IssueCode.UNKNOWN_AR_TAG)

        if mode == "legacy" and not str(row.get("nft_base_url", "")).strip():
            issues.add(IssueCode.LEGACY_URL_MISSING)

        if not str(row.get("model_3d_url", "")).strip():
            issues.add(IssueCode.MODEL_URL_EMPTY)
        glb_size = row.get("glb_size")
        if isinstance(glb_size, bool) or not isinstance(glb_size, (int, float)) or glb_size <= 0:
            issues.add(IssueCode.GLB_SIZE_INVALID)

        encodings = {
            _transform_encoding(row[field])
            for field in ("position", "rotation", "scale")
            if field in row
        }
        if len(encodings) > 1:
            issues.add(IssueCode.TRANSFORM_ENCODING_MIXED)

        if any(
            field in row and not isinstance(row[field], (datetime, str))
            for field in ("created_at", "updated_at")
        ):
            issues.add(IssueCode.TIMESTAMP_TYPE_INVALID)

        if tag_counts[ar_tag] > 1:
            issues.add(IssueCode.DUPLICATE_AR_TAG)
        catalog_key = (row.get("mind_catalog_id"), index)
        if (
            has_catalog_id
            and has_catalog_index
            and catalog_key_counts[catalog_key] > 1
        ):
            issues.add(IssueCode.DUPLICATE_CATALOG_INDEX)

        classification = "invalid"
        if not issues and mode == "catalog":
            classification = "catalog"
            valid_catalog += 1
        elif not issues and mode == "legacy":
            classification = "legacy"
            valid_legacy += 1

        audits.append(
            DocumentAudit(
                ar_tag=ar_tag,
                redacted_id=_redact_id(row.get("_id")),
                classification=classification,
                issues=tuple(sorted(issue.value for issue in issues)),
            )
        )

    return AuditReport(
        total=len(rows),
        valid_catalog=valid_catalog,
        valid_legacy=valid_legacy,
        invalid=len(rows) - valid_catalog - valid_legacy,
        documents=tuple(audits),
    )


__all__ = [
    "AuditReport",
    "DocumentAudit",
    "IssueCode",
    "audit_documents",
]
