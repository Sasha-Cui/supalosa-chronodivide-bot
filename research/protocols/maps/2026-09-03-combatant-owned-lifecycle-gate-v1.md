# Combatant-owned lifecycle gate v1

Status: prospectively frozen design, before implementation or live simulation.
A neutral lifecycle pass is a prerequisite, not endpoint-promotion authority.
A3 passed at aggregate
9e3d788a97e1b078ce93b03fc20af9af065e83fe60a78fcc20ddf733a750581a.

## Objective and public-information boundary

Validate the candidate live-owned snapshot against REAL combatant-owned
buildings and strict physical attribution. Agent actions use public GameApi
and ActionsApi only. Evaluator snapshots may inspect both declared actors,
but no extra observations are granted to StrongBot or another competitive
policy. No trained policy appears in these fixtures.

Use pinned game-api 0.75.0 and the already validated explicit-start loader.
Legacy endpoint version 5 and candidate snapshot stay separate. Do not modify
the installed engine, inject damage, reveal shroud or change old results.

## Controlled assets and actors

Derive private maps from the same simple-1v1-no-preview.map template,
SHA bd61bb9ab4412b15895c89188336ab53b03dd20879936b92aaf4418e091cf7fc.
Keep geometry, start points, and one Neutral GAPOWR at (50,50), health 256/256.
Use GAPOWR Strength=100, Crewed=no, Explodes=no and scenario-specific
LeaveRubble. Retain native Capturable and Returnable rules; verify Capturable
true and Returnable false during preflight.

Allow ENGINEER and SENGINEER to start in multiplayer; disallow E2 and HTNK
in these fixture maps only. Do not change their native Owner/ForbiddenHouses
rules. Inspected rules make ENGINEER available to Americans but not Russians,
and SENGINEER available to Russians but not Americans. The attacker is
Americans, the owner actor Russians. Both have ten starting units and an MCV.
Require attacker ENGINEER and MTNK and owner SENGINEER before any update.
The owner's initial type set must be exactly SMCV plus SENGINEER; the
attacker's allowed initial types are AMCV, MTNK, E1 and ENGINEER. Engineers'
native DefuseKit/VirtualScanner tools are permitted; they are not an armed
defender troop. Any other starting type fails technically. This is a
pre-implementation clarification of the noncombatant-owner loadout guard.

All other settings match A3: credits 10000, no crates/superweapons,
shortGame=false, mcvRepacks=true, gameSpeed=6, buildOffAlly=false.
Hash every private map and every runtime/asset entry. Reuse sealed regular
assets read-only where possible; never use asset symlinks with the pinned
file reader. New generated maps and all outputs live only under
research-evidence/live-building-ledger/combatant-owned-gate-v1.

## Exact population

Five scenarios in this fixed order:

1. physical_no_rubble: attacker physically destroys owner target, LeaveRubble=no.
2. physical_rubble: same, LeaveRubble=yes.
3. capture: attacker engineer captures the owner target, LeaveRubble=yes.
4. sale: owner sells its own target, LeaveRubble=yes.
5. cleanup: owner invokes the public quit action to induce unattributed
   engine asset cleanup, LeaveRubble=yes.

Cross five scenarios with two reciprocal physical start/slot orientations,
two evaluator label mappings (attacker is candidate or baseline), and two
deterministic repeats: exactly 40 full-stage cases. Task index =
scenarioIndex*8 + orientation*4 + attackerLabelIndex*2 + repeat.
Seed = 3100500000 + scenarioIndex*100 + orientation. Repeat and label mapping
do not alter the seed or actor callback RNG identities. Use fixed actor
identities fixture-attacker and fixture-owner for RNG binding independently
of evaluator labels.

These are technical repetitions, not 40 independent competitive trials.
No statistical bot-strength inference or competitive outcome field is allowed.

## Controlled preparation and action schedule

The attacker deploys its AMCV with no-target DeploySelected every 15 ticks
below tick 120. The owner leaves its SMCV undeployed.

From tick 120 every 30 ticks, the owner sends its lowest-ID live SENGINEER
toward (50,50) while the target is not publicly visible, then uses the public
Capture order once visible and still neutral. After ownership is acquired,
Stop remaining owner engineers; do not repair, build or attack. Keep the
attacker's other units stationary during preparation.

