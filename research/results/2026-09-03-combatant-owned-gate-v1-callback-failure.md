# Combatant-owned gate v1: callback timing failure

Initialization 24647236 completed 0:0 under pi_jss233 day, zero games/updates.
Its immutable JSON SHA is
459a6b650588090442c2500b6ca778d2db79580d6f6efe8d06b40c2cb79ae020.

Smoke 24647237 FAILED 1:0 at the replayer's first-frame callback timestamp
check. Progress records one game creation/callback and 2045 completed update
calls for case 0. Cases 8,16,24,32 were not executed; no full array was
submitted. This is an incomplete technical smoke, not a lifecycle result.

The pinned API runs the engine turn before invoking bot callbacks. The first
stream frame records pre tick 0, post tick 1 and callback ticks 1/1. The
replayer and synthetic mock incorrectly expected callback tick 0. The fix must
separate after-step queued requests from requests submitted to the next
engine step, and place the tick-1800 readiness guard before enqueuing actions.

Preserved evidence under
research-evidence/live-building-ledger/combatant-owned-gate-v1:

- Manifest: 002a0eaabb0db9fde44393c7ce85a66afcfb5585d8f5b60e702ce07d9d3b3306.
- Failure: eb1f87fd834b8042a0e8512cd13095ffa8a3cdef2edf79d9bdf97040d9c021ac.
- Failure audit: 97fce2fd6f6e56e7a4df37807041ba48e9de246943b66a39af29d811a26d6bf8.
- First gzip stream: 7062eb36a4e780000e5b650e987abfd5aec663c66586e3ad45b06e0e0bf4b8f1.
- First uncompressed stream: a2b3e809dfb9b8db60da62c38f87afbce41acdb8306dd2f1548d5a3540f8e66c.

Only timing metadata was inspected to diagnose the incomplete stage. No
partial-case empirical claim, reclassified outcome, or endpoint promotion is
made. A prospective A1 amendment preserves the original attempt and all
original gate conditions, with a new schema, output root and complete smoke.
