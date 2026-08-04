#!/usr/bin/env python3
"""Prospective power simulation for the Chrono Divide primary endpoint.

This tool is intentionally assumption-based.  It never reads experiment results,
maps, manifests, or test outcomes.  It simulates paired score differences under a
balanced crossed random-effects design and applies a two-way cluster-robust test
with map family and optimizer run as the clustering dimensions.
"""

from __future__ import annotations

import argparse
import json
import math
import random
import statistics
import sys
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Iterable, Optional, Sequence, Tuple


TOOL_VERSION = "1.0.0"
ASSUMPTION_LABEL = (
    "ASSUMPTION-BASED PROSPECTIVE DESIGN ANALYSIS; NOT AN OBSERVED RESULT"
)


@dataclass(frozen=True)
class DesignConfig:
    families: int = 9
    optimizer_runs: int = 5
    paired_blocks: int = 8
    reciprocal_starts_per_block: int = 2
    variance_family: float = 0.0025
    variance_optimizer_run: float = 0.0009
    variance_family_optimizer: float = 0.0016
    variance_game: float = 0.16
    alpha: float = 0.05
    alternative: str = "two-sided"
    null_replicates: int = 20_000
    simulations: int = 20_000
    seed: int = 20_260_804

    def validate(self) -> None:
        if self.families < 2:
            raise ValueError("families must be at least 2 for family clustering")
        if self.optimizer_runs < 2:
            raise ValueError(
                "optimizer_runs must be at least 2 for optimizer-run clustering"
            )
        if self.paired_blocks < 1:
            raise ValueError("paired_blocks must be at least 1")
        if self.reciprocal_starts_per_block < 1:
            raise ValueError("reciprocal_starts_per_block must be at least 1")
        variances = (
            self.variance_family,
            self.variance_optimizer_run,
            self.variance_family_optimizer,
            self.variance_game,
        )
        if any(value < 0.0 or not math.isfinite(value) for value in variances):
            raise ValueError("all variance components must be finite and non-negative")
        if sum(variances) <= 0.0:
            raise ValueError("at least one variance component must be positive")
        if not 0.0 < self.alpha < 1.0:
            raise ValueError("alpha must lie strictly between 0 and 1")
        if self.alternative not in {"two-sided", "greater"}:
            raise ValueError("alternative must be 'two-sided' or 'greater'")
        if self.null_replicates < 100:
            raise ValueError("null_replicates must be at least 100")
        if self.simulations < 100:
            raise ValueError("simulations must be at least 100")


def _normal_draw(rng: random.Random, variance: float) -> float:
    if variance == 0.0:
        return 0.0
    return rng.gauss(0.0, math.sqrt(variance))


def draw_cluster_statistic(
    rng: random.Random, config: DesignConfig, effect_size: float
) -> Tuple[float, Optional[float], Optional[float]]:
    """Draw one balanced study and return estimate, standard error, statistic.

    Each D[f,r,b] is the average conditioned-minus-global score difference over
    the prespecified reciprocal starts in block b.  The simulated block-level
    paired contrast for family f, optimizer run r, and paired block b is

        D[f,r,b] = effect + U[f] + V[r] + W[f,r] + E[f,r,b].

    Only cell totals are generated because they are sufficient for the endpoint and
    the intercept-only two-way cluster sandwich estimator.  The finite-cluster CGM
    variance is V_family + V_run - V_family-by-run.  Non-positive estimates are
    returned as analysis failures instead of silently being clamped.
    """

    family_count = config.families
    run_count = config.optimizer_runs
    block_count = config.paired_blocks

    family_effects = [
        _normal_draw(rng, config.variance_family) for _ in range(family_count)
    ]
    run_effects = [
        _normal_draw(rng, config.variance_optimizer_run)
        for _ in range(run_count)
    ]

    cell_totals = [[0.0] * run_count for _ in range(family_count)]
    game_sum_variance = block_count * config.variance_game
    for family in range(family_count):
        for run in range(run_count):
            interaction = _normal_draw(
                rng, config.variance_family_optimizer
            )
            game_noise_sum = _normal_draw(rng, game_sum_variance)
            cell_totals[family][run] = block_count * (
                effect_size
                + family_effects[family]
                + run_effects[run]
                + interaction
            ) + game_noise_sum

    observation_count = family_count * run_count * block_count
    total = sum(sum(row) for row in cell_totals)
    estimate = total / observation_count

    family_cluster_meat = 0.0
    for row in cell_totals:
        residual_sum = sum(row) - run_count * block_count * estimate
        family_cluster_meat += residual_sum * residual_sum

    run_cluster_meat = 0.0
    for run in range(run_count):
        residual_sum = (
            sum(cell_totals[family][run] for family in range(family_count))
            - family_count * block_count * estimate
        )
        run_cluster_meat += residual_sum * residual_sum

    intersection_meat = 0.0
    for family in range(family_count):
        for run in range(run_count):
            residual_sum = cell_totals[family][run] - block_count * estimate
            intersection_meat += residual_sum * residual_sum

    intersection_count = family_count * run_count
    variance_estimate = (
        (family_count / (family_count - 1.0)) * family_cluster_meat
        + (run_count / (run_count - 1.0)) * run_cluster_meat
        - (intersection_count / (intersection_count - 1.0))
        * intersection_meat
    ) / (observation_count * observation_count)

    if not math.isfinite(variance_estimate) or variance_estimate <= 0.0:
        return estimate, None, None
    standard_error = math.sqrt(variance_estimate)
    return estimate, standard_error, estimate / standard_error


