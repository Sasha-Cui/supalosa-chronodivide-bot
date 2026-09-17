# Unified intent V2 OD1: paired competitive development

Frozen: 2026-09-17, after complete V2 Gate 2 audit and before any OD1
initialization or competitive outcome.

Parent method:
`research/protocols/method/2026-09-14-unified-intent-separated-lane-v2.md`

Technical prerequisite:
`research/results/2026-09-17-unified-intent-v2-gate2-complete.md`

## Question and claim boundary

Does enabling the fixed separated-lane arbiter increase literal wins and
paired score relative to the identical deployed StrongBot, while preserving
Supalosa performance and improving play against pinned RA2Web Advanced?

This is open development, not confirmation. There are two prespecified arms
and no parameter search or selection among ceilings. The earlier hard-total
V1 M2 attempt remains invalid and sealed; none of its games is reused.

The test measures the complete arbiter component, including priorities,
validation, grouping, duplicate suppression, deferral, and command budgeting.
It does not by itself isolate which subcomponent causes an effect.

## Population and fresh identities

Use the same 900 base configurations as the V2 technical gate:
- pinned external Supalosa on all 15 frozen physical maps: 540 cases;
- pinned Advanced on the ten HFO variants: 360 cases;
- first two start ordinals in both directed orientations;
- all nine canonical countries; and
- candidate participant slots 0 and 1.

Use the exact existing map order and country order from the Gate 2 manifest.
Each case index receives seed `3,350,106,000 + caseIndex`, indices 0--899.
Each arm shares the case's engine seed and candidate/opponent RNG identities.
Slots remain distinct case seeds as in the current technical population.

One task contains the two sequential arms:
1. `disabled`: exact deployed factory with the arbiter explicitly disabled;
2. `separated_lanes_v2`: the same factory with explicit mode
   `separated_lanes_v2` and command ceiling 115.

No strategy, exact-map tactic, priority, retry interval, TTL, target choice,
chunk size, country, map bytes, or observation setting changes between arms.
The command window remains 900 updates, with no cap on essential gameplay
calls. The evaluator suppresses both players' resignations symmetrically.

There are 900 pairs, 1,800 outcome episodes, and 25 opponent-map benchmark
strata of 36 cases each. These are not 25 independent topologies. OD1 tests
only the specified first-two-start subset, not every map start combination.

Before initialization, check the new seed subranges against all registered
post-certificate manifests/reservations without reading sealed outcomes.
Bind the original audited interval [3,350,000,000, 3,351,000,000).
Any collision blocks launch; it is not repaired by silently shifting seeds.

## Corrected performance endpoint

The primary endpoint is the existing corrected live-owned v6 adjudicator
validated in the September 5 fresh dual study. Pin
`liveOwnedBuildingEliminationEndpointV6.ts`, its snapshot implementation,
version/specification hash, and compiled bytes. Its positive-health self-owned
building collection excludes destroyed rubble retained in the world.

Reuse the validated passive dual observer. Retain v5 as a secondary
measurement audit only, never as a substitute for the primary result.
Each observer's first result is immutable. Continue the same policy/world
trajectory until both observers complete, native termination, or the shared
24,000-update cap. Neither observer may inform policy decisions.

A v6 win requires opposing-player-attributed physical destruction of every
currently enemy-owned live building, after both players have established a
building. Apply its existing loss, simultaneous-destruction draw, clean
nonliteral-termination draw, and cap-draw rules exactly. Capture, sale,
unattributed removal, or resignation cannot become physical victory.
Unexplained engine termination is a technical failure, never a draw.

The 24,000-update development horizon is unchanged from the V2 method
protocol. Do not compare these win rates directly with the historical
90,000-update confirmation as if horizon, starts, and seeds were identical.
No outcome-conditioned extension or replay may rescue a failed OD1 screen.

Gate 2 used the v5 stop observer. Its pass establishes the tested engineering
behavior, not authorization to revert the corrected competitive metric.
The small noninterference check below binds v6 before OD1 outcomes.

## Small prelaunch checks

Complete the current-source build, semantic/terminal/firewall/telemetry tests,
and v6/dual-adjudicator truth-table and replay tests before simulation.

Freeze 905 zero-update case definitions: 900 competitive cases, four canary
configurations, and one smoke case. All are defined below before outcomes.

Canary configurations, using the first two map starts, direction 0,
Americans, candidate slot 0:
- HFO LE against pinned Supalosa, seed 3,350,107,000;
- Peak against pinned Supalosa, seed 3,350,107,001;
- Tour of Egypt against pinned Supalosa, seed 3,350,107,002;
- HFO LE against pinned Advanced, seed 3,350,107,003.

For each configuration run both arms under v5-only reference instrumentation
and under passive dual instrumentation, fixed at 3,600 updates. This is
16 technical episodes, packed as four configuration tasks. Require exact
public-call and normalized state hashes between observer modes within each
arm, no unexpected early engine finish, matching requested/effective seed
and starts, intact V2 invariants, and no forwarded resignation. Outputs contain
technical equality booleans and hashes only; retain no competitive outcomes.
Compare instrumentation variants, not disabled versus enabled trajectories.

After the complete canary passes, run one preserved two-arm natural-termination
smoke on HFO LE/Supalosa, first two starts, direction 0, Americans, slot 0,
seed 3,350,107,100. Discard competitive payloads. Require technical completion,
reconstructable adjudication evidence, valid checksums, both arms' identities,
and V2 command/invariant and resignation checks. These two episodes are not
included in the 1,800-game screen. No gate may depend on smoke wins or losses.

The scientific launch count is 16 canary episodes + two smoke episodes +
1,800 outcome episodes = 1,818 advancing episodes, plus 905 zero-update
initializations. No retry, replacement, or exclusion is authorized.

