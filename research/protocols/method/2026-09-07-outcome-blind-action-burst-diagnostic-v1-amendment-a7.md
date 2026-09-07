# Outcome-blind timestamped action-burst diagnostic V1 amendment A7

Frozen: 2026-09-07, after smoke `25189533` failed and before any successful
action trace

Parents: the V1 protocol and Amendments A1–A6.

Failure record:

`../../results/2026-09-07-action-burst-smoke-event-clock-failure.md`

## Event clock

Use logical update labels:

- `0`: initialization calls made during participant `onGameStart`;
- `1..3600`: calls made during the corresponding live engine update.

Set the collector's logical update immediately before each
`instance.update()`. Validate the engine tick after the update as before.
Every event must have an integer label in `0..3600`.

## Temporal metrics

Report initialization calls separately as `initializationCalls`. Report
`liveCalls` and `liveCallsPer900` for labels 1 through 3,600. Retain total
`calls` and `callsPer900`, explicitly including initialization calls.

The four exact nonoverlapping live quarters are:

- 1–900;
- 901–1,800;
- 1,801–2,700; and
- 2,701–3,600.

Rolling-900 windows and their ordered-unit totals use live-update events only,
with half-open integer-label intervals ([t,t+900)) anchored at each observed
live request. Same-update and duplicate fractions retain all events and report
initialization label zero normally.

The protected `gameplay_nonorder` reserve is derived only from the live
rolling-900 maximum. Initialization calls cannot set (R).

## Execution

Use a new source-bound manifest under
`execution-v1-a4-runtime-a1-certificate-a6`. Preserve the failed smoke and
its generic artifact.

## Unchanged requirements

The selected seeds, 1,717 assignments, maps, opponents, countries, starts,
slots, game settings, 3,600-update horizon, action methods/classes, argument
digests, determinism, reserve formula, total ceiling grid, prohibited fields,
storage, file budget, and CPU resources are unchanged.
