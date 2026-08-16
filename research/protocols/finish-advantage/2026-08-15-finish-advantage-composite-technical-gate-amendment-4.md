# Finish-Advantage Composite Technical-Gate Amendment 4

Status: **prospectively frozen before the composite gate or any
finish-advantage competitive outcome**

Recorded: 2026-08-15 (America/New_York)

Decision-doctrine amendment 6 identifies the frozen V5 terminal-base-race
assumption and requires a prospective, explicitly configured correction.

## New configuration invariant

Every composite construction must declare exactly one terminal base-race mode:

- `legacy_v5_ignore_own_base_loss`, allowed only for the unchanged V5
  comparator; or
- `strict_literal_endpoint_base_race`, required for every prospective
  intervention arm.

The mode is part of the composite configuration commitment. Missing, unknown,
or comparator-inconsistent modes fail the gate.

## New deterministic decision invariants

Under `strict_literal_endpoint_base_race`:

1. A final-building strike is legal only when its credible completion plus the
   frozen safety margin precedes both causal strike interception and predicted
   physical destruction of the candidate's final building.
2. If the candidate's final building falls first and the responsible public
   threat is identifiable, the controller attacks that minimum threat and does
   not issue the terminal-building order on the same update.
3. If the enemy final building falls first, an arbitrarily large off-route army
   cannot preempt the terminal strike.
4. The next legal update after threat removal must reconsider the final
   building.
5. The minimum-sufficient strike-group deadline must include the candidate's
   final-building destruction deadline.

The gate must exercise all five cases in both candidate slots and across both
factions within its fixed all-country population. The gate remains outcome
free: it records only public-state inputs, selected mode, timing inequalities,
decision/action witnesses, and deterministic digests.

## Comparator preservation

The exact V5 comparator must retain its existing source policy, policy ID, and
legacy base-race mode. The new guard may not be installed implicitly by a
shared default. Disabled-equivalence checks remain binding.

## Advancement

Any mode mismatch, unsafe strict-mode strike, absent causal threat, action
witness mismatch, or failure to exercise the new cases invalidates the whole
composite gate. There are no selective technical cell reruns.

