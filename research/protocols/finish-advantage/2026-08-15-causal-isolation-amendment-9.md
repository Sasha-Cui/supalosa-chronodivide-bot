# Prospective amendment 9: preserve the V5 comparator while fixing the candidate

Status: frozen prospectively and outcome-blind before integration, open causal
development, or fresh confirmation.

Recorded: 2026-08-15 (America/New_York)

## Integration correction

The V22 audit correctly identified the literal race rule: attack the remaining
enemy building only when it falls strictly before the candidate's required
building set, clear forces that collapse the strike, and defend forces that win
the candidate-base race. Its proposed modification of the shared objective
selector must not be integrated, however, because that selector also supplies
the deliberately unchanged V5 comparator.

V18 already implements the same correction at the appropriate causal boundary:
`terminalBaseRaceGuard.ts` has an explicit
`strict_literal_endpoint_base_race` candidate mode and an explicit
`legacy_v5_ignore_own_base_loss` comparator mode. Applying V22 globally would
silently change the legacy arm, make the “unchanged V5” label false, and prevent
the open screen from identifying the effect of the base-race correction.

Therefore:

- preserve every V22 file and hash as an audit record;
- do not integrate V22 `terminalObjectiveDecisionCore.ts` or its replacement
  test;
- retain the V18 strict guard as the candidate implementation;
- retain exact legacy V5 behavior only in its comparator arm; and
- add the V22 decision examples as guard-level regression tests without
  changing production semantics.

## Required guard-level regression cases

- A strict candidate attacks the final building when the aggregate deadline
  from 100 off-route tanks is later than objective completion.
- It defends all causally credited base threats when those tanks win the base
  race, with deterministic threat ordering.
- Exact same-update objective/base destruction is treated as draw risk and
  triggers defense.
- The legacy V5 comparator remains bit-for-bit decision-equivalent and ignores
  the new guard even in the early-base-loss fixture.

This amendment changes the integration disposition, not an empirical outcome.
No competitive claim follows from it.
