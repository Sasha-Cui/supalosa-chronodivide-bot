import { UNIFIED_INTENT_GATE2_COUNTRIES } from "./unifiedIntentGate2Plan.js";
import { UnifiedIntentGate3Map } from "./unifiedIntentGate3Plan.js";

export const UNIFIED_INTENT_M2_C1_SEED_BASE = 3_350_104_000;
export const UNIFIED_INTENT_M2_C1_MAX_UPDATES = 24_000;
export const UNIFIED_INTENT_M2_C1_ARM = {
    id: "ceiling_150",
    enabled: true,
    totalCeiling: 150,
} as const;

export type UnifiedIntentM2C1Case = {
    caseIndex: number;
    taskIndex: number;
    familyId: string;
    opponent: "pinned_supalosa" | "ra2web_advanced";
    opponentMapOrdinal: number;
    mapId: string;
    directionOrdinal: number;
    candidateStart: string;
    opponentStart: string;
    candidateStartOrdinal: number;
    opponentStartOrdinal: number;
    countryOrdinal: number;
    country: typeof UNIFIED_INTENT_GATE2_COUNTRIES[number];
    candidateSlot: number;
    requestedEngineSeed: number;
    maxUpdates: number;
    arm: typeof UNIFIED_INTENT_M2_C1_ARM;
};

export type UnifiedIntentM2C1Plan = {
    kind: "unified-intent-m2-c1-plan-v1";
    complete: true;
    passed: true;
    technicalOnly: true;
    competitiveFieldsAbsent: true;
    seedBase: number;
    maxUpdates: number;
    maps: UnifiedIntentGate3Map[];
    countries: readonly string[];
    arm: typeof UNIFIED_INTENT_M2_C1_ARM;
    cases: UnifiedIntentM2C1Case[];
    counts: {
        maps: 15;
        advancedMaps: 10;
        families: 25;
        supalosaCases: 540;
        advancedCases: 360;
        cases: 900;
        tasks: 900;
        games: 900;
        distinctSeeds: 900;
    };
};

export const buildUnifiedIntentM2C1Plan = (
    maps: UnifiedIntentGate3Map[],
): UnifiedIntentM2C1Plan => {
    const cases: UnifiedIntentM2C1Case[] = [];
    const append = (
        opponent: UnifiedIntentM2C1Case["opponent"],
        selectedMaps: UnifiedIntentGate3Map[],
    ) => {
        selectedMaps.forEach((map, opponentMapOrdinal) => {
            if (map.starts.length < 2) throw new Error("Unified intent M2 C1 map lacks starts");
            for (let directionOrdinal = 0; directionOrdinal < 2; directionOrdinal += 1) {
                const candidateStartOrdinal = directionOrdinal;
                const opponentStartOrdinal = 1 - directionOrdinal;
                for (const [countryOrdinal, country] of UNIFIED_INTENT_GATE2_COUNTRIES.entries()) {
                    for (let candidateSlot = 0; candidateSlot < 2; candidateSlot += 1) {
                        const caseIndex = cases.length;
                        cases.push({
                            caseIndex,
                            taskIndex: caseIndex,
                            familyId: opponent + "__" + map.id,
                            opponent,
                            opponentMapOrdinal,
                            mapId: map.id,
                            directionOrdinal,
                            candidateStart: map.starts[candidateStartOrdinal],
                            opponentStart: map.starts[opponentStartOrdinal],
                            candidateStartOrdinal,
                            opponentStartOrdinal,
                            countryOrdinal,
                            country,
                            candidateSlot,
                            requestedEngineSeed: UNIFIED_INTENT_M2_C1_SEED_BASE + caseIndex,
                            maxUpdates: UNIFIED_INTENT_M2_C1_MAX_UPDATES,
                            arm: UNIFIED_INTENT_M2_C1_ARM,
                        });
                    }
                }
            }
        });
    };
    append("pinned_supalosa", maps);
    append("ra2web_advanced", maps.filter((value) => value.advancedEligible));
    const plan: UnifiedIntentM2C1Plan = {
        kind: "unified-intent-m2-c1-plan-v1",
        complete: true,
        passed: true,
        technicalOnly: true,
        competitiveFieldsAbsent: true,
        seedBase: UNIFIED_INTENT_M2_C1_SEED_BASE,
        maxUpdates: UNIFIED_INTENT_M2_C1_MAX_UPDATES,
        maps,
        countries: UNIFIED_INTENT_GATE2_COUNTRIES,
        arm: UNIFIED_INTENT_M2_C1_ARM,
        cases,
        counts: {
            maps: 15, advancedMaps: 10, families: 25, supalosaCases: 540,
            advancedCases: 360, cases: 900, tasks: 900, games: 900,
            distinctSeeds: 900,
        },
    };
    validateUnifiedIntentM2C1Plan(plan);
    return plan;
};

export const validateUnifiedIntentM2C1Plan = (plan: UnifiedIntentM2C1Plan): void => {
    if (
        plan.kind !== "unified-intent-m2-c1-plan-v1" || !plan.complete || !plan.passed ||
        !plan.technicalOnly || !plan.competitiveFieldsAbsent ||
        plan.seedBase !== UNIFIED_INTENT_M2_C1_SEED_BASE ||
        plan.maxUpdates !== UNIFIED_INTENT_M2_C1_MAX_UPDATES || plan.maps.length !== 15 ||
        plan.maps.filter((value) => value.advancedEligible).length !== 10 ||
        plan.cases.length !== 900 || JSON.stringify(plan.arm) !== JSON.stringify(UNIFIED_INTENT_M2_C1_ARM)
    ) throw new Error("Unified intent M2 C1 plan identity drifted");
    const supalosa = plan.cases.filter((value) => value.opponent === "pinned_supalosa");
    const advanced = plan.cases.filter((value) => value.opponent === "ra2web_advanced");
    const seeds = plan.cases.map((value) => value.requestedEngineSeed);
    if (supalosa.length !== 540 || advanced.length !== 360 ||
        new Set(seeds).size !== 900 || Math.min(...seeds) !== UNIFIED_INTENT_M2_C1_SEED_BASE ||
        Math.max(...seeds) !== UNIFIED_INTENT_M2_C1_SEED_BASE + 899 ||
        new Set(plan.cases.map((value) => value.familyId)).size !== 25 ||
        new Set(plan.cases.map((value) => [
            value.opponent, value.mapId, value.directionOrdinal,
            value.country, value.candidateSlot,
        ].join("|"))).size !== 900
    ) throw new Error("Unified intent M2 C1 coverage drifted");
    for (const [caseIndex, value] of plan.cases.entries()) {
        if (value.caseIndex !== caseIndex || value.taskIndex !== caseIndex ||
            value.requestedEngineSeed !== UNIFIED_INTENT_M2_C1_SEED_BASE + caseIndex ||
            value.maxUpdates !== 24_000 || JSON.stringify(value.arm) !== JSON.stringify(plan.arm)) {
            throw new Error("Unified intent M2 C1 case drifted");
        }
    }
};
