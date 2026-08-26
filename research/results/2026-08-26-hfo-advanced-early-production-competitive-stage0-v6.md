# HFO RA2Web-Advanced early-production competitive V6 Stage-0 result

Status: **complete; no eligible survivor and no validation/replication**

## Identities and complete coverage

- Zero-update master selector: job `23706051`, 1,857 initialized games, 468
  selected cases, selection SHA-256
  `9e2945997fe49d8f8677acc8287b416408f19e2a4175bd7ff2a53e86fc5b8402`.
- Selection populations were exact and mutually unique: 36 west-development,
  72 balanced-validation, and 360 final-replication cases. Validation and
  replication remain unused.
- Preserved no-op smoke: job `23712569`, technically clean; no strength
  inference was made.
- Stage-0 array: `23712723`, 216/216 tasks completed `0:0` under
  `pi_jss233`; no retry, replacement, exclusion, or partial-outcome inspection
  occurred.
- Fail-closed finalizer: `23712724`, completed `0:0` after the full array.
- Aggregate SHA-256:
  `dd11fe53ddb23ed445830ae79e48da9a8e8406c40220b211f7ebcfa9317d1318`.
- Source commit:
  `b337fc2d124cd681ea65ff6bd81293e6e742a5f4`.
- Program SHA-256:
  `6436559c9f496e333a34c90a019bf3cd9dfa111bf977b96ce99f7526f659031e`.
- Protocol SHA-256:
  `d87be8557ff3d48997f18b0cbb0d222f2004e1313b78809e777a279fd4c363db`.
- Asset-manifest SHA-256:
  `d942117f24363818977d573dbc87006a9b320c6861bddf939d5fc80db2217e67`.
- Pinned Supalosa commit:
  `165b77a71d0cf5ebd27c65b19d0486bcbae78d0f`.
- RA2Web client commit/release:
  `218fb800614295119e25040986b175fee4c3670f`,
  `0.84.1-r1d35349-dd6a17b9c`.
- RA2Web Advanced bundle/freeze-manifest SHA-256:
  `81d8797b6dd1371ba2dcbd79e25df8b42254290c820159e121a82650fd97a143`,
  `a405c0fc6d1d6541f965582c9b53be0bfd01c0c68f4d0f340e1a5ae37671aa5d`.

All 216 cell checksums and scheduler IDs passed. Every arm contains the exact
36 fresh west country/slot cases and literal endpoint evidence.

## Frozen arm results

The no-op control was 0W/0D/36L. Paired score uses W=1/D=0.5/L=0 on the
identical case and the frozen one-sided 90% lower bound.

| Arm | W/D/L | Win | Paired mean | Paired lower | Improved/tied/worsened | Eligible |
|---|---:|---:|---:|---:|---:|---|
| Infantry rush | 2/5/29 | 5.56% | +0.1250 | +0.0647 | 7/29/0 | No |
| Tank rush | 4/1/31 | 11.11% | +0.1250 | +0.0543 | 5/31/0 | No |
| Dual rush | 2/3/31 | 5.56% | +0.0972 | +0.0401 | 5/31/0 | No |
| Tank production only | 2/2/32 | 5.56% | +0.0833 | +0.0281 | 4/32/0 | No |
| Vehicle assault | 0/1/35 | 0% | +0.0139 | -0.0043 | 1/35/0 | No |

Four profiles robustly improved paired score over a control that lost every
case, but none approached a positive absolute west record. The finalizer's
descriptive ranking was infantry rush, tank rush, dual rush, tank-production
only, and vehicle assault; no arm passed the frozen advancement rule.

## Safety structure

The gains were narrow rather than broad:

- infantry rush produced all of its improvements in Soviet cases: Allied
  0/0/20, Soviet 2/5/9;
- tank rush produced all wins in Allied cases: Allied 4/1/15, Soviet 0/0/16;
- dual rush was Allied 0/0/20 and Soviet 2/3/11;
- tank production only was Allied 2/1/17 and Soviet 0/1/15; and
- vehicle assault was Allied 0/0/20 and Soviet 0/1/15.

No profile had wins exceed losses in either slot. At most one country was
strictly positive for any profile, and most countries remained 0/0/4. Thus a
positive paired average cannot be reinterpreted as a robust specialist.

The side complementarity between infantry and tank profiles is descriptive
post-development evidence. It cannot authorize a post-hoc country router or a
new arm on these cases.

## Interpretation

The complete V4--V6 sequence identifies the boundary precisely:

1. StrongBot's HFO policy reliably dominates pinned Supalosa but does not
   transfer to Advanced.
2. Pinned Supalosa itself is competitive against Advanced outside west and can
   be decorated exactly.
3. Map-profile removal and order-only overlays do not repair west.
4. Early production changes force composition and convert some certain losses
   into draws or wins.
5. The tested production/attack profiles remain decisively losing at west
   across countries and slots.

This is a complete negative cross-opponent development result, not missing
power near an advancement threshold. No V6 validation or replication claim is
permitted.

## Consequence

Competitive V6 is closed. The 72 validation and 360 replication cases remain
sealed and unused because Stage 0 produced no eligible survivor. Do not weaken
the gates, revive a rejected arm, combine side-specific arms post hoc, or run a
new Advanced endpoint before a substantively different prospective method.

The empirical program now prioritizes the predeclared positive second-map
direction on Peak of Perfection. The central Supalosa result remains unchanged:
633W/24D/63L on balanced HFO confirmation.