def _higher_quantile(values: Sequence[float], probability: float) -> float:
    if not values:
        raise ValueError("cannot compute a quantile from an empty sequence")
    ordered = sorted(values)
    index = max(0, min(len(ordered) - 1, math.ceil(probability * len(ordered)) - 1))
    return ordered[index]


def calibrate_null(config: DesignConfig) -> dict:
    """Calibrate the cluster-statistic cutoff under the assumed null model."""

    rng = random.Random(config.seed)
    statistics_under_null = []
    invalid = 0
    for _ in range(config.null_replicates):
        _, _, statistic = draw_cluster_statistic(rng, config, effect_size=0.0)
        if statistic is None:
            invalid += 1
            continue
        if config.alternative == "two-sided":
            statistics_under_null.append(abs(statistic))
        else:
            statistics_under_null.append(statistic)

    if len(statistics_under_null) < 100:
        raise RuntimeError(
            "fewer than 100 valid null replicates; revise the design assumptions"
        )
    critical_value = _higher_quantile(
        statistics_under_null, 1.0 - config.alpha
    )
    realized_exceedances = sum(
        value > critical_value for value in statistics_under_null
    )
    return {
        "critical_value": critical_value,
        "valid_replicates": len(statistics_under_null),
        "invalid_replicates": invalid,
        "invalid_fraction": invalid / config.null_replicates,
        "conditional_tail_fraction_at_cutoff": (
            realized_exceedances / len(statistics_under_null)
        ),
    }


def _oracle_standard_error(config: DesignConfig) -> float:
    family_count = config.families
    run_count = config.optimizer_runs
    block_count = config.paired_blocks
    variance = (
        config.variance_family / family_count
        + config.variance_optimizer_run / run_count
        + config.variance_family_optimizer / (family_count * run_count)
        + config.variance_game / (family_count * run_count * block_count)
    )
    return math.sqrt(variance)


def _oracle_normal_power(
    effect_size: float, standard_error: float, alpha: float, alternative: str
) -> float:
    normal = statistics.NormalDist()
    noncentrality = effect_size / standard_error
    if alternative == "greater":
        critical = normal.inv_cdf(1.0 - alpha)
        return 1.0 - normal.cdf(critical - noncentrality)
    critical = normal.inv_cdf(1.0 - alpha / 2.0)
    return normal.cdf(-critical - noncentrality) + 1.0 - normal.cdf(
        critical - noncentrality
    )


