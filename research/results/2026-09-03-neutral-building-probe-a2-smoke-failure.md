# Neutral probe A2: complete smoke failed actuation

Both scheduler jobs completed cleanly under pi_jss233 day with zero restarts:

- 24643219: initialization only, 0 game instances and 0 updates.
- 24643220: two sequential technical smoke traces, task indices 0 and 2.

Initialization SHA:
f55ef974d310550cbbfd10bf4b5d1b5a53ea0760107b198af68b40a45b30f1f4.
Complete smoke SHA:
78ccef1f3e6d8b710f74bf8b16d0ab06e4a1f5f3f13ddf8baca8268e039f4722.

Both no-rubble and rubble cases completed exactly 6000 updates without the
deployment exception. Each emitted 191 force-attack requests. Neither
observed a target ObjectDestroy; both boundary lists were empty. The complete
smoke therefore failed its original technical gates. No A2 full array was
submitted. These are not policy-strength measurements.

The two canonical trace hashes were identical:
74c5580e54cb567da5c5c0018483ba3ef2eabde15738b316fac7f0059248f0a2.
This is consistent with no destruction and no exercised rubble difference;
it is not a successful lifecycle or endpoint-equivalence result.

Pinned source rejects object-targeted orders when the target's footprint is
fully shrouded. The fixture repeatedly issued a known evaluator target ID,
without movement to reveal that target. A2 did not capture target visibility;
the source-based explanation is tested prospectively in A3 rather than
treated as an already measured causal result.

A3 adds only scripted scouting and fixed public visibility/movement telemetry,
retains every original gate and adds visibility checks, and uses a separate
output root. All A2 artifacts and original scientific outcomes remain intact.
The neutral probe and full endpoint compatibility gate remain unpassed.
