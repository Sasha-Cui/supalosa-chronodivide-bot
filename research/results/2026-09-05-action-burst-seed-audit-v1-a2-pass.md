# Action-burst diagnostic V1 A2 seed selection pass

Date: 2026-09-05

## Decision

The deterministic A2 retained-metadata audit passes. It selects the first
collision-free interval in the frozen order:

[
3{,}010{,}000{,}000 leq mathrm{seed} < 3{,}011{,}000{,}000.
]

The signed-int32-equivalent interval is:

[
-1{,}284{,}967{,}296 leq mathrm{seed}_{32}
< -1{,}283{,}967{,}296.
]

This authorizes outcome-blind manifest generation and technical traces under
the parent protocol and Amendments A1/A2. It does not authorize a competitive
outcome or establish policy performance.

## Identities

- Slurm job: `24946861`
- scheduler state: `COMPLETED 0:0`
- account/partition: `pi_jss233/day`
- CPUs/GPUs: one/zero
- source:
  `7d1779eba7c5248d9170d006fe88c0efd64bbd98`
- program SHA-256:
  `5f17a8edc679a25ffa7d6cb74967e25ca66b47a29e36d3fa2aeb250cc5b36bea`
- parent protocol SHA-256:
  `a07abda852b03a3904e364235dd50672aa9885fdf1062c7e1865e0695dc636b7`
- Amendment A1 SHA-256:
  `def1d7cab6fe8c31878e67b6f28c6670c6047575b85cb2d648dac939514ba549`
- Amendment A2 SHA-256:
  `608fa26b0c2e6502567eb49769d5c04734197b9dd44fb9df4857d5167dad0a9e`
- audit artifact SHA-256:
  `ac9c2100702750270e4bc9df311fbdff62aca29a933687e44d16d18f7318a231`
- audit artifact bytes: 537,547,172

The completion marker and sidecar match. Inner stderr is empty.

## Coverage

The audit scanned:

- 1,811,152 retained text-like files;
- 13,717,433,802 bytes;
- decimal, grouped, underscored, hexadecimal, and signed-int32-equivalent
  integer tokens; and
- explicit array/object seed range declarations.

There were zero read/mutation errors. The audit evaluated all 26 frozen
candidate intervals in one pass. Twelve candidates had zero retained token or
declared-range collision; fourteen had one or more collision records. The
first candidate alone is selected. Later clean candidates remain unselected
and unreserved.

The two earlier failed intervals remain barred:

- the parent range collided with mission-native-closeout V14; and
- the A1 range collided with mission-native-closeout V4.

## Derived diagnostic seeds

Let (i) be map ordinal. Use:

- pinned-Supalosa map block:
  `3,010,000,000 + 1,000*i`;
- Advanced HFO map block:
  `3,010,100,000 + 1,000*i`; and
- within a block:
  `100*countryOrdinal + 10*candidateStartOrdinal + replicateOrdinal`.

Reciprocal participant slots share the same engine seed. The complete
opponent/map/country/start/slot/replicate tuple remains unique.

## Limitations

This is a retained lexical audit, not proof over all possible historical
storage. Dependency, asset, binary, compressed, credential-named,
symlink-target, inaccessible, and off-tree archive bytes were excluded and
remain listed in the artifact. Numeric tokens were inspected without parsing
or interpreting competitive outcomes.

## Advancement

Implement the exact 1,717-trace, 3,600-update action diagnostic. Before the
full array, require:

1. exact static manifest coverage and seed derivation;
2. full 15-method/two-side wrapper tests;
3. recursive prohibited-field tests;
4. deterministic rolling-window and duplicate-summary tests;
5. one preserved outcome-blind smoke; and
6. clean synchronized source/runtime identities.

No W/D/L, score, endpoint, defeated state, game-finish orientation, terminal
building count, or policy ranking may be generated.
