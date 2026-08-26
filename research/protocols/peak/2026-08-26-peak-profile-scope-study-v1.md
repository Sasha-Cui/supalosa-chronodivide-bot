# Peak of Perfection profile-scope study V1

Status: **prospectively frozen after complete V6 closure and before any Peak
V1 selection or outcome**

## Motivation and fixed prior evidence

The complete literal all-country pilot evaluated deployed StrongBot against
pinned Supalosa on Peak of Perfection. The pooled result was 83W/15D/82L, but
the two physical starts differed: the start receiving the deployed Peak
strategy and bot profiles, `(37,73)`, scored 46W/8D/36L; the reciprocal
unprofiled start `(118,73)` scored 37W/7D/46L. This completed evidence selects
profile scope as the mechanism, not a favorable case or country.

A pre-audit parameter-trainer seed, evaluated only with an Arabs candidate and
a narrow opponent set under nonliteral 22,000-update settings, recorded
35W/4D/9L across four old Peak screens. It selects one exact
`historical_defensive_infantry` configuration for fresh evaluation but supports
no claim.

The study asks whether reciprocal application of macro and tactical Peak
profiles repairs directional asymmetry and yields reliable literal superiority
over exact Supalosa across all countries.

## Fixed software and gameplay

- Map: `cd_2_peak_of_perfection.map`, SHA-256
  `440715dc154ac10b4b922159824140d40c48990311c6838345b66958f3b3a442`.
- External Supalosa commit:
  `165b77a71d0cf5ebd27c65b19d0486bcbae78d0f`.
- Countries: all nine; same-country opponent; starts `(37,73)` and `(118,73)`;
  both participant slots.
- 10,000 credits, 90,000 updates, `shortGame=false`, superweapons disabled,
  symmetric resignation suppression, and literal all-building elimination.
- Candidate source: clean synchronized `main`; Slurm account `pi_jss233`; at
  most 64 CPU tasks concurrently.

No retry, replacement, selective rerun, exclusion, or partial-outcome access is
allowed. Every selector, cell, and finalizer records exact source, program,
script, protocol, runtime, map, baseline, seed, and scheduler identities.

## Required scope switches

Add independent strategy and bot/tactic scope options with values
`weak_only`, `both`, and `off`. Existing behavior is `weak_only`. Defaults must
remain byte-for-byte behavior compatible with deployed StrongBot.

- The strategy switch controls application of the existing immutable
  `PEAK_OF_PERFECTION_WEAK_PROFILE`.
- The bot/tactic switch controls the existing immutable
  `applyPeakOfPerfectionWeakProfile`, `maybePeakEmergencyDefend`, and
  `maybePeakCloseout` paths.
- `both` changes only the start predicate from `(37,73)` to either exact Peak
  start; no profile parameter, target rule, threshold, route, or unit choice is
  changed.
- `off` disables that layer at both starts.

Unit tests and a zero-outcome compatibility gate must establish that default
`weak_only` behavior is unchanged, that every `both` arm differs only at
`(118,73)`, and that both starts/map identity are resolved from public state.

## Exact historical candidate

The historical strategy is the parameter trainer's `withDefaultBaseTuning`
merged with its recorded seed overrides:

- strategic plan off; macro/static defense/all-in disabled;
- infantry attack composition; attack gate disabled;
- attack missions do not steal defense;
- defense checks every 30 updates, starts at radius 24, grows by 0.0003 per
  update, defends production, mission priority 60, active priority 120;
- scouting cooldown 180, maximum three missions, priority 10;
- known-tech engineers enabled, maximum one target, maximum distance 38,
  priority 96, escort level 2;
- force attack, harass, route attack, HFO closeout, HFO west sweep, emergency
  defense, macro boost, static defense boost, and all-in disabled; and
- all remaining recorded numeric values are retained even when their mechanism
  is disabled, so the serialized policy exactly matches the old seed.

