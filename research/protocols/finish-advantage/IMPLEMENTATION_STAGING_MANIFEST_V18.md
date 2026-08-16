# Finish-advantage implementation staging manifest, version 18

Status: staged outside the tracked checkout while sealed V5 confirmation array
`22312734` and dependent technical gate/unblinder `22312776`/`22312779`
remain active.

Recorded: 2026-08-15 (America/New_York)

Version 18 prospectively implements the literal-endpoint terminal base-race
rule frozen before any V5 or finish-advantage outcome was accessed. It
supersedes version 17 for eventual integration; versions 1 through 17 remain
preserved as prior records. No file in this staging version has been copied to
the tracked checkout.

## Source and evidence boundary

- tracked repository: `/nfs/roberts/project/pi_jss233/zc362/chrono_divide/strong-chronodivide-bot`
- required branch: `main`
- frozen active source and `fork/main`: `d6b7190e77f4ad730f37ac43e0e0b0ceaf6f5ff6`
- staging root: `/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/finish-advantage/implementation-staging-v1`
- tactical doctrine amendment 5 SHA-256: `25b966692ac190e8bbce00906ac9877bb35911ab14c523759e0721928abcf46a`
- tactical doctrine amendment 6 SHA-256: `60577491c1e11dc0938ce6d01bea38458f62e464159f22bff66652c22889fd64`
- composite technical-gate amendment 4 SHA-256: `17dd858768cd5ae3030176574d74575281fa5b2ad5fad65a79db9a32394ea72a`
- open causal-screen amendment 4 SHA-256: `d66ef1e3753a31b87fd028e4f215ad40003651933ae93f83637aa91936bf4da6`
- consolidated process lessons V4 SHA-256: `eddd9ad6a3a967d72becfdf1ce11f009cd6fcc6357ad5df528b31cd9a51104ab`
- literal win remains physical destruction of every enemy building; no
  resignation, score proxy, or short-game survival condition is introduced.

## Prospective terminal base-race rule

`terminalBaseRaceGuard.ts` adds exactly two explicit modes:

1. `legacy_v5_ignore_own_base_loss`, which returns the frozen V5 decision
   unchanged and emits no new telemetry fields; and
2. `strict_literal_endpoint_base_race`, which keeps attacking the final enemy
   building when the complete objective mission wins first, but temporarily
   selects only the identified causal base-race threats when our own final
   building would reach zero no later than the objective plus the frozen safety
   margin.

The strict mode treats an unknown blocker-then-building completion time as a
lost race, sorts and validates exact threat identifiers, fails closed on
inconsistent deadlines, and returns immediately to the building after the
threat disappears. A dual-purpose unit that is both route blocker and base
threat is handled by one base-defense mission. Off-route forces remain ignored
when they cannot beat the building strike.

If a special weapon threatening the sole surviving friendly building cannot be
calibrated, strict mode does not invent a deadline. It yields to the predecessor
with the exact uncalibrated threat identifiers and an explicit uncertainty
witness. A claimed complete base-safety certificate with contradictory threat
metadata is rejected.

`terminalObjectiveStrategy.ts` applies the guard both before and after
minimum-strike-group selection. In strict mode only, its schema-4 telemetry
records the guard mode, the pre-intervention complete objective time, and
whether the comparison caused an intervention. This makes necessary defense
distinguishable from generic defensive drift. Legacy mode omits all three
fields, preserving frozen V5 behavior and telemetry serialization.

When a proposed smaller strike group fails its recheck, both the original safe
full-force decision and its original guard witness are retained; telemetry
never describes the rejected smaller group as though it had executed.

## Frozen open-development design

The complete open causal screen now has four to six arms (720, 900, or 1,080
games): exact external Supalosa, unchanged V5, V5 plus only the strict base-race
guard, strict base-race plus irreversible finish, and at most two prespecified
strict base-race plus surplus-finish margins. All arms share ten map families,
all nine countries, reciprocal slots, and common seeds.

The base-race-only arm isolates the new terminal correction. The finalizer
validates the exact arm mode and requires strict intervention telemetry to
prove that a retained strike beats the own-base deadline or that a defensive
interruption has a causal deadline/threat witness. It separately counts guard
opportunities, interventions, non-interventions, and dual-purpose defenses.
The base-race-only arm must emit no multi-building finish telemetry.

Only the four prospective intervention arms are eligible for selection. The
external control and unchanged V5 remain comparators. No test-family outcome,
sealed result, retry, or outcome-conditioned arm was used to design this
version.

## File commitments

