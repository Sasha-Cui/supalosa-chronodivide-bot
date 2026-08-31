#!/usr/bin/env python3
"""Build and verify a fail-closed ICAART upload staging directory."""

from __future__ import annotations

import argparse
from dataclasses import dataclass
import hashlib
import json
import os
from pathlib import Path
import shutil
import tempfile
from typing import Iterable


ROOT = Path(__file__).resolve().parents[2]
REVIEWED_SOURCE_COMMIT = "75cdf7a68763007e45c737ee1773aad1cc71ded1"
DEFAULT_OUTPUT = ROOT / "tmp" / "submission" / "icaart-2027"
ALLOWED_OUTPUT_ROOT = (ROOT / "tmp" / "submission").resolve()
MANIFEST_NAME = "UPLOAD_MANIFEST.json"
INSTRUCTIONS_NAME = "UPLOAD_INSTRUCTIONS.txt"
DENIED_TOKENS = (
    b"sasha cui",
    b"sasha.z.cui",
    b"zc362",
    b"pi_jss233",
    b"/nfs/roberts",
    b"github.com/sasha-cui",
    b"yale university",
)


@dataclass(frozen=True)
class BoundFile:
    source: Path
    name: str
    sha256: str
    size_bytes: int
    role: str
    conditional: bool = False


BOUND_FILES = (
    BoundFile(
        source=ROOT / "paper_scitepress" / "build" / "main.pdf",
        name="anonymous-paper.pdf",
        sha256="628482e622a19700d56de5516e2f91ea1b74c48705a879a78d6b3c77ea91f7fc",
        size_bytes=1_359_301,
        role="Upload as the anonymous regular-paper PDF.",
    ),
    BoundFile(
        source=ROOT / "paper_scitepress" / "build" / "submission_metadata.json",
        name="submission-metadata.json",
        sha256="cc8f656f8ccca9fab1a614d40a80368e0bec08bcfd6fc5dee07b69edb475d127",
        size_bytes=2_170,
        role="Copy these exact title, abstract, keyword, area, and topic fields into PRIMORIS.",
    ),
    BoundFile(
        source=ROOT / "artifact" / "dist" / "chrono-divide-review-artifact.tar.gz",
        name="anonymous-review-artifact.tar.gz",
        sha256="d0e49b55bc76d5d5c103378b23cbc374a9a93353e1380e0283b54421e7d249c4",
        size_bytes=1_319_409,
        role="Attach only if the ICAART secretariat explicitly permits reviewer artifacts.",
        conditional=True,
    ),
)


INSTRUCTIONS = """ICAART 2027 ANONYMOUS UPLOAD STAGING DIRECTORY

This directory is a staging aid, not one file to upload wholesale.

1. Upload anonymous-paper.pdf as the regular-paper PDF.
2. Open submission-metadata.json and copy its exact values into PRIMORIS.
3. Upload anonymous-review-artifact.tar.gz only if the ICAART secretariat
   explicitly approves a reviewer-artifact route, file type, and delivery method.
4. Do not upload UPLOAD_MANIFEST.json or this instruction file unless requested.
5. After upload, download the venue copy and compare its PDF hash and rendering.
6. Keep author identity, affiliations, funding, ORCIDs, and conflicts in the
   private submission record and portal fields, never in the anonymous PDF.

Run the builder again after any approved manuscript change. It will refuse
stale input hashes.
"""


