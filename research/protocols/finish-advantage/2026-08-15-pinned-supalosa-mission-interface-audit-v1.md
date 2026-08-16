# Pinned Supalosa Mission-Interface Audit V1

Status: read-only source/runtime audit completed before implementing the finish-advantage observer and before sealed V5 unblinding.

## Pinned baseline

- Git commit: `165b77a71d0cf5ebd27c65b19d0486bcbae78d0f`
- `dist/bot/logic/mission/mission.js` SHA-256: `899d5643a042011046799453a2bebdcddaf52157c40dcea7732244f5702232da`
- `dist/bot/logic/mission/missionController.js` SHA-256: `cd40128712122e07bba2d54819a8285e6cc130f54651b0a112032f7e3aa86401`

The commit equals the external-baseline commit frozen by the active V5 confirmatory campaign.

## Verified structural interface

The pinned `MissionController` exposes `getMissions()`. Each live mission exposes the methods needed by the passive observer:

- `getUnitIds(): number[]`;
- `getUniqueName(): string`;
- `isUnitsLocked(): boolean`; and
- `getPriority(): number`.

`getMissions()` returns the controller's live mission array, and `getUnitIds()` returns each mission's live unit-ID array. The observer must therefore copy both arrays immediately. It must never sort, splice, retain, or otherwise mutate the returned arrays.

## Wrapper placement

The external strategy interface receives the live mission controller in `onAiUpdate`. The passive wrapper can therefore:

1. call the inner external `DefaultStrategy` exactly once;
2. retain a replacement strategy returned by that call;
3. inspect the mission controller only after the inner update; and
4. return the wrapper without issuing actions or changing mission state.

This ordering measures the force allocation that Supalosa has actually chosen for the update.

## Fail-closed conditions

Surplus-force exposure and later surplus leasing must be disabled for the update if any of these conditions occurs:

- `getMissions` is unavailable or throws;
- its return value is not an array;
- a mission lacks any required method;
- a required method throws or returns a value of the wrong type;
- a unit ID is not a nonnegative safe integer;
- one unit is claimed by multiple missions;
- a mission name is empty or unstable within the copied snapshot; or
- the snapshot cannot be deterministically canonicalized and hashed.

Unknown but well-formed mission names are protected, not malformed. A mission is classified as offensive only when its name starts with `attack_` or exactly equals `allInAttack` or `navalAssault`. The pinned external implementation ordinarily exposes `attack_*`; the other two names are accepted conservatively for compatibility with the shared StrongBot mission vocabulary.

The irreversible-opponent certificate is independent of mission ownership and may still be observed when mission introspection fails. The surplus-cover mechanism must remain action-free.

## Required verification

Unit tests must cover array copying, duplicate ownership, thrown methods, wrong return types, unknown mission names, offensive-name classification, and deterministic hashing. The live audit must additionally prove identical candidate action traces and mission-membership digests between unobserved and observed same-seed exact-Supalosa games.

This artifact verifies interface availability only. It is not evidence that the finishing policy is effective.