| File | SHA-256 |
|---|---|
| `finishAdvantageCompositeCandidate.test.ts` | `e7c99235bc84367e75824acf5361959508f210a4023309686fd8e79e27583eb2` |
| `finishAdvantageCompositeCandidate.ts` | `c32cd5f0d5fd459f27b7d2fdf3d3b233fd4cc1d1a6d4907e979d5cda2a28e4ec` |
| `finishAdvantageCompositeCompatibilityGate.test.ts` | `17e86cd4a6083fc1ce10585e32c2faaee2096b00f30b3d446258cd2df3a0ea87` |
| `finishAdvantageCompositeCompatibilityGate.ts` | `af3dd61825ee9433742619b85074ef6c232040993c7d20759c017894b46c9311` |
| `finishAdvantageCompositeCompatibilityRunner.ts` | `ce61d574c2eb9fb6cdeaaa83013a12bccbf7ad3bbf861cc43ce270e656e1c5d0` |
| `finishAdvantageControl.test.ts` | `fc46feb54ee7a7c1556e877b6d1dafd30dd615ad96e9383e065dc8b0f5f6c7bd` |
| `finishAdvantageControl.ts` | `be756ced4a7758fc2e5dfdf00c082be6f336f460a1564bd254b620bf6fa2aaf7` |
| `finishAdvantageOpenCausalScreenAnalysis.test.ts` | `227a4fb2a6d1781610c5c46006162efd5af48e133204ac3675da49a44fd5524b` |
| `finishAdvantageOpenCausalScreenAnalysis.ts` | `bc1a584a40131c09ef1b6d8e8e2356824ed9ed960543a3d7dacfd6b6898a1dec` |
| `finishAdvantageOpenCausalScreenCampaign.test.ts` | `2a23930809cfd4e01e5e40dd2c4f407df0f9300c31e9f2734c45e2d662bf048a` |
| `finishAdvantageOpenCausalScreenCampaign.ts` | `b3d2c2b177a9e8a976b375cf6379edbce80b3ae550f2b8e40416d3c386d0162b` |
| `finishAdvantageOpenCausalScreenCell.test.ts` | `01e8182c24e45f5b18da82a75b50aef93109e6dece29f38b5fd4fc486f355013` |
| `finishAdvantageOpenCausalScreenCell.ts` | `3763d348633c55af20bfcec9cfa84edc39761491bf85a54497c15500968cf88c` |
| `finishAdvantageOpenCausalScreenEpisode.test.ts` | `f0d048be2d921e2a550879526efd58be9ec67cf699865e81d668811b1416c3f4` |
| `finishAdvantageOpenCausalScreenEpisode.ts` | `d3dfac899748cd9251bb3250472a9613b3fc3427ab6d5076fc776bd816bd1371` |
| `finishAdvantageOpenCausalScreenFinalizer.test.ts` | `e3eb58f6d3b3383a533c2b0003ebaf657177b27498b62438fb1050e093006556` |
| `finishAdvantageOpenCausalScreenFinalizer.ts` | `a04633e70c964c9a9e026623d732c40db5963de1ecfdaddf6b4e8e587bf9a0be` |
| `finishAdvantagePolicy.test.ts` | `804079d910f8d0d407780ca9c50dc28088129e4a50ae8595a66b8f5a46931bbf` |
| `finishAdvantagePolicy.ts` | `53376d0572d5308c34c4a484910d0880376d44eac448183427f4ad023150b68b` |
| `finishAdvantageStateAuditAggregate.test.ts` | `5fad7076d54de9dcef782215431bbdfc84196d61713d499751950337e1efd3a9` |
| `finishAdvantageStateAuditAggregate.ts` | `8a500a9540aa7ccfe4aad37a1f9671316a4cbf73d9df5c42d278b54ffccf2441` |
| `finishAdvantageStateAuditCampaign.ts` | `c672237e2c10901e3c6c1820d97edf4808d1235dae2e24582188c0979809f6dd` |
| `finishAdvantageStateAuditCell.ts` | `89c5c1031074fca2b26e77f4e4a9691ff7aa934a0876312297301b113d9d4f0e` |
| `finishAdvantageStateAuditTrace.ts` | `ad548976f208d24c507a83d3217dddcca5a262dfd5164473a54564b64172203a` |
| `finishAdvantageStateObserver.test.ts` | `c4b74e1f6b95597d6284bc40a3d21524180af713e35a1dc01036e961f2f4c5a9` |
| `finishAdvantageStateObserver.ts` | `a1dc914657fd209988199775e2f596110f4e90650c569a08519c4a3815aa7f06` |
| `finishAdvantageStrategy.test.ts` | `042522e501e0e3801fbe14addfa23cca2f88c28f4169aedd4ba91f6322d5fdd4` |
| `finishAdvantageStrategy.ts` | `80ad763d4e295d81265018e6981970c0d41d0bb6696cb19dabd94ec41d31daf5` |
| `finish_advantage_composite_compatibility.sbatch` | `950aa63d5bde25abfabb7c08920f278a138e0329c2fe0b16120297736735748d` |
| `finish_advantage_open_causal_screen_controller.sbatch` | `0faee47afc73a16de390247ae0e20b2ae941ce5f9d5fb9f226d6709720eba38c` |
| `finish_advantage_open_causal_screen_shard.sbatch` | `ffb5b19c6bde9228a57fb107f68a5ad4a673c589036379a80856849ef395c07b` |
| `finish_advantage_state_audit_controller.sbatch` | `ff01dc7afddadddbd101d4e0d308bae0373f447e2d7def5e2a88e37f5798a501` |
| `finish_advantage_state_audit_shard.sbatch` | `f76f4f0760ddcf15b334652b3e6a94a625247f9c2ee222392a3cf7aea7693e07` |
| `objectiveMissionOwnership.test.ts` | `382f3fb77cd3c5c16ce88add8340b08c0048bfe391316ddafefedd01c817346f` |
| `objectiveMissionOwnership.ts` | `4e533059c6eda7ac8b2f9b37ddace0c68cb0d6baa8080fb217548a3159cd6831` |
| `officialMapLiveCompatibility.test.ts` | `7c3c707a12a26bc83da02ad7028a6891d485c0b93610743a5680c254d607fa89` |
| `officialMapLiveCompatibilityAggregate.ts` | `a44c46c69e049575d0f4d40c43a1dea0b22e96705e8181b46f576fb7192d0ac0` |
| `officialMapLiveCompatibilityCampaign.ts` | `61d491e67f3a002287a5fd6c362e080aa94c60869f85a7de6c0d1c869684021d` |
| `officialMapLiveCompatibilityCell.ts` | `c7bc25416910c86958394d27592889276952d67ee34e94d595c17018ed8076a3` |
| `official_map_live_compatibility_controller.sbatch` | `c7de65dc868ae645b8951791e77568d1cce63bafcdcbcdf91e041f29a802e3c9` |
| `official_map_live_compatibility_shard.sbatch` | `9c11198bb3594b40316ceb3f5630dfd1d91c40973f430e2a899770df387f367a` |
| `terminalBaseRaceGuard.test.ts` | `d79207c3ecc5c04363a34306b1a7591a15e01408e6af6d1eef64a23a9361f0a9` |
| `terminalBaseRaceGuard.ts` | `3a8d3e8d163b66cf352c11d236a90462baaf8fc1769a380cfa251ba67fedd135` |
| `terminalObjectiveStrategy.ts` | `1a8ad018ab50a336b9cedc9cc1c503c5f9fff02a507da7debaa72cd19735b092` |

