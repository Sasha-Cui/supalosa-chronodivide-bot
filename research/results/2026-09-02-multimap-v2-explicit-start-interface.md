# Multi-map V2 explicit-start interface: complete technical pass

This is an evaluation-interface result, not evidence of policy strength.
Single CPU Slurm job `24565842` completed `0:0` under `pi_jss233`.
The complete marker and both checksum files were independently verified
before either artifact was interpreted.

## Frozen provenance

- Source: `24cfe6d000d60aac276b0578dc1d763347dcec9d`.
- Smoke program: `a7444f5b4e9d4bea2ff6292a9985dec037e6ec34914eeb42253e3af942922f44`.
- Amendment: `1d2d193d452d1dbf024be0466fa29387cb461c3a08329ee1969b06d6c2eb8a40`.
- Loader: `9cd22887ab3ae3206b0c6cb8d91a15593dd2a2dd073ad36d9b5b9827dac46cac`.
- Transform: `d36371064697371a53ecece243ddc086db1b481d210d84c549dcd5d0eb9ea32a`.
- Installed game-api: `dd398f5c8c2b4c3e3d6eb0f9ca6d7549bf70fee16c5950cd8902616ac922497d`.
- Effective loader runtime: `4ad4a5dd7a6a8ae53a7e671a29d7dd0a5fbad1916d94e52c69c9eda133a30f0c`.
- Reference artifact: `dc79e9bcd0c07556b1d373430aa374c582413002dfe08dadac2f704cd9bd5c58`.
- Compatibility artifact: `51ab624f2e8aa7a094bff51d1fe675298c1eb30b8c72672dfefb041df3cdd752`.

Artifacts reside in
`research-evidence/multimap-v2/explicit-start-amendment-1-smoke`.
The reference and compatibility JSON files are complete technical artifacts.
No individual or partial task output was inspected.

## Verified checks

Across the 13 unchanged map files:

- 26 unmodified reference initializations (USA, both slots per map).
- 26 loader/no-override repetitions exactly matching reference hashes.
- 26 explicit assignments matching the naturally selected starts, also
  exactly matching reference initial/one-update state and action hashes.
- 372 directed-pair/slot cases, each repeated twice: 744 initializations.
- 234 country/slot cases across all nine countries, each repeated twice:
  468 initializations.

Total: 26 reference + 1,264 loader = **1,290 initializations**, each stopped
after exactly one update. Requested coordinates matched actual coordinates.
Both participant views and action hashes were deterministic. No resignation
was forwarded. All 13 map hashes and start counts matched the frozen inventory.
A recursive audit found no prohibited competitive field.

The loader preserves the installed game-api file and maps. Its effective
runtime is explicitly different and must be identified in future evaluation
manifests. Passing one-update tests does not establish full-game equivalence
for arbitrary newly forced start pairs; those are intentionally a broader
evaluation population, not a stock-random-spawn replication.

## Next gate

The old random-start selector remains failed and must not be advanced.
Rebuild the entire 4,068-case technical selector in a new evidence directory,
with fresh frozen seed blocks and a historical recorded-seed audit. Do not mix
old and new runtime identities or reinterpret the earlier five completed maps
as a full-suite pass.

Competitive screening remains gated on that full selector and its outcome-blind
coverage audit. HFO LE and Peak remain separate historical results, and V8
remains closed negative.
