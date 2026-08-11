#!/usr/bin/env python3
"""Build a deterministic, identity-neutral paper review artifact."""

from __future__ import annotations

import argparse
import gzip
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import shutil
import sys
import tarfile
import tempfile
from typing import Any


PACKAGE_NAME = "chrono-divide-review-artifact"
REDACTED = "REDACTED_FOR_DOUBLE_BLIND"
DENIED_TEXT = (
    "Sasha Cui",
    "sasha.z.cui@gmail.com",
    "zc362",
    "pi_jss233",
    "/nfs/roberts",
    "github.com/Sasha-Cui",
    "Yale University",
)
REDACTED_KEYS = {"sourceGitCommit"}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load_generator(path: Path):
    spec = importlib.util.spec_from_file_location("artifact_generate_assets", path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"cannot import {path}")
    module = importlib.util.module_from_spec(spec)
    previous = sys.dont_write_bytecode
    sys.dont_write_bytecode = True
    try:
        spec.loader.exec_module(module)
    finally:
        sys.dont_write_bytecode = previous
    return module


def sanitize_payload(value: Any) -> Any:
    if isinstance(value, dict):
        sanitized = {}
        for key, child in value.items():
            if key in REDACTED_KEYS:
                sanitized[key] = REDACTED
            elif key in {"account", "schedulerAccount"} and child == "pi_jss233":
                sanitized[key] = REDACTED
            else:
                sanitized[key] = sanitize_payload(child)
        return sanitized
    if isinstance(value, list):
        return [sanitize_payload(child) for child in value]
    return value


def copy_paper(repo_root: Path, package_root: Path) -> None:
    shutil.copytree(
        repo_root / "paper",
        package_root / "paper",
        ignore=shutil.ignore_patterns("build", "__pycache__", "*.pyc"),
    )


def write_sanitized_artifacts(
    repo_root: Path,
    package_root: Path,
    filenames: list[str],
) -> dict[str, str]:
    target_dir = package_root / "research" / "artifacts"
    target_dir.mkdir(parents=True)
    hashes: dict[str, str] = {}
    for filename in sorted(filenames):
        source = repo_root / "research" / "artifacts" / filename
        payload = sanitize_payload(json.loads(source.read_text(encoding="utf-8")))
        target = target_dir / filename
        target.write_text(
            json.dumps(payload, indent=2, sort_keys=True) + "\n",
            encoding="utf-8",
        )
        hashes[filename] = sha256(target)
    return hashes


def replace_generator_hashes(
    generator_path: Path,
    original_hashes: dict[str, str],
    sanitized_hashes: dict[str, str],
) -> None:
    text = generator_path.read_text(encoding="utf-8")
    for filename in sorted(original_hashes):
        original = original_hashes[filename]
        sanitized = sanitized_hashes[filename]
        if text.count(original) != 1:
            raise ValueError(f"expected one pinned hash for {filename}")
        text = text.replace(original, sanitized)
    generator_path.write_text(text, encoding="utf-8")


def write_manifest(package_root: Path) -> dict[str, str]:
    entries = {
        path.relative_to(package_root).as_posix(): sha256(path)
        for path in sorted(package_root.rglob("*"))
        if path.is_file() and path.name != "MANIFEST.json"
    }
    payload = {
        "schemaVersion": 1,
        "scope": "all package files except MANIFEST.json",
        "files": entries,
    }
    (package_root / "MANIFEST.json").write_text(
        json.dumps(payload, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    return entries


def anonymity_scan(package_root: Path) -> None:
    violations: list[str] = []
    for path in sorted(package_root.rglob("*")):
        relative = path.relative_to(package_root).as_posix()
        for token in DENIED_TEXT:
            if token in relative:
                violations.append(f"filename contains {token!r}: {relative}")
        if not path.is_file():
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        for token in DENIED_TEXT:
            if token in text:
                violations.append(f"file contains {token!r}: {relative}")
    if violations:
        raise ValueError("anonymous artifact scan failed:\n" + "\n".join(violations))


def build_package(repo_root: Path, package_root: Path) -> dict[str, str]:
    if package_root.exists():
        raise FileExistsError(package_root)
    package_root.mkdir(parents=True)

    source_generator = repo_root / "paper" / "scripts" / "generate_assets.py"
    source_module = load_generator(source_generator)
    filenames = sorted(source_module.EXPECTED_ARTIFACT_HASHES)

    copy_paper(repo_root, package_root)
    sanitized_hashes = write_sanitized_artifacts(repo_root, package_root, filenames)
    copied_generator = package_root / "paper" / "scripts" / "generate_assets.py"
    replace_generator_hashes(
        copied_generator,
        dict(source_module.EXPECTED_ARTIFACT_HASHES),
        sanitized_hashes,
    )

    shutil.copyfile(repo_root / "artifact" / "templates" / "REVIEW_README.md", package_root / "README.md")
    shutil.copyfile(repo_root / "artifact" / "THIRD_PARTY.md", package_root / "THIRD_PARTY.md")
    (package_root / "artifact_hashes.json").write_text(
        json.dumps(sanitized_hashes, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )

    copied_module = load_generator(copied_generator)
    copied_module.generate_all(package_root, package_root / "paper" / "generated")
    anonymity_scan(package_root)
    return write_manifest(package_root)


def write_deterministic_archive(package_root: Path, archive_path: Path) -> None:
    archive_path.parent.mkdir(parents=True, exist_ok=True)
    temporary = archive_path.with_suffix(archive_path.suffix + ".tmp")
    with temporary.open("wb") as raw:
        with gzip.GzipFile(filename="", mode="wb", fileobj=raw, mtime=0) as compressed:
            with tarfile.open(fileobj=compressed, mode="w") as archive:
                for path in sorted(package_root.rglob("*")):
                    relative = path.relative_to(package_root)
                    arcname = Path(PACKAGE_NAME) / relative
                    info = tarfile.TarInfo(arcname.as_posix())
                    info.mtime = 0
                    info.uid = 0
                    info.gid = 0
                    info.uname = ""
                    info.gname = ""
                    if path.is_dir():
                        info.type = tarfile.DIRTYPE
                        info.mode = 0o755
                        archive.addfile(info)
                    elif path.is_file():
                        data = path.read_bytes()
                        info.size = len(data)
                        info.mode = 0o644
                        archive.addfile(info, fileobj=io.BytesIO(data))
                    else:
                        raise ValueError(f"unsupported package entry: {path}")
    temporary.replace(archive_path)


def build_archive(repo_root: Path, archive_path: Path) -> str:
    build_parent = repo_root / "artifact" / "build"
    build_parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="package.", dir=build_parent) as directory:
        package_root = Path(directory) / PACKAGE_NAME
        build_package(repo_root, package_root)
        write_deterministic_archive(package_root, archive_path)
    return sha256(archive_path)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo-root", type=Path, default=Path(__file__).resolve().parents[2])
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    repo_root = args.repo_root.resolve()
    output = args.output or repo_root / "artifact" / "dist" / f"{PACKAGE_NAME}.tar.gz"
    digest = build_archive(repo_root, output.resolve())
    print(f"archive={output.resolve()}")
    print(f"sha256={digest}")


if __name__ == "__main__":
    main()
