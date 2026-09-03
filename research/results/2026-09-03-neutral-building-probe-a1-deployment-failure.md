# Neutral probe A1: deployment-interface failure

All eight tasks in array 24639986 FAILED 1:0 after 5-8 seconds under pi_jss233
day, with zero restarts. Finalizer 24639987 was cancelled before running.
The initialization prerequisite 24639844 remains a valid zero-game pass:
regular-file materialization repaired the earlier symlink incompatibility.

Every task produced the same compact error: "Cannot read properties of
undefined (reading 'obj')". None produced trace.json or a COMPLETE marker.
Unlike the earlier asset-initialization failure, these logs do not establish
exact game/update progress, so no zero-game or zero-update claim is made.

The source contains a deterministic API-contract violation matching this
error. The scripted actor supplies no target to OrderType.Deploy; the pinned
DeployOrder is targeted and dereferences this.target.obj. OrderType.DeploySelected
is the no-target command used by the existing working bots. The intended
deployment schedule did not require a clicked target.

Preserve the entire neutral-probe-v1-materialization-a1 evidence tree, all
logs, manifests, init pass and dispatch records. A failure-audit.json records
all exact task/job/hash bindings. No lifecycle or policy-strength result is
available from this stage. No legacy endpoint or scientific score is changed.

Prospective A2 corrects only the deployment call and adds bounded stack/
progress logging, a two-case end-to-end smoke prerequisite, and a separate
output root. It reuses the sealed regular assets read-only. The eight-case
probe and every technical/advancement gate remain intact.
