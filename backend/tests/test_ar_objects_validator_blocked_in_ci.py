"""Task 8: CI enforcement.

The backend CI workflow must explicitly run the validator plan dry-run so
any drift between ``ARObjectContract`` and the JSON Schema stops the
build. This test asserts the wrapper script that the CI step invokes
exists, is executable, and prints the plan.
"""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_ROOT = REPO_ROOT / "backend"
DRIVER = BACKEND_ROOT / "scripts" / "apply_ar_objects_validator.sh"


@pytest.mark.skipif(os.name != "posix", reason="bash driver is POSIX only")
def test_driver_runs_dry_run(tmp_path: Path):
    out = subprocess.run(
        [str(DRIVER), "--action", "warn"],
        capture_output=True,
        text=True,
        check=False,
        cwd=BACKEND_ROOT,
    )
    assert out.returncode == 0, out.stderr
    assert "collMod" in out.stdout
    assert "validationAction" in out.stdout
    assert "warn" in out.stdout


def test_validator_module_cli_dry_run():
    """The Python CLI can be invoked directly from CI on any platform."""
    from database.migrations.apply_ar_objects_validator import build_validator

    command = build_validator("warn")
    assert command["validationAction"] == "warn"


def test_ci_workflow_references_validator_module():
    """``ci.yml`` must mention the validator step; missing step == test fails."""
    workflow = REPO_ROOT / ".github" / "workflows" / "ci.yml"
    text = workflow.read_text(encoding="utf-8")
    assert "apply_ar_objects_validator" in text, (
        "ci.yml does not run the staged validator; the build can no longer "
        "detect drift between ARObjectContract and the JSON Schema."
    )