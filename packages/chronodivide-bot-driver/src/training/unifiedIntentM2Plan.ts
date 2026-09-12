import { UNIFIED_INTENT_GATE2_COUNTRIES } from "./unifiedIntentGate2Plan.js";
import { UNIFIED_INTENT_GATE3_B1_ARMS } from "./unifiedIntentGate3B1Plan.js";
import { UnifiedIntentGate3Map } from "./unifiedIntentGate3Plan.js";

export const UNIFIED_INTENT_M2_SEED_BASE = 3_350_103_000;
export const UNIFIED_INTENT_M2_MAX_UPDATES = 24_000;

export type UnifiedIntentM2Case = {
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
    arms: typeof UNIFIED_INTENT_GATE3_B1_ARMS;
};

export type UnifiedIntentM2Plan = {
    kind: "unified-intent-m2-plan-v1";
    complete: true;
    passed: true;
    developmentOnly: true;
    seedBase: number;
    maxUpdates: number;
    maps: UnifiedIntentGate3Map[];
    countries: readonly string[];
    arms: typeof UNIFIED_INTENT_GATE3_B1_ARMS;
    cases: UnifiedIntentM2Case[];
    counts: {
        maps: 15;
        advancedMaps: 10;
        families: 25;
        supalosaCases: 540;
        advancedCases: 360;
        cases: 900;
        tasks: 900;
        arms: 2;
        games: 1800;
        distinctSeeds: 900;
    };
};

export const buildUnifiedIntentM2Plan = (
    maps: UnifiedIntentGate3Map[],
): UnifiedIntentM2Plan => {
    const cases: UnifiedIntentM2Case[] = [];
    const append = (
        opponent: UnifiedIntentM2Case["opponent"],
        selectedMaps: UnifiedIntentGate3Map[],
    ) => {
        selectedMaps.forEach((map, opponentMapOrdinal) => {
            if (map.starts.length < 2) throw new Error("Unified intent M2 map lacks starts");
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
                            requestedEngineSeed: UNIFIED_INTENT_M2_SEED_BASE + caseIndex,
                            maxUpdates: UNIFIED_INTENT_M2_MAX_UPDATES,
                            arms: UNIFIED_INTENT_GATE3_B1_ARMS,
                        });
                    }
                }
            }
        });
    };
    append("pinned_supalosa", maps);
    append("ra2web_advanced", maps.filter((value) => value.advancedEligible));
    const plan: UnifiedIntentM2Plan = {
        kind: "unified-intent-m2-plan-v1",
        complete: true,
        passed: true,
        developmentOnly: true,
        seedBase: UNIFIED_INTENT_M2_SEED_BASE,
        maxUpdates: UNIFIED_INTENT_M2_MAX_UPDATES,
        maps,
        countries: UNIFIED_INTENT_GATE2_COUNTRIES,
        arms: UNIFIED_INTENT_GATE3_B1_ARMS,
        cases,
        counts: {
            maps: 15, advancedMaps: 10, families: 25, supalosaCases: 540,
            advancedCases: 360, cases: 900, tasks: 900, arms: 2, games: 1800,
            distinctSeeds: 900,
        },
    };
    validateUnifiedIntentM2Plan(plan);
    return plan;
};

export const validateUnifiedIntentM2Plan = (plan: UnifiedIntentM2Plan): void => {
    if (
        plan.kind !== "unified-intent-m2-plan-v1" || !plan.complete || !plan.passed ||
        !plan.developmentOnly || plan.seedBase !== UNIFIED_INTENT_M2_SEED_BASE ||
        plan.maxUpdates !== UNIFIED_INTENT_M2_MAX_UPDATES || plan.maps.length !== 15 ||
        plan.maps.filter((value) => value.advancedEligible).length !== 10 ||
        plan.cases.length !== 900 ||
        JSON.stringify(plan.arms) !== JSON.stringify(UNIFIED_INTENT_GATE3_B1_ARMS)
    ) throw new Error("Unified intent M2 plan identity drifted");
    const supalosa = plan.cases.filter((value) => value.opponent === "pinned_supalosa");
    const advanced = plan.cases.filter((value) => value.opponent === "ra2web_advanced");
    if (supalosa.length !== 540 || advanced.length !== 360) {
        throw new Error("Unified intent M2 opponent coverage drifted");
    }
    const seeds = plan.cases.map((value) => value.requestedEngineSeed);
    if (
        new Set(seeds).size !== 900 || Math.min(...seeds) !== UNIFIED_INTENT_M2_SEED_BASE ||
        Math.max(...seeds) !== UNIFIED_INTENT_M2_SEED_BASE + 899
    ) throw new Error("Unified intent M2 seed coverage drifted");
    if (
        new Set(plan.cases.map((value) => value.familyId)).size !== 25 ||
        new Set(plan.cases.map((value) => [
            value.opponent, value.mapId, value.directionOrdinal,
            value.country, value.candidateSlot,
        ].join("|"))).size !== 900
    ) throw new Error("Unified intent M2 family coverage drifted");
    for (const [caseIndex, value] of plan.cases.entries()) {
        if (
            value.caseIndex !== caseIndex || value.taskIndex !== caseIndex ||
            value.requestedEngineSeed !== UNIFIED_INTENT_M2_SEED_BASE + caseIndex ||
            value.maxUpdates !== UNIFIED_INTENT_M2_MAX_UPDATES ||
            JSON.stringify(value.arms) !== JSON.stringify(UNIFIED_INTENT_GATE3_B1_ARMS)
        ) throw new Error("Unified intent M2 case identity drifted");
    }
};
