from __future__ import annotations

import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tarfile
import tempfile
import unittest


REPO = Path(__file__).parents[2]
SCRIPT = REPO / "artifact" / "scripts" / "build_anonymous_artifact.py"
SPEC = importlib.util.spec_from_file_location("build_anonymous_artifact", SCRIPT)
assert SPEC is not None and SPEC.loader is not None
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


def walk(value):
    if isinstance(value, dict):
        for key, child in value.items():
            yield key, child
            yield from walk(child)
    elif isinstance(value, list):
        for child in value:
            yield from walk(child)


class BuildAnonymousArtifactTest(unittest.TestCase):
    def test_package_is_sanitized_current_and_self_consistent(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            package = Path(directory) / MODULE.PACKAGE_NAME
            MODULE.build_package(REPO, package)

            self.assertFalse((package / "packages").exists())
            self.assertFalse((package / ".git").exists())
            self.assertFalse((package / "paper" / "main.tex").exists())
            self.assertFalse((package / "paper" / "sections" / "supplement.tex").exists())
            self.assertFalse((package / "paper" / "scripts" / "generate_assets.py").exists())
            self.assertTrue((package / "paper_scitepress" / "main.tex").is_file())
            self.assertFalse((package / "paper_scitepress" / "build").exists())

            artifact_paths = sorted(
                (package / "research" / "artifacts").glob("*.json")
            )
            self.assertEqual(
                [path.name for path in artifact_paths],
                [MODULE.EVIDENCE_NAME],
            )
            evidence = json.loads(artifact_paths[0].read_text(encoding="utf-8"))
            self.assertEqual(evidence["status"], "PASS_FINAL_PAPER_EVIDENCE")
            self.assertEqual(
                (
                    evidence["hfoConfirmation"]["overall"]["wins"],
                    evidence["hfoConfirmation"]["overall"]["draws"],
                    evidence["hfoConfirmation"]["overall"]["losses"],
                ),
                (633, 24, 63),
            )
            self.assertEqual(
                (
                    evidence["peakStudy"]["replication"]["candidate"]["overall"]["wins"],
                    evidence["peakStudy"]["replication"]["candidate"]["overall"]["draws"],
                    evidence["peakStudy"]["replication"]["candidate"]["overall"]["losses"],
                ),
                (134, 14, 32),
            )
            for key, child in walk(evidence):
                if key in MODULE.REDACTED_KEYS:
                    self.assertEqual(child, MODULE.REDACTED)

            generated = package / "paper" / "generated"
            self.assertEqual(
                {path.name for path in generated.glob("*.tex")},
                set(MODULE.CURRENT_ASSETS),
            )
            metrics = (generated / "metrics.tex").read_text(encoding="utf-8")
            self.assertIn(r"\newcommand{\HfoWins}{633}", metrics)
            self.assertIn(r"\newcommand{\PeakWins}{134}", metrics)
            self.assertIn(r"\newcommand{\AdvancedStrongLosses}{262}", metrics)
            self.assertEqual(
                metrics,
                (package / "paper_scitepress" / "generated" / "metrics.tex").read_text(),
            )
            self.assertEqual(
                (package / "paper" / "references.bib").read_bytes(),
                (package / "paper_scitepress" / "references.bib").read_bytes(),
            )

            frames = sorted(
                (package / "paper" / "figures" / "game_frames").glob("*.png")
            )
            self.assertEqual(len(frames), 15)
            for row in evidence["frameEvidence"]["frames"]:
                path = package / row["file"]
                self.assertEqual(path.stat().st_size, row["bytes"])
                self.assertEqual(hashlib.sha256(path.read_bytes()).hexdigest(), row["pngSha256"])

            metadata_run = subprocess.run(
                [
                    sys.executable,
                    str(
                        package
                        / "paper_scitepress"
                        / "scripts"
                        / "export_submission_metadata.py"
                    ),
                ],
                cwd=package,
                check=False,
                capture_output=True,
                text=True,
            )
            self.assertEqual(metadata_run.returncode, 0, metadata_run.stderr)
            submission_metadata = json.loads(metadata_run.stdout)
            self.assertEqual(submission_metadata["abstractWordCount"], 190)
            self.assertEqual(
                submission_metadata["title"],
                "StrongBot: Auditable Map-Profiled RTS Agent Development in Chrono Divide",
            )
            self.assertNotIn("\\", submission_metadata["abstract"])

            review_readme = (package / "README.md").read_text(encoding="utf-8")
            self.assertIn("one sanitized frozen JSON input", review_readme)
            self.assertIn("633/24/63", review_readme)
            self.assertIn("134/14/32", review_readme)
            self.assertIn("12-page A4", review_readme)
            self.assertIn("python3 verify_manifest.py", review_readme)
            self.assertIn("## Claim-to-evidence map", review_readme)
            reference = (
                chr(96)
                + f"research/artifacts/{MODULE.EVIDENCE_NAME}"
                + chr(96)
            )
            self.assertEqual(review_readme.count(reference), 1)
            self.assertIn(
                "one sanitized aggregate JSON record",
                " ".join((package / "THIRD_PARTY.md").read_text().split()),
            )

            manifest = json.loads((package / "MANIFEST.json").read_text())
            for relative, expected in manifest["files"].items():
                actual = hashlib.sha256((package / relative).read_bytes()).hexdigest()
                self.assertEqual(actual, expected, relative)
            verification = subprocess.run(
                [sys.executable, str(package / "verify_manifest.py")],
                cwd=package,
                check=False,
                capture_output=True,
                text=True,
            )
            self.assertEqual(verification.returncode, 0, verification.stderr)
            self.assertIn(
                f"Manifest verified: {len(manifest['files'])} immutable files",
                verification.stdout,
            )

    def test_archive_is_deterministic_and_contains_only_review_sources(self) -> None:
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
            self.assertFalse(any(name.endswith("/paper/main.tex") for name in names))
            self.assertFalse(any(name.endswith("/paper/sections/supplement.tex") for name in names))
            self.assertTrue(any(name.endswith("/paper_scitepress/main.tex") for name in names))
            self.assertFalse(any("/paper_scitepress/build/" in name for name in names))


if __name__ == "__main__":
    unittest.main()
