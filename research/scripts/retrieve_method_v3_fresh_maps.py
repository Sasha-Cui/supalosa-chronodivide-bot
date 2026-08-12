#!/usr/bin/env python3
"""Retrieve exact method-v3 fresh maps without redistributing map bytes."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import urllib.request
from pathlib import Path
from typing import Any


DEFAULT_BASE_URL = "https://cncmaparchive.org/download/YR"
MAP_NAME = re.compile(r"^method_v3_fresh_([0-9a-f]{40})\.map$")


def sha256_bytes(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest()


def safe_repo_path(repo_root: Path, relative: str) -> Path:
    candidate = Path(relative)
    if candidate.is_absolute() or ".." in candidate.parts:
        raise ValueError(f"Unsafe catalog path: {relative}")
    resolved = (repo_root / candidate).resolve()
    try:
        resolved.relative_to(repo_root.resolve())
    except ValueError as error:
        raise ValueError(f"Catalog path escapes repository: {relative}") from error
    return resolved


def load_maps(catalog_path: Path) -> list[dict[str, Any]]:
    catalog = json.loads(catalog_path.read_text(encoding="utf-8"))
    rows = catalog.get("maps") if isinstance(catalog, dict) else None
    if catalog.get("outcomeBlind") is not True or not isinstance(rows, list) or not rows:
        raise ValueError("Expected the frozen outcome-blind fresh-map catalog")
    return rows


def retrieve(
    repo_root: Path,
    catalog_path: Path,
    base_url: str,
    verify_existing: bool,
) -> dict[str, int]:
    downloaded = verified = 0
    seen_paths: set[str] = set()
    for index, row in enumerate(load_maps(catalog_path)):
        if not isinstance(row, dict):
            raise ValueError(f"Catalog map {index} is not an object")
        relative = row.get("path")
        expected_sha256 = row.get("sha256")
        expected_bytes = row.get("bytes")
        if (
            not isinstance(relative, str)
            or relative in seen_paths
            or not re.fullmatch(r"[0-9a-f]{64}", str(expected_sha256))
            or not isinstance(expected_bytes, int)
            or isinstance(expected_bytes, bool)
            or expected_bytes <= 0
        ):
            raise ValueError(f"Catalog map {index} has invalid exact-file fields")
        seen_paths.add(relative)
        match = MAP_NAME.fullmatch(Path(relative).name)
        if match is None:
            raise ValueError(f"Catalog map path lacks the committed content SHA-1: {relative}")
        target = safe_repo_path(repo_root, relative)
        if target.exists():
            if (
                not target.is_file()
                or target.stat().st_size != expected_bytes
                or hashlib.sha1(target.read_bytes()).hexdigest() != match.group(1)
                or sha256_bytes(target.read_bytes()) != expected_sha256
            ):
                raise ValueError(f"Existing fresh map differs from the catalog: {target}")
            verified += 1
            continue
        if verify_existing:
            raise FileNotFoundError(f"Fresh map is absent in verification mode: {target}")
        url = f"{base_url.rstrip('/')}/{match.group(1)}"
        with urllib.request.urlopen(url, timeout=60) as response:
            payload = response.read()
        if (
            len(payload) != expected_bytes
            or hashlib.sha1(payload).hexdigest() != match.group(1)
            or sha256_bytes(payload) != expected_sha256
        ):
            raise ValueError(f"Downloaded bytes do not match the frozen catalog: {url}")
        target.parent.mkdir(parents=True, exist_ok=True)
        descriptor = os.open(target, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(descriptor, "wb") as handle:
            handle.write(payload)
            handle.flush()
            os.fsync(handle.fileno())
        downloaded += 1
    return {"requested": len(seen_paths), "downloaded": downloaded, "verified": verified}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-root", type=Path, required=True)
    parser.add_argument("--catalog", type=Path, required=True)
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL)
    parser.add_argument("--verify-existing", action="store_true")
    args = parser.parse_args()
    summary = retrieve(
        args.repo_root.resolve(),
        args.catalog.resolve(),
        args.base_url,
        args.verify_existing,
    )
    print(json.dumps({
        **summary,
        "catalog": str(args.catalog.resolve()),
        "baseUrl": args.base_url,
        "mapBytesRedistributedByRepository": False,
    }, sort_keys=True, indent=2))


if __name__ == "__main__":
    main()
