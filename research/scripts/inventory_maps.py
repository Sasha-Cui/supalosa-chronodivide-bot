#!/usr/bin/env python3
"""Create a content-hash inventory for the two preserved map collections."""

from __future__ import annotations

import argparse
import hashlib
import json
from collections import defaultdict
from pathlib import Path


def digest(path: Path) -> str:
    value = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            value.update(chunk)
    return value.hexdigest()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--data-root",
        type=Path,
        default=Path("packages/chronodivide-bot-driver/data"),
    )
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()

    roots = [
        ("direct", args.data_root),
        ("realistic-maps", args.data_root / "realistic-maps"),
    ]
    rows: list[dict[str, object]] = []
    for collection, root in roots:
        for path in sorted(root.glob("*.map")):
            rows.append(
                {
                    "collection": collection,
                    "path": str(path.resolve()),
                    "relativePath": str(path),
                    "bytes": path.stat().st_size,
                    "sha256": digest(path),
                }
            )

    by_hash: dict[str, list[str]] = defaultdict(list)
    for row in rows:
        by_hash[str(row["sha256"])].append(str(row["relativePath"]))
    duplicate_groups = [
        {"sha256": value, "files": files}
        for value, files in sorted(by_hash.items())
        if len(files) > 1
    ]
    payload = {
        "schemaVersion": 1,
        "mapFiles": len(rows),
        "uniqueContentHashes": len(by_hash),
        "duplicateGroups": len(duplicate_groups),
        "duplicateFileOccurrences": sum(len(group["files"]) for group in duplicate_groups),
        "rows": rows,
        "exactDuplicateGroups": duplicate_groups,
        "caution": (
            "Content hashes detect exact duplicates only. Revised or renamed maps must be grouped "
            "into map families before train/validation/test splitting."
        ),
    }
    rendered = json.dumps(payload, indent=2, sort_keys=True) + "\n"
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(rendered)
    else:
        print(rendered, end="")


if __name__ == "__main__":
    main()
