# Finish-advantage state-audit protocol, version 1

Status: **frozen before implementation, launch, or V5 confirmatory unblinding**

Recorded: 2026-08-15 UTC

## Purpose and boundary

This audit measures whether the prospectively fixed finish-advantage
certificates occur under exact external Supalosa play. The observer reads only
the declared public-complete-state interface and issues no game action. It is
not a policy comparison, does not estimate a competitive effect, and may not
emit or use winner, score, terminal building advantage, endpoint attribution,
or map-specific anecdotes.

The older `research/DIAGNOSTIC_PROTOCOL.md` is neither reused nor amended. Its
1,000-launch cap, optimizer identities, conditioned-versus-global estimand, and
single unblinding concern a completed method-development program. This audit
has a separate, outcome-free state-exposure question and uses only permanently
open families.

## Fixed population and seeds

Use the ten permanently open V5 development families in their frozen order,
all nine countries in the standard order, and reciprocal candidate slots.
There is one engine seed for each family-country pair and the same seed is used
for both slots and both observer conditions:

```text
requested_engine_seed = 4,225,000,000 + 9 * family_ordinal + country_ordinal.
```

This gives 90 unique seeds and 360 launched games:

```text
10 families x 9 countries x 2 slots x 2 observer conditions = 360.
```

The two conditions are exact external Supalosa with no observer and the same
bot with the passive observer. Both play an independent exact external
Supalosa opponent. Every game uses the literal building-elimination
instrumentation, 24,000-tick cap, deterministic participant seed derivation,
short game disabled, crates disabled, 10,000 credits, game speed 6, MCV repacks
enabled, superweapons disabled, and Slurm account `pi_jss233`.

No family, country, slot, seed, or condition may be retried selectively. A
technical software repair invalidates this version and requires a new protocol,
new exclusive root, and new seed block.

## Public state recorded

At every 120 ticks and every certificate or building-count transition, record
only the candidate's public live interface:

- current tick and candidate country/slot/faction;
- own and enemy building counts;
- enemy selectable-combatant count, including selectable armed buildings;
- enemy production-building count where `factory != FactoryType.None`;
- enemy deployable-base-unit count using `deploysInto` and the public general
  `baseUnit` list;
- enemy non-building mobile selectable-combatant count;
- own eligible mobile anti-building count under the exact future calibration;
- for each enemy building, count of calibrated compatible reachable attackers;
- count of buildings with any finite compatible attack mission;
- current and maximum previously observed enemy-building count;
- irreversible-certificate state and transition;
- final-building state;
- candidate cover and strike sizes for margins `{0, 2, 4, 8}`;
- whether each margin has a nonempty strike and a compatible finite target;
- target visibility, finite completion estimate, route-threat count, and
  physical building-progress clock where available; and
- state-transition and sampling provenance.

The irreversible certificate is fixed as more than one enemy building, zero
enemy selectable combatants, zero enemy production buildings, and zero enemy
deployable base units. The observer reconstructs this condition independently
and cannot read resignation attempts.

For own eligible count `N`, enemy mobile count `E`, ordinary base reserve `r=2`,
and margin `m`, compute

```text
cover_m = min(N, max(r, E + m))
strike_m = N - cover_m.
```

No outcome, evaluator disposition, suppressed-resignation signal, engine
winner field, or terminal building count may enter the state-exposure record.
The technical harness may use the engine-finished predicate only to stop a run
and may use symmetric quit-suppression counts only for trace equivalence; those
fields cannot enter margin selection.

## Trace-equivalence gate

For every one of the 180 family-country-slot cells, compare the unobserved and
observed runs under the same engine and participant seeds. Require identity of:

1. every candidate `orderUnits` tick and structured argument list;
2. every candidate state snapshot at fixed 300-tick intervals;
3. observed tick count and engine-finished predicate transition tick;
4. symmetric suppressed-quit technical counts;
5. literal disposition-history digest; and
6. terminal technical status digest with winner and score removed before
   persistence.

The observer must emit at least one state record in every observed cell, emit
no action, and pass a repeated deterministic pure-unit test. Any mismatch
fails the full audit closed. Competitive outcomes remain unpersisted and
uninspected.

## Fixed margin selection

After the complete technical gate passes, aggregate only state exposure. A
margin is eligible when a nonempty strike with at least one compatible finite
target occurs in:

- both Allied and Soviet factions;
- both candidate slots;
- at least eight of nine countries; and
- at least five of ten open families.

Select at most two margins from `{0, 2, 4, 8}`:

1. select the largest eligible margin; and
2. select the smallest eligible margin whose median positive exposed strike
   size is at least two.

If both rules select the same margin, retain it once. If no margin satisfies a
rule, do not replace it. Ties use the larger margin. No winner, score, tick-cap
frequency, terminal advantage, country performance, family performance, or
anecdotal identity may modify this rule.

The irreversible-only arm does not depend on margin exposure and remains the
first causal candidate even if no surplus margin is eligible.

## Required outputs

One fail-closed finalizer writes:

- source, external baseline, game API, package-lock, map, protocol, and runtime
  hashes;
- exact Slurm job IDs, account, array-task accounting, launch count, and
  failure count;
- the complete observed/unobserved equivalence verdict and per-cell trace
  digests;
- transition-compressed state records or their committed private artifact;
- aggregate certificate and margin exposure by faction, slot, country, and
  family count without competitive outcome;
- the fixed margin-selection result;
- an exact list of fields proven absent; and
- a SHA-256 commitment to every preserved artifact.

The finalizer refuses partial inputs, overwrite, source drift, wrong account,
missing cell, duplicate cell, imbalance, non-finite state value, policy action,
forbidden field, or a second invocation.

## Advancement

Passing this audit authorizes implementation and outcome-free compatibility
testing of the irreversible policy and no more than the selected surplus
margins. It does not authorize a performance claim. Competitive evaluation
begins only in a separately frozen complete open causal screen.
