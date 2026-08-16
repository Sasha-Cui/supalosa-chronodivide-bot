# Finish-Advantage Decision Doctrine Amendment 6

Date: 2026-08-15

Status: frozen prospective correction; written before access to the sealed V5
confirmatory outcome and before any finish-advantage competitive campaign.

Parent doctrine amendment:
`2026-08-15-finish-advantage-decision-doctrine-amendment-5.md`
(`sha256: 25b966692ac190e8bbce00906ac9877bb35911ab14c523759e0721928abcf46a`).

## Audit finding

The frozen V5 final-building decision contains a deliberate legacy assumption
that is incompatible with the author-confirmed base-race rule. In the exact
source at commit `d6b7190e77f4ad730f37ac43e0e0b0ceaf6f5ff6`, terminal evidence causes
the selector to ignore the predicted destruction time of the candidate's own
last building. Its source comment says that surviving mobile units may finish
after the candidate's final building falls, and its deterministic test expects
a final-building strike even when one hundred enemy tanks are projected to
destroy the candidate's sole building first.

The relevant frozen source hashes are:

- `terminalObjectiveDecisionCore.ts`:
  `4a8144cb7df1f293cd6b63e0f208a37edcb6e6380935901a801b09ee4858845c`;
- `terminalObjectiveDecisionCore.test.ts`:
  `16d29dbb2f00d7257bea106850d10dfb05c7d6595ebef0ba21e29c345d1ca517`;
- `terminalObjectiveStrategy.ts`:
  `af91f39a1d5c069547b259c5acb5e9d628b3e5e94112bdf32c5c2a6bb4800f2b`;
  and
- `literalBuildingEliminationEndpoint.ts`:
  `e50c4523f2bc8e74addd94e75d7377972b82f3a825f8310878508ca6cf60e920`.

The project's literal endpoint adjudicator establishes a loss when the
candidate's buildings transition to zero through valid physical destruction.
The open finish campaign also evaluates this literal zero-building transition
even though the engine is configured with `shortGame: false`. Therefore a
mobile force cannot recover a candidate win after the opponent physically
destroys the candidate's final building first.

This is an outcome-blind code and endpoint audit. It does not use or imply any
sealed V5 result.

## Corrected final-building rule

For a candidate final-building mission, define:

- `T_objective` as the credible completion time of the selected direct
  building strike, or of the minimum-blocker-clear plus resumed strike when the
  direct route is not survivable;
- `T_intercept` as the earliest causal destruction time of the committed strike
  group; and
- `T_own_zero` as the earliest public-state prediction that hostile forces
  physically destroy the candidate's last surviving building.

Subject to the frozen safety margin, attack the enemy final building only when
the mission is credible before both causal interception and `T_own_zero`. A
large remote army remains irrelevant when it cannot satisfy either deadline.
When an identified hostile force makes `T_own_zero` occur first, defend or
interrupt that minimum causal threat and immediately recompute. When the same
force blocks the objective route and threatens the base, its removal serves
both purposes and must not expand into a global force sweep.

Unknown or internally inconsistent base-loss evidence fails closed. This
correction does not justify defensive delay when the enemy building can be
destroyed first.

## Backward-compatible implementation boundary

The sealed V5 policy and its active confirmation remain byte-for-byte frozen.
The correction must be implemented as an explicit prospective composite mode,
not by silently changing the behavior or identity of the V5 comparator.

The final candidate will therefore distinguish:

1. unchanged legacy V5, retained as a comparator; and
2. a termination-aware V5-derived controller that applies the strict
   final-building base-race guard before issuing the terminal order.

The mode must be part of the composite configuration and policy commitment.
Legacy V5 construction defaults to its old behavior; the prospective candidate
must request the corrected mode explicitly.

## Required deterministic and outcome-blind evidence

Before a competitive finish screen:

- one enemy building plus one hundred off-route tanks selects the building when
  `T_objective < T_own_zero`;
- the same geometry selects the minimum base-race threat when
  `T_own_zero <= T_objective + margin`;
- a route blocker that is also the base-race threat is attacked once, not
  duplicated into two missions;
- removing the threat causes immediate reconsideration of the final building;
- minimum-strike-group construction includes the base-loss deadline under the
  corrected mode;
- unchanged V5 retains exact disabled/comparator behavior; and
- the composite compatibility artifact records the selected base-race mode and
  contains no outcome field.

## Non-retroactivity

This amendment does not change, reinterpret, or repair the active sealed V5
array, technical gate, or unblinder. It applies only to later implementation,
outcome-blind compatibility work, permanently open development, and any newly
frozen confirmation.

