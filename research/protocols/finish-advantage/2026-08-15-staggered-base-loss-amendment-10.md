# Prospective amendment 10: staggered candidate-base loss

Status: frozen prospectively and outcome-blind before implementation,
integration, open causal development, or fresh confirmation.

Recorded: 2026-08-15 (America/New_York)

## Defect

The V21 multi-building strategy correctly computes staggered friendly arrival
and collective route-threat collapse, but its candidate-base-loss estimate
still combines the earliest enemy travel time with the summed damage rate of
all enemy forces. A distant high-damage unit can therefore contribute damage
before it arrives merely because a nearby weak unit is present. This produces a
spuriously early own-building deadline and can suppress a building strike that
would actually finish safely.

## Required estimator

For each candidate-owned building independently, construct one damage-arrival
row per ordinary enemy force that can damage it:

- arrival is that force's own travel time to ordinary attack range;
- damage rate is that force's own calibrated ordinary damage per tick; and
- completion is the earliest time at which cumulative damage from forces that
  have actually arrived reaches the building's remaining hit points.

The predicted zero-building time is the maximum destruction time over all
candidate-owned buildings. If any building has no finite destruction estimate,
complete candidate elimination is not established. The deterministic
base-race threat witness is the lowest identifier among the actual
participating forces for a building whose destruction completes that final
zeroing transition.

## Required regressions

- A nearby weak enemy and a distant high-damage enemy must not be treated as a
  simultaneous damage source.
- If the weak enemy alone destroys the base only after the building strike
  finishes, the finish overlay keeps attacking the building.
- When several arrival waves are genuinely needed, all necessary arrivals
  contribute to the predicted deadline.
- Existing earlier-base-loss abstention and literal endpoint safety remain
  unchanged.

This amendment changes only a public-state timing estimate. It does not use or
assert a competitive result.
