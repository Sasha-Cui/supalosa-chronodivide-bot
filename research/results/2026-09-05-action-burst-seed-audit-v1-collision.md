# Action-burst V1 seed audit: namespace collision

Date: 2026-09-05

## Disposition

Seed audit job `24923442` failed correctly before any game initialization.
The proposed range in the parent protocol is not fresh and is permanently
barred from the action-burst diagnostic.

No action trace, game update, policy outcome, W/D/L value, score, endpoint,
building state, or policy ranking was generated.

## Frozen identities

- source:
  `3ea48d8901d4fd9a9c1dd95dc1d9113634a84580`
- program SHA-256:
  `917c7cdfee8a74e38bc2766d22e9fd949c37a43d180610d8f590450f79351f3f`
- protocol SHA-256:
  `a07abda852b03a3904e364235dd50672aa9885fdf1062c7e1865e0695dc636b7`
- Slurm script SHA-256:
  `e833da1dcbe25d6394e4c89d84120d37d4746a9f9e83703a36abf62d7f1b7dac`
- scheduler: `24923442`, `FAILED 2:0`, `pi_jss233/day`, one CPU,
  no GPU, zero restarts
- artifact SHA-256:
  `93f8ea58fc2bac8128fb74f9d908c226dc953495b5e18176fdcd9aa8e5e4bcfe`
- artifact bytes: 537,180,698

The audit scanned 1,811,146 retained text-like files totaling
13,717,429,484 bytes with zero read errors.

## Collision

The scanner found ten retained paths containing the proposed range. Seven are
preserved typecheck staging copies of
`missionNativeCloseoutCompatibilityGateV14.ts`. The same source is tracked in
the current driver. A completed outcome-blind compatibility artifact contains
the eighteen exact seeds beginning at the proposed lower boundary. The prior
fresh-dual seed audit also retained the value in its source-declaration
inventory.

These are genuine prior-use collisions, not hash substrings, floating-point
fragments, or the current protocol describing its own reservation.

## Integrity

The failed audit artifact is complete and outcome-blind. It records only
paths, byte offsets, integer tokens, file hashes/sizes, scan exclusions,
declared ranges, errors, and scheduler/source identities. It was written
before the job exited with the frozen collision code. No success marker or
sidecar was emitted; the exact artifact hash above was computed afterward
without modifying the artifact.

## Repair

Amendment A1 replaces only the seed range and its deterministic block bases.
The complete 1,717-trace population, maps, opponents, countries, starts,
slots, horizon, measurements, prohibited fields, reserve rule, gates, and
Slurm design remain unchanged. The failed namespace can never be reused or
described as a successful reservation.
