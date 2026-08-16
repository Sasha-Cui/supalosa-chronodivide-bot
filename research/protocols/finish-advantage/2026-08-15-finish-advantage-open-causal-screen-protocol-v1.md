# Finish-advantage complete open causal-screen protocol, version 1

Status: **prospectively frozen before any finish-advantage competitive outcome**

Recorded: 2026-08-15 (America/New_York), while the unrelated sealed V5 confirmation remained blinded

## Purpose and claim boundary

This is the complete development-only causal screen for the mission-preserving finish-advantage controller. It asks whether the irreversible certificate or an outcome-blindly selected surplus-cover rule converts otherwise unfinished advantages into literal wins without sacrificing games already won by V5.

The ten map families are permanently open development families. Their results may select and revise a policy for a later fresh-family confirmation, but they can never support a confirmatory paper claim and can never enter the sealed population.

## Preconditions

Launch is forbidden unless all of the following pass on one clean `main` commit:

1. the complete 360-game outcome-blind state audit and its scheduler finalizer;
2. the full 1,476-game official-map live compatibility gate;
3. the 72-game outcome-free composite technical gate;
4. the exact external Supalosa provenance check;
5. all deterministic unit, native-integration, policy-schema, and telemetry tests; and
6. an immutable campaign artifact containing every arm, family, country, slot, seed, policy hash, source/runtime hash, map hash, endpoint hash, Slurm script hash, aggregate-program hash, and this protocol hash.

No competitive outcome from this screen may be opened until every shard is scheduler-complete with exit `0:0`, account `pi_jss233`, exact artifact counts, exact launch counts, empty validation errors, and a passing technical finalizer.

## Frozen population and pairing

- Families: the same ten permanently open V5-development families committed by the state-audit population.
- Countries: USA, Korea, France, Germany, Great Britain, Libya, Iraq, Cuba, and Russia.
- Candidate slots: 0 and 1.
- Cells: `10 * 9 * 2 = 180` family-country-slot cells.
- Engine seed: one fresh seed per cell from a new committed uint32 interval, shared across every arm in that cell.
- Match settings, maximum ticks, suppressed-quit endpoint reconstruction, and exact external opponent: identical across arms.
- Each shard contains all arms for one or more complete cells. No arm may be launched or repaired alone.

## Frozen arms

Canonical order:

1. `external_supalosa_control`: exact pinned external Supalosa.
2. `visibility_aware_final_building_v5`: unchanged frozen V5.
3. `v5_plus_irreversible_finish`: V5 plus the multi-building `irreversible_only` policy.
4. For each state-audit-selected margin in ascending numeric order, at most two arms named `v5_plus_surplus_m{margin}`.

The state audit may therefore produce four or five total arms. No arm may be added, removed, renamed, or reordered after the campaign is frozen. If no margin qualifies, the four-arm screen still proceeds. Total launched games are exactly 720 for four arms or 900 for five arms.

## Literal endpoint and outcome coding

The endpoint is the precommitted physical destruction of every enemy-owned building. For candidate-oriented score,

\[
Y=\begin{cases}
1 & \text{candidate literal win},\\
0.5 & \text{draw at the frozen horizon},\\
0 & \text{candidate literal loss}.
\end{cases}
\]

Every arm uses the same outcome reconstruction. Suppressed `quitGame` attempts are audit variables only and never define a win.

## Paired estimands

For candidate arm \(a\), comparator \(c\), family \(f\), country \(k\), and slot \(s\), define

\[
d^{a,c}_{fks}=Y^{a}_{fks}-Y^{c}_{fks}.
\]

The family-macro paired score effect is

\[
\widehat\Delta^{a,c}=\frac{1}{10}\sum_{f=1}^{10}
\left(\frac{1}{18}\sum_{k=1}^{9}\sum_{s=0}^{1}d^{a,c}_{fks}\right).
\]

Let \(\delta_f^{a,c}\) be the inner family mean. The development standard error is the ordinary sample standard deviation of the ten family means divided by \(\sqrt{10}\). The one-sided 80% lower bound is

