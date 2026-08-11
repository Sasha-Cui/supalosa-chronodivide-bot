from __future__ import annotations

import hashlib
import importlib.util
import json
from pathlib import Path
import tarfile
import tempfile
import unittest


REPO = Path(__file__).parents[2]
SCRIPT = REPO / "artifact" / "scripts" / "build_anonymous_artifact.py"
SPEC = importlib.util.spec_from_file_location("build_anonymous_artifact", SCRIPT)
assert SPEC is not None and SPEC.loader is not None
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class BuildAnonymousArtifactTest(unittest.TestCase):
    def test_package_is_sanitized_and_self_consistent(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            package = Path(directory) / MODULE.PACKAGE_NAME
            MODULE.build_package(REPO, package)

            self.assertFalse((package / "packages").exists())
            self.assertFalse((package / ".git").exists())
            confirmatory = json.loads(
                (package / "research" / "artifacts" / "method_v2_confirmatory_result_v1.json").read_text()
            )
            self.assertEqual(confirmatory["scheduler"]["account"], MODULE.REDACTED)
            self.assertEqual(confirmatory["sourceGitCommit"], MODULE.REDACTED)
            compute = json.loads(
                (package / "research" / "artifacts" / "accepted_compute_accounting_v1.json").read_text()
            )
            self.assertEqual(compute["evidence"]["account"], MODULE.REDACTED)
            self.assertEqual(compute["accounting"]["allocationCount"], 562)
            metrics = (package / "paper" / "generated" / "metrics.tex").read_text()
            self.assertIn(r"\newcommand{\ImprovementEstimate}{0.336}", metrics)
            self.assertIn(r"\newcommand{\ChampionAbsoluteLower}{-0.021}", metrics)
            self.assertIn(r"\newcommand{\AcceptedCoreHours}{288.72}", metrics)

            aggregate_inputs = sorted(
                (package / "research" / "artifacts").glob("*.json")
            )
            self.assertEqual(len(aggregate_inputs), 8)
            self.assertIn(
                "eight sanitized frozen JSON inputs",
                (package / "README.md").read_text(),
            )
            self.assertIn(
                "Expected output is a 16-page",
                (package / "README.md").read_text(),
            )
            self.assertIn(
                "eight sanitized aggregate JSON records",
                " ".join((package / "THIRD_PARTY.md").read_text().split()),
            )

            manifest = json.loads((package / "MANIFEST.json").read_text())
            for relative, expected in manifest["files"].items():
                actual = hashlib.sha256((package / relative).read_bytes()).hexdigest()
                self.assertEqual(actual, expected, relative)

    def test_archive_is_deterministic_and_contains_no_git_tree(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            first = root / "first.tar.gz"
            second = root / "second.tar.gz"
            first_hash = MODULE.build_archive(REPO, first)
            second_hash = MODULE.build_archive(REPO, second)
            self.assertEqual(first_hash, second_hash)
            with tarfile.open(first, "r:gz") as archive:
                names = archive.getnames()
            self.assertFalse(any("/.git/" in name for name in names))
            self.assertFalse(any("/packages/" in name for name in names))


if __name__ == "__main__":
    unittest.main()
