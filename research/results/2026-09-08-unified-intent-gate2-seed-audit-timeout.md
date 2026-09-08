# Unified intent Gate 2 seed audit timeout

Date: 2026-09-08

## Disposition

Zero-game seed audit 25323885 reached its six-hour Slurm limit before
finishing. It produced no seed-audit JSON, checksum, or completion marker.
No seed was selected and no game was initialized.

The empty internal stdout and stderr files show that the process was still
inside its complete scan when Slurm stopped it. The only diagnostic message
was the scheduler time-limit cancellation in the preflight stderr.

## Frozen attempt

- source: 723769ea67b7dc60e9294e23981afd7013538ae1
- program SHA-256:
  3bf87d0bfe9140402be25130fb0c6a4925f1dd6ad6388738cf70db637cf06160
- Slurm SHA-256:
  e2689b38a198e069f034f602baf951baf3570ae11ee82394dd2687eeace92cff
- Gate 2 protocol SHA-256:
  e673fde0577cb82b18be98a5ffbc102621a67db56918dec3d656c1477314786e
- Amendment A1 SHA-256:
  74ccb56177a45a5937cd61688f7297d54eed63214e187e080d422bdabc825ac1
- account/partition: pi_jss233/day
- CPU/GPU: one/zero
- node: c1102u05n02
- state: TIMEOUT
- allocation exit: 0:0
- batch step: CANCELLED 0:15
- elapsed: 06:00:11
- total CPU: 05:16:26
- maximum RSS: 8,387,004 KiB
- maximum disk read: 13,741.36 MiB
- restarts: zero

The failed root contains only four logs: two empty internal logs, an empty
preflight stdout, and the 120-byte Slurm cancellation stderr. It contains no
partial scientific artifact.

## Diagnosis

The scanner reused a general numeric-token expression and materialized a
dictionary for every scanned file before writing. The retained corpus contains
many small numeric values, so the general matcher performed unnecessary Python
work even though only 20 narrow billion-scale intervals mattered. The complete
file ledger also drove memory close to the eight-GiB request.

## Repair boundary

Preserve seed-audit-v1 unchanged. A prospective amendment may use an
interval-equivalent coarse matcher that emits only long positive-three-billion,
long negative, hexadecimal, and declared-range candidates before exact
integer/range validation. It may stream the complete file ledger instead of
holding it in memory. It must still rescan every eligible retained file,
decompress gzip text, assess all 20 intervals, bind every file hash, and
select only the first zero-collision candidate. Use a new output root.
