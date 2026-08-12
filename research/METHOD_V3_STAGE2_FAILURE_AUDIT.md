# Method-v3 Stage-2 open-training failure audit

Status: **analysis implementation frozen; result is descriptive open-training
evidence and not a paper claim**.

This audit was added after all five method-v3 Stage-2 runs and the cross-run
finalizer completed. It may inspect those opened training outcomes to diagnose
the next method version. It does not authorize access to fresh-development or
sealed-test outcomes.

## Immutable endpoint

A win means a finished engine game in which Supalosa is defeated, StrongBot is
not defeated, and the terminal Supalosa building count is zero. A tick-cap game
is always a draw. In particular, zero Supalosa buildings at the tick cap is not
retrospectively relabeled as a win, including when both players have lost every
building.

## Evidence validation

`research/scripts/analyze_method_v3_stage2_failures.py` starts from the frozen
cross-run finalizer. It verifies all five run-finalizer hashes, their technical
gate hashes, Slurm account `pi_jss233`, exact array job identities, successful
scheduler task states, 1,188 complete games per run, zero technical failures,
and the literal win invariant before summarizing any lifecycle event. Raw
win/draw/loss counts must exactly reproduce every selected policy's frozen
aggregate ranking row.

The generated artifact records a SHA-256 manifest commitment over every
`events.jsonl` file it reads. The output timestamp is intentionally `null`, so
repeated executions over unchanged evidence are byte-identical.

## Descriptive questions

For every selected finalist, the audit reports:

- win, draw, and loss counts by country, side, reciprocal slot, family, and run;
- whether building elimination activated in each outcome class;
- policy-event incidence, including activation blocks, stalls, progress,
  reassignment-related orders, capability production, and sweep orders;
- terminal building-count distributions;
- draws with surviving Supalosa buildings, zero candidate buildings, or mutual
  zero-building states; and
- the count of losses that occur before building elimination activates.

These diagnostics separate early/mid-game strength from literal building
elimination. They may motivate a prospectively frozen training-only method
revision. They cannot establish out-of-family generalization or reliable
superiority over Supalosa.
