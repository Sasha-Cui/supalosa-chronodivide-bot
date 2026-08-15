# Progress-certified V5 confirmatory technical-repair result, version 1

Status: **complete technical selection; no policy outcome inspected**

Completed: 2026-08-15 UTC

## Decision

The first sealed confirmation remains invalid in full and contributes no game
to the repaired analysis. The prospective repair protocol was executed without
relaxing its byte screen, deployment gate, replacement rule, or outcome-access
boundary. The resulting fresh-confirmation population contains 53 map families:
49 of the original 56 and all four reserve families that passed the frozen byte
screen.

This document records map eligibility only. It is not evidence that any V5 arm
beats Supalosa and does not authorize paper claims.

## Frozen reserve retrieval and byte screen

- reserve selection artifact SHA-256:
  `00cfe9cf5ead516c8cd34fea81a25448a9c5c27928ab6b6b3a2f8b0cf2d6bb6c`;
- frozen reserve population commitment:
  `551dc195e780101a4b51aa2908e102db9abd7118bb8414d6696389e8cebc4764`;
- retrieved objects: 70/70, each authenticated against its frozen source
  SHA-1;
- download-manifest SHA-256:
  `b4f633d68614b2f8da0ed5710f79447da6ca312f023099cbe73d85b932db401e`;
- downloaded-map commitment:
  `527118cd8f18a901df066b557ad29bb532f48db85f1ca7c55cf07be50af58712`;
- byte-screen SHA-256:
  `d33e9e9537041ac26db5e14eca8b03d2488360220276a5bba52ce206a41a7b75`;
- byte-screen result: 4 pass, 66 excluded; and
- passing-population commitment:
  `4f3ceef170756f9f1a53e3d3ea04b01a701c06fb6d870da9f0d647e294b6d9a1`.

Bouchet's resolver could not resolve `cncmaparchive.org`. Retrieval therefore
used curl's explicit TLS-host resolution override for `cncmaparchive.org` while
retaining the HTTPS hostname and validating every object against its
prospectively frozen source SHA-1. Commit `e5426c4` records this transport-only
repair. No candidate was skipped or substituted.

## Deployment campaign

Preflight job `22340769` completed `0:0` on account `pi_jss233`. It built the
source, passed six focused tests, verified clean pushed `main`, verified exact
external Supalosa commit `165b77a71d0cf5ebd27c65b19d0486bcbae78d0f`, and
froze:

- source commit: `82982f44d917590d764f9dba41d1593b759aceee`;
- campaign SHA-256:
  `25f2c5287ef5177a4eff25f1b2d1dd3111a9b3fd5e35a6be519998d3c14772bb`;
- 60-family candidate-population commitment:
  `10103e518580131bc8df95e188f16e77a535d5f8d9557b5a762c01cb6dc64072`;
- 540 family-country cells; and
- 1,080 exact-Supalosa-versus-exact-Supalosa technical games, two reciprocal
  orders per cell.

Smoke array `22340774` executed task zero only and completed `0:0`. Both sides
established at tick 63 in both reciprocal orders, physical starts swapped
exactly, and all five authenticated map reads matched. This smoke artifact is
not part of selection.

Full array `22340782` completed all 540 tasks once, each `0:0`, on account
`pi_jss233`. Finalizer `22341425` completed `0:0` and validated every scheduler,
campaign, map, runtime, start, establishment, diagnostic, and artifact
commitment without reading a winner, score, resource, policy action, or sealed
test outcome.

The final summary has SHA-256
`e9a6b6dd56b248f581a34e14ae92f6c164b82024a136c3756b98d7df7c5ac646`.
The selected 53-family population commitment is
`595c601817bc685996a293194fc6371ca37c63644a8284cf10ce2abbcff5facb`.

## Whole-family eligibility

Seven original families failed at least one country/order establishment cell
and were excluded in full:

- `mf_archive_09f37c66d32c7849`;
- `mf_archive_0d65da8719b4d184`;
- `mf_archive_28cfcf99ced03914`;
- `mf_fresh266f190627e9340b856282b749f36b13cf3dca27`;
- `mf_fresh64ad2c42f1bbe142dd53ed06be3fc01e1ab9abab`;
- `mf_freshc900f1b9d3c8c4bd193193850c6307ea90ba1ecb`; and
- `mf_freshe2c24f49c0fc814024587bb28105e21d523788f2`.

The new gate therefore identified one additional failure beyond the six visible
in the invalid confirmation incident. Across failed cells, the only recorded
failure classes were missing alpha or beta establishment in one or both
reciprocal orders. All four reserve byte-passes cleared all 18 country/order
executions and were appended in the frozen `(rankSha256, sourceSha1)` order.

## Recomputed design power

The immutable finalizer reports a labeled normal-approximation power of
`0.8893204499874044`. Before any repaired-confirmation execution, the primary
analysis's intended one-sample family-level *t* design was also recomputed at
53 families using R 4.4.2:

- degrees of freedom: 52;
- one-sided 95% critical value: `1.6746891537260253`;
- noncentrality at the frozen development effect and sample SD:
  `2.867775781164644`; and
- noncentral-*t* approximate power: `0.88204868194211761`.

The repaired confirmation must use the 53-family critical value and report the
reduced population transparently. It must not restore sample size by weakening
eligibility, revisiting reserve outcomes, or adding a new source.

## Authorization and next step

The complete 53-family population may now be used for one entirely fresh V5
confirmation: three unchanged arms, all nine countries, both reciprocal slots,
new engine seeds, and exclusive output roots. Every old launch—including the
2,700 individually valid games in array `22312734` and smoke array `22340774`—is
excluded. A new technical controller must require both endpoints established in
every one of the 2,862 fresh games before authorizing one complete unblinding.
