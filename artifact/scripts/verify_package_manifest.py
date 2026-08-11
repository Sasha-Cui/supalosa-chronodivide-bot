#!/usr/bin/env python3
"""Verify every immutable file in an extracted anonymous review artifact."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


IGNORED_DIRECTORY_NAMES = {"build", "__pycache__"}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def is_ignored(relative: Path) -> bool:
    return bool(IGNORED_DIRECTORY_NAMES.intersection(relative.parts)) or relative.suffix == ".pyc"


def main() -> int:
    root = Path(__file__).resolve().parent
    manifest_path = root / "MANIFEST.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    if manifest.get("schemaVersion") != 1:
        raise SystemExit("unsupported MANIFEST.json schemaVersion")

    expected: dict[str, str] = manifest["files"]
    missing: list[str] = []
    changed: list[str] = []
    for relative_text, expected_hash in sorted(expected.items()):
        path = root / relative_text
        if not path.is_file():
            missing.append(relative_text)
        elif sha256(path) != expected_hash:
            changed.append(relative_text)

    actual = {
        path.relative_to(root).as_posix()
        for path in root.rglob("*")
        if path.is_file()
        and path != manifest_path
        and not is_ignored(path.relative_to(root))
    }
    extra = sorted(actual.difference(expected))

    if missing or changed or extra:
        raise SystemExit(
            "manifest verification failed: "
            f"missing={missing}, changed={changed}, extra={extra}"
        )
    print(f"Manifest verified: {len(expected)} immutable files")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
