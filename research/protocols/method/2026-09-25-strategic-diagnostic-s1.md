# S1: prospective strategic bottleneck diagnostic

Frozen: 2026-09-25, after complete independently verified D1, before S1
instrumentation implementation, game initialization or advancing simulation.
This is an observation-only development study, not a candidate-policy trial.

## Basis and stopping decision

D1's complete 200-block / 600-game result failed the frozen positive
budget-removal, improvement-over-unchanged, and absolute-Advanced decisions.
The independent implementation replayed all 600 ledgers and matched all
18 bootstrap streams and gates. Stop arbitration as the primary performance
direction. Keep unchanged deployed StrongBot; do not search ceilings or
repeat variants. The user authorized strategic diagnostics followed by one
supported improvement at a time.

Evidence:

- Result: `research/results/2026-09-25-command-budget-d1/REPORT.md`.
- D1 aggregate SHA-256:
  `8bd48913a5353ef830b965f862876cd2d814599b7341314310b2d56caf2da14b`.
- Independent audit SHA-256:
  `6f9e3f0ec79965d52c1e07cd9fe532d7f8e2e87fc95e672bd22d2d70ce254c4c`.
- Controller verification SHA-256:
  `96d3bb74741509a8cab86f45d6d45040c3f8ff87f0177f3bfc48a6320e3a5f79`.
- Pre-S1 repository/report checkpoint: `e28288b` on main. Deployed policy
  behavior is still the D1 disabled reference from `18dde712`.

## Question and policy boundary

Where does unchanged StrongBot exhibit observable production, composition,
coordination, or mission-completion problems in a balanced fresh population?
The existing endpoint ledgers do not retain all needed economic or tactical
variables. Do not manufacture them from action counts or rerun old games.

Only one gameplay policy is permitted: unchanged StrongBot with arbitration
disabled, existing deployment defaults and map tactics unchanged. Opponents,
assets, maps, public `api_full_state` boundary, game settings, participant
names `OD1Candidate`/`OD1Opponent`, participant RNG identities, symmetric
resignation suppression, corrected v6 primary/passive v5 observers and
24,000-update immutable-first-result horizon remain D1-equivalent.

The new strategic observer is research-only, passive and opt-in. It must not
choose actions, consume policy RNG, change retries/timing, modify units or
queues, call private engine methods, or send its own debug/chat commands.
No new production/attack/composition policy is implemented in S1. A pure
copying accessor for the candidate bot's own mission state is allowed, but
not opponent-internal inspection. It must not invoke update methods, mutate
returned collections, lazily create missions, or alter mission ownership.

## Fresh population and identities

Use all 25 existing opponent-map strata in the frozen D1 map order:
15 physical maps against pinned Supalosa and ten HFO variants against
RA2Web Advanced. For each stratum enumerate direction 0/1, country
Americans/Africans, and candidate slot 0/1. The countries are the first
canonical Allied/Soviet entries, not selected for favorable outcomes.
This gives 200 single-policy cases (120 Supalosa, 80 Advanced), eight per
stratum. It is a diagnostic sample, not nine-country confirmation.

Reserve prospectively, subject to the fail-closed collision audit:

- Main case seeds `3350120000..3350120199`, case indices 0..199.
- Canary seeds `3350121000..3350121003`, indices 200..203, respectively:
  HFO LE/Supalosa, Peak/Supalosa, Tour of Egypt/Supalosa, HFO LE/Advanced.
  Each uses Americans, slot 0, direction 0.
- Smoke seed `3350121100`, index 204, HFO LE/Supalosa, Americans/slot0/dir0.

Exactly 205 zero-update definitions. Before any initializer, scan the
complete metadata registration population: all earlier registered manifests,
original seed certificate, failed OD1 V1 905-case journal, all OD1 A1
definitions including canaries/smoke, and all completed D1 definitions.
Use exact registration-path allowlists, not blanket study exclusions.
Unknown registrations, collisions, modified prior manifests or missing
metadata block initialization. No silent seed shifts. Any necessary change
requires a preserved prospective amendment before new observations.

## Retained strategic observations

Sample at tick 0, every 300 updates, and the final observed update without
duplicating a periodic final sample. No future information enters policy or
sampling. Public action counts are accumulated over the intervening update
window without altering forwarding. Retain samples rather than just hashes.
The exact sample count is 1 + floor(updates/300) + I(updates mod 300 != 0),
including 13 strategic samples in a 3,600-update canary. Initial action counts
cover startup/tick-0 calls; later windows cover calls since the preceding
sample without overlap. Every retained public call belongs to one window.