def sha256_bytes(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest()


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def validate_bindings(bindings: Iterable[BoundFile]) -> list[tuple[BoundFile, bytes]]:
    values: list[tuple[BoundFile, bytes]] = []
    names: set[str] = set()
    for binding in bindings:
        require(binding.name not in names, f"duplicate output name: {binding.name}")
        names.add(binding.name)
        require(binding.source.is_file(), f"missing bound input: {binding.source}")
        payload = binding.source.read_bytes()
        require(len(payload) == binding.size_bytes, f"size drift: {binding.source}")
        require(
            sha256_bytes(payload) == binding.sha256,
            f"SHA-256 drift: {binding.source}",
        )
        folded = payload.lower()
        for token in DENIED_TOKENS:
            require(token not in folded, f"identity token in {binding.source}")
        values.append((binding, payload))
    return values


def manifest_payload(
    values: list[tuple[BoundFile, bytes]],
    instructions_payload: bytes,
) -> dict[str, object]:
    files = {
        binding.name: {
            "conditional": binding.conditional,
            "role": binding.role,
            "sha256": sha256_bytes(payload),
            "sizeBytes": len(payload),
        }
        for binding, payload in values
    }
    files[INSTRUCTIONS_NAME] = {
        "conditional": False,
        "role": "Human upload instructions; do not submit unless requested.",
        "sha256": sha256_bytes(instructions_payload),
        "sizeBytes": len(instructions_payload),
    }
    return {
        "schemaVersion": 1,
        "kind": "icaart-2027-upload-staging",
        "reviewedSourceCommit": REVIEWED_SOURCE_COMMIT,
        "files": dict(sorted(files.items())),
    }


def verify_bundle(path: Path) -> dict[str, object]:
    manifest_path = path / MANIFEST_NAME
    require(manifest_path.is_file(), f"missing {MANIFEST_NAME}")
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    require(manifest["schemaVersion"] == 1, "unsupported manifest schema")
    expected_names = set(manifest["files"]) | {MANIFEST_NAME}
    observed_names = {child.name for child in path.iterdir() if child.is_file()}
    require(observed_names == expected_names, "unexpected or missing staging files")
    for name, record in manifest["files"].items():
        payload = (path / name).read_bytes()
        require(len(payload) == record["sizeBytes"], f"staged size drift: {name}")
        require(sha256_bytes(payload) == record["sha256"], f"staged hash drift: {name}")
    return manifest


def build_bundle(
    *,
    output: Path,
    bindings: tuple[BoundFile, ...] = BOUND_FILES,
    instructions: str = INSTRUCTIONS,
    replace: bool = False,
) -> dict[str, object]:
    values = validate_bindings(bindings)
    instructions_payload = instructions.encode("utf-8")
    for token in DENIED_TOKENS:
        require(token not in instructions_payload.lower(), "identity token in instructions")

    output = output.resolve()
    if output.exists() and not replace:
        raise FileExistsError(output)
    output.parent.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory(prefix=".icaart-stage.", dir=output.parent) as temporary:
        staging = Path(temporary) / "bundle"
        staging.mkdir(mode=0o700)
        for binding, payload in values:
            target = staging / binding.name
            target.write_bytes(payload)
            target.chmod(0o644)
        instructions_path = staging / INSTRUCTIONS_NAME
        instructions_path.write_bytes(instructions_payload)
        instructions_path.chmod(0o644)
        manifest = manifest_payload(values, instructions_payload)
        manifest_path = staging / MANIFEST_NAME
        manifest_path.write_text(
            json.dumps(manifest, indent=2, sort_keys=True) + "\n",
            encoding="utf-8",
        )
        manifest_path.chmod(0o644)
        verify_bundle(staging)

        if output.exists():
            backup = output.with_name(output.name + ".previous")
            require(not backup.exists(), f"stale replacement backup: {backup}")
            os.replace(output, backup)
            try:
                os.replace(staging, output)
            except BaseException:
                os.replace(backup, output)
                raise
            else:
                shutil.rmtree(backup)
        else:
            os.replace(staging, output)

    return {
        "files": sorted(manifest["files"]),
        "manifestSha256": sha256_bytes((output / MANIFEST_NAME).read_bytes()),
        "output": str(output),
        "reviewedSourceCommit": REVIEWED_SOURCE_COMMIT,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--replace", action="store_true")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    output = args.output.resolve()
    require(
        output == ALLOWED_OUTPUT_ROOT or ALLOWED_OUTPUT_ROOT in output.parents,
        f"CLI output must remain under {ALLOWED_OUTPUT_ROOT}",
    )
    result = build_bundle(output=output, replace=args.replace)
    print(json.dumps(result, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