## Complete evidence and independent metric reconstruction

Preserve each pair's exact source, policy options, runtime, map, opponent,
country, start, slot, seed, and scheduler identities; both first v5/v6 results;
v6 terminal or cap update; per-status draw classification; resignation audits;
action and state hashes; and the complete V2 telemetry summary.

Keep a reconstructable compressed building-state/event ledger for each arm
using the existing validated delta/event rules. Store both compressed ledgers
inside the paired artifact (for example, gzip/base64) so successful tasks still
use only one artifact and one completion marker. Bound memory and bytes in the
implementation before launch; do not replace ledgers with only hashes.

The finalizer must reconstruct both endpoints independently from the ledger
and match the episode's recorded results, including unfavorable v5/v6
differences. Outcomes stay sealed until all 900 tasks and that finalizer
complete cleanly. A technical failure invalidates the population; retain its
evidence and do not analyze a completed subset or rerun selected games.

## Estimands and uncertainty

Code primary v6 score as win 1, draw 0.5, loss 0. Estimate enabled-minus-disabled
score and literal-win indicator differences within every pair.

Report equal-weight opponent-map stratum means, overall and separately for
Supalosa and Advanced; full W/D/L; every map, country, faction, direction,
slot and country/direction cell; the complete paired transition matrix;
draw subtypes; and terminal-time summaries. Do not report only winning maps.
Report v5 tables and all v5/v6 transitions as secondary measurement evidence.

Retain the earlier development decision thresholds below, now applied to v6.
Calculate deterministic 200,000-replicate benchmark-stratum bootstrap bounds:
resample 25 full paired strata overall, 15 for Supalosa, and ten for Advanced.
Use SHA-256 counter-mode domain `unified-intent-v2-od1-bootstrap-v1`,
separate named streams, unbiased index sampling, a frozen quantile convention,
and output digests. Use the empirical 0.10 quantile for one-sided 90% lower
bounds. Define the quantile as sorted index floor(0.10 * 200000).

These benchmark-stratum bounds are development filters, not proof of
generalization to independent map topologies. Also report:
- a five-topology grouped bootstrap preserving both opponents and all map
  variants within each sampled group: HFO, Peak, Tour of Egypt, South Pacific
  (both revisions), Pacific Heights; retain the primary case/stratum weights;
- opponent-specific country/direction-clustered paired bounds, resampling
  all 18 clusters with both slots and all maps intact; and
- leave-one-topology-out point effects overall.

For Advanced, all ten tested maps belong to the HFO topology; no unseen-topology
inference is identifiable from this screen. Require its country/direction
paired-score lower bound to be positive in addition to the benchmark-stratum
gate. Five-topology intervals are reported with their small-cluster limitation.
They cannot replace failed primary gates.

Report one-sided 90% Wilson win lower bounds for both arms and each opponent,
with z=1.2815515655446004, as descriptive pooled bounds alongside clustered
effects. They do not treat related maps as independent generalization tests.

## Frozen advancement decisions

A broad positive development signal requires every condition:
1. overall benchmark-stratum paired-score lower bound strictly above zero;
2. overall benchmark-stratum paired-literal-win lower bound strictly above zero;
3. Advanced benchmark-stratum paired-score lower bound strictly above zero,
   more enabled literal wins, and positive country/direction paired-score
   lower bound;
4. Supalosa paired-score lower bound at least -0.02, enabled wins greater than
   losses, and at most two Supalosa map strata with paired score below -0.10;
5. nonnegative Allied and Soviet point paired-score effects;
6. nonnegative slot-0 and slot-1 point paired-score effects; and
7. disabled-win-to-enabled-loss transitions no greater than the sum of
   disabled-loss-to-enabled-win and disabled-draw-to-enabled-win transitions.

Absolute Advanced superiority remains separate: enabled wins must exceed
losses and its pooled one-sided 90% Wilson win lower bound must exceed 0.50.
This is only a development eligibility condition; it is not the final
reliability or dominance claim.

Do not weaken these thresholds or choose a favorable endpoint, map subset,
horizon, or uncertainty method after outcomes.

If the broad signal passes, freeze fresh replication and component ablations
before deployment or paper claims. If Advanced relative improvement fails,
do not claim arbitration solves Advanced; prospective development must address
strategic play using the complete evidence. If Supalosa safety fails, do not
deploy V2 globally. If relative improvement passes but absolute Advanced
superiority fails, V2 is at most a candidate component, not completion of M2
or the user's success criterion.

## Execution and resource limits

Only clean synchronized main, Node 20.13.1, frozen runtime/opponent/map assets,
and pi_jss233/day CPU jobs are allowed. No source edits while dependent jobs
are active. Pin source/compiled bytes, protocols, V2 Gate 1/2 results, C1
record, adjudicator, dependency specs, scripts, and metadata.

After pure/selector/canary/smoke prerequisites, submit exactly array
`0-899%64`, one CPU and 8 GiB per paired task, four-hour limit, no requeue,
with an afterok fail-closed finalizer (one CPU, 24 GiB, eight-hour limit).
Stop and preserve any technical failure. Use only the three-hour heartbeat;
no continuous polling.

Successful pairs use one compact artifact and one combined checksum marker.
Keep each pair below 32 MiB and the final execution below 2,000 files.
Validate ledger bounds and reconstruction before scaling.

V2 Gate 2 used 103.942 CPU-hours for 925 episodes including verification.
Budget approximately 200--500 CPU-hours for OD1, allowing for disabled-arm
command pressure and reconstructable dual-observer ledgers. This is an estimate,
not a guarantee; record observed smoke resource use before launching the array.

The manuscript stays frozen until competitive development, fresh replication,
breadth checks, uncertainty analysis, and mechanism ablations are complete.
