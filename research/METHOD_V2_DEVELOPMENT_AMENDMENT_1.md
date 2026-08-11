# Method-v2 development amendment 1: `.mpr` prelaunch compatibility

Status: **frozen after technical-only diagnosis and before any replacement
development gameplay**.

This amendment does not change the champion, default policy, family pool,
family ordering, engine seeds, reciprocal slots, game budget, estimands,
uncertainty estimator, or pass thresholds in
`METHOD_V2_DEVELOPMENT_PROTOCOL.md`. It repairs one sealed execution interface
and defines the disposition of the failed campaign.

## Triggering technical evidence

The first source-`268cdebdd95f4cedf5eda9bf25af043e8b92696a` phase-1
campaign passed its technical gate without outcome access. Its phase-2 campaign
had SHA-256
`116558add81d70df133381ece434556d45e3212e54ae173acdd7427bfdfac4c9`
and ran as Slurm array `21919472` under account `pi_jss233`.

Four shards failed after `launch_counted`: array tasks `0`, `1`, `14`, and
`15`, whose exact scheduler job IDs were `21919473`, `21919474`, `21919487`,
and `21919488`. Each shard recorded four technical failures and no completed
episodes. The error was deterministic and outcome-free: the research episode
validator rejected committed `.mpr` basenames even though Chrono Divide, the
driver, and the frozen fidelity probe support `.mpr` maps. No winner, score, or
other policy outcome was inspected during diagnosis.

The complete 22-shard array used the exact job-ID set `21919472` through
`21919493` inclusive. It accounted for all 88 requested launches: 18 shards
completed 72 episodes cleanly, while the four shards above recorded 16
technical failures. The fail-closed gate produced no passing artifact.

All original campaign plans, manifests, private events, sealed summaries,
scheduler records, and logs remain immutable. Because the failures occurred
after `launch_counted`, no failed shard is retried and the campaign is
permanently excluded from development inference.

## Prospective repair

Before replacement gameplay, the research interface must:

1. accept basename-only `.map` and `.mpr` inputs, case-insensitively;
2. continue rejecting path-bearing names and every other extension; and
3. validate every materialized episode specification before creating an
   output directory or writing a `launch_counted` event.

The third requirement makes any future unsupported committed map a prelaunch
failure eligible only for the already frozen exact-attempt policy.

## Full-program restart

The replacement execution starts again at phase 1 from one new clean `main`
commit and uses that unchanged source through phase 3 and the single
unblinding. It reruns the complete frozen phase-1 and phase-2 schedules,
including every family, rather than selectively rerunning the failed `.mpr`
families or reusing successful outcome-bearing shards. It uses the original
seed blocks and all original statistical rules. Evidence from the abandoned
source-`268cdeb` development campaigns has technical-audit value only and is
not pooled with or substituted into the replacement analysis.
