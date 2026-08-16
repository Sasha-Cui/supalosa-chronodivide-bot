# Finish-advantage implementation staging manifest, version 19 overlay

Status: staged outside the tracked checkout while repaired sealed V5
confirmation array `22341679`, dependent technical gate `22342013`, and
authorized unblinder `22342015` remain active or dependency-blocked.

Recorded: 2026-08-15 (America/New_York)

## Purpose and boundary

This immutable overlay applies on top of the complete version-18 staging
manifest. It makes the author's absolute reliable-win and low-stalemate
requirements executable before any finish-advantage competitive outcome is
generated. It does not change the active V5 policy, jobs, population, analyzer,
or claims.

- V18 base manifest SHA-256:
  `3a4f2c655ba1ef6e6bf575eeb827ea607626b6a8426e9060865f56a029ef7ae4`
- open causal-screen amendment 5 SHA-256:
  `2ab1a790e5652d6465cfcb926ae6ad3c0b775ebd684e6bb60e978946d159cfda`
- confirmatory-design amendment 1 SHA-256:
  `3448b1ac38a47768d0f66594dd187560478227e43dfc17e8ab87479d53d5a2f6`

## Executable changes

The open-development analyzer now retains a `nonterminalDraw` indicator in
every exact family-country-slot outcome row and computes equal-family-weighted:

- literal-win, total-draw, and nonterminal-draw rates;
- family, country, faction, and reciprocal-slot rate tables;
- family-cluster standard deviations and standard errors;
- the one-sided 80% literal-win lower bound; and
- the one-sided 80% draw upper bound.

Candidate eligibility retains every V18 comparative/mechanism requirement and
adds the strict conjunction:

1. literal-win lower bound greater than `0.50`;
2. draw upper bound less than `0.25`; and
3. nonterminal-draw point rate less than `0.10`.

The finalizer derives nonterminal draws only from
`engine_nonliteral_termination_draw` and `tick_cap_draw`, exposes absolute rate
summaries for every arm, and passes the indicator into the selector. A
simultaneous physical-elimination draw remains a total draw but is not a
nonterminal draw.

## File commitments

| File | SHA-256 |
|---|---|
| `finishAdvantageOpenCausalScreenAnalysis.ts` | `4ae688d361fc0def7c542ae05828cfecd519864a66598ac56d89baa89012a731` |
| `finishAdvantageOpenCausalScreenAnalysis.test.ts` | `91c682fd615055702f6e3a99356533b1a71c6ad0e39d71aae3335fcbc93793dd` |
| `finishAdvantageOpenCausalScreenFinalizer.ts` | `4edf5f7096fa4c57764ec1ac00886aca0b4927c900d1531c73b0b967061a1cd4` |

All other eventual integration files remain exactly as committed by V18.

## Verification

In an isolated 5.2 MiB copy of the staged TypeScript mirror, with no tracked
checkout mutation:

- strict TypeScript checking passed for the changed analyzer and finalizer plus
  their imported dependency closure under `target ES2022`, `module NodeNext`,
  and `moduleResolution NodeNext`;
- Vitest 4.1.10 passed the changed analyzer and existing finalizer suites:
  two files, 16 tests, zero failures; and
- the new adversarial tests prove that an arm can satisfy the prior relative
  improvement gates yet remain ineligible because it draws too often, that
  equality at the 50% win gate fails, and that equality at the 10%
  nonterminal-draw gate fails.

These checks authorize later integration testing only after the active sealed
chain is terminal. They do not authorize a competitive launch or paper claim.
