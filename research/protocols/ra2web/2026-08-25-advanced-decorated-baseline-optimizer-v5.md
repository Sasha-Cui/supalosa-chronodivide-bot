# HFO RA2Web-Advanced decorated-baseline optimizer V5

Status: **prospectively frozen before V5 selection, equivalence, or policy outcomes**

## Motivation and correction from V4

V4 showed that its four in-process arms are much weaker than pinned external
Supalosa against RA2Web Advanced. A post-aggregate source audit then established
that `preserveBaselineCore=true` preserves the fork's modified strategy,
queue, awareness, and mission stack. It does not instantiate the pinned
upstream implementation. Parameter search on that wrapper would therefore
optimize a failed baseline-equivalence assumption.

V5 instead decorates the exact bot returned by the pinned external-baseline
factory. The decorator calls the original lifecycle first and may then issue a
bounded west-start overlay. It may not replace baseline production, queue,
awareness, strategy, missions, or state. The first stage is a no-op decorator
equivalence gate; no policy search may launch unless exact casewise equivalence
passes.

The confirmed deployed StrongBot Supalosa expert is unchanged. V5 develops a
separate Advanced expert. Passing V5 does not authorize deployment or an
adaptive-policy claim.

## Fixed identities and game rules

- Map: `cd_chrono_4_heck_freezes_over_le.map`, SHA-256
  `e4dfc736a6355e0e68d4681e4d67419516e6bb94549e2d42880c9414e95e2e8d`.
- External Supalosa commit:
  `165b77a71d0cf5ebd27c65b19d0486bcbae78d0f`.
- RA2Web client commit:
  `218fb800614295119e25040986b175fee4c3670f`.
- RA2Web Advanced bundle SHA-256:
  `81d8797b6dd1371ba2dcbd79e25df8b42254290c820159e121a82650fd97a143`.
- RA2Web freeze-manifest SHA-256:
  `a405c0fc6d1d6541f965582c9b53be0bfd01c0c68f4d0f340e1a5ae37671aa5d`.
- Countries: Americans, Alliance, French, Germans, British, Africans,
  Arabs, Confederation, and Russians.
- Physical candidate starts: west `(39,82)`, east `(151,119)`, top
  `(88,34)`, and bottom `(88,157)`; both participant slots.
- Same-country opponent, 10,000 credits, 90,000 updates, `shortGame=false`,
  superweapons disabled, symmetric resignation suppression, and literal
  all-building elimination.

Every job must run from clean synchronized `main` under `pi_jss233`, record
source/program/protocol/runtime/opponent hashes and exact scheduler IDs, and
write immutable completion markers. At most 64 CPU tasks may run concurrently.

## Outcome-blind master selection

Before any V5 gameplay, select every case population below in one zero-update
job. For namespace base `b`, country ordinal `c`, start ordinal `s`, slot `q`,
and offset `o`, enumerate

$$
b + 10{,}000c + 1{,}000s + 100q + o.
$$

Take the first exact candidate/opposite-start case in each required cell. The
selector may initialize games only; it must write zero updates, no W/D/L,
score, terminal state, endpoint orientation, or policy ranking. All selected
`requestedEngineSeed`/slot pairs must be unique across namespaces.

| Population | Namespace base | Coverage | Cases per cell |
|---|---:|---|---:|
| Equivalence gate | 4,265,000,000 | 9 countries x 4 starts x 2 slots | 1 |
| Run 0/1/2 stage 0 | 4,266/4,267/4,268 billion | 9 countries x west x 2 slots | 1 |
| Run 0/1/2 stage 1 | 4,269/4,270/4,271 billion | 9 countries x west x 2 slots | 2 |
| Run 0/1/2 stage 2 | 4,272/4,273/4,274 billion | 9 countries x 4 starts x 2 slots | 1 |
| Championship | 4,275,000,000 | 9 countries x 4 starts x 2 slots | 2 |
| Replication | 4,276,000,000 | 9 countries x 4 starts x 2 slots | 5 |

Maximum offset is 99. Earlier V3/V4 seeds and every population in this table
are mutually barred.

## Stage A: no-op decorator equivalence

Run two arms on each of the 72 equivalence cases: pinned external Supalosa and
the same factory product with the V5 decorator installed in no-op mode. Use
the same normalized player names, slot, country, engine seed, opponent, and
game settings for both arms: 144 games total.

The decorator in no-op mode must call the original `onGameStart`,
`onGameTick`, and `onGameEvent` without issuing an action, requesting
production, mutating baseline fields, replacing a method other than the
lifecycle wrapper, or receiving competitive endpoints.

For each game, compute a trajectory SHA-256 from canonical snapshots every 60
updates and at termination. A snapshot normalizes player names to roles and
contains tick, player credits, sorted owned unit rule/type/hit-point/tile
records, and literal building counts. The digest is evaluator-only and is not
available to either policy.

The gate passes only if every paired case has identical:

1. trajectory SHA-256;
2. winner and literal terminal status;
3. terminal update;
4. terminal building counts and unit inventory;
5. forwarded and attempted resignation counts; and
6. W=1/D=0.5/L=0 score.

Thus pooled and every country/start/slot paired score difference must be
exactly zero, with 72 tied, zero improved, and zero worsened cases. Any mismatch
fails closed. Do not average away a lifecycle incompatibility and do not launch
Stage B after a partial or failed gate.

## Stage B architecture and parameter space