The historical candidate retains the trainer's deployed bot/tactic default,
`weak_only`; its explicit macro options prevent automatic strategy-profile
substitution. A second historical arm changes only bot/tactic scope to `both`,
preserving the exact historical macro strategy.

## Frozen arms

1. `deployed`: strategy `weak_only`, bot/tactics `weak_only`.
2. `strategy_both`: strategy `both`, bot/tactics `weak_only`.
3. `bot_both`: strategy `weak_only`, bot/tactics `both`.
4. `both_both`: strategy `both`, bot/tactics `both`.
5. `historical_defensive_infantry`: exact historical strategy and deployed
   `weak_only` bot/tactic scope.
6. `historical_defensive_infantry_bot_both`: the same historical strategy plus
   bot/tactic scope `both`.

Arms 1--4 form a 2x2 scope factorial. Arms 5--6 estimate whether the historical
macro profile benefits from the same reciprocal tactical layer. No arm is
adapted after fresh outcomes.

## Outcome-blind populations

For namespace base `b`, country ordinal `c`, start ordinal `s`, slot `q`, and
offset `o`, enumerate `b + 10,000c + 1,000s + 100q + o`; maximum offset 99.
Select the first exact candidate/opposite-start case in every cell.

| Population | Base | Cases per country/start/slot | Total |
|---|---:|---:|---:|
| Development | 4,281,000,000 | 1 | 36 |
| Final replication | 4,282,000,000 | 5 | 180 |

Require 216 unique cases across populations. The selector initializes games
only and writes zero updates and no W/D/L, score, terminal state, endpoint
orientation, or rank. All earlier Peak pilot and other reserved seeds are
barred.

## Stage 0: all-country scope screen

Run all six arms on the 36 development cases: 216 games. Use W=1/D=0.5/L=0
paired differences from `deployed`, a one-sided 90% paired-t lower bound with
`t=1.30621`, `df=35`, and one-sided 95% Wilson absolute bounds.

Report W/D/L, literal statuses and updates, both starts, sides, countries,
slots, paired transitions, and descriptive strategy-scope, bot-scope, and
interaction effects from arms 1--4.

An arm other than `deployed` is eligible only if:

1. wins exceed losses;
2. paired mean is positive and its 90% lower bound exceeds zero;
3. losses are fewer than deployed losses;
4. both starts, both sides, and both slots have wins exceed losses;
5. every country has wins at least losses and at least seven countries have
   wins exceed losses; and
6. for arms 2--4, every `(37,73)` candidate/deployed pair is trajectory- and
   endpoint-identical because changing scope from `weak_only` to `both` adds
   only `(118,73)`.

Rank eligible arms by minimum start win rate, paired lower bound, pooled win
rate, fewer losses, minimum country win rate, then declaration order. Select
exactly one champion. If none is eligible, do not run replication.

## Stage 1: final replication

Run the unchanged champion and deployed control on all 180 replication cases:
360 games. Use one-sided 95% Wilson and paired-t inference with `t=1.65341`,
`df=179`. The result supports a reliable Peak claim only if:

1. champion wins exceed losses and the Wilson lower bound exceeds 0.5;
2. paired mean versus deployed is positive and its 95% lower bound exceeds
   zero;
3. both starts, both sides, and both slots have wins exceed losses;
4. every country has wins at least losses and at least seven countries have
   wins exceed losses;
5. the equal-weight 18 country-by-start cell mean has a one-sided 95% lower
   bound above 0.5 using `t=1.73961`, `df=17`; and
6. any arm intended to differ at only one start remains exactly trajectory-
   and endpoint-identical at the other start in all 90 pairs.

Report all development arms and every replication stratum. A pass is a
map-specific all-country result, not general-map robustness.

## Paper and screenshot boundary

Only after complete replication may Peak enter the paper. Deterministic
screenshots must be selected from immutable confirmed cases by predeclared
mechanism category and must cite map hash, policy, country, start, slot, seed,
job ID, update, and frame/checkpoint hash. Do not select only wins or visually
flattering cases.
