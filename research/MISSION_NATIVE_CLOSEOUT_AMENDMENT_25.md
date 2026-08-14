# Mission-Native Closeout: Amendment 25

Date: 2026-08-14

Status: **failed focused V21 gate and prospective V22 readiness-screen freeze**

## Completed outcome-free focused V21 gate

The frozen V21 gate completed as Slurm job `22235744` under account
`pi_jss233`.

- source commit: `4c73d0651ae2aa1dd68758bbc6263c037a2a51f6`
- external baseline commit: `165b77a71d0cf5ebd27c65b19d0486bcbae78d0f`
- artifact:
  `research-evidence/mission-native-closeout/outcome-blind-focused-gate-v21/22235744/focused-gate-v21.json`
- artifact SHA-256:
  `61c27bf1436936ad6f646a8b89c0c64e73d2be695aecf7b3569365d32dc842c0`
- scheduler state: `FAILED`, exit code `1:0`, elapsed `00:01:12`
- peak batch RSS: 440,852 KiB
- artifact status:
  `FAIL_OUTCOME_FREE_MISSION_NATIVE_CLOSEOUT_FOCUSED_GATE_V21`
- launched games: 4; same-seed identity passed; resignation attempts: zero
- outcome inspected: no

The Allied stratum passed with two physical `MTNK`s and 214 hit points of
building damage. The Soviet stratum produced one physical `HTNK`, retained
production telemetry through tick 5,376, emitted 70 valid readiness-defense
events, but caused zero building damage.

Active defense therefore executed but was insufficient. In the Soviet self
trace, the factory fell from 1,000 HP at tick 3,600 to 493 HP at tick 4,200; the
factory and staged tank were both gone by tick 4,500. Defense telemetry shows
the isolated `HTNK` repeatedly engaging nearby `E2` infantry. The remaining
failure is a force-composition mismatch, not passivity or production-latch
failure.

## Frozen V22 repair

V22 preserves V21 and adds one side-generic combined-arms mechanism.

1. After the first physical main tank appears during latched closeout
   production, reserve the infantry queue for a four-unit screening force.
2. Use `E1` for GDI and `E2` for Nod; retain the side-correct screen request in
   the production reservation alongside `GAWEAP`/`MTNK` or `NAWEAP`/`HTNK`.
3. Cap the screen at four visible units. Do not delay the first main tank, and
   continue main-tank production toward the existing target in parallel.
4. Allow the existing readiness reserve to own the screen and the V21 defense
   rule to focus the combined staged force on visible threats within 12 tiles.
5. Preserve the active vanguard, terminal-building priority, route certificate,
   transfer behavior, and all country-independent rules.
6. Add exact policy field `adaptiveGroundAssaultScreenTargetCount: 4` and
   telemetry for physical screen count and request state.

Use fresh seed base `4_220_000_000` for the focused V22 gate. Require exact
same-seed identity, zero resignations, physical main tanks on both factions,
physical screen acquisition where requested, valid defense telemetry, persistent
production telemetry, and positive building damage for both factions. Only a
pass may advance to a fresh all-country gate at seed base `4_230_000_000`.

All gates remain outcome-free. No win, loss, draw, score, terminal tick,
opponent outcome, or sealed-family field may be inspected or serialized.