All candidates decorate the pinned external baseline. The overlay is active
only when the candidate's observed physical start is west and the opponent's
start is east. At every other start it is a no-op and must remain trajectory-
equivalent to the Stage-A decorator.

The overlay observes only game state available through `GameApi`. It may issue
unit orders through the baseline bot's existing `ActionsApi`; it may not issue
production orders, read opponent identity, inspect bundle metadata, or change
baseline missions.

At a frozen 24-update interval, the overlay first applies an optional home
defense profile when visible enemy combatants enter the radius of the
candidate start. It then applies an optional attack profile when the time,
own-combatant count, and own-minus-visible-enemy advantage gates pass. Eligible
owned units are selectable combatants excluding harvesters and dogs. Target
and unit ties are resolved by numeric unit ID.

Defense profile is one of:

| ID | Radius | Maximum defenders |
|---|---:|---:|
| `off` | - | 0 |
| `compact` | 42 | 18 |
| `wide` | 60 | 36 |

Attack parameters are the Cartesian product:

- minimum tick in `{7200, 9600, 12000, 14400}`;
- minimum combatants in `{6, 10, 14}`;
- own-minus-enemy combatant gate in `{-12, -4, 4}`; and
- target mode in `{force_first, terminal_race, production_first}`.

`force_first` targets the nearest visible combatant while one exists, then a
production building, then the nearest building. `terminal_race` targets a
building immediately when exactly one visible enemy building remains;
otherwise it follows `force_first`. `production_first` targets a visible
construction yard or production building before combatants, then follows
`force_first`. When no target is visible, units attack-move to the selected
opponent start. This yields 324 candidate configurations. The undecorated/no-op
baseline is always a control and cannot win the search.

For optimizer run `r` in `{0,1,2}`, serialize every candidate as canonical
JSON, compute SHA-256 of `advanced-west-v5|r|<json>`, sort lexicographically by
hash, and take the first 24. This deterministic sampling rule, all candidate
values, and all run indices are fixed before outcomes.

## Successive-halving stages

Within a run, candidates share cases and are compared with the no-op baseline
on the identical case. Score is W=1, D=0.5, L=0. For a set of paired
differences, define the robust value as the mean minus the fixed one-sided 90%
Student-t term. Use `t=1.33338` for 18 cases and `t=1.29773` for 54 cases.
Rank by larger robust value, larger mean difference, fewer losses, higher win
rate, then canonical configuration hash.

1. **Stage 0:** evaluate 24 candidates and the control on 18 west cases per
   run (450 games/run). Retain six candidates.
2. **Stage 1:** evaluate the six survivors and control on 36 fresh west cases
   per run (252 games/run). Combine the 18+36 paired cases and retain two.
3. **Stage 2:** evaluate the two survivors and control on 72 fresh balanced
   all-start cases per run (216 games/run). Select one run winner only if the
   frozen advancement gates below pass; otherwise that run contributes no
   finalist.

A stage finalizer may read outcomes only after every scheduled cell in that
stage completed `0:0`. It writes survivor hashes once. Later-stage arrays may
be launched only from those immutable hashes. A failed run is not replaced.

## Stage-2 advancement gates

A run winner must satisfy all of the following on its 72 fresh Stage-2 cases:

1. overall wins exceed losses and the one-sided 95% Wilson lower bound for win
   probability exceeds 0.5;
2. paired mean score versus the no-op baseline is positive and its one-sided
   90% lower bound exceeds zero (`t=1.29359`, `df=71`);
3. both Allied and Soviet records have wins exceed losses;
4. every start has wins at least losses and at least three starts have wins
   exceed losses;
5. every country has wins at least losses and at least seven countries have
   wins exceed losses;
6. both participant slots have wins exceed losses; and
7. all 54 non-west candidate/control pairs have identical trajectory hashes,
   endpoints, and scores.

The last gate ensures that a west-only decorator cannot silently change the
other starts.

## Championship and replication

Deduplicate eligible run-winner configuration hashes. If none remain, V5
fails. Evaluate each remaining winner and the no-op control on the 144 fresh
championship cases. Use the Stage-2 safety gates, a one-sided 95% paired-t lower
bound (`t=1.65558`, `df=143`), and a one-sided 95% Wilson lower bound above
0.5. Rank eligible finalists by larger minimum start win rate, paired lower
bound, pooled win rate, fewer losses, then configuration hash.

Replicate the unchanged champion and no-op control on all 360 prespecified
replication cases: 720 games. Require:

- champion wins exceed losses and one-sided 95% Wilson lower exceeds 0.5;
- one-sided 95% paired-t lower versus control exceeds zero (`t=1.64911`,
  `df=359`);
- Allied and Soviet wins exceed losses;
- every start and slot has wins exceed losses;
- every country has wins at least losses and at least seven countries have
  wins exceed losses; and
- all 270 non-west pairs remain trajectory- and endpoint-identical.

No threshold may be relaxed after outcomes. Report every run, survivor,
failure, stratum, interval, and launched job ID.

## After V5

A replicated champion becomes only a frozen standalone Advanced specialist.
Next implement the tick-1,200 observation-conditioned handoff from the
confirmed deployed StrongBot prefix. Evaluate the real shared prefix,
classifier errors, expert state initialization, and switching cost on disjoint
cases against both opponents. The Advanced specialist may not replace the
confirmed Supalosa expert, and an oracle identity switch is not evidence.

If equivalence or search fails, preserve the complete negative result and
diagnose prospectively. Do not select favorable countries, starts, slots,
runs, or terminal states; do not reuse championship or replication outcomes
for development.
