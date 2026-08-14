# Mission-Native Closeout: Amendment 26

Date: 2026-08-14

Status: **failed focused V22 gate and prospective V23 factory-triggered staged-screen freeze**

## Completed outcome-free focused V22 gate

Slurm job `22236229` completed under `pi_jss233` from source
`bc7e6f149a756caa5cf2a4ce932f9ee76be7d5c8` and external baseline
`165b77a71d0cf5ebd27c65b19d0486bcbae78d0f`.

- artifact: `research-evidence/mission-native-closeout/outcome-blind-focused-gate-v22/22236229/focused-gate-v22.json`
- SHA-256: `4f47fae47fd76eec6a06a2ae45583b8913329da405121c16e7d89dd402fee1fb`
- scheduler: `FAILED`, exit `1:0`, elapsed `00:01:37`, peak RSS 389,720 KiB
- artifact: `FAIL_OUTCOME_FREE_MISSION_NATIVE_CLOSEOUT_FOCUSED_GATE_V22`
- four games; both same-seed repeats exact; no outcome inspected

Americans produced no `MTNK`, caused no building damage, and made 32 intercepted
resignation attempts per repeat. Its war factory had 560 HP at tick 3,600 and
was gone by tick 4,200. Africans produced `HTNK`, grew an explicitly requested
`E2` count from one to four, preserved the war factory through tick 5,400, and
later produced a replacement tank, but still caused zero building damage.

Schema-17 `currentCount` also counted all visible faction infantry rather than
the units owned by the readiness reserve. The reported maxima of six `E1` and
18 `E2` therefore do not prove that those units formed the closeout screen.

## Frozen V23 repair

V23 preserves V22 except for one corrected screen-assembly mechanism.

1. Track the physical `E1`/`E2` count actually owned by the readiness-reserve
   mission in shared public state.
2. Trigger screen production when the side-correct war factory first becomes
   physically visible, rather than waiting for the first completed main tank.
3. Request and retain screen infantry until the readiness-owned count reaches
   four. Continue main-tank production in parallel.
4. Schema-17 `currentCount` must mean readiness-owned screen units; add the
   physical factory count and trigger state to the event.
5. The existing V21 defense rule controls the staged screen. Do not commandeer
   the active vanguard or count unrelated infantry as readiness evidence.
6. Add exact V23 field `adaptiveGroundAssaultScreenFactoryTrigger: true`.

Use fresh focused seed base `4_240_000_000`. Require determinism, zero
resignations, physical factories and main tanks on both factions, verified
growth of readiness-owned screens after requests, valid active defense,
persistent production, and positive building damage for both factions. Only a
pass advances to all-country seed base `4_250_000_000`.

The gate remains outcome-free; no win, loss, draw, score, terminal tick, or
sealed-family field may be inspected or serialized.