def simulate_power(
    config: DesignConfig,
    effect_size: float,
    critical_value: float,
    scenario_index: int,
) -> dict:
    if not math.isfinite(effect_size) or not -1.0 <= effect_size <= 1.0:
        raise ValueError("effect_size must be finite and within [-1, 1]")

    scenario_seed = config.seed + 104_729 * (scenario_index + 1)
    rng = random.Random(scenario_seed)
    rejections = 0
    valid = 0
    invalid = 0
    estimates = []
    for _ in range(config.simulations):
        estimate, _, statistic = draw_cluster_statistic(
            rng, config, effect_size=effect_size
        )
        estimates.append(estimate)
        if statistic is None:
            invalid += 1
            continue
        valid += 1
        test_value = abs(statistic) if config.alternative == "two-sided" else statistic
        if test_value > critical_value:
            rejections += 1

    # A non-positive two-way variance estimate means the prespecified analysis could
    # not support a rejection.  Counting it as non-rejection makes the primary power
    # unconditional on the analysis succeeding.
    power = rejections / config.simulations
    mc_standard_error = math.sqrt(power * (1.0 - power) / config.simulations)
    mc_half_width = 1.96 * mc_standard_error
    oracle_se = _oracle_standard_error(config)
    return {
        "effect_size": effect_size,
        "scenario_seed": scenario_seed,
        "rejections": rejections,
        "valid_analyses": valid,
        "invalid_analyses": invalid,
        "invalid_analysis_fraction": invalid / config.simulations,
        "simulated_power_unconditional": power,
        "simulated_power_conditional_on_positive_variance": (
            rejections / valid if valid else None
        ),
        "monte_carlo_standard_error": mc_standard_error,
        "monte_carlo_95_interval": [
            max(0.0, power - mc_half_width),
            min(1.0, power + mc_half_width),
        ],
        "mean_simulated_endpoint": sum(estimates) / len(estimates),
        "oracle_known_variance_standard_error": oracle_se,
        "oracle_normal_power_reference": _oracle_normal_power(
            effect_size, oracle_se, config.alpha, config.alternative
        ),
    }


def build_report(config: DesignConfig, effect_sizes: Iterable[float]) -> dict:
    config.validate()
    effects = list(effect_sizes)
    if not effects:
        raise ValueError("at least one effect_size is required")
    for effect in effects:
        if not math.isfinite(effect) or not -1.0 <= effect <= 1.0:
            raise ValueError("every effect_size must be finite and within [-1, 1]")

    calibration = calibrate_null(config)
    scenarios = [
        simulate_power(config, effect, calibration["critical_value"], index)
        for index, effect in enumerate(effects)
    ]
    paired_block_contrasts = (
        config.families * config.optimizer_runs * config.paired_blocks
    )
    start_level_paired_contrasts = (
        paired_block_contrasts * config.reciprocal_starts_per_block
    )
    component_games = 2 * start_level_paired_contrasts
    return {
        "schema_version": 1,
        "tool": "chrono_divide_design_power",
        "tool_version": TOOL_VERSION,
        "label": ASSUMPTION_LABEL,
        "prospective": True,
        "source_data_used": False,
        "observed_or_test_outcomes_used": False,
        "design": asdict(config),
        "planned_sample_units": {
            "paired_score_contrasts": paired_block_contrasts,
            "paired_block_contrasts": paired_block_contrasts,
            "reciprocal_starts_per_block": config.reciprocal_starts_per_block,
            "start_level_paired_method_contrasts": start_level_paired_contrasts,
            "component_game_outcomes": component_games,
            "minimum_component_game_outcomes": component_games,
            "note": (
                "One statistical paired-block contrast is the mean of the "
                "conditioned-minus-global contrasts at each prespecified reciprocal "
                "start. Each start-level method contrast requires two component "
                "games (conditioned and global). Country mirrors increase the game "
                "count unless folded into the prespecified block mean."
            ),
        },
        "endpoint": {
            "name": "family-macro conditioned-minus-global score difference",
            "score": "win=1, draw=0.5, loss=0",
            "contrast": "conditioned score minus global score",
            "weighting": (
                "equal weight per map family; the simulated design is balanced over "
                "optimizer runs and paired seed/start blocks"
            ),
            "block_definition": (
                "D[f,r,b] is the arithmetic mean of the conditioned-minus-global "
                "score contrasts over reciprocal starts within engine-seed block b"
            ),
        },
        "data_generating_model": {
            "equation": (
                "D[f,r,b] = delta + U_family[f] + V_run[r] + "
                "W_family_run[f,r] + E_block[f,r,b]"
            ),
            "distribution": "independent zero-mean Gaussian random effects",
            "variance_components": {
                "U_family": config.variance_family,
                "V_run": config.variance_optimizer_run,
                "W_family_run": config.variance_family_optimizer,
                "E_block_after_reciprocal_start_averaging": config.variance_game,
            },
            "variance_game_cli_note": (
                "For backward compatibility, --variance-game denotes the residual "
                "variance of the already reciprocal-start-averaged D block, not the "
                "variance of one component game. Reciprocal starts therefore change "
                "launch accounting but not the simulated number of analysis units."
            ),
        },
        "analysis_model": {
            "test": (
                "intercept-only two-way cluster-robust test on paired differences"
            ),
            "clusters": ["map_family", "optimizer_run"],
            "sandwich": (
                "finite-cluster CGM: V_family + V_optimizer_run "
                "- V_family_by_optimizer_run"
            ),
            "critical_value": (
                "Monte Carlo calibrated under delta=0 using the same assumed "
                "random-effects model"
            ),
            "alternative": config.alternative,
            "alpha": config.alpha,
            "non_positive_variance_policy": (
                "preserve and count as non-rejection; never clamp to zero"
            ),
        },
        "null_calibration": calibration,
        "scenarios": scenarios,
        "limitations": [
            "This is design sensitivity under supplied assumptions, not evidence that the effect exists.",
            "No historical, validation, sealed-test, map, or game outcome is read by this tool.",
            "Gaussian paired differences can fall outside the physical [-1, 1] score-difference range.",
            "Variance components are treated as fixed assumptions; misspecification can materially change power.",
            "The balanced complete design does not model missing games, adaptive stopping, failed runs, or map-family misclassification.",
            "Few family or optimizer-run clusters can make two-way sandwich variances unstable; the reported invalid-analysis fraction is part of the result.",
            "The simulation calibrates its cutoff under the same model used to generate alternatives, so it does not establish robustness to non-Gaussian or heteroskedastic outcomes.",
            "Final confirmatory inference should be frozen before sealed-test evaluation and accompanied by sensitivity analyses at the family and optimizer-run levels.",
        ],
    }


