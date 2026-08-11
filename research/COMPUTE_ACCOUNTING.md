# Compute accounting

Audited: **2026-08-11**

## Scope

This audit covers the 8,704 accepted outcome-bearing games in the finalized
method-v2 path. It includes the optimizer, common-seed championship, fresh
development gate, sealed confirmatory evaluation, optimizer-selection
diagnostic, and policy-component diagnostic. It excludes failed or zero-launch
jobs, compatibility-only gates, controller/finalizer overhead, and the terminal
analysis that reused existing completion records.

The frozen aggregate is
[`artifacts/accepted_compute_accounting_v1.json`](artifacts/accepted_compute_accounting_v1.json).
Raw scheduler exports are retained outside Git under
`research-evidence/compute-accounting-v1/` and are bound by SHA-256 in the
aggregate.

## Result

- 562 accepted simulation-shard allocations;
- one allocated CPU core and 6 GiB requested memory per allocation;
- 1,039,401 Slurm core-seconds, or 288.7225 core-hours;
- no GPU allocation;
- 1,712,252 KiB maximum recorded batch-step RSS, or 1.632 GiB; and
- 30.15 accepted games per allocated core-hour.

All 562 allocations completed under the prespecified project account. The stage
allocation counts, games, and core-seconds independently sum to the frozen
totals.

## Definition and limitation

Core-hours are
`sum(ElapsedRaw * AllocCPUS) / 3600` over accepted simulation allocations.
Because every allocation used one core, this is also the sum of allocation
elapsed hours. It includes scheduler-visible setup and teardown and does not
measure CPU utilization, electrical energy, or carbon emissions. Peak RSS is
the maximum `MaxRSS` among the 562 batch steps, not a sum or average.

The resource statement is descriptive reproducibility metadata. It does not
alter any outcome, endpoint, uncertainty estimate, or inferential claim.
