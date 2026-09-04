# Fresh dual-endpoint compressed-canary amendment A2

Status: prospectively frozen before any compressed-canary repair run.

## Reason for the amendment

The first noninterference canary chain (array 24728660, finalizer 24728661)
completed all four prescribed reference/dual pairs and proved exact normalized
public-world and public-action hashes over 6,000 updates. Its aggregate SHA-256
is a4e9d38a91dfb9840e30041be52b83b65b564fd3d91ba06292346ad0b8107a52.

However, those eight technical games wrote JSON summaries only. They did not
write or validate a compressed trace. The frozen parent protocol explicitly
requires valid compressed output before competitive scaling. Therefore the
aggregate field `competitiveRunAuthorized=true` is insufficient and must not
be used to launch the 2,700 competitive games.

This is a technical protocol-compliance repair, not a policy or outcome repair.
No competitive endpoint from the first canaries was serialized or inspected.

## Unchanged scope and cases

Rerun all four original technical configurations, not a favorable subset:

1. deployed StrongBot / pinned Supalosa on HFO LE;
2. strategy_both / pinned Supalosa on Peak;
3. deployed StrongBot / RA2Web Advanced on HFO LE; and
4. external Supalosa / RA2Web Advanced on HFO LE.

For each configuration run the v5-reference and passive-dual variants
sequentially in one worker, for exactly 6,000 updates. Retain the original
Americans country, candidate slot 0, maps, starts, policies, opponents, and
canary seeds 3769000000 through 3769000003. Reusing these outcome-blind
technical seeds directly tests whether adding the trace writer preserves the
already observed deterministic trajectory; no competitive result is generated,
ranked, selected, or exposed.

The original runtime/policy freeze remains the immutable policy input. A new
source manifest must additionally hash the trace writer, amended canary runner,
this amendment, scheduler script, and prior canary aggregate.

## Compressed trace

Each physical run writes an exclusive gzip JSONL stream with no mode label and
no endpoint result. The reference and dual stream schemas are therefore
identical. Record only:

- a technical header binding the common map, country, starts, slot, and seed;
- one record for each of 6,001 public-world observations, containing the
  sequential observation index, update, and SHA-256 of the exact normalized
  public-world snapshot already used by the trajectory audit; and
- one technical final record containing update/snapshot counts, the public
  world-trajectory hash, public-action hash/count/method counts, bounded
  zero-health-target diagnostic summary, and symmetric quit audit.

Do not include W/D/L, score, endpoint winner/status, defeated side, terminal
building count, or competitive ranking. Recursively reject such keys from both
JSON summaries and decompressed records.

The writer must be streaming and bounded-memory, use exclusive file creation,
end with a newline, and record compressed/plain SHA-256, byte counts, record
count, and encoding. A separate streaming verifier must independently
decompress every file and validate all metadata and schema fields.

## Exact pass conditions

All eight runs and the fail-closed finalizer must complete under
`pi_jss233` CPU `day`, with zero restarts and unique task IDs. For every
configuration require:

- exactly 6,000 updates and 6,001 world observations in both modes;
- exact reference/dual public-world trajectory hashes;
- exact reference/dual public-action hashes, counts, per-method counts, and
  bounded corpse-target summaries;
- exact reference/dual quit audits and zero forwarded resignations;
- exact reference/dual compressed-stream plain SHA-256 and gzip SHA-256;
- exact trace record, byte, newline, schema, context, and completion checks;
- exact frozen policy/runtime/map/start/seed identities; and
- no prohibited competitive field at any depth.

The gzip hashes are required to match because the same Node/zlib build and
record bytes are frozen. A mismatch fails closed even if decompressed bytes
match.

Only a complete passing amended aggregate may set a new competitive launch
authorization. Failure preserves every artifact and requires prospective
diagnosis; it cannot be repaired by dropping a pair, weakening equality, or
inspecting endpoints. No competitive game may launch before this amendment
passes.
