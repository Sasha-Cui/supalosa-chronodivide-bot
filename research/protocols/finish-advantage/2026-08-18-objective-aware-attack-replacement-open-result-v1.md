# Objective-aware attack-factory replacement: open-screen result V1

Status: **complete, technically clean, no advancing candidate; development-only**

## Immutable execution

- compatibility array/controller: `22624096` / `22624690`;
- compatibility artifact SHA-256: `e089df2193dd02c2d3a8ee1a55f7076e68442e7da9baecfcb04462d2ca968e22`;
- campaign SHA-256: `d04f10fdb545309f763e86d3b6a96c00f9a2bd396751eadd7a29ef5f6d01f319`;
- source commit: `c887cb996427838b3ef45be82beed23fb99bf010`;
- outcome array/controller: `22625201` / `22625202`;
- games: 900/900, all 90 tasks complete, no retries or technical failures;
- final artifact SHA-256: `11b0877adf09c5a9b9b349f2aabae22afa410aae2caeb5888e8e549dcf77a161`.

## Complete result

| Arm | Wins | Draws | Losses | Score |
|---|---:|---:|---:|---:|
| exact external Supalosa | 36 | 111 | 33 | 0.5083 |
| unchanged V5 | 42 | 105 | 33 | 0.5250 |
| V5 + distance replacement | 42 | 99 | 39 | 0.5083 |
| V5 + forces-first replacement | 21 | 117 | 42 | 0.4417 |
| V5 + buildings-first replacement | 4 | 123 | 53 | 0.3639 |

No replacement passed the prospective rule. Distance reduced draws but traded six
draws for six losses and had paired score effect `-0.0167` versus V5. Forces-first
and buildings-first were strongly harmful in both factions and nearly every
family. The intervention was fully exposed: the three replacement arms created
1,573, 1,673, and 1,669 missions respectively.

## Mechanistic conclusion

Replacing every attack from the opening changes too much of Supalosa's successful
trajectory. The distance control demonstrates that replacement-factory liveness
can reduce draws, but applying it from tick zero sacrifices established wins.
Static target priority is not a safe global policy.

A descriptive oracle over the four V5/replacement arms would produce 57 wins,
101 draws, and 22 losses, versus V5's 42/105/33. This is not an achievable result
or paper claim; it only shows that useful replacement behavior exists in some
states. A family-identity oracle reaches 48/102/30 and a country-identity oracle
49/101/30, which is too weak and too vulnerable to overfitting to justify a
static contextual selector.

The next causal mechanism preserves exact Supalosa+V5 until a public physical
building-progress clock certifies stagnation, then replaces only the factory for
future missions. Existing missions, production, defence, scouting, engineers,
and all prior commands remain untouched. This result does not authorize
confirmation or paper writing.
