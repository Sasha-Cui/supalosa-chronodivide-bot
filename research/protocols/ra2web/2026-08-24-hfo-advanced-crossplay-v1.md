# HFO RA2Web Advanced paired cross-play protocol V1

Status: **prospectively frozen before selection or competitive outcomes**

## Purpose and fixed artifacts

The 720-game deployed confirmation established reliable superiority to pinned
Supalosa on balanced HFO. This study asks whether that strength transfers to
an independently developed opponent and calibrates that opponent against
Supalosa on the same cases.

The frozen RA2Web compatibility gate already passed 126/126 technical launches
for all countries and both participant slots. Use only:

- final deployed StrongBot defaults from commit `7bd6b51` or a descendant
  containing no policy changes;
- exact external Supalosa commit
  `165b77a71d0cf5ebd27c65b19d0486bcbae78d0f`;
- RA2Web Advanced Old Priest bundle SHA-256
  `81d8797b6dd1371ba2dcbd79e25df8b42254290c820159e121a82650fd97a143`;
- RA2Web freeze-manifest SHA-256
  `a405c0fc6d1d6541f965582c9b53be0bfd01c0c68f4d0f340e1a5ae37671aa5d`;
  and
- client commit `218fb800614295119e25040986b175fee4c3670f`, release
  `0.84.1-r1d35349-dd6a17b9c`.

The adjacent upstream Bot3 manifest reports a different bundle hash; the study
uses and reports the frozen actual-byte hash above.

## Outcome-blind balanced selection

Use all nine countries and candidate/reference starts in order `39,82`,
`151,119`, `88,34`, and `88,157`, with their exact opposite HFO start. For
country ordinal `c`, start ordinal `s`, designated first-player slot `q`, and
offset `o`, enumerate

$$
4{,}261{,}000{,}000 + 100{,}000c + 20{,}000s + 10{,}000q + o.
$$

Initialize with zero updates and select the first five exact-start cases per
country/start/slot cell. Require 360 unique cases: ten per country/start, five
per slot, 40 per country, and 90 per start. No outcome field is permitted.

## Paired arms and gameplay

Run two arms once on every selected case:

1. `candidate_vs_advanced`: deployed StrongBot is the designated first player
   and RA2Web Advanced is the opponent.
2. `supalosa_vs_advanced`: exact pinned Supalosa is the designated first player
   and the same RA2Web Advanced bundle is the opponent.

Both arms use the same country, physical starts, participant slot, and engine
seed. Use the exact private Snow HFO runtime, 10,000 credits,
`shortGame=false`, superweapons disabled, symmetric resignation suppression,
literal all-building elimination, and a 90,000-tick maximum. This is 720 games.

No retry, replacement, selective rerun, exclusion, or early outcome access is
permitted. At most 64 CPU tasks may run concurrently under `pi_jss233`.

## Frozen analysis

For each arm report W/D/L from the designated first-player perspective,
literal-win probability, one-sided 95% Wilson lower bound, terminal status and
ticks, country, start, faction, slot, and the full 9-by-4 matrix.

For `candidate_vs_advanced`, compute the equal-weight 36-country/start-cluster
lower bound using `t=1.68957`, as in the Supalosa confirmation.

For each paired case score first-player win=1, draw=0.5, loss=0. Let

$$
d_i = \mathrm{score}(\text{candidate vs Advanced})_i -
      \mathrm{score}(\text{Supalosa vs Advanced})_i.
$$

Report the paired mean and one-sided 95% t lower bound using `df=359` and
`t=1.64913`, plus improved, tied, and worsened case counts.

## External-opponent pass rule

The study passes only if all of the following hold:

1. all 720 scheduled games and both arms complete with exact identities;
2. candidate wins exceed candidate losses against Advanced;
3. the candidate's pooled Wilson lower bound against Advanced exceeds 0.5;
4. the candidate's 36-cell clustered lower bound exceeds 0.5;
5. every start, both factions, and both participant slots have candidate
   Wilson lower bounds above 0.5;
6. every country has candidate wins exceed losses, and at least seven country
   Wilson lower bounds exceed 0.5;
7. no country/start cell has candidate losses exceed wins, and at least 30 of
   36 cells have wins exceed losses; and
8. the paired candidate-minus-Supalosa score lower bound against the common
   Advanced opponent exceeds zero.

No criterion may be weakened after outcomes. The Supalosa-versus-Advanced arm
is reported regardless of its direction; no assumption about Advanced's
strength is made before the aggregate.

## Decision boundary

On pass, the paper may claim that the policy improvement transfers to a frozen
independently developed opponent on HFO, while disclosing the exact bundle and
license/provenance boundary. On failure, preserve the complete result and do
not select favorable opponents, countries, starts, or arms.

This study adds opponent diversity but not map diversity. A separate frozen
second-map study remains required for broad environment-generalization claims.
