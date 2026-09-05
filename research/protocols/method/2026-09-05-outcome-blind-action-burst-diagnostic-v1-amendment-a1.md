# Outcome-blind timestamped action-burst diagnostic V1 amendment A1

Frozen: 2026-09-05, after seed audit `24923442` failed and before any new
initialization or action trace

Parent protocol:

`2026-09-05-outcome-blind-action-burst-diagnostic-v1.md`

Failure record:

`../../results/2026-09-05-action-burst-seed-audit-v1-collision.md`

## Reason

The parent range collided with a completed, outcome-blind
mission-native-closeout compatibility population. Audit `24923442` scanned
1,811,146 files and found the tracked V14 source, seven preserved staging
copies, a complete eighteen-seed artifact, and a prior seed-audit inventory.
The parent range is barred permanently.

No game was initialized and no outcome was generated or inspected.

## Replacement range

Replace the parent range with:

[
3{,}980{,}000{,}000 leq mathrm{seed} < 3{,}981{,}000{,}000.
]

Its signed-int32-equivalent half-open interval is:

[
-314{,}967{,}296 leq mathrm{seed}_{32} < -313{,}967{,}296.
]

Replace the two block definitions with:

- pinned-Supalosa map block `i`:
  `3,980,000,000 + 1,000*i`; and
- Advanced HFO map block `i`:
  `3,980,100,000 + 1,000*i`.

The within-block formula, shared reciprocal-slot seeds, opponent-start rule,
duplicate-pair construction, and every other parent requirement are unchanged.

## Audit

Run a new complete lexical audit under a new exclusive
`seed-audit-v1-a1` root. Exclude the parent/current protocol, this amendment,
and the exact audit implementation/test/Slurm sources from collision
classification while binding and hashing them explicitly. Preserve the failed
V1 root byte-for-byte.

The new range remains only a proposal until the A1 audit passes with zero
errors and zero collisions. Any collision requires another prospective
amendment; never whitelist a prior use or narrow the interval around an
observed token.
