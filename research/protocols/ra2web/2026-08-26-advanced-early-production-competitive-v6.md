# HFO RA2Web-Advanced early-production competitive V6

Status: **prospectively frozen after the complete technical gate and before
competitive selection or outcomes**

## Motivation and evidence boundary

V5 established that pinned external Supalosa can be decorated without changing
its trajectory and that west-only overlays remain exact no-ops at the other
three HFO starts. V5 order-only search then produced no west win. Outcome-blind
V6 technical traces validated early infantry, tank, dual, production-only, and
attack interfaces. Amendment 1 validated reliable vehicle idle-or-replace
production. No V6 technical artifact contains W/D/L or endpoint orientation.

V6 competitive evaluation now asks whether any technically validated early
production profile creates a robust Advanced specialist while preserving the
exact pinned baseline outside west. This is a separate study. The already
confirmed StrongBot-versus-Supalosa expert remains unchanged and is not
retrained here.

## Fixed identities and gameplay

- Map: `cd_chrono_4_heck_freezes_over_le.map`, SHA-256
  `e4dfc736a6355e0e68d4681e4d67419516e6bb94549e2d42880c9414e95e2e8d`.
- External Supalosa commit:
  `165b77a71d0cf5ebd27c65b19d0486bcbae78d0f`.
- RA2Web client commit/release:
  `218fb800614295119e25040986b175fee4c3670f`,
  `0.84.1-r1d35349-dd6a17b9c`.
- RA2Web Advanced bundle SHA-256:
  `81d8797b6dd1371ba2dcbd79e25df8b42254290c820159e121a82650fd97a143`.
- Freeze-manifest SHA-256:
  `a405c0fc6d1d6541f965582c9b53be0bfd01c0c68f4d0f340e1a5ae37671aa5d`.
- Countries: all nine; same-country opponents; all four physical starts and
  both participant slots where specified below.
- 10,000 credits, 90,000 updates, `shortGame=false`, superweapons disabled,
  symmetric resignation suppression, and literal all-building elimination.

Every job runs from clean synchronized `main` under `pi_jss233`, records exact
source/program/script/protocol/runtime/opponent/selection hashes and scheduler
IDs, and writes immutable completion markers. At most 64 CPU tasks run
concurrently. No retry, replacement, selective rerun, or partial-outcome access
is allowed.

## Outcome-blind master selection

Before gameplay, select every population in one zero-update job. For namespace
base `b`, country ordinal `c`, physical-start ordinal `s`, slot `q`, and offset
`o`, enumerate

$$
b + 10{,}000c + 1{,}000s + 100q + o.
$$

Take the first exact candidate/opposite-start case in each cell, with maximum
offset 99. Require unique engine-seed/slot pairs across all populations.

| Population | Namespace base | Coverage | Cases per cell | Total |
|---|---:|---|---:|---:|
| West development | 4,278,000,000 | 9 countries x west x 2 slots | 2 | 36 |
| Balanced validation | 4,279,000,000 | 9 countries x 4 starts x 2 slots | 1 | 72 |
| Final replication | 4,280,000,000 | 9 countries x 4 starts x 2 slots | 5 | 360 |

The selector initializes games only and writes zero updates, no W/D/L, score,
endpoint orientation, terminal state, or ranking. All V3--V6 technical and
sealed V5 championship/replication seeds are barred.

## Fixed policy architecture

Every arm instantiates the pinned external Supalosa bot and attaches the
validated lifecycle decorator. An intervention activates only at physical west
`(39,82)` versus east `(151,119)`; it is an empty decorator at east, top, and
bottom. At non-west starts, candidate/control trajectory and endpoint hashes
must remain identical case by case.

Country-aware unit names are `E1`/`MTNK` for Allied and `E2`/`HTNK` for
Soviet. Production rules must come from the candidate's own available-object
API. Idle checks occur every 90 updates from 1,200 through 8,400. Bounded
vehicle replacement checks occur every 600 updates from 1,800 through 7,200,
with idle queuing preferred at coincident checks. Attack checks occur every 24
updates. Dogs and harvesters are excluded from overlay attackers.

Targeting is exactly the technically tested behavior: `force_first` chooses
the nearest visible combatant, then a construction yard or production
building, then the nearest building, then attack-moves to the public opponent
start. `production_first` exchanges the first two target classes. Ties use
numeric unit ID.

## Frozen arms

1. `noop`: pinned external Supalosa plus empty decorator.
2. `infantry_rush`: idle country-infantry production; from update 4,800,
   force-first attack with at least four non-dog combatants.
