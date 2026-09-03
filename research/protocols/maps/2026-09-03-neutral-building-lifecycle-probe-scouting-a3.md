# Neutral-building probe: scouting actuation amendment A3

Frozen prospectively before A3 simulation. Preserve every previous protocol,
failure and result. No competitive result changes or endpoint promotion.

## Completed A2 smoke

Initialization 24643219 and two-case smoke 24643220 completed 0:0 under
pi_jss233 day, with zero restarts. Both technical traces reached exactly
6000 updates, each emitted 191 force-attack requests, and neither recorded
target destruction. Thus the complete smoke FAILED and no A2 eight-case
array was launched. Smoke SHA:
78ccef1f3e6d8b710f74bf8b16d0ab06e4a1f5f3f13ddf8baca8268e039f4722.

The deployment interface fix eliminated the exception. Source inspection
shows OrderUnitsAction rejects object targets whose footprint remains fully
shrouded, and ForceAttack has a second shroud check. The fixture knew the
target ID from evaluator queries but never sent movement/scouting commands.
This identifies a missing actuation prerequisite, consistent with the smoke;
A2 did not record visibility, so direct visibility confirmation is prospective.

## Narrow scripted change

Retain the same two byte-hashed maps, all eight assignments/seeds, actors,
ten starting units, no-target DeploySelected schedule, 6000-update horizon,
attribution rules, no competitive fields and every prior gate.

From tick 180, every 30 ticks, the attacker queries public hostile visibility.
If the live target is not visible, send its non-MCV mobile units a Move order
to the fixed fixture coordinate (50,50). Once visible, use the original
ForceAttack schedule from tick 300 at 30-tick intervals. After target health
is zero or the target is absent, send Stop. Do not reveal shroud, inject
damage, modify the engine, or relax object-attribution requirements.

Record scout and attack request counts, first target-visible tick, first
attack-request tick and hidden attack-request count. Record fixed public
target/own-unit observations at updates 0,120,180,300,600,1200,2400,6000.
Require eight observations, target visibility no later than first attack,
and zero hidden-target attack requests, in addition to every prior technical
gate. Target health is read from the public basic object-data accessor;
this does not supply new information to any competitive agent.

## Prerequisites, population and boundaries

Use a NEW output root:
research-evidence/live-building-ledger/neutral-probe-v1-scouting-a3.
Reuse A1 sealed regular assets read-only, with the same source asset and
fixture-map hashes; write no new asset copies. Freeze current source,
program, protocol, helper, runtime, candidate/legacy compiled bytes,
manifest, job IDs and checksums.

Run one zero-game initialization job, then one afterok smoke job containing
exactly two sequential full-horizon technical traces (task indices 0 and 2).
Only if both smoke traces pass ALL old and new technical checks may exactly
eight tasks 0-7 and an afterok aggregate finalizer run. No partial-trace
inspection, replacements, selective replay, or threshold weakening.

The maximum is ten neutral-target technical game instances (two smoke and
eight full-stage), never a competitive policy evaluation. Each job uses one
CPU/4 GiB/30 minutes, pi_jss233 day, no requeue; full-stage concurrency at most
eight. No source edits while source-bound jobs run. Preserve every failure.

A pass remains limited to neutral-building lifecycle. Actual combatant-owned
buildings, capture/sale/unattributed-cleanup controls, reciprocal orientations,
and event timing remain prerequisites for any corrected competitive endpoint.
Historical scores, failed confirmations, and closed V8 policies are untouched.
