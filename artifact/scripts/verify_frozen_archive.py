#!/usr/bin/env python3
"""Rebuild and verify the frozen anonymous review-archive identity."""

from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import tarfile
import tempfile
from typing import Any


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load_builder(repo_root: Path):
    path = repo_root / "artifact" / "scripts" / "build_anonymous_artifact.py"
    spec = importlib.util.spec_from_file_location("frozen_artifact_builder", path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"cannot import artifact builder: {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def load_identity(repo_root: Path) -> dict[str, Any]:
    path = repo_root / "artifact" / "FROZEN_IDENTITY.json"
    payload = json.loads(path.read_text(encoding="utf-8"))
    if payload.get("schemaVersion") != 1:
        raise ValueError("unsupported frozen-identity schema")
    archive = payload.get("archive")
    required = {"filename", "immutableFileCount", "sha256", "sizeBytes"}
    if not isinstance(archive, dict) or set(archive) != required:
        raise ValueError("invalid frozen archive identity")
    return payload


def inspect_archive(path: Path, identity: dict[str, Any]) -> dict[str, Any]:
    if not path.is_file():
        raise FileNotFoundError(path)
    expected = identity["archive"]
    actual_hash = sha256(path)
    actual_size = path.stat().st_size

    try:
        with tarfile.open(path, "r:gz") as archive:
            root = "chrono-divide-review-artifact"
            manifest_member = f"{root}/MANIFEST.json"
            member = archive.extractfile(manifest_member)
            if member is None:
                raise ValueError(f"archive lacks {manifest_member}")
            manifest = json.load(member)
            immutable_count = len(manifest.get("files", {}))
            names = archive.getnames()
            if any(
                name != root and not name.startswith(f"{root}/")
                for name in names
            ):
                raise ValueError("archive contains an entry outside the package root")
    except (OSError, tarfile.TarError, json.JSONDecodeError, KeyError) as error:
        raise ValueError(
            f"frozen archive mismatch for {path}: invalid tar.gz package"
        ) from error

    mismatches = []
    if actual_hash != expected["sha256"]:
        mismatches.append(
            f"SHA-256 expected {expected['sha256']}, observed {actual_hash}"
        )
    if actual_size != expected["sizeBytes"]:
        mismatches.append(
            f"size expected {expected['sizeBytes']}, observed {actual_size}"
        )
    if immutable_count != expected["immutableFileCount"]:
        mismatches.append(
            "manifest count expected "
            f"{expected['immutableFileCount']}, observed {immutable_count}"
        )
    if mismatches:
        raise ValueError(f"frozen archive mismatch for {path}:\n" + "\n".join(mismatches))

    return {
        "path": str(path),
        "sha256": actual_hash,
        "sizeBytes": actual_size,
        "immutableFileCount": immutable_count,
    }


def verify_current_source(repo_root: Path, identity: dict[str, Any]) -> dict[str, Any]:
    builder = load_builder(repo_root)
    expected_name = identity["archive"]["filename"]
    if expected_name != f"{builder.PACKAGE_NAME}.tar.gz":
        raise ValueError("frozen filename disagrees with the artifact builder")
    with tempfile.TemporaryDirectory(prefix="chrono-frozen-artifact.") as directory:
        output = Path(directory) / expected_name
        builder.build_archive(repo_root, output)
        return inspect_archive(output, identity)


def verify_distribution_file(
    repo_root: Path,
    identity: dict[str, Any],
) -> dict[str, Any]:
    path = repo_root / "artifact" / "dist" / identity["archive"]["filename"]
    return inspect_archive(path, identity)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--repo-root",
        type=Path,
        default=Path(__file__).resolve().parents[2],
    )
    parser.add_argument(
        "--skip-distribution-file",
        action="store_true",
        help="verify a fresh source build but do not require artifact/dist",
    )
    args = parser.parse_args()

    repo_root = args.repo_root.resolve()
    identity = load_identity(repo_root)
    source = verify_current_source(repo_root, identity)
    print(
        "source build verified: "
        f"sha256={source['sha256']} size={source['sizeBytes']} "
        f"files={source['immutableFileCount']}"
    )
    if not args.skip_distribution_file:
        distribution = verify_distribution_file(repo_root, identity)
        print(
            "distribution file verified: "
            f"sha256={distribution['sha256']} size={distribution['sizeBytes']} "
            f"files={distribution['immutableFileCount']}"
        )


if __name__ == "__main__":
    main()
