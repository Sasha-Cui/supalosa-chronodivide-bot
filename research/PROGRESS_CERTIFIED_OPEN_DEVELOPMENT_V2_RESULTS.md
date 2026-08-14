# Progress-certified objective conversion open-development v2 results

Status: **complete null development evidence; do not advance or use as a paper performance claim**

## Evidence identity

- Frozen source: `0975cba0e4dee225fa529dfb5b826d747246e888` on `main` and `fork/main` at launch.
- Campaign: `research-evidence/progress-certified/open-development-v2/campaign-0975cba-v2/campaign.json`.
- Campaign SHA-256: `3611df56822bf48b82b490e47f6a3cd3b8a0010a4786d4da6f62750c3216bdc2`.
- Results: `research-evidence/progress-certified/open-development-v2/results-0975cba-v2`.
- Submission record SHA-256: `0fde55128b7491fa18bd4b96637b7482796ac61266132d10b1597e9375220a4f`.
- Slurm array: `22171172`; fail-closed controller: `22171173`; account: `pi_jss233`.
- Technical gate SHA-256: `8508bfa496ad514d08dd6cae1e9e3825af6403ca35445e778ff2b344f781587f`.
- Scheduled analysis SHA-256: `5648f2a024fb5492a4dfe80e70f95c398eef0b9e962eb9572a57aa608922c333`.
- Retrospective diagnostic program SHA-256: `0045044f1cc41bb5cac0308428579bec1ccb3c5e482838caad4411e7bcb0a61d`.
- Retrospective diagnostic artifact SHA-256: `2cb8adcf3d6729331a5c84d60f431a40c0eed58a982d157860b0dc3af9823bb3`.

Progress-certified v1 remains invalidated and excluded. V2 reused only its fixed family identities, launched fresh games from engine-seed base `4,230,000,000`, and pooled no v1 outcome or game.

## Execution reconciliation

All 90 array tasks completed under `pi_jss233` with exit `0:0`. The scheduler exposed 90 unique array indices and 90 unique task records. The array launched all 1,080 prespecified games:

$$
10\text{ map families}\times 9\text{ countries}\times
6\text{ arms}\times 2\text{ reciprocal slots}=1{,}080.
$$

The tasks used 151,273 single-CPU seconds, or 42.0203 CPU-hours. Shard elapsed times ranged from 110 to 4,304 seconds. Scheduler-local execution ran from `2026-08-13T23:54:46` through `2026-08-14T01:47:05`; the controller then completed in nine seconds with exit `0:0`.

The technical gate reconciled exactly 1,080 requested and accounted launches, zero technical failures, zero endpoint violations, zero information-boundary violations, and intervention exposure in every country. All result files were committed before outcome analysis by artifact SHA-256 `a16704f8405f201e2900918f66232710050c3cd17cba6d93487396def35d94c2`. No partial outcome was inspected before the controller wrote `PASS_PROGRESS_CERTIFIED_CONTROLLER`.

## Scheduled result

The scheduled analyzer returned `DO_NOT_ADVANCE_PROGRESS_CERTIFIED_FROM_OPEN_DEVELOPMENT`. Counts use only literal candidate wins established by opponent-attributed physical destruction of every enemy-owned building.

| Arm | Wins | Draws | Losses | Literal win probability | Family-macro one-sided 80% lower bound |
|---|---:|---:|---:|---:|---:|
| External Supalosa control | 26 | 121 | 33 | 0.1444 | 0.1029 |
| Final building, direct | 26 | 121 | 33 | 0.1444 | 0.1077 |
| Final building, hybrid | 28 | 119 | 33 | 0.1556 | 0.1163 |
| Low count, direct | 19 | 124 | 37 | 0.1056 | 0.0808 |
| Low count, route without deadline | 27 | 116 | 37 | 0.1500 | 0.1141 |
| Low count, progress hybrid | 28 | 116 | 36 | 0.1556 | 0.1214 |

The frozen ranking selected `external_low_count_progress_hybrid`, but it passed only the technical checks and the two directional paired-effect checks. It failed every absolute or breadth check:

- its lower confidence bound was `0.1214`, not above `0.5`;
- wins did not exceed losses (`28 < 36`);
- Allied and Soviet literal win probabilities were `0.16` and `0.15`, not above `0.5`;
- wins exceeded losses in only three of nine countries, not at least seven; and
- the complete campaign was therefore not eligible for confirmatory evaluation.

Relative to control, the selected arm added two wins, removed five draws, and added three losses. Its family-macro literal-win effect was `+0.0111`, and its family-macro draw-probability effect was `-0.0278`. These permissive development quantities are positive in direction but far too small and unsafe to support the user-required claim of reliably beating Supalosa.

## Paired causal interpretation

The exact outcome-transition counts over the 180 paired family-country-slot blocks were:

- Final-building hybrid: `119 D->D`, `2 D->W`, `33 L->L`, `26 W->W`. It changed only two outcomes and caused no degradation.
- Low-count progress hybrid: `112 D->D`, `6 D->W`, `3 D->L`, `1 L->D`, `32 L->L`, `3 W->D`, `1 W->L`, and `22 W->W`.

Thus the exact-one-building mechanism is a small but empirically monotone kernel in this campaign. The broader low-count intervention is not monotone: its six draw-to-win conversions were offset by three draw-to-loss conversions and four degradations of control wins.

The direct final-building arm was not monotone. It converted one draw to a win but also converted one control win to a draw, yielding no net count change. This supports retaining route/survivability logic rather than unconditional direct attack.

## Opportunity and mechanism diagnostics

The final-building hybrid activated in 46 of 180 episodes. Within this exposed cohort it produced 28 wins, 18 draws, and zero losses. All 46 first decisions occurred at exact enemy-building count one. It therefore acts late and safely, but it cannot by itself produce a high unconditional win probability.

Among the 121 control draws, terminal enemy-building counts were:

- 17 at one building;
- 33 at two through five buildings (`15 + 7 + 2 + 9`);
- 34 at six through nine buildings (`9 + 9 + 9 + 7`);
- 10 at zero buildings without a qualifying literal physical-destruction endpoint; and
- 27 above nine buildings.

Even perfect conversion of every control draw ending at one through five buildings, while preserving all 26 control wins, would yield at most 76 wins in these 180 development games (`0.4222`). A method capable of exceeding one-half must safely improve trajectories earlier than exact count five, or improve the macro policy that reaches those trajectories, while preserving existing wins.

The current executor leaves substantial compatible force unused. For the final-building hybrid, telemetry accumulated 45,098 repeated decision-tick rejections labeled `uncalibrated_friendly_mechanic`, while unassigned eligible combatants were observed idle 38,150 times, moving 5,293 times, and attacking 1,910 times. These are repeated observations, not unique-unit counts. The fraction of observed unassigned actions that were moving or attacking was `0.1588`. The maximum episode-level physical no-progress interval was 15,012 ticks.

For the low-count progress hybrid, 109 of 125 exposed episodes first activated at count five; the remainder first activated at counts two through four. It accumulated 163,157 repeated uncalibrated-mechanic rejections. The median episode-level maximum physical no-progress interval was 6,372 ticks and the maximum was 19,068. This explains why merely adding progress deadlines did not make the intervention reliably convert objectives.

Current telemetry records the rules names of selected attackers but not rejected attackers. Therefore it does not establish which tank, infantry, aircraft, deployment, or special-weapon classes dominate rejection. V3 must measure this outcome-blind before any outcome-bearing screen; the missing identity must not be guessed from aggregate counts.

## V3 design requirements

The next method must be a genuinely new prospective version with fresh seeds. It must satisfy all of the following before a new open-development campaign:

1. Preserve the external Supalosa production, economy, scouting, defense, and ordinary attack controller.
2. Retain the safe exact-one hybrid kernel; never weaken an existing exact-one direct opportunity merely to clear unrelated forces.
3. Replace broad low-count command takeover with an additive assault allocation that cannot commandeer the baseline's home defense or an already productive attack.
4. Mobilize a substantially larger fraction of truly building-capable force. Outcome-blind telemetry must identify rejected unit rules names, weapon/mechanic reason, current action, target armor, reachability, and whether a certified ordinary weapon remained available despite an unrelated special secondary mechanic.
5. Add a safety gate before intervention above count one: own-building survival, local base threat, available surplus force, and an objective completion certificate must all be recorded.
6. Treat enemy forces only as route or existential blockers. When a building strike can end the game before interception, the building remains the overriding target.
7. Issue persistent direct `Attack` orders for visible or public-exact buildings, with reachable attack-move staging only when a firing perimeter is unavailable; verify order acceptance and subsequent movement, attack state, target damage, and physical destruction.
8. Bound interference using explicit assault-unit leases and release them after physical no-progress. Deadline fallback must not silently return the same idle units to the same failed mission.
9. Preserve every control win in an outcome-blind compatibility proxy and prespecify a non-regression development condition in addition to the literal-win gate.
10. Use fresh complete-population games. Do not selectively rerun the two favorable final-building conversions, the six favorable low-count conversions, or any failed family/country/slot.

## Decision

Do not proceed to confirmatory evaluation and do not write a positive paper narrative from v2. The result supports only a development conclusion: objective targeting can safely convert a very small number of exact-one-building draws, but the present executor does not mobilize enough force, and the count-five takeover can destroy baseline wins. V3 should focus on safe additive command execution and surplus-force allocation rather than another target-ranking sweep.
