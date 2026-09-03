# Fresh dual-endpoint study: seed namespace amendment A1

Status: prospectively frozen before selector initialization, canaries, or
competitive outcomes. Only the proposed seed namespace changes. Preserve the
original protocol and this amendment together.

## Collision caught before launch

The initial 3300000000 base overlaps the existing
METHOD_V3_STAGE2_ENGINE_SEED_BASE in
packages/chronodivide-bot-driver/src/training/methodV3Stage2Schedule.ts.
Its declared optimizer-run and stage strides also occupy part of the proposed
study namespace. Existing or reserved families must not be reused, whether
or not a particular case has been played.

No new study game, canary or selector initialization used the conflicting
namespace. This is a prelaunch reservation correction, not a response to
competitive results.

## Replacement proposal

Replace the original proposed range with 3765000000 through 3769999999:

- Central HFO: 3765000000.
- Peak: 3766000000.
- Transfer: 3767000000 plus mapIndex*10000.
- Advanced: 3768000000.
- Compatibility canaries: 3769000000..3769000003.

All case enumeration, paired-slot/arm seeds, 2160 unique configurations,
2700 competitive games, eight canary runs, map assignments, policies,
opponents, uncertainty and decision gates remain unchanged. No old outcome
is inspected or reclassified for this correction.

A preliminary protocol/TypeScript-source scan found no direct references in
the replacement range. Nearby declared 3730M, 3740M and 3745M bases were
inspected; their small indexed schedules do not reach the proposed range.
The next known terminal-objective campaign begins at 3770M. These observations
are NOT the complete required reservation audit.

Before any initialization, complete the metadata-only manifest/reservation
audit for the exact planned seed set, record source files/ranges and coverage
exclusions, and fail closed on unresolved overlap. Do not treat this
preliminary source scan as proof of universal historical freshness. Do not
read sealed competitive outcomes, archives or unlisted private locations to
complete the audit. Any further collision requires another explicit
pre-outcome amendment.