Required channels and provenance:

1. **Economy and production:** both players' public credits, power data and
   defeat flags; every public production queue's type, status, size, maxSize
   and item rulesName/rulesType/quantity; live owned factories' public rules,
   health, build status and powered state. Use the existing documented
   `getPlayerData` / `getQueueData` interface shapes. Raw enum values and
   symbolic mapping are source-bound before initialization.
2. **Composition:** live positive-health units by owner, rules name and
   object type, with public position, health/maxHealth, purchaseValue,
   isIdle, canMove, and primary/secondary weapon metadata. Preserve null
   optional properties explicitly. Keep exact counts and known-value sums
   separate from counts lacking a valid purchaseValue; never impute cost.
3. **Coordination:** candidate-owned mission membership and available
   mission type/priority/active state from pure copying accessors; public
   movement/attack order counts and target categories per window; positions
   and idle flags from channel 2. No engine-private mission data. Order
   categories/enum mappings must be fully enumerated and validated in the
   implementation freeze; unknown values fail closed, not silently grouped.
4. **Completion:** both sides' live owned building counts and identities,
   physical destruction/owner-change/unspawn events, endpoint first-result
   status/tick, and remaining armed objects. Preserve the complete existing
   compressed v5/v6 endpoint ledger separately from strategic samples.

Mission age means time since its first observed sample unless an existing
creation timestamp is explicitly available and source-bound. Label the former
as a sampled lower bound on age. Membership changes are differences between
samples, not a claim to capture every intervening transfer or short-lived
mission. Do not backfill unobserved lifecycle events.

The implementation must commit an exact raw schema and channel-availability
contract before the formal pure gate. Required channels cannot be silently
removed after observations. Optional absent fields are retained as null with
availability counts; metrics requiring them remain unavailable with an exact
reason and denominator. Unavailable is neither zero nor evidence of absence.

Never fabricate income from credit differences: spending, selling and other
flows are not separately identified by balance snapshots. Purchase value is
a descriptive inventory value, not a calibrated combat-strength predictor.
Actions/state samples and mission metadata may inform development, but do
not establish a causal explanation for winning or losing.

## Fixed descriptive metrics and screening flags

Report continuous distributions before threshold flags. For every case and
the full fixed population, retain credits, queue occupancy/status counts,
known purchase-value inventory by rules/type, idle-unit counts, mission size
and age, mission membership changes, spatial dispersion, target-category
counts, and building-count trajectories. Preserve both players' public
measures and candidate-only mission availability explicitly.

Define **armed mobile nonharvesters** using public canMove=true and at least
one primary/secondary weapon; exclude canonical `HARV` and `CMIN`. This is
an operational subset, not every useful unit. Keep excluded and missing-
property counts. Distances use map-tile coordinates, not rendered pixels.

Predefined flags are development screens, not claims of tactical mistakes:

- **Funded empty vehicle queue:** candidate credits >=2,000, an owned live
  completed/powered `GAWEAP` or `NAWEAP`, and an empty vehicle queue at four
  consecutive periodic samples. Explicitly report factory/enum availability.
- **Idle force:** at least eight armed mobile nonharvesters, at least half
  with public isIdle=true, and enemy live buildings present, at four
  consecutive periodic samples. Defensive waiting may be intentional.
- **Dispersed mission:** a candidate mission with at least eight live armed
  mobile nonharvesters has the 90th percentile distance to its centroid >12
  tiles at four consecutive periodic samples. Missions may intentionally
  split; report type and priority rather than automatically calling this waste.
- **Unopposed closeout screen:** one to three enemy live buildings, no enemy
  live armed units/buildings, and at least three candidate armed mobile
  nonharvesters at four consecutive periodic samples. This does not prove
  targets are reachable or the position is a guaranteed win.

Four samples span 900 updates but do not establish that a predicate held
continuously between samples. Missing or ineligible samples break the run.
Report per-case any-flag incidence and eligible-sample fractions with their
denominators, then continuous distributions and all strata/subgroups. Do not
rank unrelated diagnostic units as though they were a common utility score.
Composition remains a measured distribution, not an invented automatic
counter-composition success score.

