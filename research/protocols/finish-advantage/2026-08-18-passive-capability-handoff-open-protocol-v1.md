# Passive capability handoff: open protocol V1

Status: **prospectively frozen before implementation and before any V1 gameplay outcome**

This version retains the exact delayed-distance trigger, side-specific air units,
prerequisite order, target counts, and priorities from the failed capability
screen. It changes only unit ownership handoff.

The capability unit mission requests missing `JUMPJET` or `ZEP` units at request
priority 180. Its mission donor priority is zero, `isUnitsLocked=false`, and it
never emits `releaseUnits`. Once the public total reaches the target, it returns
no request. Any ordinary attack mission with positive priority can therefore
transfer the staged unit through the existing mission-controller donor rule.
The capability layer issues no combat order and does not disband or retarget any
mission.

## Arms

1. exact Supalosa;
2. unchanged V5;
3. V5 + early-distance, no capability;
4. V5 + early-distance + passive air-2;
5. V5 + conservative-distance + passive air-2;
6. V5 + conservative-distance + passive air-4.

All thresholds, counts, prerequisite priorities, unit names, and seed-independent
rules match the previous version.

## Technical gate

Before competition, all countries and slots must prove deterministic swaps,
side-correct requests, zero explicit release events, donor priority zero,
unlocked ownership, request cessation at target count, and transfer eligibility
to a positive-priority ordinary attack mission. Live traces on ground and mixed-
domain maps must show capability acquisition; synthetic controller tests must
show passive transfer without a release action. No outcome field is permitted.

## Fresh screen

After a pass, use the same ten open families, all nine countries, reciprocal
slots, 24,000 ticks, and fresh seed base `4,227,600,000`: 1,080 games with no
retry or filtering. Apply the unchanged advancement and ranking rule. Passing
authorizes fresh confirmation only.
