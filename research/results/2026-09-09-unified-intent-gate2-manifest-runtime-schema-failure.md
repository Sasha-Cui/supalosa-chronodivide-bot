# Unified intent Gate 2 manifest runtime-schema failure

Date: 2026-09-09

## Disposition

Replacement zero-update manifest job 25684187 failed during runtime
verification, before simulator initialization. It wrote no execution file and
initialized no game.

## Frozen attempt

- source: 94d1244798bc06cebe54e6955df4388c0e7fa2bc
- program SHA-256:
  d11d2d88a27e198e1381d5ff208212b5eff788f8251171f3ce6161dab8912250
- manifest Slurm SHA-256:
  815ea67074bc70c07924271c7aa25c8f56e3efb5df5a5b97ff4c6d3a874e471f
- Amendment A6 SHA-256:
  b7c3cdd74987f3c4c914769c8aba318b6384318398a2bc8e46267d431988375b
- job/account/partition: 25684187, pi_jss233/day
- state/exit: FAILED 1:0
- CPU/GPU/restarts: one/zero/zero
- node: c1106u03n02
- elapsed: 14 seconds
- stdout: empty
- stderr: 723 bytes

The fresh execution directory is empty.

## Cause

The pinned runtime-freeze asset entries have schema {name, sha256}. The new
runner incorrectly expected {relativePath, bytes, sha256}. Joining an
undefined relativePath threw before cdapi initialization.

## Repair

Validate the actual frozen asset schema, require entry count to equal the
frozen count, join each entry.name to the frozen root, and rehash every asset.
Bind the updated program and all Slurm stages in a new execution root. Do not
change any scientific case or trace rule.