3. `tank_rush`: idle country-tank production; from update 6,000, force-first
   attack with at least three non-dog combatants.
4. `dual_rush`: both idle production rules; from update 6,000, force-first
   attack with at least five non-dog combatants.
5. `tank_production_only`: idle country-tank production and no overlay combat
   order.
6. `vehicle_assault`: Amendment-1 idle-or-replace vehicle production; from
   update 7,200, production-first attack with at least four non-dog combatants.

The first five arms are exact original-V6 technical profiles. The sixth joins
the validated Amendment-1 production interface with the separately validated
original-V6 production-first attack interface; it adds no new primitive or
threshold. No parameter is tuned during this study.

## Stage 0: west development

Run all six arms on all 36 development cases: 216 games. Analyze only after all
tasks and the finalizer complete cleanly.

For each intervention arm, compute W/D/L, win probability and one-sided 95%
Wilson lower bound, literal terminal status/update, country/side/slot strata,
and paired W=1/D=0.5/L=0 difference from `noop` on identical cases. Use the
one-sided 90% paired-t lower bound with `t=1.30621`, `df=35`.

An intervention is Stage-0 eligible only if:

1. wins exceed losses;
2. paired mean score is positive and its lower bound exceeds zero;
3. losses are fewer than no-op losses;
4. Allied and Soviet wins each exceed losses;
5. both slots have wins exceed losses; and
6. at least seven countries have wins exceed losses and every country has wins
   at least losses.

Rank eligible arms by paired lower bound, win rate, fewer losses, minimum
country win rate, then declaration order. Retain at most the first two. If no
arm is eligible, V6 competitive development fails and no balanced validation
or replication runs.

## Stage 1: balanced validation

Run `noop` and the unchanged one or two Stage-0 survivors on all 72 validation
cases: 144 or 216 games. Use fresh cases only. Use a one-sided 90% paired-t
lower bound with `t=1.29359`, `df=71`.

A candidate is eligible only if:

1. overall wins exceed losses and the one-sided 95% Wilson lower bound for win
   probability exceeds 0.5;
2. paired mean versus `noop` is positive and its one-sided 90% lower bound
   exceeds zero;
3. west wins exceed losses and west losses are fewer than no-op west losses;
4. Allied and Soviet wins exceed losses;
5. all four starts have wins exceed losses;
6. both slots have wins exceed losses;
7. at least seven countries have wins exceed losses and every country has wins
   at least losses; and
8. all 54 non-west candidate/noop pairs have identical normalized trajectory
   hashes, literal endpoints, terminal updates, building counts, unit
   inventories, and resignation audits.

Rank eligible candidates by minimum start win rate, paired lower bound, pooled
win rate, fewer losses, minimum country win rate, then Stage-0 rank. Select
exactly one champion. If none is eligible, do not run replication.

## Stage 2: final replication

Run the unchanged champion and `noop` on all 360 final cases: 720 games. This
is the only population supporting the final standalone Advanced-specialist
claim. Use one-sided 95% intervals: Wilson for absolute win probability and
paired-t with `t=1.64911`, `df=359`.

Replication passes only if:

1. champion wins exceed losses and the 95% Wilson lower bound exceeds 0.5;
2. paired mean versus `noop` is positive and its 95% lower bound exceeds zero;
3. west wins exceed losses and west losses are fewer than no-op west losses;
4. Allied and Soviet wins exceed losses;
5. all four starts and both slots have wins exceed losses;
6. at least seven countries have wins exceed losses, every country has wins at
   least losses, and the equal-weight country-by-start win-rate lower bound
   exceeds 0.5; and
7. all 270 non-west pairs remain exactly trajectory- and endpoint-identical.

Report every case, stratum, interval, status, terminal update, failure, job ID,
and candidate considered. Do not hide negative development arms.

## Adaptive-policy boundary

A replication pass freezes one standalone Advanced specialist only. It does
not validate an adaptive bot. The next disjoint study must begin both opponents
under a shared pre-detection policy, apply the already frozen tick-1,200 credit
detector, initialize or transfer expert state without identity leakage, and
include delay, misclassification, and switching cost. It must preserve the
already confirmed StrongBot Supalosa expert.

If competitive V6 fails at any stage, preserve the complete negative result and
do not weaken gates or reuse later populations. Proceed to the positive
Peak-of-Perfection second-map study or a prospectively different Advanced
mission/production architecture.
