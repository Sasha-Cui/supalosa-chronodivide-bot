# Temperate trained profiles: literal pilot result V1

Status: **complete, technically clean, failed every performance gate**

Outcome-blind gate array/controller `22714732`/`22714733` passed all 72 traces,
all countries/slots, and both starts per map. Gate artifact SHA-256:
`f4bb33f7a38750bb9d3846d704b98f0fbe8f8389a9bb225e6336ac14f749b3b0`.
The literal pilot used array/controller `22715203`/`22715204`; all 180 shards
and 360 games completed without retry or technical failure. Final artifact
SHA-256: `9c0df0d59d72565a05120930af1dfb2ac26248029f4e4b1b60a792c6d51b6b4a`.

Current deployed StrongBot was 98W/34D/228L overall, literal win probability
0.2722, with one-sided 95% Wilson lower bound 0.2354. Tikal was 15W/19D/146L;
Peak was 83W/15D/82L. Both factions and slots lost decisively, and no country
had wins exceeding losses. Every performance gate failed; only start coverage
passed.

The historical 100% short-game grids were not portable to mirrored-country,
reciprocal-start, physical-all-building evaluation. These two profiles do not
support a paper claim or confirmation.