def parse_args(argv: Optional[Sequence[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Prospective, assumption-only power simulation for the family-macro "
            "conditioned-minus-global endpoint. The program never reads outcomes."
        )
    )
    parser.add_argument("--families", type=int, default=9)
    parser.add_argument("--optimizer-runs", type=int, default=5)
    parser.add_argument("--paired-blocks", type=int, default=8)
    parser.add_argument(
        "--reciprocal-starts-per-block",
        type=int,
        default=2,
        help=(
            "Prespecified reciprocal starts averaged into each block contrast "
            "(default: 2)."
        ),
    )
    parser.add_argument(
        "--effect-size",
        type=float,
        action="append",
        dest="effect_sizes",
        help="Expected score difference; repeat for a sensitivity grid (default: 0.10).",
    )
    parser.add_argument("--variance-family", type=float, default=0.0025)
    parser.add_argument("--variance-optimizer-run", type=float, default=0.0009)
    parser.add_argument("--variance-family-optimizer", type=float, default=0.0016)
    parser.add_argument("--variance-game", type=float, default=0.16)
    parser.add_argument("--alpha", type=float, default=0.05)
    parser.add_argument(
        "--alternative", choices=("two-sided", "greater"), default="two-sided"
    )
    parser.add_argument("--null-replicates", type=int, default=20_000)
    parser.add_argument("--simulations", type=int, default=20_000)
    parser.add_argument("--seed", type=int, default=20_260_804)
    parser.add_argument(
        "--output",
        type=Path,
        help="Optional JSON output path; the same report is always printed to stdout.",
    )
    parser.add_argument("--indent", type=int, default=2)
    return parser.parse_args(argv)


def main(argv: Optional[Sequence[str]] = None) -> int:
    args = parse_args(argv)
    config = DesignConfig(
        families=args.families,
        optimizer_runs=args.optimizer_runs,
        paired_blocks=args.paired_blocks,
        reciprocal_starts_per_block=args.reciprocal_starts_per_block,
        variance_family=args.variance_family,
        variance_optimizer_run=args.variance_optimizer_run,
        variance_family_optimizer=args.variance_family_optimizer,
        variance_game=args.variance_game,
        alpha=args.alpha,
        alternative=args.alternative,
        null_replicates=args.null_replicates,
        simulations=args.simulations,
        seed=args.seed,
    )
    effect_sizes = args.effect_sizes if args.effect_sizes is not None else [0.10]
    try:
        report = build_report(config, effect_sizes)
    except (ValueError, RuntimeError) as error:
        print(f"design_power: error: {error}", file=sys.stderr)
        return 2

    rendered = json.dumps(report, indent=args.indent, sort_keys=True) + "\n"
    if args.output is not None:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(rendered, encoding="utf-8")
    sys.stdout.write(rendered)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
