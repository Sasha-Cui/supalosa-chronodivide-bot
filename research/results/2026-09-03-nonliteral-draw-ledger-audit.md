# Complete nonliteral-draw audit and live-building ledger risk

The entire already-unblinded 95-case engine-nonliteral draw category from the
900-game screen was audited without replaying games or reading partial
confirmation outcomes. Audit artifact:
`research-evidence/multimap-v2/post-screen-nonliteral-audit-v1/audit.json`,
SHA-256 `fae01cd2203f31d4a76bd513c2cc5e6634546b36fd6906b262a9776f476ca1d5`.

| Recorded terminal condition | Cases |
|---|---:|
| Both flagged defeated, no world-building rows remaining | 15 |
| Baseline flagged defeated, both sides retain world-building rows | 47 |
| Candidate flagged defeated, both sides retain world-building rows | 18 |
| Both flagged defeated, baseline world-building rows remain | 15 |

Every case had the ledger enabled; all 201 recorded final-update removals were
unspawn without qualifying opponent attribution. These observations alone do
not identify the cause of every draw or authorize any score correction.

## Source evidence

Pinned game-api SHA:
`dd398f5c8c2b4c3e3d6eb0f9ca6d7549bf70fee16c5950cd8902616ac922497d`.

- getAllUnits queries Techno world objects without filtering isDestroyed.
- destroyObject sets destruction and zero health. Its leaveRubble branch
  removes the object from the player's owned collection but leaves the rubble
  object in the world, with the prior owner tag.
- getVisibleUnits(player, self) queries that player's owned collection instead.
- The current snapshot uses getAllUnits, filters type/owner only, and counts
  rows regardless of health or live-owned membership.
- The native stalemate detector has separate countdown/asset-cleanup behavior.
  Its progress resets concern production, income and certain building events;
  it is not a simple measure of all ongoing combat activity.

## What is established and what is not

A synthetic two-update test of the existing evaluator establishes a contract
risk: destruction of a last live building that remains as zero-health rubble
produces continue; a later elimination on the other side can then produce the
opposite winner. The problem can affect first-elimination ordering, not only
convert wins into draws. The test created ZERO game instances.

The synthetic ordering record is at
`post-screen-nonliteral-audit-v1/ordering-risk.json`, SHA
`608a7d308940d422e1353994e46e4f051bd8c42068051331f7f987d38d981995`.

This is NOT a live-game validation or an estimate of affected matches. Saved
terminal summaries are insufficient to reconstruct every earlier elimination
event. No original score has changed. A source-level risk cannot be used to
retrospectively credit favorable draws or restore rejected policies.

## Next required work

Build a separately named candidate live-owned-building snapshot, leaving the
legacy endpoint intact. Validate real leaveRubble lifecycle, ownership,
health and destroy/unspawn event timing in controlled fresh fixtures, with
non-rubble and negative attribution controls. Only after that gate may a
prospectively versioned corrected endpoint be used on fresh COMPLETE cohorts.
Review all potentially affected outcomes, not just the 95 draws.
