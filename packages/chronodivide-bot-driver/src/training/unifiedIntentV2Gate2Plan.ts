import crypto from "node:crypto";
import { UNIFIED_INTENT_GATE2_COUNTRIES } from "./unifiedIntentGate2Plan.js";
import { UnifiedIntentGate3Map } from "./unifiedIntentGate3Plan.js";

export const UNIFIED_INTENT_V2_GATE2_SEED_BASE = 3_350_105_000;
export const UNIFIED_INTENT_V2_GATE2_MAX_UPDATES = 24_000;
export const UNIFIED_INTENT_V2_GATE2_ARM = {
    id: "separated_lanes_v2",
    enabled: true,
    budgetMode: "separated_lanes_v2",
    commandCeiling: 115,
} as const;

export type UnifiedIntentV2Gate2Case = {
    caseIndex: number;
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
    arm: typeof UNIFIED_INTENT_V2_GATE2_ARM;
};

export type UnifiedIntentV2Gate2Task = UnifiedIntentV2Gate2Case & {
    taskIndex: number;
    executionReplicateOrdinal: number;
    duplicateOfTaskIndex: number | null;
};

export type UnifiedIntentV2Gate2Plan = {
    kind: "unified-intent-v2-gate2-plan-v1";
    complete: true;
    passed: true;
    technicalOnly: true;
    competitiveFieldsAbsent: true;
    seedBase: number;
    maxUpdates: number;
    maps: UnifiedIntentGate3Map[];
    countries: readonly string[];
    arm: typeof UNIFIED_INTENT_V2_GATE2_ARM;
    cases: UnifiedIntentV2Gate2Case[];
    tasks: UnifiedIntentV2Gate2Task[];
    duplicateBaseCaseIndices: number[];
    counts: {
        maps: 15;
        advancedMaps: 10;
        families: 25;
        supalosaCases: 540;
        advancedCases: 360;
        cases: 900;
        duplicateTasks: 25;
        tasks: 925;
        episodes: 925;
        distinctSeeds: 900;
    };
};

const sha256 = (value: string): string =>
    crypto.createHash("sha256").update(value).digest("hex");
const identity = (value: UnifiedIntentV2Gate2Case): string => JSON.stringify({
    familyId: value.familyId,
    opponent: value.opponent,
    mapId: value.mapId,
    directionOrdinal: value.directionOrdinal,
    candidateStart: value.candidateStart,
    opponentStart: value.opponentStart,
    country: value.country,
    candidateSlot: value.candidateSlot,
    requestedEngineSeed: value.requestedEngineSeed,
});

export const selectUnifiedIntentV2Gate2Duplicates = (
    cases: UnifiedIntentV2Gate2Case[],
): number[] => cases.map((value) => ({
    caseIndex: value.caseIndex,
    digest: sha256("unified-intent-v2-gate2-duplicate-v1\0" + identity(value)),
})).sort((left, right) =>
    left.digest.localeCompare(right.digest) || left.caseIndex - right.caseIndex)
    .slice(0, 25)
    .map((value) => value.caseIndex);

