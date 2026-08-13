import { StrongBot } from "@supalosa/chronodivide-bot/dist/bot/strongBot.js";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { StrongStrategy } from "@supalosa/chronodivide-bot/dist/bot/strategy/strongStrategy.js";
import { Strategy } from "@supalosa/chronodivide-bot/dist/bot/strategy/strategy.js";
import { InspectableBaselineBot } from "../benchmark/baselineLoader.js";
import {
    buildResearchBotOptions,
    buildResearchStrategyOptions,
    parseResearchPolicy,
    ResearchPolicyConfig,
    researchPolicySha256,
} from "./researchPolicy.js";
import {
    ContinuousOffensePolicy,
    validateContinuousOffensePolicy,
} from "./continuousOffensePolicy.js";
import {
    TerminalObjectiveStrategy,
    TerminalObjectiveTelemetry,
} from "./terminalObjectiveStrategy.js";

export const FROZEN_MACRO_CHAMPION_POLICY_ID =
    "ab0071009cbd5f1fc9e2f1a76a562455a0ebeacf77dac1cd9c13b9fc6374203f" as const;

export const FROZEN_MACRO_CHAMPION_SOURCE = {
    sourceGitCommit: "f11dcd6ef320482fdd5124141b3206e775ea0ea4",
    artifact:
        "research-evidence/training-v2/championship-v2-f11dcd6/method-v2-champion.json",
    selectionStatus: "training-only-fixed-policy-selection",
} as const;

export const FROZEN_MACRO_CHAMPION_POLICY: ResearchPolicyConfig = {
    schemaVersion: 1,
    attackCompositionPolicy: "infantry",
    strategicPlan: "rush",
    attackGateEnabled: true,
    attackGateMinTick: 7_200,
    attackGateMinCombatants: 10,
    attackGateCombatantAdvantage: 0,
    attackGateMaxEnemyCombatants: 999,
    defenceCheckTicks: 24,
    defenceStartingRadius: 36,
    defenceRadiusIncreasePerTick: 0.0001,
    scoutCooldownTicks: 45,
    scoutMaxConcurrentMissions: 2,
    engineerTechMaxTargets: 1,
    engineerTechMaxDistanceFromStart: 38,
    staticDefenseEnabled: false,
    staticDefenseStartTick: 5_400,
    staticDefenseTargetCount: 3,
    allInEnabled: true,
    allInMinTick: 12_600,
    allInMinCombatants: 10,
    allInCombatantAdvantage: 0,
    forceAttackEnabled: false,
    forceAttackMinTick: 10_800,
    forceAttackMinCombatants: 4,
    forceAttackCombatantAdvantage: -6,
    forceAttackMaxEnemyCombatants: 999,
    emergencyDefenseRadius: 64,
    emergencyDefenseMaxDefenders: 24,
};

const frozenMacroPolicy = parseResearchPolicy(FROZEN_MACRO_CHAMPION_POLICY);
if (researchPolicySha256(frozenMacroPolicy) !== FROZEN_MACRO_CHAMPION_POLICY_ID) {
    throw new Error("Frozen macro champion policy drifted from its training artifact");
}

/**
 * Construct the trained macro champion with an optional continuous objective
 * scheduler around its strategy. The macro strategy always runs first on each
 * update, retaining learned production/opening behavior; the scheduler then
 * owns only the declared objective combatants after its activation gate.
 */
export const createContinuousOffenseChampionCandidate = (
    name: string,
    country: Countries,
    rawObjectivePolicy: ContinuousOffensePolicy,
    telemetry: (event: TerminalObjectiveTelemetry) => void = () => undefined,
): InspectableBaselineBot => {
    const objectivePolicy = validateContinuousOffensePolicy(rawObjectivePolicy);
    const inner = new StrongStrategy(buildResearchStrategyOptions(frozenMacroPolicy));
    const strategy: Strategy = objectivePolicy.enabled
        ? new TerminalObjectiveStrategy(
            inner,
            country,
            objectivePolicy,
            telemetry,
        ) as unknown as Strategy
        : inner;
    return new StrongBot(
        name,
        country,
        [],
        false,
        strategy,
        buildResearchBotOptions(frozenMacroPolicy),
    );
};
