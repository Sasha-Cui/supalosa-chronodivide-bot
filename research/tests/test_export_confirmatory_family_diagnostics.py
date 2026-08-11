from __future__ import annotations

import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest


SCRIPT = Path(__file__).parents[1] / "scripts" / "export_confirmatory_family_diagnostics.py"
SPEC = importlib.util.spec_from_file_location("export_confirmatory", SCRIPT)
assert SPEC is not None and SPEC.loader is not None
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


def fixture() -> dict:
    rows = []
    for index in range(16):
        default = index / 32
        effect = 0.0 if index < 2 else (index + 1) / 32
        rows.append(
            {
                "familyId": f"mf_{index:02d}",
                "improvement": effect,
                "defaultScore": default,
                "championScore": default + effect,
                "blockCount": 8,
            }
        )
    default_mean = sum(row["defaultScore"] for row in rows) / len(rows)
    champion_mean = sum(row["championScore"] for row in rows) / len(rows)
    return {
        "schemaVersion": 1,
        "status": "FAILED_CONFIRMATORY_SUCCESS_GATE",
        "unblindingCount": 1,
        "sourceGitCommit": MODULE.EXPECTED_SOURCE_COMMIT,
        "arrayJobId": MODULE.EXPECTED_ARRAY_JOB_ID,
        "schedulerAccount": "pi_jss233",
        "familyCount": 16,
        "launchedGameCount": 512,
        "analysis": {
            "improvement": {"estimate": champion_mean - default_mean},
            "methods": {
                "default": {"score": default_mean},
                "champion": {"score": champion_mean},
            },
            "familyDiagnostics": rows,
        },
    }


class ExportConfirmatoryFamilyDiagnosticsTest(unittest.TestCase):
    def write_fixture(self, payload: dict) -> tuple[tempfile.TemporaryDirectory, Path, str]:
        directory = tempfile.TemporaryDirectory()
        path = Path(directory.name) / "unblinding.json"
        path.write_text(json.dumps(payload), encoding="utf-8")
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        return directory, path, digest

    def test_exports_and_sorts_verified_rows(self) -> None:
        directory, path, digest = self.write_fixture(fixture())
        self.addCleanup(directory.cleanup)
        result = MODULE.build_export(path, expected_sha256=digest)
        self.assertEqual(result["aggregateChecks"]["familySigns"], {
            "positive": 14,
            "zero": 2,
            "negative": 0,
        })
        effects = [row["championMinusDefault"] for row in result["families"]]
        self.assertEqual(effects, sorted(effects))

    def test_rejects_source_hash_mismatch(self) -> None:
        directory, path, _ = self.write_fixture(fixture())
        self.addCleanup(directory.cleanup)
        with self.assertRaisesRegex(ValueError, "SHA-256 mismatch"):
            MODULE.build_export(path, expected_sha256="0" * 64)

    def test_rejects_inconsistent_family_effect(self) -> None:
        payload = fixture()
        payload["analysis"]["familyDiagnostics"][4]["improvement"] += 0.1
        directory, path, digest = self.write_fixture(payload)
        self.addCleanup(directory.cleanup)
        with self.assertRaisesRegex(ValueError, "effect for mf_04"):
            MODULE.build_export(path, expected_sha256=digest)


if __name__ == "__main__":
    unittest.main()
