# Neutral lifecycle probe v1: initialization failure

Array 24639432 tasks 0-7 all FAILED 1:0 in 3-5 seconds, pi_jss233 day,
with zero restarts. Dependent finalizer 24639433 was CANCELLED before running.
No trace.json or COMPLETE trace marker was produced.

Every task reported the same error during cdapi.init:
language.mix could not be read (TypeMismatchError). The pinned
file-system-access 1.0.4 adapter uses lstat(path).isFile(); a symlink is rejected
even when its target exists and has the correct bytes. This was a materialized
input-type incompatibility, not an unavailable dependency or permission denial.

Program flow places cdapi.init before withSeededOfflineGame, and all traces
failed in initialization: zero games were created and zero updates occurred.
There is no scientific or lifecycle result from this launch. The failure says
nothing about the proposed rubble correction.

Preserved root:
research-evidence/live-building-ledger/neutral-probe-v1.
Source ba816bf122ac3efaf5750fb7730cabf663a45a13;
manifest SHA-256 6acc921ecf8ea64382c3487dd170369df3785960a0add3fc485ecaca5b5a3df5.
All eight original stderr logs, empty stdout logs, asset links, generated
fixture maps and dispatch records remain intact. A machine-readable failure
audit records exact raw job IDs, file hashes, and absence of output markers.

A prospective A1 repair uses independent regular asset files and an
initialization-only Slurm prerequisite before the unchanged eight-case design.
No old artifact is overwritten, no trace is selectively replaced, no gate
changes, and no competitive endpoint is promoted.
