#!/usr/bin/env python3
"""Build a compact verified projection of the complete A2 seed audit."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import re
import subprocess


PROJECT = Path("/nfs/roberts/project/pi_jss233/zc362/chrono_divide")
REPO = PROJECT / "strong-chronodivide-bot"
STUDY = PROJECT / "research-evidence/action-burst-diagnostic-v1"
AUDIT = STUDY / "seed-audit-v1-a2/seed-audit.json"
AUDIT_SHA256 = "ac9c2100702750270e4bc9df311fbdff62aca29a933687e44d16d18f7318a231"
AUDIT_BYTES = 537_547_172
AUDIT_FILES = 1_811_152
AUDIT_SCANNED_BYTES = 13_717_433_802
AUDIT_SOURCE = "7d1779eba7c5248d9170d006fe88c0efd64bbd98"
AUDIT_PROGRAM = "5f17a8edc679a25ffa7d6cb74967e25ca66b47a29e36d3fa2aeb250cc5b36bea"
AUDIT_A2 = "608fa26b0c2e6502567eb49769d5c04734197b9dd44fb9df4857d5167dad0a9e"
SELECTED = [3_010_000_000, 3_011_000_000]
CANDIDATE_BASES = [
    3_010_000_000, 3_020_000_000, 3_030_000_000, 3_040_000_000,
    3_050_000_000, 3_060_000_000, 3_070_000_000, 3_080_000_000,
    3_090_000_000, 3_120_000_000, 3_130_000_000, 3_140_000_000,
    3_150_000_000, 3_160_000_000, 3_170_000_000, 3_180_000_000,
    3_190_000_000, 3_210_000_000, 3_220_000_000, 3_230_000_000,
    3_240_000_000, 3_250_000_000, 3_260_000_000, 3_270_000_000,
    3_280_000_000, 3_290_000_000,
]
PROHIBITED = re.compile(
    r"winner|outcome|score|endpoint|defeated|gamefinished|terminalbuilding|"
    r"remainingbuilding|buildingcount|rank",
    re.I,
)


class CertificateError(RuntimeError):
    pass


def require(condition: bool, message: str) -> None:
    if not condition:
        raise CertificateError(message)


def sha256_file(path: Path) -> str:
    value = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            value.update(block)
    return value.hexdigest()


def git(*arguments: str) -> str:
    return subprocess.run(
        ["git", *arguments], cwd=REPO, check=True, text=True, capture_output=True,
    ).stdout.strip()


def reject_prohibited(value) -> None:
    if isinstance(value, list):
        for child in value:
            reject_prohibited(child)
    elif isinstance(value, dict):
        for key, child in value.items():
            require(not PROHIBITED.search(key), "prohibited certificate field " + key)
            reject_prohibited(child)


def project_audit(audit: dict) -> dict:
    require(audit["kind"] == "action-burst-seed-reservation-audit-v1-a2",
            "audit kind drifted")
    require(audit["complete"] is True and audit["passed"] is True,
            "audit did not pass")
    require(audit["outcomeFree"] is True, "audit access boundary drifted")
    require(audit["sourceCommit"] == AUDIT_SOURCE, "audit source drifted")
    require(audit["programSha256"] == AUDIT_PROGRAM, "audit program drifted")
    require(audit["amendmentA2Sha256"] == AUDIT_A2, "audit A2 drifted")
    require(audit["scheduler"] == {
        "jobId": "24946861", "account": "pi_jss233", "partition": "day",
    }, "audit scheduler drifted")
    require(audit["scannedFileCount"] == AUDIT_FILES, "audit file count drifted")
    require(audit["scannedBytes"] == AUDIT_SCANNED_BYTES, "audit byte count drifted")
    require(audit["errors"] == [], "audit errors are not empty")
    assessments = audit["orderedCandidateIntervals"]
    require(len(assessments) == len(CANDIDATE_BASES), "candidate count drifted")
    compact = []
    for base, value in zip(CANDIDATE_BASES, assessments):
        expected_interval = [base, base + 1_000_000]
        expected_signed = [base - 2**32, base + 1_000_000 - 2**32]
        require(value["base"] == base, "candidate order drifted")
        require(value["interval"] == expected_interval, "candidate interval drifted")
        require(value["signedInt32EquivalentInterval"] == expected_signed,
                "candidate signed interval drifted")
        require(isinstance(value["collisionRecords"], int) and value["collisionRecords"] >= 0,
                "candidate collision count drifted")
        require(value["passed"] is (value["collisionRecords"] == 0),
                "candidate pass flag drifted")
        require(value["selected"] is (base == SELECTED[0]),
                "candidate selection flag drifted")
        compact.append({
            "base": base,
            "interval": expected_interval,
            "signedInt32EquivalentInterval": expected_signed,
            "collisionRecords": value["collisionRecords"],
            "passed": value["passed"],
            "selected": value["selected"],
        })
    passing = [value for value in compact if value["passed"]]
    selected = [value for value in compact if value["selected"]]
    require(selected == [passing[0]], "first-passing selection drifted")
    require(audit["selectedInterval"] == SELECTED, "selected interval drifted")
    require(
        audit["selectedSignedInt32EquivalentInterval"] ==
        [SELECTED[0] - 2**32, SELECTED[1] - 2**32],
        "selected signed interval drifted",
    )
    certificate = {
        "kind": "action-burst-seed-selection-certificate-v1-a2",
        "complete": True,
        "passed": True,
        "technicalOnly": True,
        "competitiveFieldsAbsent": True,
        "completeAudit": {
            "path": str(AUDIT),
            "sha256": AUDIT_SHA256,
            "bytes": AUDIT_BYTES,
            "scannedFiles": AUDIT_FILES,
            "scannedBytes": AUDIT_SCANNED_BYTES,
            "sourceCommit": AUDIT_SOURCE,
            "programSha256": AUDIT_PROGRAM,
            "schedulerJobId": "24946861",
        },
        "candidateAssessments": compact,
        "selectedInterval": SELECTED,
        "selectedSignedInt32EquivalentInterval": [
            SELECTED[0] - 2**32, SELECTED[1] - 2**32,
        ],
        "selectionRule": "first-zero-collision-candidate-in-frozen-order",
    }
    reject_prohibited(certificate)
    return certificate


def main() -> None:
    require(os.environ.get("SLURM_JOB_ACCOUNT") == "pi_jss233", "pi_jss233 required")
    require(os.environ.get("SLURM_JOB_PARTITION") == "day", "day required")
    require(not os.environ.get("SLURM_JOB_GPUS") and not os.environ.get("SLURM_GPUS"),
            "GPU prohibited")
    source = git("rev-parse", "HEAD")
    require(git("branch", "--show-current") == "main", "main required")
    require(git("status", "--porcelain=v1") == "", "clean source required")
    require(git("rev-parse", "fork/main") == source, "fork/main drifted")
    require(source == os.environ["SOURCE_COMMIT"], "source commit mismatch")
    require(sha256_file(Path(__file__).resolve()) == os.environ["PROGRAM_SHA256"],
            "certificate program mismatch")
    amendment = REPO / (
        "research/protocols/method/"
        "2026-09-06-outcome-blind-action-burst-diagnostic-v1-amendment-a6.md"
    )
    require(sha256_file(amendment) == os.environ["AMENDMENT_A6_SHA256"],
            "certificate amendment mismatch")
    require(AUDIT.stat().st_size == AUDIT_BYTES, "complete audit bytes drifted")
    require(sha256_file(AUDIT) == AUDIT_SHA256, "complete audit hash drifted")
    with AUDIT.open() as handle:
        audit = json.load(handle)
    certificate = project_audit(audit)
    certificate.update({
        "sourceCommit": source,
        "programSha256": sha256_file(Path(__file__).resolve()),
        "amendmentA6Sha256": sha256_file(amendment),
        "scheduler": {
            "jobId": os.environ["SLURM_JOB_ID"],
            "account": os.environ["SLURM_JOB_ACCOUNT"],
            "partition": os.environ["SLURM_JOB_PARTITION"],
        },
        "pythonVersion": os.sys.version,
    })
    reject_prohibited(certificate)
    output = Path(os.environ["OUT_PATH"])
    require(
        output.parent == STUDY / "seed-certificate-v1-a2" and
        output.parent.is_dir() and not output.exists(),
        "certificate output path invalid",
    )
    with output.open("x") as handle:
        json.dump(certificate, handle, indent=2, sort_keys=True)
        handle.write("\n")
    print(json.dumps({
        "complete": True,
        "passed": True,
        "selectedInterval": certificate["selectedInterval"],
        "candidateIntervals": len(certificate["candidateAssessments"]),
    }, sort_keys=True))


if __name__ == "__main__":
    main()
