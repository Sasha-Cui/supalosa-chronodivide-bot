# Unified intent Gate 2 manifest wrapper failure

Date: 2026-09-09

## Disposition

Zero-update manifest job 25678716 failed before invoking the Gate 2 runner.
It wrote no execution file, initialized no game, and selected no case.

## Frozen attempt

- source: fec46f8211beca43074f6afbadfca4dfc908d2d0
- program SHA-256:
  80deeee5bbee6a3689c324f9ccc9c998d8a8e8abea5687c2f8cde2e65da0975d
- manifest Slurm SHA-256:
  428a238e1514140f6120fed47891252482cb519f37ca8ae87eea4a96930ad887
- job/account/partition: 25678716, pi_jss233/day
- state/exit: FAILED 1:0
- CPU/GPU/restarts: one/zero/zero
- node: c1102u05n02
- elapsed: four seconds
- stdout: empty
- stderr: 505 bytes

The empty execution-v1 directory contains no partial manifest or failure
artifact. The stderr is only Node's module-not-found error for a literal plus
argument.

## Cause

Patch transport consumed shell continuation backslashes and joined the next
diff lines, leaving literal plus separators in all three Node command lines.
Bash syntax validation could not detect the semantically valid but incorrect
arguments. Node therefore tried to execute a file named plus.

## Repair

Use one physical shell line for every Node invocation and add a literal-plus
regression check. Move the replacement to a fresh execution root. Do not
change the population, seed, runtime, trace, identity gate, or resources.
