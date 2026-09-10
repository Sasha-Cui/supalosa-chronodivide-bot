import crypto from "node:crypto";
import { UNIFIED_INTENT_GATE2_COUNTRIES } from "./unifiedIntentGate2Plan.js";

export const UNIFIED_INTENT_GATE3_SEED_BASE = 3_350_100_000;
export const UNIFIED_INTENT_GATE3_FIXED_UPDATES = 3_600;

export const UNIFIED_INTENT_GATE3_ARMS = [
    { id: "disabled", enabled: false, totalCeiling: null },
    { id: "ceiling_75", enabled: true, totalCeiling: 75 },
    { id: "ceiling_150", enabled: true, totalCeiling: 150 },
    { id: "ceiling_300", enabled: true, totalCeiling: 300 },
] as const;

export type UnifiedIntentGate3Map = {
    id: string;
    label: string;
    fileName: string;
    absolutePath: string;
    sha256: string;
    starts: string[];
    advancedEligible: boolean;
};

export type UnifiedIntentGate3Case = {
    caseIndex: number;
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
    fixedUpdates: number;
};

export type UnifiedIntentGate3Task = UnifiedIntentGate3Case & {
    taskIndex: number;
    executionReplicateOrdinal: number;
    duplicateOfTaskIndex: number | null;
    arms: typeof UNIFIED_INTENT_GATE3_ARMS;
};

export type UnifiedIntentGate3Plan = {
    kind: "unified-intent-gate3-plan-v1";
    complete: true;
    passed: true;
    technicalOnly: true;
    competitiveFieldsAbsent: true;
    seedBase: number;
    maps: UnifiedIntentGate3Map[];
    countries: readonly string[];
    arms: typeof UNIFIED_INTENT_GATE3_ARMS;
    cases: UnifiedIntentGate3Case[];
    tasks: UnifiedIntentGate3Task[];
    duplicateBaseCaseIndices: number[];
    counts: {
        maps: 15;
        advancedMaps: 10;
        supalosaCases: 540;
        advancedCases: 360;
        cases: 900;
        duplicateTasks: 25;
        tasks: 925;
        arms: 4;
        traces: 3700;
        distinctSeeds: 900;
    };
};

const sha256 = (value: string): string =>
    crypto.createHash("sha256").update(value).digest("hex");

const caseIdentity = (value: UnifiedIntentGate3Case): string => JSON.stringify({
    opponent: value.opponent,
    mapId: value.mapId,
    directionOrdinal: value.directionOrdinal,
    candidateStart: value.candidateStart,
    opponentStart: value.opponentStart,
    country: value.country,
    candidateSlot: value.candidateSlot,
    requestedEngineSeed: value.requestedEngineSeed,
});

export const selectUnifiedIntentGate3Duplicates = (
    cases: UnifiedIntentGate3Case[],
): number[] => cases.map((value) => ({
    caseIndex: value.caseIndex,
    digest: sha256(
        "unified-intent-gate3-duplicate-v1\0" + caseIdentity(value),
    ),
})).sort((left, right) =>
    left.digest.localeCompare(right.digest) ||
    left.caseIndex - right.caseIndex)
    .slice(0, 25)
    .map((value) => value.caseIndex);

export const buildUnifiedIntentGate3Plan = (
    maps: UnifiedIntentGate3Map[],
): UnifiedIntentGate3Plan => {
    const cases: UnifiedIntentGate3Case[] = [];
    const append = (
        opponent: UnifiedIntentGate3Case["opponent"],
        selectedMaps: UnifiedIntentGate3Map[],
    ) => {
        selectedMaps.forEach((map, opponentMapOrdinal) => {
            if (map.starts.length < 2) {
                throw new Error("Unified intent Gate 3 map lacks two starts");
            }
            for (let directionOrdinal = 0; directionOrdinal < 2; directionOrdinal += 1) {
                const candidateStartOrdinal = directionOrdinal;
                const opponentStartOrdinal = 1 - directionOrdinal;
                for (const [countryOrdinal, country] of UNIFIED_INTENT_GATE2_COUNTRIES.entries()) {
                    for (let candidateSlot = 0; candidateSlot < 2; candidateSlot += 1) {
                        const caseIndex = cases.length;
                        cases.push({
                            caseIndex,
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
                            requestedEngineSeed: UNIFIED_INTENT_GATE3_SEED_BASE + caseIndex,
                            fixedUpdates: UNIFIED_INTENT_GATE3_FIXED_UPDATES,
                        });
                    }
                }
            }
        });
    };
    append("pinned_supalosa", maps);
    append("ra2web_advanced", maps.filter((value) => value.advancedEligible));
    const duplicateBaseCaseIndices = selectUnifiedIntentGate3Duplicates(cases);
    const baseTasks: UnifiedIntentGate3Task[] = cases.map((value) => ({
        ...value,
        taskIndex: value.caseIndex,
        executionReplicateOrdinal: 0,
        duplicateOfTaskIndex: null,
        arms: UNIFIED_INTENT_GATE3_ARMS,
    }));
    const duplicateTasks: UnifiedIntentGate3Task[] =
        duplicateBaseCaseIndices.map((caseIndex, index) => ({
            ...cases[caseIndex],
            taskIndex: cases.length + index,
            executionReplicateOrdinal: 1,
            duplicateOfTaskIndex: caseIndex,
            arms: UNIFIED_INTENT_GATE3_ARMS,
        }));
    const plan: UnifiedIntentGate3Plan = {
        kind: "unified-intent-gate3-plan-v1",
        complete: true,
        passed: true,
        technicalOnly: true,
        competitiveFieldsAbsent: true,
        seedBase: UNIFIED_INTENT_GATE3_SEED_BASE,
        maps,
        countries: UNIFIED_INTENT_GATE2_COUNTRIES,
        arms: UNIFIED_INTENT_GATE3_ARMS,
        cases,
        tasks: [...baseTasks, ...duplicateTasks],
        duplicateBaseCaseIndices,
        counts: {
            maps: 15,
            advancedMaps: 10,
            supalosaCases: 540,
            advancedCases: 360,
            cases: 900,
            duplicateTasks: 25,
            tasks: 925,
            arms: 4,
            traces: 3700,
            distinctSeeds: 900,
        },
    };
    validateUnifiedIntentGate3Plan(plan);
    return plan;
};

