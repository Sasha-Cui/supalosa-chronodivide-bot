# HFO bottom simultaneous-draw diagnostic V1 result

Status: **complete; open-development mechanism evidence**

## Identities

- Slurm job `22795823`, completed `0:0` under `pi_jss233` in 12:26.
- Source commit: `96b2f8ed40947d198fc903a0393faa096d2db29a`.
- Protocol SHA-256:
  `9960704b49cdb1560dce9a68cd75e30f2380109ea4cc457141417d6afc072ac3`.
- Artifact SHA-256:
  `9f225651a664c59cebf3b7e35ff52c13539f27f6c466384188f58405bc1f94d2`.
- Exact reproduction: engine-nonliteral draw at tick 59,916, candidate bottom
  and baseline top, with one suppressed resignation attempt per side.

## Observed mechanism

This was not gradual simultaneous destruction. From tick 53,940 through tick
59,880, StrongBot retained 10 buildings and 12 combatants while Supalosa
retained four buildings and one combatant. Neither building count changed for
at least 5,940 ticks. At engine termination all objects were removed together,
which produced the apparent zero-versus-zero endpoint.

During the final 6,000 ticks StrongBot emitted 6,000 recorded orders:

- 4,000 direct attacks against the same target ID; and
- 2,000 attack-move orders to `(39,81)`.

The candidate force remained materially superior but made no building
progress. At tick 42,000 it had 27 combatants and ten buildings against three
combatants and four buildings; at tick 54,000 it still had 12 combatants and
ten buildings against one combatant and four buildings.

## Interpretation

The failure is a stalled objective assignment, not lack of combat power or a
need to fight the remaining unit first. Existing bottom cleanup repeatedly
selects one high-weight building and has no progress-aware target rotation.
The next screen therefore tests building-only stalled retargeting, unconditional
rotation, top-pocket priority, and split building attacks.

## Instrumentation limitation

The artifact's building-threshold fields all report tick 1 because the initial
undeployed MCV state has zero buildings. Those fields are invalid and are not
used. Fixed snapshots and the rolling final trajectory establish the mechanism;
future threshold instrumentation must first establish a positive building
count before recording downward crossings.

## Claim boundary

This replay is outcome-selected and cannot estimate the frequency or benefit of
any repair. Fresh all-country bottom-versus-top cases are required.
