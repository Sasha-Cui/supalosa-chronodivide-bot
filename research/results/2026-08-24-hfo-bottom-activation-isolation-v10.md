# HFO bottom activation-isolation V10 result

Status: **complete; activation isolation passed**

## Identities

- Zero-update selector: job `23403036`, 99 initialized games, 36 selected
  country/start cells, selection SHA-256
  `aca2f460e001d68fbf822cda0341930d1dd89486da2955cb98d91b7fbbbb4faf`.
- Trace array: `23403479`, 36/36 cells completed `0:0` under
  `pi_jss233`; no retries or replacements.
- Failure-preserving finalizer: job `23403555`, completed `0:0`.
- Aggregate SHA-256:
  `f70cfd50dc57f3e42a4244d58783b51b3cb5f571cf20f370bd882f6d6538fb07`.
- Source commit:
  `768b2872df8b8115b9791eac3aa7b34ff70d337c`.
- Program and cell-program SHA-256:
  `afdfcf80bb4126ea71935c39fae62175ffeedb3441919ea11d2c07e322df6a9c`.
- Protocol SHA-256:
  `7ac13e5bd4576566b9ab18d4992041203fabab334bf41500c12db6c6a84be7ff`.

## Activation matrix

All nine expected-active bottom cells passed:

- disabled activation flag remained false;
- exposure-enabled activation flag became true; and
- disabled and enabled action hashes differed.

All 27 expected-inactive cells passed exact equality for normalized candidate
actions, own-state and production snapshots, observed ticks, engine-finished
state, and quit-suppression counts. The enabled activation flag remained false
in every inactive cell.

Coverage included all nine countries at west, east, top, and bottom. The
aggregate status is
`PASS_HFO_BOTTOM_RETARGET_ACTIVATION_ISOLATION`.

## Decision and boundary

V8 supplies large outcome evidence for the exact 1,200-tick progress-gated
policy. V10 supplies outcome-free technical evidence that the controller is
active only at HFO bottom and bit-for-bit inert at all other HFO starts.

Together they authorize enabling the exact V8 configuration by default while
retaining explicit off controls. This gate does not replace fresh
all-country/all-start outcome confirmation.
