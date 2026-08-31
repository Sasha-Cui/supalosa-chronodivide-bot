# RA2Web Advanced state-conditioned policy synthesis V8

Status: **prospectively frozen before V8 traces, search outcomes, or endpoints**

Date frozen: 2026-08-31

## Research question

Can a compact, auditable prioritized-rule controller synthesized from public
game state turn StrongBot's known HFO weakness against RA2Web Advanced into
replicated dominance, while remaining exactly inactive against pinned Supalosa
and preserving the already confirmed Supalosa expert?

V8 is a substantively new policy class. It is not an extension of the rejected
V4--V6 profile, timing, order-only, or fixed production overlays.

## Immutable environment

- map: `cd_chrono_4_heck_freezes_over_le.map`;
- map SHA-256:
  `e4dfc736a6355e0e68d4681e4d67419516e6bb94549e2d42880c9414e95e2e8d`;
- pinned Supalosa commit:
  `165b77a71d0cf5ebd27c65b19d0486bcbae78d0f`;
- RA2Web client commit/release:
  `218fb800614295119e25040986b175fee4c3670f` /
  `0.84.1-r1d35349-dd6a17b9c`;
- Advanced bundle/freeze-manifest SHA-256:
  `81d8797b6dd1371ba2dcbd79e25df8b42254290c820159e121a82650fd97a143` /
  `a405c0fc6d1d6541f965582c9b53be0bfd01c0c68f4d0f340e1a5ae37671aa5d`;
- credits 10,000; no crates, superweapons, or starting units; MCV repacks
  enabled; short-game disabled;
- update cap 90,000; and
- literal opponent-attributed destruction of every enemy-owned building with
  symmetric resignation suppression.

All jobs use CPU `day` under `pi_jss233`, 8 GiB per task, and global concurrency
at most 64. GPU partitions are prohibited.

## Evidence boundary

The V7 diagnostic used only the consumed West development population and found
an actionable window from update 3,600 through roughly 12,000. V8 uses entirely
fresh seed namespaces. The 72 V6 validation and 360 V6 replication cases remain
sealed forever and are not V8 inputs.

No endpoint from a later V8 population may be inspected before all earlier
gates pass. No source-bound job may overlap a tracked source change.

## Public opponent detector

The detector is frozen from V3 and may read only public opponent credits at
update 1,200:

- opponent credits `< 7,798`: classify as RA2Web Advanced;
- opponent credits `>= 7,798`: classify as pinned Supalosa.

The detector version, threshold, source, opponent hashes, and update are one
joint identity. It is evaluated once per game and cannot inspect bot class,
name, bundle, case, seed, hidden state, or eventual outcome.

StrongBot runs unchanged before update 1,200. If Supalosa is detected, the V8
controller remains exactly inactive. If Advanced is detected, the frozen V8
specialist activates.

## Exclusive ownership seam

After Advanced activation, the controller exclusively owns:

- Infantry and Vehicles queue mutations; and
- orders for selectable non-harvester combatants.

StrongBot continues to own structures, economy, harvesters, repair, power,
construction placement, and internal state updates. During each StrongBot tick,
an API ownership wrapper suppresses only baseline calls targeting a
controller-owned queue or combatant. The controller then acts after the base
tick through the same public APIs. Every suppressed and forwarded call is
audited with update, method, owned identifiers, and canonical argument hash.

The controller cannot sell, pack, place structures, order harvesters, quit,
read hidden units, or mutate opponent state. Failure to establish exact
ownership is a technical stop.

## Policy representation

A policy is an ordered list of at most 12 rules plus one fallback. Every rule
has:

1. one to three conjunctive public predicates;
2. one production action;
3. one force-control action;
4. one target priority;
5. a force fraction and minimum home reserve; and
6. a persistence interval.

The first matching rule fires. Canonical JSON field order, rule order, and
SHA-256 identify the policy. Duplicate rules, unreachable rules, contradictory
predicates, and policies exceeding the complexity limit are invalid.

### Predicate grammar

Only the candidate-view V7 feature definitions are admissible:

