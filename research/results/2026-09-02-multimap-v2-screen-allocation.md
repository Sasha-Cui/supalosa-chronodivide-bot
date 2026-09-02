# Multi-map V2 screen allocation: amendment 3 sealed

The canonical allocation is job `24602339`, source
`8f9fde85a4b20d8bad8aca208a5af973b219c002`, with artifact SHA-256
`5a838bd9cb3edf06df288914ad5cea60b61983f29d183a1efdeb5a3c90e3295e`.

Protocol amendment 3 was committed before outcomes at `a370646`; its SHA is
`1e992a30ee6b7978cff0842c05c94478412f69d77434156023aec479ce9a6760`.
The allocator module SHA is
`ad4d4b3675aa661e959c06aa54ef32672e21fd8a56c7f72eb5c2a6151de38296`.
Parent census SHA is
`5715eef27a8dc0b4b24f3ea2909c83ef2d15c3ea546a7c16b9b3a61b1583d1c5`.

The canonical file resides at
`research-evidence/multimap-v2/screen-amendment-3/allocation/allocation.json`.
Its checksum, completion marker, job/account/source and plan invariants were
verified independently.

## Explicit allocation change

All 900 screen games and 3,168 complementary confirmation cases are preserved
in number. No policy, map bytes, game seed, unit weight or performance gate is
changed. Only three maps change membership: original HFO adds/removes 126
indices; HFO Golden and Tour of Egypt each add/remove 88. Total additions and
removals are 302 each, all published in the sealed ledger. No competitive
outcome had been generated when these labels changed.

Two/four-start memberships remain identical. Six/eight-start memberships
attain the smallest feasible two-game cyclic-offset count range while retaining
matched participant-slot scenarios, exact country/start/opponent margins,
and per-candidate-start coverage of every opponent. These counts are explicitly
near-balanced, not uniform, and index offsets are not geometric distance.

## Filesystem-visibility incident and unnecessary metadata repeats

Initial direct lookups did not see the output directory despite successful
scheduler accounting. A second allocation job `24602625` and a traced
allocation job `24602968` were submitted in distinct paths; startup-only
probe `24602908` checked shell execution without creating any game.

After refreshing the parent directory, all three complete allocation artifacts
were visible, with timestamps consistent with their original runs. All three
plans are exactly identical; only execution provenance differs. There was no
allocation execution failure. The additional two metadata runs were unnecessary
and are preserved, not used to choose a different allocation.

Their artifact hashes are
`c50df8706f23a2f9f0bca2ab1323102986d7fb2ee46b8f006d73d64de5ecd6ec`
and
`bd9171acee15b1933db0983a3f175c3e34fa061c72988492a238ed22259a5114`.
No simulation or competitive outcome was generated or duplicated by these jobs.

Process correction: when accounting says completed but an output lookup is
negative, refresh parent directories and allow visibility to settle before
classifying a failure or resubmitting. The competitive finalizer now refreshes
completed directories before enforcing its existing markers; no integrity
check is bypassed. Persistent discrepancies still fail closed.

## Next gate

Only the canonical first allocation authorizes the frozen 900-game screen.
All competitive cells and its finalizer must complete cleanly before results
are opened. Confirmation remains sealed and the paper remains frozen.
