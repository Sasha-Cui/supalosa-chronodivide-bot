# Finish-advantage state-audit protocol, amendment 2

Status: **prospective aggregation clarification frozen before implementation,
state-audit launch, or V5 confirmatory unblinding**

Recorded: 2026-08-15 UTC

This amendment resolves the aggregation unit for the fixed margin-selection
rule in `2026-08-15-finish-advantage-state-audit-protocol-v1.md`. It changes no
population, seed, margin, certificate, action, or eligibility threshold.

## Nonterminal state boundary

The observer records ordinary live states only while both combatants own at
least one physical building. A transition to zero buildings is a terminal
outcome-bearing state and is censored from state-exposure records. The
technical harness may retain only the prespecified engine-finished transition
tick and scrubbed technical digests. It may not persist a zero terminal
building count, winner, score, endpoint orientation, or defeated-side label.

## Exposure unit

The aggregation unit is one `family-country-candidate-slot` cell. Observer and
no-observer runs are a technical pair, not two exposure units. For margin `m`,
a cell is exposed if at least one preserved nonterminal observer record has:

- successful strict mission-ownership introspection;
- a positive effective strike under the amended protected-unit partition; and
- at least one compatible reachable target with a finite positive damage-time
  estimate.

Repeated 120-tick samples within a cell do not increase its support weight.
For each exposed cell, define its positive strike size as the maximum effective
strike size among its qualifying records. This is a state-capacity calibration,
not a performance measure.

## Support and median

For each margin, report the number of distinct exposed:

- map families;
- countries;
- candidate slots; and
- factions, with the five standard Allied countries and four standard Soviet
  countries fixed by the campaign country list.

The original eligibility thresholds apply to these distinct cell supports:
both factions, both slots, at least eight countries, and at least five
families. The `median positive exposed strike size` is the ordinary median of
the one maximum-positive-strike value from every exposed cell. Thus each cell
contributes at most once and long games cannot receive extra weight.

The first selection rule retains the numerically largest eligible margin. The
second retains the numerically smallest eligible margin whose cell-level
median is at least two. Duplicated selections are collapsed. Empty rules remain
empty and cannot be replaced post hoc.

## Failure handling

Malformed, thrown, unavailable, non-array, or duplicate mission ownership
makes every surplus margin unavailable for that state. Such a state can still
contribute to irreversible-certificate prevalence, but never to margin
exposure. No competitive outcome or terminal advantage may be used to discard
or reinterpret it.

This clarification was fixed without inspecting a state-audit game or sealed
V5 outcome.