| Feature | Frozen thresholds or values |
|---|---|
| update | 1,200; 1,800; 2,400; 3,600; 4,800; 6,000; 7,200; 8,400; 9,600; 12,000; 15,000 |
| own credits | 0; 500; 1,000; 2,000; 4,000; 8,000 |
| public credit gap | -4,000; -2,000; -1,000; -500; 0; 500; 1,000; 2,000; 4,000 |
| own combatants | 0; 4; 8; 12; 16; 24; 32 |
| visible enemy combatants | 0; 2; 4; 8; 12; 16 |
| visible threats within 8/16/24 of production | 0; 1; 2; 4; 8 |
| own harvesters | 0; 1; 2; 3 |
| own barracks / war factories | 0; 1; 2 |
| own buildings | 1; 2; 3; 4; 5; 6 |
| own force at home / midfield / opponent base | 0; 4; 8; 12; 16; 24 |
| force-count change since prior 300-update snapshot | -8; -4; 0; 4; 8 |
| no building-hit-point progress | 600; 1,200; 2,400 updates |
| visible enemy buildings | 0; 1; 2; 3; 4; 6 |
| faction side | Allied; Soviet |
| candidate physical start | West; East; Top; Bottom |

Comparators are `<=`, `>=`, `=`, and `!=` where meaningful. No learned
continuous threshold is allowed outside this table.

### Production actions

- `baseline`: do not mutate an owned queue;
- `infantry`: produce E1 for Allied or E2 for Soviet;
- `tank`: produce MTNK for Allied or HTNK for Soviet;
- `mixed`: alternate the country-aware infantry and tank requests;
- `screen`: produce DOG for Allied or ADOG for Soviet while visible infantry
  pressure exceeds visible vehicle pressure; otherwise infantry; and
- `rebuild`: prioritize a tank until the post-loss combatant threshold is
  recovered, then return to baseline.

The action may fill an idle queue or replace one active different item at most
once per 300 updates. It cannot touch structures, aircraft, ships, or armory.

### Force-control actions

- `hold`: retain owned combatants at their current mission;
- `defend_home`: attack visible threats within 24 tiles of production;
- `regroup_home`: move selected combatants to the own-start centroid;
- `probe`: attack-move the selected fraction toward the opponent start;
- `assault_force`: attack the highest public threat score;
- `assault_production`: attack the nearest visible enemy production building;
- `raid_economy`: attack a visible harvester, then refinery, then production;
- `recover`: regroup until the minimum force and nonnegative 300-update force
  change are both satisfied; and
- `literal_closeout`: when one visible enemy building remains, attack it unless
  a visible force is within eight tiles of the assault path or own production.

Force fractions are 0.25, 0.50, 0.75, or 1.00. Minimum home reserves are 0, 4,
8, or 12 combatants. Persistence is 120, 300, or 600 updates. Target ties use
distance, hit points, rule name, tile coordinates, then unit ID.

The fallback is immutable: `baseline` production, `defend_home` when a visible
threat is within 16 tiles, otherwise `recover` below eight combatants and
`probe` above that threshold.

## Deterministic synthesis algorithm

Three independent runs use search seeds `8,801`, `8,802`, and `8,803`.
Candidate generation, mutation, crossover, tie-breaking, and hashes are frozen
before gameplay.

- Generation 0: 32 grammar-valid policies per run.
- Generation 1: retain four elites; create eight one-edit mutations and four
  subtree crossovers from the top eight, for 16 policies per run.
- Generation 2: retain two elites; create four one-edit mutations and two
  subtree crossovers from the top four, for eight policies per run.
- One immutable run winner may advance from each run.

A one-edit mutation changes exactly one threshold, comparator, action field,
predicate, rule order, rule insertion, or rule deletion. Crossover exchanges
one complete rule between distinct parents and then canonicalizes. A child
identical to any previously evaluated hash is deterministically skipped and
replaced by the next generated child. No outcome-conditioned manual policy is
allowed.

## Fresh populations

A master zero-update selector freezes every case before Generation 0:

| Population | Seed namespace | Cases | Coverage |
|---|---:|---:|---|
| technical interface | 3,100,000,000 | 18 | one per country/slot, West vs East |
| run 0/1/2 Generation 0 | 3,101/102/103,000,000 | 18 each | one per country/slot, West vs East |
| run 0/1/2 Generation 1 | 3,104/105/106,000,000 | 36 each | two per country/slot, West vs East |
| run 0/1/2 Generation 2 | 3,107/108/109,000,000 | 72 each | all country/start/slot cells once |
| championship | 3,110,000,000 | 144 | two per country/start/slot cell |
| replication | 3,111,000,000 | 360 | five per country/start/slot cell |
| adaptive Advanced | 3,112,000,000 | 360 | five per country/start/slot cell |
| adaptive Supalosa | 3,113,000,000 | 360 | five per country/start/slot cell |

Each namespace allows at most 100 start-selection offsets. Engine seed plus
participant slot is globally unique. Selection records zero updates and no
competitive field. Exact country, faction, physical-start, opposite-start,
slot, and repeat balance is mandatory.

## Technical interface gate