export const buildUnifiedIntentV2Gate2Plan = (
    maps: UnifiedIntentGate3Map[],
): UnifiedIntentV2Gate2Plan => {
    const cases: UnifiedIntentV2Gate2Case[] = [];
    const append = (
        opponent: UnifiedIntentV2Gate2Case["opponent"],
        selectedMaps: UnifiedIntentGate3Map[],
    ) => selectedMaps.forEach((map, opponentMapOrdinal) => {
        if (map.starts.length < 2) throw new Error("Unified intent V2 Gate 2 map lacks starts");
        for (let directionOrdinal = 0; directionOrdinal < 2; directionOrdinal += 1) {
            const candidateStartOrdinal = directionOrdinal;
            const opponentStartOrdinal = 1 - directionOrdinal;
            for (const [countryOrdinal, country] of UNIFIED_INTENT_GATE2_COUNTRIES.entries()) {
                for (let candidateSlot = 0; candidateSlot < 2; candidateSlot += 1) {
                    const caseIndex = cases.length;
                    cases.push({
                        caseIndex,
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
                        requestedEngineSeed: UNIFIED_INTENT_V2_GATE2_SEED_BASE + caseIndex,
                        maxUpdates: UNIFIED_INTENT_V2_GATE2_MAX_UPDATES,
                        arm: UNIFIED_INTENT_V2_GATE2_ARM,
                    });
                }
            }
        }
    });
    append("pinned_supalosa", maps);
    append("ra2web_advanced", maps.filter((value) => value.advancedEligible));
    const duplicateBaseCaseIndices = selectUnifiedIntentV2Gate2Duplicates(cases);
    const tasks: UnifiedIntentV2Gate2Task[] = [
        ...cases.map((value) => ({
            ...value,
            taskIndex: value.caseIndex,
            executionReplicateOrdinal: 0,
            duplicateOfTaskIndex: null,
        })),
        ...duplicateBaseCaseIndices.map((caseIndex, index) => ({
            ...cases[caseIndex],
            taskIndex: 900 + index,
            executionReplicateOrdinal: 1,
            duplicateOfTaskIndex: caseIndex,
        })),
    ];
    const plan: UnifiedIntentV2Gate2Plan = {
        kind: "unified-intent-v2-gate2-plan-v1",
        complete: true,
        passed: true,
        technicalOnly: true,
        competitiveFieldsAbsent: true,
        seedBase: UNIFIED_INTENT_V2_GATE2_SEED_BASE,
        maxUpdates: UNIFIED_INTENT_V2_GATE2_MAX_UPDATES,
        maps,
        countries: UNIFIED_INTENT_GATE2_COUNTRIES,
        arm: UNIFIED_INTENT_V2_GATE2_ARM,
        cases,
        tasks,
        duplicateBaseCaseIndices,
        counts: {
            maps: 15, advancedMaps: 10, families: 25, supalosaCases: 540,
            advancedCases: 360, cases: 900, duplicateTasks: 25, tasks: 925,
            episodes: 925, distinctSeeds: 900,
        },
    };
    validateUnifiedIntentV2Gate2Plan(plan);
    return plan;
};

export const validateUnifiedIntentV2Gate2Plan = (plan: UnifiedIntentV2Gate2Plan): void => {
    if (
        plan.kind !== "unified-intent-v2-gate2-plan-v1" || !plan.complete || !plan.passed ||
        !plan.technicalOnly || !plan.competitiveFieldsAbsent ||
        plan.seedBase !== UNIFIED_INTENT_V2_GATE2_SEED_BASE || plan.maxUpdates !== 24_000 ||
        plan.maps.length !== 15 || plan.maps.filter((value) => value.advancedEligible).length !== 10 ||
        plan.cases.length !== 900 || plan.tasks.length !== 925 ||
        plan.duplicateBaseCaseIndices.length !== 25 ||
        JSON.stringify(plan.arm) !== JSON.stringify(UNIFIED_INTENT_V2_GATE2_ARM)
    ) throw new Error("Unified intent V2 Gate 2 plan identity drifted");
    const seeds = plan.cases.map((value) => value.requestedEngineSeed);
    if (
        plan.cases.filter((value) => value.opponent === "pinned_supalosa").length !== 540 ||
        plan.cases.filter((value) => value.opponent === "ra2web_advanced").length !== 360 ||
        new Set(seeds).size !== 900 || Math.min(...seeds) !== UNIFIED_INTENT_V2_GATE2_SEED_BASE ||
        Math.max(...seeds) !== UNIFIED_INTENT_V2_GATE2_SEED_BASE + 899 ||
        new Set(plan.cases.map((value) => value.familyId)).size !== 25 ||
        new Set(plan.cases.map((value) => [
            value.opponent, value.mapId, value.directionOrdinal,
            value.country, value.candidateSlot,
        ].join("|"))).size !== 900 ||
        JSON.stringify(plan.duplicateBaseCaseIndices) !==
            JSON.stringify(selectUnifiedIntentV2Gate2Duplicates(plan.cases))
    ) throw new Error("Unified intent V2 Gate 2 coverage drifted");
    for (const [taskIndex, task] of plan.tasks.entries()) {
        const source = plan.cases[task.caseIndex];
        if (task.taskIndex !== taskIndex || !source ||
            task.requestedEngineSeed !== source.requestedEngineSeed ||
            (taskIndex < 900
                ? task.caseIndex !== taskIndex || task.executionReplicateOrdinal !== 0 ||
                    task.duplicateOfTaskIndex !== null
                : task.executionReplicateOrdinal !== 1 ||
                    task.duplicateOfTaskIndex !== task.caseIndex)) {
            throw new Error("Unified intent V2 Gate 2 task drifted");
        }
    }
};
