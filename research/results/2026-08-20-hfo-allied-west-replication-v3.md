# HFO Allied west winner replication V3 result

Status: **complete; replication passed**

## Identities

- Zero-update selector: job `22793192`, 190 initialized games, 50 selected
  cases, selection SHA-256
  `6bdb6eeb658391d181e98a6b472b872d3305c2f915378d4e3686ea1517a84a80`.
- Gameplay array: `22793528`, 100/100 tasks completed `0:0` under
  `pi_jss233`, with no retries or replacements.
- Finalizer: `22793529`, completed `0:0` with empty stderr.
- Aggregate SHA-256:
  `81ae77c4fd6691fe05d278c7621ba50a94c6502b0164f75b9557061c91bfee26`.
- Source commit: `77b47bcba969c2000aec5b16800cd3b96e04fa42`.
- Protocol SHA-256:
  `86ceb8fd18d1b9cd058ffffc2988c03b8397ef044dd72097a4a7e998882a8123`.

## Primary result

| Arm | W | D | L | Win rate | Loss rate | One-sided 95% Wilson lower |
|---|---:|---:|---:|---:|---:|---:|
| Default | 1 | 11 | 38 | 2% | 76% | 0.45% |
| Conditional winner | 47 | 2 | 1 | 94% | 2% | 85.91% |

The paired winner-minus-default W/D/L score difference was `+0.83`; its
one-sided 95% paired t lower bound was `+0.76393` over 50 cases. The winner
improved 48 cases, tied two, and worsened none.

## Country strata

| Country | W | D | L | One-sided 95% Wilson lower |
|---|---:|---:|---:|---:|
| USA | 9 | 1 | 0 | 65.23% |
| Korea | 9 | 0 | 1 | 65.23% |
| France | 9 | 1 | 0 | 65.23% |
| Germany | 10 | 0 | 0 | 78.71% |
| Great Britain | 10 | 0 | 0 | 78.71% |

Every preregistered criterion passed: wins exceeded losses overall and in all
five countries, the overall Wilson lower bound exceeded one half, the paired-t
lower bound exceeded zero, and winner loss rate was below default.

## Interpretation and boundary

Across V2 and V3, the conditional group-hold policy is 64W/3D/3L on 70 fresh
Allied-west cases. This is strong development replication, not final paper
confirmation. The candidate is still opt-in and current default behavior is
unchanged.

The next required step is an outcome-blind activation-isolation gate over all
nine countries and four HFO starts. Only after the winner differs for Allied
west and is exactly inert everywhere else may it be enabled by default and
frozen for all-country/all-start confirmation.
