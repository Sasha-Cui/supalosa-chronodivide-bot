# Action-burst V1 smoke: explicit-start loader failure

Date: 2026-09-06

## Disposition

Outcome-blind smoke `25102476` created the engine session at tick zero but
failed its combined start/tick/live precondition before executing an update.
It wrote one bounded generic `FAILURE.json` and no trace or completion
record.

No partial action stream, W/D/L, score, endpoint, defeated state, building
state, or policy ranking was serialized or inspected.

## Cause

Source comparison with the validated V2 runner found that the new Slurm
wrapper omitted the evaluation-only explicit-start loader and
`CHRONO_GAME_API_PATH`. The bots carried `chronoResearchStartPos` ordinals,
but the untransformed game API ignored them; the observed positions therefore
did not satisfy the frozen assignment.

The prior V2 campaign invoked
`research/runtime/explicit-start-loader-v1.mjs` and verified its global
original-runtime commitment before each game.

## Frozen attempt

- source:
  `9cfb85fc222d0dc11eb7a2ee11cb28c1711e9e90`
- program SHA-256:
  `0912e6cfd12ac7cff0b607ec847d58f6727519a614bfab1a4defa7dd805c274a`
- manifest job: `25075730`, `COMPLETED 0:0`
- manifest SHA-256:
  `206ef34068cf90286da3070f5aff813bcf5fa70a30331892f409b80bfd2cb860`
- smoke job: `25102476`, `FAILED 1:0`, `pi_jss233/day`, one CPU,
  zero GPU, zero restarts
- node: `c1104u11n02`
- elapsed: six seconds

## Prospective repair

Bind and hash the existing explicit-start loader and transform in the
manifest. Export the physical game-api path and invoke Node 20.13.1 with the
same loader before the program module is imported. Require the loader's global
original SHA-256 to equal the frozen game-api file before the smoke session.

Use a new source-bound manifest and exclusive
`execution-v1-a4-runtime-a1-certificate-a4` root. No seed, assignment,
opponent, horizon, action schema, summary, reserve rule, gate, or resource
changes.
