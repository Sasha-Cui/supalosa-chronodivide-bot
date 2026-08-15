# Mission-Native Closeout: Amendment 50

Date: 2026-08-15

Status: **V36-R1 outcome-blind pass without no-owner exposure; prospective V36-R2 horizon extension**

## Preserved V36-R1 exposure result

The V36-R1 outcome-blind exposure screen ran once as Slurm array job
`22270897` under account `pi_jss233`, from clean tracked `main` source
`f182db54eb53b64e98851c6ddc5ddde4f6f56ef9`. Its enabled V36 policy identifier
was `0efbf8df5a9df23e5ff5a07596d7e07a394578216b83488004460556ce129d31`.

All 18 country-by-reciprocal-slot cells completed with exit `0:0`. The screen
preserved 18 artifacts and 38 outcome-blind traces: two enabled same-seed traces
per cell plus one direct and one disabled trace in cell zero. Every repeat was
identical, the direct and disabled traces were identical, all nine countries
and both starts were present, no resignation occurred, and every validation
error list was empty. The ordered artifact-list commitment is
`66b862b924a746d398e9313b27f8b75a0728103fad498011195fee77f8b2aaf8`.

The complete first-trace telemetry contained nine progress-deadline fallbacks.
All nine established unit-owning Supalosa predecessor missions and replanned
under the ordinary V35-compatible path. There were zero no-owner recoveries and
zero cap-truncated fallback intervals.

No win, loss, draw, score, terminal tick, terminal building count, or other
competitive outcome was serialized or inspected. V36-R1 is a valid technical
pass, but it does not expose the intervention newly introduced by V36 and
therefore cannot by itself authorize outcome-bearing evaluation.

## Frozen V36-R2 diagnostic

V36-R2 changes neither the bot policy nor its policy identifier. It changes
only the outcome-blind diagnostic schedule:

1. use fresh seed interval `4_294_920_000` through `4_294_920_017`;
2. retain all nine countries, both reciprocal candidate starts, deterministic
   same-seed repeats, and the exact direct-versus-disabled control;
3. extend the diagnostic horizon from 5,400 to 7,200 ticks so a later repeated
   fallback can expose predecessor exhaustion;
4. preserve the rule that an engine finish before the diagnostic horizon is a
   technical failure rather than an outcome to inspect; and
5. require at least one exact schema-30 no-owner recovery at start tick plus
   120, with no active predecessor and no delayed schema-29 replan.

Every ordinary predecessor-owned fallback must continue to satisfy its exact
deadline, suspension, ownership, and replan contract. Every trace, launch, and
failure counts. The failed V35 outcome-bearing game and all R1 seeds remain
unused. V36-R2 remains a mechanism diagnostic and provides no evidence that
V36 beats Supalosa.
