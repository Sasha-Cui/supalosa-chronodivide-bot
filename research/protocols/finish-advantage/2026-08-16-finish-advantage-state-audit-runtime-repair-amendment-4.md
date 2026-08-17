# Finish-advantage state-audit runtime repair amendment 4

Status: **prospectively frozen before replacement execution**

Recorded: 2026-08-16 America/New_York

## Failed launch and admissibility

State-audit array `22359726` contained 90 tasks and planned 360 passive-audit
games. Every task failed at `assertOfflineAgentRuntimeIdentity` before the
simulator was created. The dependent controller `22359727` was cancelled by
dependency. The preserved result root contains exactly 90 task directories and
90 nonempty stderr logs, but zero `cell.json` files, zero completion markers,
zero other JSON artifacts, and zero nonempty stdout logs.

The common error was that the external Supalosa agents did not inherit from the
simulator's exact `Bot` class. A package-manager operation had introduced a
second physical copy of byte-identical `@chronodivide/game-api` code below the
driver. JavaScript class identity is physical-module-path sensitive, so the
runtime safety assertion correctly rejected the configuration.

Launch `22359726` is permanently inadmissible for state selection, policy
selection, or a paper claim. It contains no outcome, policy action, state
exposure, or partial competitive evidence. No task from that launch is reused.

## Prospective replacement

The replacement is state-audit schema 2 with status
`FROZEN_FINISH_ADVANTAGE_OUTCOME_BLIND_STATE_AUDIT_V2_RUNTIME_REPAIR`. It
retains the ten open families, nine countries, reciprocal slots, observer
conditions, 24,000-tick cap, endpoint, and fixed margin-selection rule. It
changes only technical provenance and the engine-seed block.

The new seed base is `4,225,100,000`:

```text
requested_engine_seed = 4,225,100,000 + 9 * family_ordinal + country_ordinal.
```

The replacement campaign binds the original state-audit protocol plus
amendments 1, 2, 3, and this amendment. Amendment 3 is now an explicit campaign
commitment rather than being bound only indirectly through the source commit.

## Mandatory runtime-identity preflight

Before the array becomes eligible to run, one Slurm preflight under account
`pi_jss233` must:

1. resolve the driver and external-baseline `@chronodivide/game-api` entry
   points and require identical canonical physical paths;
2. load the exact external Supalosa factory at commit
   `165b77a71d0cf5ebd27c65b19d0486bcbae78d0f`;
3. instantiate one external agent for each of the nine supported countries;
4. prove every agent is an instance of the simulator's exact `Bot` class;
5. verify clean pushed `main`, the campaign source commit, the external runtime
   commitment, and Slurm account `pi_jss233`; and
6. write an outcome-free immutable JSON artifact and completion marker.

The 90-task array must depend on successful completion of this preflight. The
aggregate controller remains `afterok` on the complete array. A failed
preflight launches zero audit games.

## Execution boundary

The replacement uses a new exclusive evidence root and regenerates its campaign
at the repaired clean source commit. All 90 cells are executed exactly once or
the replacement fails closed. No family, country, slot, or observer condition
is selectively retried. The original root and logs remain unchanged.

This amendment repairs environment identity and preflight coverage only. It
does not modify Supalosa, the finish-advantage policy, the state observer, the
margin rule, the competitive screen, or any outcome definition. Passing the
replacement audit authorizes only the already specified outcome-blind technical
gates.
