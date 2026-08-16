# V24 integration hash audit

Recorded: 2026-08-15 (America/New_York)

The integration-eligible manifests were reparsed from disk and every committed
row was independently rehashed:

| Layer | Manifest rows | Missing or mismatched |
|---|---:|---:|
| V18 | 44 | 0 |
| V19 | 3 | 0 |
| V20 | 2 | 0 |
| V21 | 4 | 0 |
| V23 | 1 | 0 |
| V24 | 2 | 0 |

Applying overwrite precedence V18, V19, V20, V21, V23, then V24 yields 37
effective TypeScript files. Every effective hash matches its corresponding file
in the isolated V24 integration mirror: 37 checked, zero missing, zero
mismatched. V22 remains explicitly excluded.

The V24 mirror passed strict checking of the affected production roots and
113/113 focused tests. This is outcome-blind integrity and compatibility
evidence, not competitive evidence.
