# Finish-advantage implementation staging manifest, version 23 overlay

Status: staged outside the tracked checkout while repaired sealed V5
confirmation array `22341679`, dependent technical gate `22342013`, and
authorized unblinder `22342015` remain active or dependency-blocked.

Recorded: 2026-08-15 (America/New_York)

## Purpose and boundary

V23 is the integration-eligible resolution of the V22 audit. It preserves V22
as evidence but excludes its shared-selector production patch because that
patch would alter the unchanged V5 comparator. The V18 explicit strict
terminal-base-race guard remains the candidate implementation, and V23 adds
only the new literal-race regression cases at that causal boundary.

- V21 overlay manifest SHA-256:
  `fe38ab74412564300a8793461f823b9d169b8ff70b8179dcda0dc12f397ca93d`
- causal-isolation amendment 9 SHA-256:
  `2e8fb7a079931b0a0336bd5a42a5b2a483c5ea0ef5f92631b1a67fc4ef80e834`
- V22 disposition SHA-256:
  `3cc075683d09ebb1b4e2524c14528208c56ce50df08f635b68426af901f5123a`

## Integration rule

Apply V18, then V19, V20, V21, and this V23 test overlay. Do not integrate
either V22 `terminalObjectiveDecisionCore.ts` or V22
`terminalObjectiveDecisionCore.test.ts`.

The strict candidate continues to attack the final building only when the
complete objective mission beats the candidate-base deadline, and otherwise
defends the exact causal threats. The legacy V5 arm continues to return its
unchanged pre-guard decision. This keeps the base-race intervention measurable
as a causal factor in the open screen.

## File commitment

| File | SHA-256 |
|---|---|
| `terminalBaseRaceGuard.test.ts` | `ad742786ac2e9a65c4d6651bebf444b9d11206f32503d3709144482f2adbfa89` |

All production files remain those committed by V18--V21.

## Verification

In an isolated V18--V21 integration mirror with the V23 test replacement:

- strict TypeScript checking passed for the strict guard and five affected
  finish-advantage production roots;
- Vitest 4.1.10 passed 13 files and 112 tests with zero failures;
- the strict guard attacks before a later aggregate deadline from 100 off-route
  tanks;
- it defends the deterministically sorted 100-threat set when that deadline is
  earlier;
- exact same-update zeroing is treated as draw risk; and
- the explicit legacy V5 mode remains unchanged in the same early-loss fixture.

These checks authorize later integration testing only after the active sealed
chain is terminal. They do not authorize competitive evaluation or a paper
claim.
