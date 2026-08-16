# Prospective amendment 8: literal victory-race priority

Status: frozen prospectively and outcome-blind before any V22 implementation,
compatibility result, open-development result, or fresh confirmation is read.
This amendment changes no active V5 job, policy, population, result, or analysis.

Recorded: 2026-08-15 (America/New_York)

## Correction

The literal endpoint declares the first side whose complete building set is
physically destroyed by its opponent defeated; if both sides are zeroed in the
same update, the result is a simultaneous draw. A prior terminal-controller
unit test incorrectly authorized a final-building strike even when the model
predicted that the opponent would destroy the candidate's final base first.
That is not an opportunity to win under the frozen endpoint and must not be
encoded as one.

## Decision order

For the terminal-objective candidate and the default `route_blockers_only`
continuous-offense mode, use this causal order for the selected enemy building:

1. If the strike-safety interface is incomplete, use the predeclared
   fail-closed fallback.
2. If an on-route force can destroy the committed strike before the target
   building falls, clear the minimum causal blocker set and resume the same
   building mission.
3. If an enemy force can destroy the candidate's required building set at or
   before the target building's predicted destruction tick (including the
   predeclared safety allowance), defend the threatened base. Equality is not
   credited as a win because it risks a simultaneous draw.
4. Otherwise, attack the building directly. Off-route forces that cannot win
   the base race remain irrelevant even if they are numerous.

The deliberately extreme `all_observed_forces_first` and `buildings_only`
arms remain causal ablations and retain their definitions. They are not the
recommended candidate.

## Required regression cases

- One remaining enemy building plus 100 off-route tanks whose base attack
  arrives too late: attack the building.
- The same state when those tanks zero the candidate base first: defend.
- A route force that collapses the strike before building destruction: clear
  the blocker.
- A nonterminal objective with an earlier candidate-base loss under the
  default causal mode: defend.
- The `buildings_only` ablation may still ignore a lethal blocker, and the
  `all_observed_forces_first` ablation may still chase an irrelevant force.

No empirical advantage is asserted by this amendment. It defines the policy
logic and its tests before the next open causal-development launch.
