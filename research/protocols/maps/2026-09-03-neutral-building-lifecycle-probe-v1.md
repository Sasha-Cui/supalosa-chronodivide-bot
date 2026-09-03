# Neutral-building lifecycle probe v1 (technical only)

Frozen before simulation. This is a bounded public-API lifecycle probe, NOT
the complete live compatibility gate and NOT a competitive evaluation.

## Fixed population and runtime

Eight traces: leaveRubble false/true x attacker at explicit start/slot 0 or 1
x two deterministic repeats. Task index = orientation*4 + rubble*2 + repeat.
Every trace uses seed 3100300000 + orientation. The same seed is deliberately
repeated only to test technical determinism. The newly generated fixture map
makes these cases distinct from every competitive population. No prior or
sealed competitive case is replayed.

Use pinned game-api 0.75.0, original SHA
dd398f5c8c2b4c3e3d6eb0f9ca6d7549bf70fee16c5950cd8902616ac922497d,
and the validated explicit-start loader (effective SHA
4ad4a5dd7a6a8ae53a7e671a29d7dd0a5fbad1916d94e52c69c9eda133a30f0c).
Derive two private fixture maps from simple-1v1-no-preview.map, SHA
bd61bb9ab4412b15895c89188336ab53b03dd20879936b92aaf4418e091cf7fc.
Retain all original geometry and start points. Add exactly one neutral GAPOWR
at (50,50), health 256/256; set GAPOWR Strength=100, Crewed=no,
Explodes=no and LeaveRubble to the arm value. Preserve all installed maps,
runtime bytes, and shared assets. Create a separate symlink-backed asset
directory with byte-exact generated fixture maps and an immutable manifest.

## Scripted actors and horizon

The attacker is Americans; the passive other player is Russians. Slot/start
orientation is reciprocal. There is no StrongBot, Supalosa, Advanced, learned
policy, adaptive selection, or parameter optimization in this probe.

Both receive ten starting units, credits 10000, no crates/superweapons,
shortGame=false, gameSpeed=6, mcvRepacks=true. The attacker requests deployment
of its MCV every 15 ticks below tick 120. Starting at tick 300 it force-attacks
only the neutral target with non-MCV mobile units, every 30 ticks. Once the
target has zero health or is absent, it issues Stop at those same checks.
The second bot issues no actions. Run exactly 6000 updates; unexpected game
finish is technical failure, with no defeated-side or competitive outcome
inspection.

## Measurements and pass criteria

Collect the public event stream once, from the attacker. Compare old
world-building and candidate self-owned snapshots before/after each update.
Hash the full canonical snapshot/event sequence. Save target event-boundary
snapshots and technical booleans only: no W/D/L, score, policy ranking,
defeated-side, or competitive endpoint labels.

Require all eight traces to initialize with the exact requested starts and
one target, complete 6000 updates, establish an attacker building before
target destruction, issue the scripted attack, and record exactly one target
ObjectDestroy attributed to the attacker, with ObjectUnspawn. In every trace,
the target must leave its public owned collection and candidate snapshot.
For rubble=true it must remain as zero-health world object with prior owner;
for rubble=false it must disappear from the world. The strict unchanged
attribution evaluator must recognize target-owned zeroing using the candidate
snapshot; the legacy snapshot must recognize it only for non-rubble. Repeat
hashes must match within each of the four configurations. The full aggregate
must contain all eight distinct Slurm task IDs plus its finalizer, account
pi_jss233, day partition, COMPLETED 0:0, zero restarts, matching source/program/
protocol/manifest/runtime identities and immutable completion checksums.

## Scope and stopping rule

This isolates a real engine primitive using a neutral target. It does NOT
establish actual-combatant-owned lifecycle equivalence, capture/sale/cleanup
negative controls, or incidence in prior games. Passing this probe does not
authorize a corrected competitive endpoint or rescoring. Those remaining
controls must be frozen and validated separately before promotion.

Failure preserves every trace and aggregate. Diagnose the failed interface
prospectively; no replacement trace or changed threshold is folded into v1.
Use at most eight concurrent one-CPU, 4-GiB, 30-minute Slurm pi_jss233 day tasks.
No GPU. No tracked-source edits during the source-bound array/finalizer.
