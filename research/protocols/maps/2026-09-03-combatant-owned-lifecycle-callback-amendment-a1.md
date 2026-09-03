# Combatant-owned lifecycle gate: callback timing amendment A1

Frozen prospectively before the repaired smoke or full array. All original
scenarios, seeds, label mappings, actors, rules, action ticks, readiness
deadline, first-transition stopping rule and attribution gates are unchanged.

## Preserved failure

Initialization 24647236 passed. Smoke 24647237 failed during replay of its
first case (index 0) after one game and 2045 fully completed update calls.
The remaining four smoke cases and the full 40-case array were not launched.
The first compressed stream is preserved but is NOT a completed smoke result.

Failure SHA:
eb1f87fd834b8042a0e8512cd13095ffa8a3cdef2edf79d9bdf97040d9c021ac.
Failure audit:
97fce2fd6f6e56e7a4df37807041ba48e9de246943b66a39af29d811a26d6bf8.

The pinned GameInstanceApi.update applies the engine turn, advances the tick,
then calls onGameTick. Source inspection and the first recorded frame agree:
pre tick 0, post tick 1, callback ticks 1/1. The original recorder/replayer
incorrectly treated these callbacks as pre-step decisions. Its mock used the
same wrong ordering. No partial-case lifecycle claim or score correction is
authorized from that failed replay.

## Corrected schema and readiness placement

Schema 2 separates the physics transition from after-step decisions:

- A frame at pre tick t records the prior queued public requests in
  stepRequests; these are submissions to that engine step, not a claim that
  the engine accepted every request.
- After the engine turn, both callback views and queuedActions have tick t+1
  and match the post-step state. The next frame's stepRequests must equal
  this frame's queuedActions exactly.
- At callback tick 1800, readiness is checked once against the post-step state
  BEFORE either actor can enqueue the declared scenario action. If it fails,
  enqueue no actions at that boundary and preserve a readiness failure.
- The action is still requested at the frozen public GameApi tick 1800 and
  enters the immediately following engine step. No deadline or action is
  moved to make an observed result pass.
- Preserve every compressed canonical frame, bounded failure stack, completed
  call count and observed engine tick. Synthetic tests must reproduce this
  source-verified order and reject pre-step callback timestamps or broken
  queued-request chains.

The legacy endpoint and candidate snapshot code are unchanged. There is no
engine patch, rule change, new observation supplied to a competitive policy,
or retrospective conversion of the schema-1 failed artifact.

## New immutable attempt and unchanged gates

Use a fresh root:
research-evidence/live-building-ledger/combatant-owned-gate-v1-callback-a1.
Reuse the first attempt's sealed regular assets read-only; manifest
002a0eaabb0db9fde44393c7ce85a66afcfb5585d8f5b60e702ce07d9d3b3306.
Do not overwrite any original manifest, stream, failure or log.

After pure tests and clean synchronized main, seal the new implementation
hashes and full 40-case manifest. Run one zero-game initialization, then the
same sequential five-scenario smoke (0,8,16,24,32). Only a complete five-case
pass permits the unchanged 40-cell array plus fail-closed finalizer.
Do not selectively replace the first failed case or fold its stream into a
new stage. The repaired attempt permits at most 45 technical games; including
the preserved first-attempt game, the cumulative bound is 46.

All resource limits, outcome prohibitions, label/repeat symmetry, full-stream
replay, negative controls, evidence preservation, and endpoint-promotion
conditions in the original protocol remain in force. Use only pi_jss233 CPU
day. No source edits during source-bound stages. Historical competitive scores
and closed V8 policies remain unchanged; the paper is still frozen.
