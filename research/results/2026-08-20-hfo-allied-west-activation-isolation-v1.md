# HFO Allied west activation-isolation V1 result

Status: **complete; passed**

## Identities

- Zero-update selector: job `22794802`, 97 initialized games, 36 selected
  country/start cells, selection SHA-256
  `d5d581dfc87b72a72ff473b3cbc0b4fc3a240f0bab00180c1c45131be5ccab7b`.
- Trace array: `22795099`, 36/36 tasks completed `0:0` under `pi_jss233`.
- Finalizer: `22795100`, completed `0:0` with empty stderr.
- Aggregate SHA-256:
  `a4483fa3487e8da0917a19713502229b9d6449f9d3f9b741b04d540d74353820`.
- Source commit: `7f841a94929a40b94af6d6741c16ca40c523cbf2`.
- Protocol SHA-256:
  `30b8de329f97f168d517878f846bf91f4a853247ec8c2671443301df4ce99d16`.
- Program SHA-256:
  `8039cfa22c753c070691b69588ff9ecca98bbaefda10ded6dd91fe73f3652f66`.

## Activation matrix

All five expected active cells—USA, Korea, France, Germany, and Great Britain
at west `39,82` versus east `151,119`—had different default/winner action
hashes and nonzero guard-anchor orders. Winner guard-anchor order counts were
9,461 for four countries and 12,332 for France.

All 31 expected inactive cells passed exact equality for:

- normalized candidate action hash;
- normalized own-state and production snapshot hash;
- observed ticks and engine-finished flag; and
- suppressed candidate/baseline resignation counts.

Inactive coverage comprised all nine countries at east, top, and bottom plus
Libya, Iraq, Cuba, and Russia at west. Every inactive winner trace had zero
guard-anchor orders.

## Conclusion and boundary

The optional winner has the intended runtime boundary: both the conditional
`rush` production profile and group guard activate only for exact HFO Allied
west-versus-east games. This technical evidence authorizes enabling the profile
and guard in deployed defaults while retaining explicit off controls.

The gate contains no W/D/L or terminal-building outcome. It does not replace
fresh all-country confirmation. Before that confirmation, the draw-heavy HFO
bottom start remains an open development target.