At tick 1800 BEFORE any scenario action, require both actors to have
established live buildings, target owner exactly the owner actor, exactly
one live owner building (the target), and at least one attacker building.
Require recorded neutral-to-owner ObjectOwnerChange. A missing readiness
condition is a preserved technical failure, not an excluded case or extended
deadline.

From tick 1800 every 30 ticks:

- Physical scenarios: attacker sends non-MCV, non-engineer mobile combatants
  toward the fixed target while hidden, then ForceAttack only when visible.
- Capture scenario: attacker sends its lowest-ID live ENGINEER toward the
  target while hidden, then Capture only when visible.
- Sale scenario: owner sends exactly one sellObject(targetId) at tick 1800.
- Cleanup scenario: owner sends exactly one quitGame at tick 1800.

The cleanup quit is a deliberately induced negative technical control.
It does NOT change symmetric resignation suppression in competitive runners.
No other quit is permitted in these fixtures.

Run until the first specified target lifecycle transition and its same-update
post-snapshot have been recorded, with maximum 7200 updates. The target must
transition after readiness. Do not continue to unrelated competitive
endpoints. An earlier unexpected game finish or a missing transition fails
technically. A game finish induced by the declared cleanup action is permitted;
do not inspect or serialize the defeated side, native winner, score or W/D/L.

## Required evidence and checks

Retain a gzip-compressed canonical per-update stream of BOTH building
snapshots (world/legacy and candidate), normalized target lifecycle events,
game tick and fixed actor identities. Retain fixed public movement/visibility
observations at updates 0,120,300,600,1200,1799 and the action/transition
boundaries. Record action counts, initial unit identities, preparation
ownership acquisition, exact terminal-free stop reason, all file hashes,
source/program/protocol/manifest/runtime bindings and Slurm IDs.

Physical cases require a same-update target ObjectDestroy attributed to the
opposing actor, ObjectUnspawn, owner live-owned zeroing, and correct strict
attribution for the declared evaluator label. Non-rubble disappears from world;
rubble remains at zero health with the old owner tag but not in owned/live
collections. The legacy comparator must agree for non-rubble and miss the
rubble zeroing, as predicted before these outcomes.

Capture requires owner change to the attacker with positive target health;
sale requires removal following the single sale action; cleanup requires
removal/zero-health destruction with NO opposing-player attribution following
the single declared quit. In EVERY negative control, neither evaluator side
may receive a physical-destruction verdict. Do not credit disappearance,
ownership change or cleanup as an attack.

Recompute candidate and legacy adjudication from the preserved canonical
stream, including the first qualifying transition, not just stored booleans.
Require deterministic repeat hashes, world/action stream identity across the
two evaluator label mappings, exact role symmetry, complete population, and
zero non-declared actions. All old source and artifact evidence is immutable.

## Fail-closed stages and resources

After pure tests and source/API review, freeze implementation hashes and
an immutable 40-case manifest before any live job. Run one initialization-only
job. Then one sequential smoke job covering indices 0,8,16,24,32 (all five
scenarios, orientation 0, label 0, first repeat). Only if every smoke scenario
passes all technical checks may the full 40-case array and afterok aggregate
finalizer run. Preserve the five smoke traces separately; do not substitute
them into the full 40-case aggregate. Maximum live cases: 45.

Use Slurm account pi_jss233, CPU day only, 1 CPU/4 GiB per task, at most eight
concurrent tasks, no automatic requeue. Set 30-minute limits for cells and
60 minutes for the five-case sequential smoke; document storage and CPU-hour
estimates in the implementation manifest. No partial-trace inspection or
tracked-source edits during source-bound jobs. Analyze only complete stages,
check exact accounting and checksums, and preserve all failures without
selective replacement or relaxed gates.

## Advancement boundary

A full pass can support a separately versioned corrected snapshot interface,
not retrospective correction of selected results or automatic paper claims.
Freeze a new competitive evaluation protocol and fresh complete cohorts
before using the new endpoint. Review all potentially affected historical
outcomes, including wins/losses, without selectively rescoring favorable
draws. Failed confirmations remain failed as run; Advanced V8 remains closed.
Do not write the paper or optimize competitive policies while this gate is
incomplete. A failure requires prospective diagnosis and amendment, not
promotion on partial or neutral-only evidence.
