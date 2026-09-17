import {
    buildUnifiedIntentV2OD1Plan as buildOriginalPlan,
    OD1_ARMS, OD1_MAP_IDS,
} from "./unifiedIntentV2OD1Plan.js";
import { UnifiedIntentGate3Map } from "./unifiedIntentGate3Plan.js";

export { OD1_ARMS, OD1_MAP_IDS };
export const OD1_A1_COMPETITIVE_SEED_BASE = 3_350_108_000;
export const OD1_A1_CANARY_SEED_BASE = 3_350_109_000;
export const OD1_A1_SMOKE_SEED = 3_350_109_100;

/** A complete fresh selector population; the original builder and failed V1 remain unchanged. */
export const buildUnifiedIntentV2OD1Plan = (maps: UnifiedIntentGate3Map[]) => {
    const original = buildOriginalPlan(maps);
    return {
        ...original,
        kind: "unified-intent-v2-od1-plan-a1" as const,
        amendment: "selector-metadata-publication-repair-a1" as const,
        cases: original.cases.map((cell) => ({
            ...cell, requestedEngineSeed: OD1_A1_COMPETITIVE_SEED_BASE + cell.caseIndex,
        })),
        canaries: original.canaries.map((cell, index) => ({
            ...cell, requestedEngineSeed: OD1_A1_CANARY_SEED_BASE + index,
        })),
        smoke: { ...original.smoke, requestedEngineSeed: OD1_A1_SMOKE_SEED },
    };
};
export type UnifiedIntentV2OD1A1Plan = ReturnType<typeof buildUnifiedIntentV2OD1Plan>;
export const validateUnifiedIntentV2OD1Plan = (
    plan: UnifiedIntentV2OD1A1Plan, frozenMaps: UnifiedIntentGate3Map[],
): void => {
    if (JSON.stringify(plan) !== JSON.stringify(buildUnifiedIntentV2OD1Plan(frozenMaps))) {
        throw new Error("OD1 A1 plan differs from its frozen reconstruction");
    }
};
