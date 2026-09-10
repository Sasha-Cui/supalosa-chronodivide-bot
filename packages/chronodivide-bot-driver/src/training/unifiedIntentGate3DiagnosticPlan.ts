import { UNIFIED_INTENT_GATE2_COUNTRIES } from "./unifiedIntentGate2Plan.js";
import {
    UNIFIED_INTENT_GATE3_ARMS,
    UnifiedIntentGate3Map,
} from "./unifiedIntentGate3Plan.js";

export const UNIFIED_INTENT_GATE3_DIAGNOSTIC_SEED_BASE = 3_350_101_000;
export const UNIFIED_INTENT_GATE3_DIAGNOSTIC_FIXED_UPDATES = 3_600;
export const UNIFIED_INTENT_GATE3_DIAGNOSTIC_MAP_IDS = [
    "hfo-le",
    "tour-of-egypt",
] as const;

export type UnifiedIntentGate3DiagnosticCase = {
    caseIndex: number;
    mapId: typeof UNIFIED_INTENT_GATE3_DIAGNOSTIC_MAP_IDS[number];
    mapOrdinal: number;
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

export type UnifiedIntentGate3DiagnosticTask = UnifiedIntentGate3DiagnosticCase & {
    taskIndex: number;
    armOrdinal: number;
    arm: typeof UNIFIED_INTENT_GATE3_ARMS[number];
};

export type UnifiedIntentGate3DiagnosticPlan = {
    kind: "unified-intent-gate3-diagnostic-a1-plan-v1";
    complete: true;
    passed: true;
    technicalOnly: true;
    competitiveFieldsAbsent: true;
    seedBase: number;
    maps: UnifiedIntentGate3Map[];
    countries: readonly string[];
    arms: typeof UNIFIED_INTENT_GATE3_ARMS;
    cases: UnifiedIntentGate3DiagnosticCase[];
    tasks: UnifiedIntentGate3DiagnosticTask[];
    counts: {
        maps: 2;
        cases: 72;
        tasks: 288;
        arms: 4;
        distinctSeeds: 72;
    };
};

export const buildUnifiedIntentGate3DiagnosticPlan = (
    maps: UnifiedIntentGate3Map[],
): UnifiedIntentGate3DiagnosticPlan => {
    const selected = UNIFIED_INTENT_GATE3_DIAGNOSTIC_MAP_IDS.map((id) => {
        const map = maps.find((value) => value.id === id);
        if (!map || map.starts.length < 2) {
            throw new Error("Unified intent Gate 3 diagnostic map drifted");
        }
        return map;
    });
    const cases: UnifiedIntentGate3DiagnosticCase[] = [];
    selected.forEach((map, mapOrdinal) => {
        for (let directionOrdinal = 0; directionOrdinal < 2; directionOrdinal += 1) {
            const candidateStartOrdinal = directionOrdinal;
            const opponentStartOrdinal = 1 - directionOrdinal;
            for (const [countryOrdinal, country] of UNIFIED_INTENT_GATE2_COUNTRIES.entries()) {
                for (let candidateSlot = 0; candidateSlot < 2; candidateSlot += 1) {
                    const caseIndex = cases.length;
                    cases.push({
                        caseIndex,
                        mapId: map.id as UnifiedIntentGate3DiagnosticCase["mapId"],
                        mapOrdinal,
                        directionOrdinal,
                        candidateStart: map.starts[candidateStartOrdinal],
                        opponentStart: map.starts[opponentStartOrdinal],
                        candidateStartOrdinal,
                        opponentStartOrdinal,
                        countryOrdinal,
                        country,
                        candidateSlot,
                        requestedEngineSeed:
                            UNIFIED_INTENT_GATE3_DIAGNOSTIC_SEED_BASE + caseIndex,
                        fixedUpdates: UNIFIED_INTENT_GATE3_DIAGNOSTIC_FIXED_UPDATES,
                    });
                }
            }
        }
    });
    const tasks = cases.flatMap((caseValue) =>
        UNIFIED_INTENT_GATE3_ARMS.map((arm, armOrdinal) => ({
            ...caseValue,
            taskIndex: caseValue.caseIndex * UNIFIED_INTENT_GATE3_ARMS.length + armOrdinal,
            armOrdinal,
            arm,
        })));
    const plan: UnifiedIntentGate3DiagnosticPlan = {
        kind: "unified-intent-gate3-diagnostic-a1-plan-v1",
        complete: true,
        passed: true,
        technicalOnly: true,
        competitiveFieldsAbsent: true,
        seedBase: UNIFIED_INTENT_GATE3_DIAGNOSTIC_SEED_BASE,
        maps: selected,
        countries: UNIFIED_INTENT_GATE2_COUNTRIES,
        arms: UNIFIED_INTENT_GATE3_ARMS,
        cases,
        tasks,
        counts: { maps: 2, cases: 72, tasks: 288, arms: 4, distinctSeeds: 72 },
    };
    validateUnifiedIntentGate3DiagnosticPlan(plan);
    return plan;
};

export const validateUnifiedIntentGate3DiagnosticPlan = (
    plan: UnifiedIntentGate3DiagnosticPlan,
): void => {
    if (
        plan.kind !== "unified-intent-gate3-diagnostic-a1-plan-v1" ||
        !plan.complete ||
        !plan.passed ||
        !plan.technicalOnly ||
        !plan.competitiveFieldsAbsent ||
        plan.seedBase !== UNIFIED_INTENT_GATE3_DIAGNOSTIC_SEED_BASE ||
        JSON.stringify(plan.maps.map((value) => value.id)) !==
            JSON.stringify(UNIFIED_INTENT_GATE3_DIAGNOSTIC_MAP_IDS) ||
        plan.cases.length !== 72 ||
        plan.tasks.length !== 288
    ) throw new Error("Unified intent Gate 3 diagnostic plan identity drifted");
    const seeds = plan.cases.map((value) => value.requestedEngineSeed);
    if (
        new Set(seeds).size !== 72 ||
        Math.min(...seeds) !== UNIFIED_INTENT_GATE3_DIAGNOSTIC_SEED_BASE ||
        Math.max(...seeds) !== UNIFIED_INTENT_GATE3_DIAGNOSTIC_SEED_BASE + 71
    ) throw new Error("Unified intent Gate 3 diagnostic seed drifted");
    if (new Set(plan.cases.map((value) => [
        value.mapId,
        value.directionOrdinal,
        value.country,
        value.candidateSlot,
    ].join("|"))).size !== 72) {
        throw new Error("Unified intent Gate 3 diagnostic coverage drifted");
    }
    for (const [taskIndex, task] of plan.tasks.entries()) {
        const source = plan.cases[task.caseIndex];
        if (
            task.taskIndex !== taskIndex ||
            task.armOrdinal !== taskIndex % 4 ||
            task.caseIndex !== Math.floor(taskIndex / 4) ||
            task.requestedEngineSeed !== source?.requestedEngineSeed ||
            JSON.stringify(task.arm) !== JSON.stringify(UNIFIED_INTENT_GATE3_ARMS[task.armOrdinal])
        ) throw new Error("Unified intent Gate 3 diagnostic task drifted");
    }
};
