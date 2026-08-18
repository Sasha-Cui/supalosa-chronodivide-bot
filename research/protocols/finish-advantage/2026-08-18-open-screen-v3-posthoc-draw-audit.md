# Open causal screen V3: complete-population posthoc draw audit

Status: **descriptive, posthoc, development-only; not paper-claim evidence**

Recorded: 2026-08-18 UTC, after the prespecified V3 finalizer reported
`NO_ADVANCING_CANDIDATE` and before the stagnation-assault redevelopment protocol
was frozen or implemented.

## Immutable source population

- campaign SHA-256: `133d49d2a8ed1f0ed467c986c5c2d017df2adc675f0686972495973fc53b3edc`
- array: `22610506`, 90/90 successful tasks under `pi_jss233`
- launched and complete games: 1,080/1,080, with no retries and no technical failures
- repaired finalizer job: `22617349`
- repaired finalizer SHA-256: `c0391851cf2de4e92b10bbcaf9bab1bf9b2c80275c30784489866044819c4b2a`
- candidate arm audited: `visibility_aware_final_building_v5`, all 180 paired cells

The audit uses the complete arm population. No family, country, slot, seed, or
outcome was excluded. It is used only to propose a new prospective mechanism.

## Findings

V5 produced 42 literal wins, 106 draws, and 32 losses. Among the 106 draws,
terminal enemy-building counts were:

| Enemy buildings remaining | Draws |
|---:|---:|
| 0 (simultaneous/nonliteral termination) | 8 |
| 1 | 10 |
| 2--4 | 24 |
| 5 or more | 64 |

Fifty-four of 106 draws contained no candidate-attributed physical enemy-building
destruction. The V5 final-building controller emitted decisions in all ten draws
ending at one enemy building and in none of the 88 draws ending with two or more.
Therefore the exact final-building kernel cannot, by itself, solve the dominant
draw population.

Eighty-five draws reached the 24,000-tick cap; 21 ended through the engine's
nonliteral termination path. Two development families, `mp17mw` and `mp25mw`,
drew in all 18 V5 cells. Their terminal building distributions were materially
different: `mp17mw` commonly approached a small residual base while `mp25mw`
often retained 10--37 enemy buildings. This rules out treating every draw as the
same closeout failure.

The 42 V5 wins occurred from tick 4,779 through 23,682 (median 11,179); 20 wins
occurred after tick 12,000, 12 after tick 18,000, and eight after tick 20,000.
A time-only takeover would therefore destroy valid late-win trajectories. Any
new intervention must require observed lack of physical objective progress.

The irreversible finish overlay acted in only six V5-draw episodes, first acting
at median tick 15,732. It reduced the terminal enemy-building count in two cells
but converted no draw. The margin-8 surplus arm converted two V5 draws to wins
and one to a loss, improved terminal enemy-building count in 15 cells, worsened
it in ten, and was inferior to unchanged V5 overall. Margin 0 converted one draw
to a win and five to losses and worsened terminal enemy-building count in 40
cells. Broad early commandeering is therefore rejected.

## Mechanistic conclusion

The redevelopment target is not another terminal-only rule. It is an earlier,
bounded increase in offensive throughput that preserves the exact Supalosa
economy/defence core and the successful V5 closeout kernel. The intervention
must:

1. activate only after both a minimum time and a building-progress stagnation
   interval;
2. add a mission through the mission controller instead of commandeering units;
3. request a dedicated buildable composition and never steal locked defensive
   units;
4. permit at most one intervention mission at a time;
5. prioritize combatants while they block progress, then production buildings
   and the remaining physical base; and
6. expose outcome-free activation, mission, composition, and progress telemetry.

This audit does not claim that the proposed mechanism works. Its only authorized
use is to define the next fresh-seed open-development screen.