## Technical gates, execution order and budget

Use a new evidence root `research-evidence/strategic-diagnostic-s1`, immutable
intents/receipts, a fresh execution namespace and all source/compiled/runtime
bindings. Do not reuse D1 receipts as S1 technical prerequisites.

1. Current-source build and pure synthetic gates: all relevant existing
   semantic/terminal/firewall/RNG/endpoint tests, original disabled/capped
   golden fixtures, full observer-schema fixtures, null/missing handling,
   sampling/window clocks, exact population and seed audit, deterministic
   analysis and byte limits. Capture any needed pre-S1 synthetic traces
   before policy-class instrumentation edits; never recapture afterward to
   redefine success. Do not include engine-initializing tests in a pure job.
2. One Slurm zero-update selector: exactly 205 definitions, effective country,
   start, slot and seeded initialization checks, after the metadata scan.
3. Four technical canary tasks: unchanged policy twice per configuration,
   endpoint-only observer first, endpoint+strategic observer second. Fixed
   3,600 updates / 3,601 public-state snapshots, identical public actions,
   state, resignation and endpoint-observer behavior within each case.
   Eight advancing episodes total. No early termination or competitive
   payload retention; retain outcome-free schema/coverage/equality proofs.
4. One unchanged-policy observed smoke, natural termination /24,000 cap.
   Replay both compressed payload formats, verify sampling/field/resource/
   byte limits, and discard all competitive/strategic payloads after making
   the technical projection. One episode; no strength inference.
5. Exactly 200 unchanged-policy diagnostic tasks, indices 0-199%32, each
   one CPU/8GiB/six hours, no requeue, pi_jss233/day. Afterok fail-closed
   finalizer one CPU/24GiB/eight hours. Read no partial results or logs.

Total: 205 zero-update initializations plus 8 canary +1 smoke +200 main =
209 advancing episodes. Initial estimate 40–80 allocated CPU-hours, uncertain
until the observed smoke; resource failure blocks scaling. Per-task limits
are technical safety limits, not a claim that one smoke predicts every map.

Retain at most 4096 unit records per strategic sample, failing rather than
truncating on overflow. Strategic gzip limit 8MiB/episode, plain limit 64MiB,
sample-record limit 512KiB. Endpoint ledger limits remain 11MiB gzip, 512MiB
plain and 4MiB per record. Whole main artifact <=32MiB. Embed both compressed
ledgers in the per-case JSON and retain exactly record.json/COMPLETE per
stage/task, giving 416 final execution files under the same stage layout.
Raw Slurm logs live outside this count and remain preserved.

Every gate requires full independently verified completion before advancing.
No tracked source edits while any source-bound job is pending/running. Any
technical failure preserves the entire attempt and blocks subset analysis;
no selective retries, replacements, exclusions or weakened gates.

## Analysis and next intervention

After all 200 tasks and finalizer complete cleanly, read the full aggregate
first. Independently replay all endpoint/strategic ledgers, reconstruct every
sample/window/flag, and reconcile all identities, launches, resource limits,
hashes and files. Keep complete W/D/L/status/time descriptions, all 25 strata,
both countries/factions, slots and directions, plus five topology groupings.
Report the same diagnostic tables overall and by prespecified endpoint status;
these conditional descriptions are not causal estimates.

There is no S1 superiority test: only one policy is running. Do not use its
fresh win rate as a matched comparison with OD1/D1 or historical 90,000-update
studies. Do not select maps or seeds for the next policy from favorable S1
outcomes. Diagnostic thresholds must not be retuned on S1 to manufacture a
bottleneck. Preserve null and negative diagnostic findings.

Select at most one next intervention through a written, evidence-linked
mechanistic proposal with a synthetic reproduction of the observed failure
mode, explicit intended behavior and potential regressions. The proposal
must address measured production, composition, coordination or completion,
not another arbitration/ceiling variant. S1 correlations alone are not proof.
If no actionable failure mode is supported, document that result rather than
inventing an improvement. Any additional measurement requires a new freeze.

Before testing a policy change, freeze a separate fresh matched comparison
against unchanged StrongBot, all broad safety/relative/absolute decisions,
and the independent audit plan. A positive development candidate still needs
fresh nine-country/full-map validation and replication before deployment or
paper claims. Manuscript, historical failures and sealed populations remain
unchanged. Do not call M2 complete on diagnostic or technical success.
