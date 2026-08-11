#!/usr/bin/env python3
"""Export a deterministic, releasable family-level confirmatory artifact.

The frozen public confirmatory artifact contains the primary estimates but not
the per-family points needed for the paper figure.  This exporter reads the
immutable single-unblinding artifact, verifies its byte commitment and internal
aggregates, and emits only the family-level scores required for reporting.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path
from typing import Any


FROZEN_UNBLINDING_SHA256 = (
    "2f55de50b4cb4a110b3d8d48a3734866e23fac954f2254ef47556bd041fc0cfb"
)
EXPECTED_SOURCE_COMMIT = "698dc7601b61a80e091ce7b8ac2b9e681685bc69"
EXPECTED_ARRAY_JOB_ID = "21925439"


def _expect_number(value: Any, label: str) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError(f"{label} must be numeric")
    value = float(value)
    if not math.isfinite(value):
        raise ValueError(f"{label} must be finite")
    return value


def _expect_close(actual: float, expected: float, label: str) -> None:
    if not math.isclose(actual, expected, rel_tol=0.0, abs_tol=1e-12):
        raise ValueError(f"{label} mismatch: {actual!r} != {expected!r}")


def build_export(
    unblinding_path: Path,
    *,
    expected_sha256: str = FROZEN_UNBLINDING_SHA256,
) -> dict[str, Any]:
    raw = unblinding_path.read_bytes()
    actual_sha256 = hashlib.sha256(raw).hexdigest()
    if actual_sha256 != expected_sha256:
        raise ValueError(
            "unblinding SHA-256 mismatch: "
            f"{actual_sha256} != {expected_sha256}"
        )

    payload = json.loads(raw)
    if payload.get("schemaVersion") != 1:
        raise ValueError("unblinding schemaVersion must be 1")
    if payload.get("status") != "FAILED_CONFIRMATORY_SUCCESS_GATE":
        raise ValueError("unexpected frozen confirmatory status")
    if payload.get("unblindingCount") != 1:
        raise ValueError("exactly one unblinding is required")
    if payload.get("sourceGitCommit") != EXPECTED_SOURCE_COMMIT:
        raise ValueError("source Git commit mismatch")
    if payload.get("arrayJobId") != EXPECTED_ARRAY_JOB_ID:
        raise ValueError("Slurm array job ID mismatch")
    if payload.get("schedulerAccount") != "pi_jss233":
        raise ValueError("scheduler account mismatch")
    if payload.get("familyCount") != 16:
        raise ValueError("exactly 16 confirmatory families are required")
    if payload.get("launchedGameCount") != 512:
        raise ValueError("exactly 512 launched games are required")

    analysis = payload.get("analysis")
    if not isinstance(analysis, dict):
        raise ValueError("analysis must be an object")
    improvement = analysis.get("improvement")
    methods = analysis.get("methods")
    rows = analysis.get("familyDiagnostics")
    if not isinstance(improvement, dict) or not isinstance(methods, dict):
        raise ValueError("analysis aggregates are missing")
    if not isinstance(rows, list) or len(rows) != 16:
        raise ValueError("familyDiagnostics must contain 16 rows")

    exported_rows: list[dict[str, Any]] = []
    family_ids: set[str] = set()
    for index, row in enumerate(rows):
        if not isinstance(row, dict):
            raise ValueError(f"familyDiagnostics[{index}] must be an object")
        family_id = row.get("familyId")
        if not isinstance(family_id, str) or not family_id.startswith("mf_"):
            raise ValueError(f"familyDiagnostics[{index}].familyId is invalid")
        if family_id in family_ids:
            raise ValueError(f"duplicate family ID: {family_id}")
        family_ids.add(family_id)

        default_score = _expect_number(row.get("defaultScore"), "defaultScore")
        champion_score = _expect_number(row.get("championScore"), "championScore")
        effect = _expect_number(row.get("improvement"), "improvement")
        if not all(0.0 <= value <= 1.0 for value in (default_score, champion_score)):
            raise ValueError(f"family scores outside [0, 1]: {family_id}")
        _expect_close(champion_score - default_score, effect, f"effect for {family_id}")
        if row.get("blockCount") != 8:
            raise ValueError(f"block count must be 8 for {family_id}")
        exported_rows.append(
            {
                "familyId": family_id,
                "blockCount": 8,
                "defaultScore": default_score,
                "championScore": champion_score,
                "championMinusDefault": effect,
            }
        )

    exported_rows.sort(key=lambda row: (row["championMinusDefault"], row["familyId"]))
    mean_default = sum(row["defaultScore"] for row in exported_rows) / 16
    mean_champion = sum(row["championScore"] for row in exported_rows) / 16
    mean_effect = sum(row["championMinusDefault"] for row in exported_rows) / 16

    _expect_close(
        mean_default,
        _expect_number(methods["default"]["score"], "default aggregate score"),
        "mean family default score",
    )
    _expect_close(
        mean_champion,
        _expect_number(methods["champion"]["score"], "champion aggregate score"),
        "mean family champion score",
    )
    _expect_close(
        mean_effect,
        _expect_number(improvement["estimate"], "aggregate improvement"),
        "mean family improvement",
    )

    sign_counts = {
        "positive": sum(row["championMinusDefault"] > 0 for row in exported_rows),
        "zero": sum(row["championMinusDefault"] == 0 for row in exported_rows),
        "negative": sum(row["championMinusDefault"] < 0 for row in exported_rows),
    }
    if sign_counts != {"positive": 14, "zero": 2, "negative": 0}:
        raise ValueError(f"unexpected family sign counts: {sign_counts}")

    return {
        "schemaVersion": 1,
        "artifactType": "confirmatory-family-diagnostics",
        "source": {
            "unblindingSha256": actual_sha256,
            "sourceGitCommit": payload["sourceGitCommit"],
            "schedulerAccount": payload["schedulerAccount"],
            "arrayJobId": payload["arrayJobId"],
            "launchedGameCount": payload["launchedGameCount"],
        },
        "design": {
            "familyCount": 16,
            "blocksPerFamily": 8,
            "reciprocalSlotsPerMethod": 2,
            "methods": ["default", "champion"],
        },
        "aggregateChecks": {
            "defaultScore": mean_default,
            "championScore": mean_champion,
            "championMinusDefault": mean_effect,
            "familySigns": sign_counts,
        },
        "families": exported_rows,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--unblinding", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument(
        "--expected-sha256",
        default=FROZEN_UNBLINDING_SHA256,
        help="expected byte-level commitment of the unblinding artifact",
    )
    args = parser.parse_args()

    artifact = build_export(args.unblinding, expected_sha256=args.expected_sha256)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(
        json.dumps(artifact, indent=2, sort_keys=True, allow_nan=False) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
