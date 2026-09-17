# OD1 A1 implementation checkpoint

Date: 2026-09-17. The prospective amendment was frozen in commit
`249bdd7` before implementation or A1 initialization.

## Narrow repair

The registration audit now uses `registrationRoot` and
`registrationAfterUtc`. The prohibited-field checker is unchanged.
A shared preparation-envelope builder checks all source, runtime, plan and
registration metadata before `cdapi.init` or any game initialization.
Available game-mode metadata is checked before the first case, and the
completed manifest is checked again before publication.

Two new runtime regression tests exercise the actual registration builder,
complete-envelope validation, the original offending names, and nested
competitive-field rejection. The failure therefore cannot consume another
905 initializations merely because those metadata names recur.

## Prospective complete population

The original OD1 plan builder remains intact for forensic reconstruction.
A separate A1 plan module preserves every non-seed case field, arm, map,
country, start, slot, count and horizon. Its five tests check exact fresh
ranges, total disjointness from V1, full-population integrity, and continued
original V1 reconstruction.

A1 competitive seeds are 3,350,108,000–3,350,108,899; canary seeds are
3,350,109,000–3,350,109,003; the smoke seed is 3,350,109,100.
The metadata audit explicitly verifies the hashes, scheduler failure,
905-entry launch journal, and independent audit of the abandoned V1
selector, registers its identities as consumed, and rejects any overlap.
No V1 competitive payload exists or is reconstructed.

## Isolation and accounting

New artifacts use `execution-a1`, `pure-a1`, and A1-suffixed submission
intents/receipts. V1 files remain untouched. A1 reports 905 new zero-update
initializations and the 905 preserved predecessor initializations separately:
1,810 cumulatively. The scientific advancing budget remains exactly 1,818.

No policy, endpoint, action budget, horizon, bootstrap, or advancement gate
was changed. No A1 initializer or gameplay episode has run at this checkpoint.

## Validation and next gate

TypeScript build and JavaScript syntax checks passed. All 16 runtime/analysis
tests and 14 original/A1 plan tests passed locally (30 focused checks).
The source-bound Slurm gate now requires 213 tests in 26 files, one runtime
schema test, and 16 runtime/analysis tests: 230 checks in total.

After that gate passes, use the committed submission helper's `prepare`
phase for A1. Keep the same clean synchronized source commit throughout the
dependent selector, canary, smoke, paired array and finalizer stages.
Do not delete receipts, treat V1 as successful, or reuse individual failed
cases. Preserve complete technical gates before advancing.
