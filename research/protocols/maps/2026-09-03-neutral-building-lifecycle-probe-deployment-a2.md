# Neutral-building probe: deployment interface repair A2

Status: prospectively frozen before new live simulation. No competitive
endpoint promotion or result rescoring is authorized.

## Complete A1 failure and source diagnosis

All eight A1 tasks in array 24639986 FAILED 1:0, zero restarts; finalizer
24639987 was cancelled without running. The common exception was "Cannot
read properties of undefined (reading 'obj')". No trace result was written.

The fixture issues ActionsApi.orderUnits(ids, OrderType.Deploy) without a
target. In the pinned engine, Deploy constructs targeted DeployOrder, whose
isValid method directly reads this.target.obj. DeploySelected constructs the
non-targeted order. The existing working bots use DeploySelected. This is a
source-identified interface bug matching the exception; the A1 compact log
omitted stack/progress, so exact A1 update counts are not known and must not
be claimed to be zero.

## Narrow repair and evidence preservation

Use DeploySelected for the already intended no-target MCV deployment. All
case assignments, seeds, actor policies apart from this API correction,
maps, starting units, timing, fixed 6000-update horizon and technical gates
remain unchanged from the original f6dce6b protocol.

Retain every v1/A1 artifact. Write only a new root:
research-evidence/live-building-ledger/neutral-probe-v1-deployment-a2.
Reuse the A1 regular asset files read-only, hash-verified against the sealed
A1 manifest 1a005ed67327b38d0f95d0ae30f18440804674fca18b9d30c4d1d42728d29b3b.
No additional asset copies, asset edits, installed-runtime edits or history
rewrites. Add compact stack frames and explicit phase/game-callback/update
progress to prospective failure records. Do not print minified source lines.

## Mandatory end-to-end prerequisites

1. Run one initialization-only Slurm job at the new source, with zero game
   instances/updates and exact current identities.
2. Only after its checksum-protected clean completion, run ONE smoke job
   containing exactly two full technical traces sequentially: task indices
   0 and 2 (non-rubble and rubble, orientation 0, first repeat). Require every
   original per-trace technical check in both cases. The smoke is separate
   preserved compatibility evidence, not a replacement or selection source.
3. Only after smoke completion and all technical checks pass, launch exactly
   the unchanged eight-case crossed design (0-7) plus afterok finalizer.

The smoke may record only the same public lifecycle data and technical
booleans as the probe. No W/D/L, score, competitive endpoint orientation,
defeated-side or policy ranking. These are neutral-target technical fixtures,
not competitive games or selectively replayed scientific outcomes.

The full stage still requires complete aggregate inspection, eight unique
scheduler task IDs, pi_jss233 day, zero restarts, all source/runtime/asset/
protocol/manifest bindings, 6000 updates per trace, precise destruction and
unspawn attribution, expected world-vs-owned behavior and matching repeat
hashes. No source changes while source-bound jobs run. No automatic reruns.

## Resource bound and advancement

One CPU and 4 GiB per job, day partition/account pi_jss233, 30-minute limit,
at most eight concurrent full-stage tasks, no GPU. At most ten technical game
instances if prerequisites pass (two smoke plus eight stage); no game in init.
A failed smoke prevents the array. Preserve failures and diagnose them before
a new prospective amendment.

Even a pass remains a NEUTRAL lifecycle probe, not the complete live gate.
Actual combatant-owned buildings, capture, sale, unattributed cleanup, both
orientations and event timing must still be validated before a versioned
competitive endpoint change. Historical results and failed confirmations
remain unchanged; Advanced V8 remains closed and the paper stays frozen.
