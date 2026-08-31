from __future__ import annotations

import hashlib
import json
from pathlib import Path
import tempfile
import unittest

from research.scripts.build_icaart_upload_bundle import (
    BOUND_FILES,
    INSTRUCTIONS_NAME,
    MANIFEST_NAME,
    REVIEWED_SOURCE_COMMIT,
    BoundFile,
    build_bundle,
    verify_bundle,
)


class IcaartUploadBundleTest(unittest.TestCase):
    def test_frozen_bindings_match_current_candidate(self) -> None:
        self.assertEqual(
            REVIEWED_SOURCE_COMMIT,
            "75cdf7a68763007e45c737ee1773aad1cc71ded1",
        )
        expected = {
            "anonymous-paper.pdf": "628482e622a19700d56de5516e2f91ea1b74c48705a879a78d6b3c77ea91f7fc",
            "submission-metadata.json": "cc8f656f8ccca9fab1a614d40a80368e0bec08bcfd6fc5dee07b69edb475d127",
            "anonymous-review-artifact.tar.gz": "d0e49b55bc76d5d5c103378b23cbc374a9a93353e1380e0283b54421e7d249c4",
        }
        self.assertEqual(
            {binding.name: binding.sha256 for binding in BOUND_FILES},
            expected,
        )

    def test_fixture_bundle_is_deterministic_minimal_and_fail_closed(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            payloads = {
                "anonymous-paper.pdf": b"%PDF-1.5\nfixture\n",
                "submission-metadata.json": b"{\"abstract\":\"fixture\"}\n",
                "anonymous-review-artifact.tar.gz": b"fixture-tar-gz",
            }
            bindings = []
            for name, payload in payloads.items():
                source = root / ("source-" + name)
                source.write_bytes(payload)
                bindings.append(
                    BoundFile(
                        source=source,
                        name=name,
                        sha256=hashlib.sha256(payload).hexdigest(),
                        size_bytes=len(payload),
                        role="fixture",
                        conditional=name.endswith(".tar.gz"),
                    )
                )
            bindings_tuple = tuple(bindings)
            first = root / "first"
            second = root / "second"
            first_record = build_bundle(output=first, bindings=bindings_tuple)
            second_record = build_bundle(output=second, bindings=bindings_tuple)
            self.assertEqual(first_record["manifestSha256"], second_record["manifestSha256"])
            self.assertEqual(
                (first / MANIFEST_NAME).read_bytes(),
                (second / MANIFEST_NAME).read_bytes(),
            )
            manifest = verify_bundle(first)
            self.assertEqual(
                set(manifest["files"]),
                set(payloads) | {INSTRUCTIONS_NAME},
            )
            self.assertEqual(
                {child.name for child in first.iterdir()},
                set(payloads) | {INSTRUCTIONS_NAME, MANIFEST_NAME},
            )

            with self.assertRaises(FileExistsError):
                build_bundle(output=first, bindings=bindings_tuple)

            payloads["anonymous-paper.pdf"] += b"drift"
            (root / "source-anonymous-paper.pdf").write_bytes(
                payloads["anonymous-paper.pdf"]
            )
            with self.assertRaisesRegex(ValueError, "size drift"):
                build_bundle(output=root / "drift", bindings=bindings_tuple)
            self.assertFalse((root / "drift").exists())

    def test_replace_is_atomic_and_reverified(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / "source.pdf"
            payload = b"%PDF-1.5\nfixture\n"
            source.write_bytes(payload)
            binding = BoundFile(
                source=source,
                name="anonymous-paper.pdf",
                sha256=hashlib.sha256(payload).hexdigest(),
                size_bytes=len(payload),
                role="fixture",
            )
            output = root / "bundle"
            build_bundle(output=output, bindings=(binding,))
            (output / "untracked.txt").write_text("stale", encoding="utf-8")
            build_bundle(output=output, bindings=(binding,), replace=True)
            self.assertFalse((output / "untracked.txt").exists())
            verify_bundle(output)


if __name__ == "__main__":
    unittest.main()
