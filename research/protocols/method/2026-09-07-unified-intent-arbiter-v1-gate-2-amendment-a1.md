# Unified intent arbiter V1 Gate 2 amendment A1

Frozen: 2026-09-07, after the parent Gate 2 protocol was committed and before
the seed auditor was implemented or run and before any game initialization.

Parent:

research/protocols/method/2026-09-07-unified-intent-arbiter-v1-gate-2.md

## Prelaunch contradiction

The parent selected [3,070,000,000, 3,071,000,000) because the earlier A2
action-burst audit reported it clean. That earlier retained audit necessarily
contains the candidate interval and signed representation in its immutable
metadata. The parent's required lexical complete-evidence scan would therefore
find its own historical candidate declaration and fail even though no game
used the interval.

No Gate 2 audit, selector, trace, or game existed when this contradiction was
found.

## Replacement candidate scan

Run one complete retained-evidence scan over the following ordered unsigned
one-million intervals:

1. 3,330,000,000
2. 3,340,000,000
3. 3,350,000,000
4. 3,360,000,000
5. 3,370,000,000
6. 3,380,000,000
7. 3,390,000,000
8. 3,410,000,000
9. 3,420,000,000
10. 3,430,000,000
11. 3,440,000,000
12. 3,450,000,000
13. 3,460,000,000
14. 3,470,000,000
15. 3,480,000,000
16. 3,490,000,000
17. 3,510,000,000
18. 3,520,000,000
19. 3,530,000,000
20. 3,540,000,000

Each interval is [base, base + 1,000,000). Scan both unsigned and signed-int32
representations. The selected interval is the first ordered candidate with
zero lexical token, path-token, and declared-range collision. Assess all 20
candidates in the same complete scan; do not stop after finding a passing
candidate.

The complete audit must include historical seed-audit artifacts. Exclude only
this current parent protocol, this amendment, the auditor source and test, the
Slurm wrapper, and the audit output directory because those files necessarily
declare the candidates. Do not semantically reinterpret an old unselected
candidate; lexical presence is conservatively a collision.

If no candidate passes, preserve the complete failure and freeze another
amendment before scanning a new ordered set.

## Seed formula

Replace 3,070,000,000 in the parent formula with selectedBase:

selectedBase + mapOrdinal x 36 + directionOrdinal x 18 +
countryOrdinal x 2 + candidateSlot.

Both arms still share the same seed. The 180 distinct seeds must all remain
inside the selected interval.

## Unchanged requirements

The five maps and hashes, start directions, nine countries, both slots, 180
pairs, 360 tasks, two disabled arms, outcome-blind fields, fixed horizon,
pairwise exact-identity gate, resources, file budget, provenance, and
advancement rules are unchanged.
