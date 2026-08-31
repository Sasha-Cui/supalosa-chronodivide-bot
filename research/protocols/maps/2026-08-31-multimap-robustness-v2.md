# Multi-map robustness V2 protocol

Status: **prospectively frozen before V2 competitive outcomes**

Date frozen: 2026-08-31

## Question

Does one frozen StrongBot policy transfer across related Heck Freezes Over
revisions and structurally different Chrono Divide maps, and, where it does
not, can the same auditable map-profile mechanism be adapted on development
cases and then replicated on fresh cases?

This protocol is separate from the RA2Web Advanced specialist program. The
primary opponent here is pinned external Supalosa at commit
`165b77a71d0cf5ebd27c65b19d0486bcbae78d0f`. After an Advanced specialist
passes its own HFO gate, the final adaptive policy is also evaluated against
Advanced on this suite; until then no cross-product claim is allowed.

## Exact suite

The exact filenames, embedded names, start counts, hashes, and alias caveats in
`research/MAP_SUITE_V2_INVENTORY.md` are part of this protocol.

Primary HFO revision suite:

1. original eight-start HFO;
2. HFO LE;
3. HFO Golden;
4. HFO Corners;
5. HFO Corners B; and
6. HFO Corners B Golden.

Secondary fixed-pair HFO controls are B v B, L v L, R v R, and T v T.

Distinct-map suite:

1. Peak of Perfection, using the already completed positive result;
2. Tour of Egypt;
3. built-in four-start South Pacific, with the named two-start revision as a
   secondary revision control; and
4. Pacific Heights.

No listed map may be removed after outcomes. Related HFO revisions are one map
family, not independent replications.

## Stage 0: technical census

Before any competitive endpoint, a zero-update selector and one-update smoke
must establish for every new map:

- exact map and runtime hashes;
- successful load and deterministic repeat;
- exact start coordinates and count;
- available game mode;
- country and participant-slot construction;
- literal endpoint instrumentation compatibility;
- land, water, bridge, tech-building, and neutral-building metadata; and
- no W/D/L, score, defeated side, or terminal building outcome in the
  selector artifact.

Failure retains the map in the inventory and is reported as a technical limit.
Only an interface repair, frozen before further outcomes, may follow.

## Population construction

All nine countries and both participant slots are mandatory. Start assignment
is role-aware: `candidateStart` and `opponentStart` are an ordered pair of
distinct physical starts.

For a map with `S` starts:

- if `S >= 4`, one complete directed-pair cycle contains
  `9 * 2 * S * (S - 1)` cases: 216 for four starts, 540 for six starts, and
  1,008 for eight starts;
- if `S = 2`, five independent repetitions of both directed pairs contain 180
  cases; and
- each country/start cell is balanced over participant slot and opposing
  start, with no reuse of engine seed plus slot identity.

The outcome-blind selector may initialize extra games to obtain the required
start assignments, but records only zero-update start metadata. Seed namespaces
begin at `3_000_000_000`; each map and stage receives a disjoint 100,000-seed
block recorded in the implementation manifest. Any collision with a historical
experiment aborts selection.

## Stage 1: frozen-policy transfer screen

The exact deployed policy is screened without map-specific source changes.
The screen uses a prespecified subset balanced over every country, candidate
start, opposing-start class, faction side, and slot:

- 36 cases for two-start maps;
- 72 cases for four-start maps; and
- 108 cases for six-start maps; and
- 144 cases for eight-start maps.

The remaining selected cases stay sealed. Complete-map aggregates are opened
only after all tasks and a fail-closed finalizer complete. A screen passes only
if:

- wins exceed losses overall, for both factions, and for both slots;
- every physical candidate start is noninferior (`wins >= losses`);
- at least eight of nine countries are noninferior;
- the one-sided 90% paired score lower bound versus pinned Supalosa is above
  zero when a paired deployed control exists; and
- no technical or literal-endpoint gate fails.

Passing authorizes unchanged-policy confirmation. Failure authorizes
development on the screen population only and remains a reportable zero-shot
failure.

## Stage 2: bounded map-profile development

Development is permitted only after a failed Stage 1 and uses no sealed case.
The admissible intervention family is frozen per map before its first outcome
and must use public `GameApi` state. Candidate mechanisms are:

- symmetric macro-profile scope over reciprocal starts;
- geometry-derived attack/defense regions rather than unchecked coordinate
  constants;
- force preservation, regrouping, and rebuilding;
- literal building-elimination target selection; and
- naval production/control only when the Stage-0 census proves it necessary.

Every candidate is compared to the frozen deployed policy on identical cases.
Successive-halving survivors are immutable hashes. Map-specific tuning does not
become evidence of zero-shot generalization.

## Stage 3: sealed confirmation

Only one frozen policy per map enters confirmation. The confirmation population
is the uninspected remainder of the selector manifest. It is analyzed only as a
complete aggregate.

A map is a positive result only if all of the following hold:

- wins exceed losses overall, in both faction sides, in both participant
  slots, and at every physical candidate start;
- pooled one-sided 95% Wilson win-rate lower bound exceeds 0.65;
- the equal-weight country-by-start one-sided 95% lower bound exceeds 0.60;
- at least 90% of country-by-start cells have wins exceed losses and all
  remaining cells are noninferior;
- paired mean score improvement over the deployed policy is positive with a
  one-sided 95% lower bound above zero when adaptation occurred;
- literal wins destroy all enemy buildings and neither bot's resignation is
  forwarded; and
- no task, start, country, or slot is retried, replaced, or excluded.

The aspirational “consistently strong” threshold is stricter and reported
separately: point win rate at least 0.80, pooled lower bound above 0.75, and no
country-by-start cell with wins at or below losses. The paper may not call a
map “dominated” unless this stricter threshold passes.

## Aggregation and uncertainty

Report each exact map first. Then report:

1. an equal-weight average across the six primary HFO revisions;
2. an equal-weight average across distinct map families; and
3. a hierarchical bootstrap over map, country, candidate start, and seed
   block.

Raw-game pooling across all rows is secondary because maps have different start
counts. Draws remain draws; they are never redistributed. Time-to-literal-win
is summarized for wins and the full competing-risk population.

## Stop rules and claims

- No partial aggregate is inspected.
- No failed map or stratum is hidden.
- No HFO revision count is presented as independent-map breadth.
- No source changes occur while source-bound jobs run.
- A failed screen does not trigger a paper rewrite; it triggers prospective
  development or an explicit limitation.
- The paper remains frozen until the suite and final uncertainty analysis are
  complete.

## Compute envelope

All simulations use CPU `day` jobs under `pi_jss233`; GPU partitions are
prohibited. Stage 0 is at most 30 short technical tasks. Stage 1 is at most 1,200
games. Confirming all new maps is approximately 3,000--5,000 games depending on
which screens pass and which maps require adaptation. Arrays use global
concurrency at most 64, 8 GiB per task, and immutable per-task JSON plus logs.