export const validateUnifiedIntentGate3Plan = (
    plan: UnifiedIntentGate3Plan,
): void => {
    if (
        plan.kind !== "unified-intent-gate3-plan-v1" ||
        !plan.complete ||
        !plan.passed ||
        !plan.technicalOnly ||
        !plan.competitiveFieldsAbsent ||
        plan.seedBase !== UNIFIED_INTENT_GATE3_SEED_BASE ||
        plan.maps.length !== 15 ||
        plan.maps.filter((value) => value.advancedEligible).length !== 10 ||
        plan.cases.length !== 900 ||
        plan.tasks.length !== 925 ||
        plan.duplicateBaseCaseIndices.length !== 25
    ) throw new Error("Unified intent Gate 3 plan identity drifted");
    const supalosa = plan.cases.filter((value) => value.opponent === "pinned_supalosa");
    const advanced = plan.cases.filter((value) => value.opponent === "ra2web_advanced");
    if (supalosa.length !== 540 || advanced.length !== 360) {
        throw new Error("Unified intent Gate 3 opponent coverage drifted");
    }
    if (
        new Set(plan.cases.map((value) => value.requestedEngineSeed)).size !== 900 ||
        Math.min(...plan.cases.map((value) => value.requestedEngineSeed)) !==
            UNIFIED_INTENT_GATE3_SEED_BASE ||
        Math.max(...plan.cases.map((value) => value.requestedEngineSeed)) !==
            UNIFIED_INTENT_GATE3_SEED_BASE + 899
    ) throw new Error("Unified intent Gate 3 seed coverage drifted");
    const strata = new Set(plan.cases.map((value) => [
        value.opponent,
        value.mapId,
        value.directionOrdinal,
        value.country,
        value.candidateSlot,
    ].join("|")));
    if (strata.size !== 900) {
        throw new Error("Unified intent Gate 3 stratum coverage drifted");
    }
    if (JSON.stringify(plan.duplicateBaseCaseIndices) !==
        JSON.stringify(selectUnifiedIntentGate3Duplicates(plan.cases))) {
        throw new Error("Unified intent Gate 3 duplicate selection drifted");
    }
    for (const [taskIndex, task] of plan.tasks.entries()) {
        const source = plan.cases[task.caseIndex];
        if (
            task.taskIndex !== taskIndex ||
            !source ||
            task.requestedEngineSeed !== source.requestedEngineSeed ||
            JSON.stringify(task.arms) !== JSON.stringify(UNIFIED_INTENT_GATE3_ARMS) ||
            (taskIndex < 900
                ? task.executionReplicateOrdinal !== 0 ||
                    task.duplicateOfTaskIndex !== null ||
                    task.caseIndex !== taskIndex
                : task.executionReplicateOrdinal !== 1 ||
                    task.duplicateOfTaskIndex !== task.caseIndex)
        ) throw new Error("Unified intent Gate 3 task identity drifted");
    }
    for (const map of plan.maps) {
        const expectedSupalosa = supalosa.filter((value) => value.mapId === map.id);
        const expectedAdvanced = advanced.filter((value) => value.mapId === map.id);
        if (
            expectedSupalosa.length !== 36 ||
            expectedAdvanced.length !== (map.advancedEligible ? 36 : 0)
        ) throw new Error("Unified intent Gate 3 map coverage drifted");
    }
};
