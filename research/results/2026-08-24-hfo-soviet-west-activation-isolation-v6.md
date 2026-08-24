# HFO Soviet-west activation-isolation V6 result

Status: **complete; passed**

## Identities

- Zero-update selector: job `23422186`, 101 initialized games, 36 selected
  country/start cells, selection SHA-256
  `a132740568eb68b0f64b705220c97d6a355ecbaf08bd3f6a77bc3c5d9b4918e1`.
- Trace array: `23422247`, 36/36 tasks completed `0:0` under `pi_jss233`.
- Finalizer: `23422248`, completed `0:0`.
- Aggregate SHA-256:
  `73193b343c97abb98d38e97db7b5e7873193fa1c0c9766060d955ef99e07bdcf`.
- Source commit:
  `7daf1b17c4b25b447e87179ff1da099c4b55c563`.
- Program SHA-256:
  `63ccbb5b4371e23bc34bea8688786c81514f2cc3f22acfde989c28737c3343c3`.
- Protocol SHA-256:
  `123b63b9bd8d6e80b6ffc2fc5277568821527a24fda93bc781e198ab9ee7b75b`.
- Asset-manifest SHA-256:
  `d942117f24363818977d573dbc87006a9b320c6861bddf939d5fc80db2217e67`.

## Activation matrix

All four expected Soviet-west cells had different default/winner action
hashes, different state-and-production snapshot hashes, and nonzero winner
guard-anchor orders:

| Country | Action differs | Snapshot differs | Winner guard-anchor orders |
|---|---|---|---:|
| Libya | Yes | Yes | 5,628 |
| Iraq | Yes | Yes | 11,742 |
| Cuba | Yes | Yes | 5,628 |
| Russia | Yes | Yes | 5,628 |

All 32 expected inactive cells passed exact equality for:

- normalized candidate action hash;
- normalized own-state and production snapshot hash;
- observed ticks and engine-finished flag;
- suppressed candidate/baseline resignation counts; and
- default/winner guard-anchor order count.

Inactive coverage included every country at east, top, and bottom, plus all
five Allied countries at west. The Allied-west controls retained the already
deployed guard with equal counts in both arms: 12,332 for USA, Korea, Germany,
and Great Britain, and 9,461 for France.

## Conclusion and boundary

The opt-in winner has the intended runtime boundary: both the conditional rush
strategy profile and Soviet guard permission alter behavior only for exact HFO
Soviet west-versus-east games. This technical evidence authorizes enabling the
profile and guard permission in deployed defaults while retaining explicit off
controls.

The gate contains no W/D/L or terminal-building outcome and therefore does not
replace fresh performance confirmation. After deployment, the complete bot
must be frozen and evaluated on outcome-sealed seeds spanning all nine
countries, all four starts, and reciprocal participant slots. All development,
replication, and isolation seeds remain barred from that confirmation.
