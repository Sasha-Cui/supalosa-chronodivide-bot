import crypto from "node:crypto";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { METHOD_V3_COUNTRIES } from "./methodV3MechanismPlanGenerator.js";
import { RoleTarget } from "./researchPlanRunner.js";

export const METHOD_V3_STAGE2_ENGINE_SEED_BASE = 3_300_000_000 as const;
export const METHOD_V3_STAGE2_RUN_SEED_STRIDE = 10_000_000 as const;
export const METHOD_V3_STAGE2_STAGE_SEED_STRIDE = 1_000_000 as const;
export const METHOD_V3_STAGE2_FAMILY_COUNTS = [6, 12, 22] as const;
export const METHOD_V3_STAGE2_COUNTRY_COUNTS = [3, 6, 9] as const;
export const METHOD_V3_STAGE2_POLICY_COUNTS = [24, 8, 3] as const;

const rank = (domain: string, runIndex: number, value: string): string =>
    crypto
        .createHash("sha256")
        .update(`${domain}\0${runIndex}\0${value}`)
        .digest("hex");

export const rankMethodV3Stage2Families = (targets: RoleTarget[], runIndex: number): RoleTarget[] => {
    if (targets.length !== 22 || new Set(targets.map(({ familyId }) => familyId)).size !== 22) {
        throw new Error("Method-v3 Stage 2 requires exactly 22 unique opened training families");
    }
    return targets.slice().sort((left, right) =>
        rank("chrono-divide-method-v3-stage2-family-v1", runIndex, left.familyId).localeCompare(
            rank("chrono-divide-method-v3-stage2-family-v1", runIndex, right.familyId),
        ),
    );
};

export const rankMethodV3Stage2Countries = (runIndex: number): Countries[] =>
    [...METHOD_V3_COUNTRIES].sort((left, right) =>
        rank("chrono-divide-method-v3-stage2-country-v1", runIndex, left).localeCompare(
            rank("chrono-divide-method-v3-stage2-country-v1", runIndex, right),
        ),
    );

export const selectMethodV3Stage2Schedule = (
    targets: RoleTarget[],
    runIndex: number,
    stage: 0 | 1 | 2,
): { families: RoleTarget[]; countries: Countries[]; engineSeedBase: number } => {
    if (!Number.isSafeInteger(runIndex) || runIndex < 0 || runIndex > 4) {
        throw new Error("runIndex must be an integer in [0, 4]");
    }
    if (stage !== 0 && stage !== 1 && stage !== 2) throw new Error("stage must be 0, 1, or 2");
    return {
        families: rankMethodV3Stage2Families(targets, runIndex).slice(0, METHOD_V3_STAGE2_FAMILY_COUNTS[stage]),
        countries: rankMethodV3Stage2Countries(runIndex).slice(0, METHOD_V3_STAGE2_COUNTRY_COUNTS[stage]),
        engineSeedBase:
            METHOD_V3_STAGE2_ENGINE_SEED_BASE +
            runIndex * METHOD_V3_STAGE2_RUN_SEED_STRIDE +
            stage * METHOD_V3_STAGE2_STAGE_SEED_STRIDE,
    };
};