Before competitive V8 outcomes, run six fixed grammar fixtures on all 18
technical cases through update 12,000: fallback only, defense, regroup/recover,
mixed production, economy raid, and literal closeout. Generate no W/D/L,
score, defeated side, terminal building count, or ranking.

The gate requires:

- perfect V3 detector identity on both pinned opponents;
- controller inactivity and byte-identical StrongBot trajectories when
  Supalosa is detected;
- Advanced activation exactly at update 1,200;
- zero forwarded baseline calls to an owned queue or combatant after
  activation;
- positive actuation for every fixture in both faction sides and slots;
- no controller call affecting harvesters, structures, surrender, or hidden
  state;
- deterministic candidate/opponent traces and action hashes; and
- exact scheduler and recursive prohibited-field checks.

Failure permits only a prospective interface repair, never competitive search.

## Search evaluation

Every generation includes two controls on the identical cases: deployed
StrongBot and pinned external Supalosa. No partial result is opened. All three
run aggregates complete before the next generation is generated.

Score is `1` for a literal win, `0.5` for a draw, and `0` for a literal loss.
Candidates are ranked lexicographically by:

1. minimum mean score across faction side and participant slot;
2. paired mean score difference versus deployed StrongBot;
3. one-sided paired lower bound;
4. absolute win rate;
5. median updates among literal wins; and
6. fewer rules, predicates, and non-baseline actions.

Generation 0 retains eight per run; Generation 1 retains four; Generation 2
may nominate one run winner only if wins exceed losses overall, paired score
lower bound versus StrongBot is above zero, both factions and slots are
noninferior, every start is noninferior, and at least eight countries are
noninferior. Rejected hashes never return.

## Championship and replication

Championship evaluates the three immutable run winners and both controls on all
144 fresh cases. Exactly one champion advances by the same ranking only if:

- pooled one-sided 95% Wilson win lower bound exceeds 0.65;
- equal-weight country-by-start one-sided 95% lower bound exceeds 0.60;
- wins exceed losses overall, in both factions, both slots, and every start;
- paired one-sided 95% score lower bound versus deployed StrongBot exceeds
  zero; and
- at least eight countries are superior and the ninth is noninferior.

Final replication evaluates only the frozen champion and both controls on 360
fresh cases. The Advanced specialist succeeds only if:

- point win rate is at least 0.80;
- pooled one-sided 95% Wilson win lower bound exceeds 0.75;
- equal-weight country-by-start one-sided 95% lower bound exceeds 0.70;
- wins exceed losses in every country-by-start cell, both factions, both slots,
  and every physical start;
- paired score improvement over both controls has a one-sided 95% lower bound
  above zero; and
- literal-win median updates are below 30,000 with at most 2% tick-cap draws.

These gates are not relaxed after outcomes.

## Adaptive router confirmation

Only a replicated specialist enters routing. On fresh Advanced cases compare:

1. always-on champion after update 1,200;
2. detector-routed champion; and
3. deployed StrongBot.

The routed policy must retain every specialist replication gate. Its paired
score difference versus always-on champion must have one-sided 95% lower bound
above `-0.02`, and median literal-win delay may not exceed 600 updates.

On fresh Supalosa cases compare routed policy with deployed StrongBot. The
detector must choose Supalosa in every case, emit zero specialist action, and
produce byte-identical trajectory, endpoint, action, and terminal-state hashes
for all 360 pairs. Deployed StrongBot's routed win-rate lower bound must exceed
0.80.

## Uncertainty and reporting

Report W/D/L, Wilson bounds, paired score intervals, equal-weight
country-by-start intervals, faction/start/slot/country strata, time-to-literal-
win, tick-cap draws, rule complexity, activation counts, ownership suppression,
and switching cost. Report every complete negative generation and survivor
hash. No raw pooled result may hide a failing stratum.

## Stop and release rules

- No policy is handcrafted after viewing a V8 outcome.
- No partial cell, generation, championship, replication, or router outcome is
  inspected.
- No failed gate, country, start, faction, slot, or opponent is removed.
- No rejected candidate is revived or combined post hoc.
- If no run winner, champion, or replication success exists, V8 closes
  negative and a substantively new prospective method is required.
- The paper remains frozen until V8 and the multi-map suite finish.
- Release canonical policy JSON, grammar, generator seeds, manifests, aggregate
  statistics, and code when rights permit; do not release proprietary runtime
  bytes.

The expected upper envelope is roughly 6,000 search games plus technical,
championship, replication, and router stages, approximately 500--800 CPU-hours
depending on endpoint duration and survivor count.