\[
L_{0.80}^{a,c}=\widehat\Delta^{a,c}-
0.883403859685775\,\frac{\operatorname{sd}(\delta_1^{a,c},\ldots,\delta_{10}^{a,c})}{\sqrt{10}},
\]

using Student's \(t\) distribution with nine degrees of freedom. Zero family variance is valid only when all ten family effects are exactly identical; non-finite inputs fail closed.

All counts below refer to exact paired cells. A comparator win-to-draw regression is a cell where \(Y^c=1\) and \(Y^a=0.5\); win-to-loss is \(Y^c=1\) and \(Y^a=0\).

## Candidate eligibility gate

An intervention arm is eligible for fresh-family confirmation only if **all** of the following hold against both exact Supalosa and unchanged V5:

1. \(L_{0.80}^{a,c}>0\).
2. The arm has strictly more literal wins than the comparator over all 180 paired cells.
3. The arm has strictly fewer draws than the comparator.
4. Against V5 specifically, there are zero V5-win-to-draw and zero V5-win-to-loss regressions.
5. The family-macro paired point effect is positive separately for Allied countries and Soviet countries.
6. The country-macro paired point effect is positive in at least six of nine countries.
7. The family paired point effect is positive in at least six of ten families.
8. The minimum leave-one-family-out family-macro effect is strictly positive.
9. At least one literal draw-to-win conversion occurs against V5.
10. Every required mechanism field is present and finite when applicable, all selected units respect mission ownership and cover partitions, and no outcome field entered the online policy.

These are conjunctive development gates. A subgroup cannot rescue a failed aggregate gate, score improvement cannot substitute for literal-win improvement, and draw reduction cannot substitute for wins.

## Deterministic final-candidate selection

If no intervention arm is eligible, the screen records `NO_ADVANCING_CANDIDATE`; no arm advances and a new policy version requires a new prospective record and fresh development seeds.

If one or more arms are eligible, rank only eligible arms by this fixed lexicographic order:

1. larger \(\min(L_{0.80}^{a,\text{Supalosa}}, L_{0.80}^{a,\text{V5}})\);
2. larger minimum leave-one-family-out effect across both comparators;
3. larger total literal-win gain over V5;
4. fewer total losses than V5;
5. larger safety margin, treating `irreversible_only` as larger than every numerical margin; and
6. canonical arm ID.

This ranking is development selection, not inferential evidence. The selected arm must be frozen without further tuning before any fresh-family competitive outcome is generated.

## Mechanism and error decomposition

The single authorized aggregate must report, for every arm and comparator:

- literal wins, draws, and losses;
- paired score effects and the frozen family-clustered lower bounds;
- draw-to-win, loss-to-draw, loss-to-win, win-to-draw, and win-to-loss transitions;
- country, faction, family, and reciprocal-slot effects;
- leave-one-family-out effects;
- direct building strikes, exact-unseen approaches, visible handoffs, blocker clears, base-race abstentions, irreversible activations, surplus activations, certificate revocations, stall recoveries, and predecessor fallbacks;
- time to first enemy-building damage and each subsequent physical destruction when observable from the legal trace;
- protected/reserve/strike-pool sizes and any invariant violation; and
- technical warnings, timeouts, censored games, suppressed quit attempts, and scheduler failures.

No map, country, seed, slot, or mechanism subgroup is inspected before the one scheduled aggregate. Diagnostic tables cannot alter eligibility or candidate selection.

## Failure and rerun rules

- Any missing, duplicated, malformed, provenance-mismatched, non-finite, wrong-account, failed, or imbalanced cell invalidates the complete screen.
- No outcome-bearing cell is selectively rerun.
- An infrastructure repair creates a new campaign version with a new seed interval and reruns every cell and arm.
- A policy repair creates a new method version and a new prospective protocol amendment before any new competitive launch.
- The permanently open development families may be reused for policy development, but their evidence remains development-only forever.

## Advancement boundary

Passing this screen authorizes freezing one selected policy for a new-family power analysis and sealed confirmation. It does not authorize a paper claim, screenshot selection by favorable outcome, or writing a positive abstract. The project is successful only if a later sealed, all-country, reciprocal-slot study demonstrates reliable improvement over exact Supalosa and non-regression over V5 with prespecified uncertainty.

