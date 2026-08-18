import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { AttackMissionFactory } from
    "@supalosa/chronodivide-bot/dist/bot/logic/mission/missions/attackMission.js";
import { CombatTargetPriority } from
    "@supalosa/chronodivide-bot/dist/bot/logic/mission/missions/squads/common.js";
import crypto from "node:crypto";
import { BaselineFactory, InspectableBaselineBot } from "../benchmark/baselineLoader.js";
import {
    ProgressCertifiedConversionPolicyV5,
    validateProgressCertifiedConversionPolicyV5,
} from "./progressCertifiedConversionPolicyV5.js";
import { TerminalObjectiveStrategy, TerminalObjectiveTelemetry } from "./terminalObjectiveStrategy.js";

export const OBJECTIVE_AWARE_REPLACEMENT_SCHEMA_VERSION = 1 as const;
export type ObjectiveAwareReplacementPriority = Extract<CombatTargetPriority, "distance" | "strategic" | "objective">;
export type ObjectiveAwareReplacementPolicy = {
    schemaVersion: 1;
    enabled: boolean;
    targetPriority: ObjectiveAwareReplacementPriority;
    allowDefenceSteal: false;
};

export const buildObjectiveAwareReplacementPolicy = (
    targetPriority: ObjectiveAwareReplacementPriority,
    enabled = true,
): ObjectiveAwareReplacementPolicy => ({
    schemaVersion: OBJECTIVE_AWARE_REPLACEMENT_SCHEMA_VERSION,
    enabled,
    targetPriority,
    allowDefenceSteal: false,
});

export const validateObjectiveAwareReplacementPolicy = (
    policy: ObjectiveAwareReplacementPolicy,
): ObjectiveAwareReplacementPolicy => {
    if (policy.schemaVersion !== 1 || typeof policy.enabled !== "boolean" ||
        !(["distance", "strategic", "objective"] as const).includes(policy.targetPriority) ||
        policy.allowDefenceSteal !== false) throw new Error("Objective-aware replacement policy is invalid");
    return structuredClone(policy);
};

export const objectiveAwareReplacementPolicySha256 = (policy: ObjectiveAwareReplacementPolicy): string => crypto
    .createHash("sha256").update(JSON.stringify(validateObjectiveAwareReplacementPolicy(policy))).digest("hex");

type StrategyLike = { onAiUpdate(context: unknown, missionController: unknown, logger: unknown): unknown };

export const createObjectiveAwareAttackReplacementCandidate = (
    factory: BaselineFactory,
    name: string,
    country: Countries,
    rawV5Policy: ProgressCertifiedConversionPolicyV5,
    rawReplacementPolicy: ObjectiveAwareReplacementPolicy,
    v5Telemetry: (event: TerminalObjectiveTelemetry) => void = () => undefined,
): InspectableBaselineBot => {
    const v5 = validateProgressCertifiedConversionPolicyV5(rawV5Policy);
    const replacement = validateObjectiveAwareReplacementPolicy(rawReplacementPolicy);
    if (!replacement.enabled && !v5.enabled) return factory.create(name, country);
    if (!factory.createWithStrategy || !factory.createDefaultStrategy ||
        !factory.createDefaultStrategyWithAttackFactory) {
        throw new Error("Pinned baseline lacks the objective-aware attack-factory interface");
    }
    const inner = replacement.enabled
        ? factory.createDefaultStrategyWithAttackFactory(new AttackMissionFactory({
            allowDefenceSteal: false,
            targetPriority: replacement.targetPriority,
            missionNamePrefix: "attack",
        }))
        : factory.createDefaultStrategy();
    if (!inner || typeof (inner as StrategyLike).onAiUpdate !== "function") {
        throw new Error("Objective-aware replacement did not produce a strategy");
    }
    const outer: StrategyLike = v5.enabled ? new TerminalObjectiveStrategy(
        inner as never,
        country,
        v5,
        v5Telemetry,
        "strict_literal_endpoint_base_race",
    ) as unknown as StrategyLike : inner as StrategyLike;
    return factory.createWithStrategy(name, country, outer as never);
};
