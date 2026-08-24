# Deployed HFO all-country, all-start confirmatory protocol V1

Status: **prospectively frozen before selection or confirmatory outcomes**

## Primary question and candidate

Does the fully deployed, development-frozen StrongBot reliably defeat exact
pinned external Supalosa on Heck Freezes Over under the literal all-buildings
endpoint, across countries, physical starts, and participant slots?

The candidate is source commit `7bd6b51` or a descendant containing only
outcome-blind confirmatory infrastructure. It uses default `StrongStrategy()`
and default `StrongBotOptions`; no per-game override or experimental arm is
permitted. The opponent is exact external Supalosa commit
`165b77a71d0cf5ebd27c65b19d0486bcbae78d0f` in the same country.

## Outcome-blind balanced selection

Use all nine countries and candidate starts in order `39,82`, `151,119`,
`88,34`, and `88,157`. Opposite starts must respectively be `151,119`,
`39,82`, `88,157`, and `88,34`.

For country ordinal `c`, start ordinal `s`, candidate participant slot `q`, and
offset `o`, enumerate engine seeds

$$
4{,}260{,}000{,}000 + 100{,}000c + 20{,}000s + 10{,}000q + o,
$$

with `q` in `{0,1}` and `o` from 0 through 399. Initialize with zero updates
and select the first ten cases per country/start/slot cell that yield the exact
desired candidate/opponent start pair.

Require 720 unique cases: 20 per country/start cell, ten per participant slot,
80 per country, and 180 per start. Selection must contain zero updates and no
outcome field. Every seed family used in HFO pilot, development, replication,
or isolation V1 through V10 and Soviet-west V1 through V6 is barred.

## Gameplay

- Exact HFO/private Snow runtime and pinned external Supalosa.
- Same country for candidate and opponent.
- Literal physical destruction of all opponent buildings; symmetric
  resignation suppression and audit.
- 90,000 maximum ticks, 10,000 credits, `shortGame=false`, superweapons
  disabled.
- One game for every selected case: 720 games.
- No retry, replacement, selective rerun, exclusion, or early unblinding.
- At most 64 concurrent CPU tasks under `pi_jss233`.

Every cell records source, runtime, asset, map, baseline, seed, country, start,
participant slot, literal adjudication, terminal status, ticks, suppressed
resignations, and final unit/building summaries. The aggregate finalizer must
require all 720 clean scheduler tasks and exact manifest identities before
reporting any outcome.

## Frozen estimands and uncertainty

The primary outcome is literal candidate win, with draw and loss both counted
as non-wins for the absolute win-probability claim. Report pooled W/D/L,
literal-win probability, one-sided 95% Wilson lower bound, median and
distribution of terminal ticks, and suppressed resignations.

Also treat each of the 36 country/start cells as an equal-weight condition
cluster. If `p_g` is the mean win indicator in cluster `g`, report

$$
\bar p = \frac{1}{36}\sum_{g=1}^{36} p_g,
\qquad
L_{\mathrm{cluster}} = \bar p - 1.68957\,
\frac{s(p_1,\ldots,p_{36})}{\sqrt{36}}.
$$

Report W/D/L and Wilson bounds by country, start, Allied/Soviet faction, and
participant slot, plus the complete 9-by-4 W/D/L matrix. These are fixed
stratified analyses, not post-hoc subgroup discovery.

## Confirmatory pass rule

The deployed candidate passes only if all of the following hold:

1. all 720 scheduled games complete cleanly with no identity or endpoint drift;
2. pooled wins exceed pooled losses;
3. the pooled one-sided 95% Wilson lower bound for literal-win probability
   exceeds 0.5;
4. the 36-cell clustered one-sided 95% lower bound exceeds 0.5;
5. each of the four start-specific Wilson lower bounds exceeds 0.5;
6. both Allied and Soviet faction-specific Wilson lower bounds exceed 0.5;
7. both participant-slot Wilson lower bounds exceed 0.5;
8. wins exceed losses in all nine countries, and at least seven country-specific
   Wilson lower bounds exceed 0.5; and
9. no country/start cell has more losses than wins, and at least 30 of 36 cells
   have more wins than losses.

No criterion may be weakened after outcomes.

## Decision boundary

On pass, the paper may claim reliable superiority to pinned Supalosa on the
balanced HFO distribution, subject to the stated runtime and endpoint. Proceed
to predeclared second-map and additional-opponent external-validity studies,
mechanism ablations, qualitative replay capture, and final uncertainty tables.

On failure, preserve the full result and return to prospective development;
do not write a positive superiority claim from favorable subsets. All V1 seeds
remain barred from any later confirmation.