The root contains 37 TypeScript files (15 tests, 22 production) and seven
Slurm scripts.

## Verification

- Vitest 4.1.10: eight affected files, 45 tests, all pass.
- The affected tests cover safe final strikes, an earlier own-base zeroing,
  equality at the safety margin, unknown blocker completion, dual-purpose
  threats, threat removal/refocus, explicit legacy preservation, malformed
  evidence, arm construction, campaign accounting, composite construction,
  uncalibrated sole-base threats, endpoint/seed commitments, and finalizer
  scheduler fail-closed behavior.
- All ten affected production roots and their imported dependency closure pass
  strict TypeScript checking under NodeNext module semantics.
- Composite runner, campaign generator, shard cell, and finalizer all bundle
  successfully with esbuild as external-package Node ESM programs.
- All seven Slurm scripts pass `bash -n`.
- The apparent typecheck mirror was subsequently found to contain hard links.
  Its single tracked-file mutation, the fail-closed sealed-gate incident, exact
  repair, and physical-inode isolation requirement are recorded in process
  lessons V4 and the sealed campaign's `TECHNICAL_GATE_REPAIR_R1.md`.
- An accidental whole-mirror run was preserved for transparency: 184/198 test
  files and 1,105/1,130 tests passed. Its 14 file failures were pre-existing
  mirror-environment failures from absent `./data`/commitment fixtures and
  historical heavyweight tests exceeding Vitest's 5-second default; none was
  in an affected file. This broad run is not used as acceptance evidence.

These checks authorize integration testing only after the sealed V5 array and
its dependent technical gate/unblinder reach terminal states. They do not
authorize a competitive claim, screenshot selection, confirmatory test access,
or paper text.
