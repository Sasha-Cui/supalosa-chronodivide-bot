# V2 OD1 foundation pure gate — complete

Date: 2026-09-17. This is a technical regression result, **not** an empirical
performance result. No OD1 simulator initialization or competitive game was
part of this gate.

## Exact execution

- Source: `716cdb6ac826d1803955e94dec518f7d3ffc587f`.
- Job: `26489795`; `pi_jss233/day`; one CPU; 25 seconds;
  `COMPLETED 0:0`; zero restarts.
- TypeScript build passed.
- 208 tests in 25 files passed; no failed, pending, or todo tests.
- One additional runtime-schema test passed: 209 checks in total.
- Evidence: `research-evidence/unified-intent-arbiter-v2/od1/pure-v1`.

## Integrity

The independent audit matched the checksum/completion marker, all 25 test
source hashes, runtime test and log hashes, full Vitest report hash, program
and Slurm script hashes, and the exact scheduler row.

- Pure artifact SHA-256:
  `f8ff9ca4b2bfc252407f467274fc498991e712df44c7ddea7d3773aa0b796000`.
- Independent audit:
  `research-evidence/unified-intent-arbiter-v2/od1/pure-independent-audit-v1.json`.
- Audit SHA-256:
  `5e42a90f3c557f05c0d1f464abe318d7c70180d8404debdb0bb0b9a6b9b7c50c`.
- Program SHA-256:
  `a1cb2c4d2d35e0984fc43d05950bde49af8a5ac95b334db048e79f86a928c7d1`.
- Script SHA-256:
  `ff6c4face4e2a8da78e3968f1a48ee266885ebf7d0a7c80e61163f33e393a527`.

## Decision

The foundation passed its pure checks. Subsequent launcher/statistical work
changes source and requires a new current-source regression gate before the
frozen selector, canaries, smoke, and paired study. This result does not
authorize deployment, demonstrate improved play, or complete milestone M2.
