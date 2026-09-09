export const UNIFIED_INTENT_GATE2_SELECTED_BASE = 3_350_000_000;
export const UNIFIED_INTENT_GATE2_FIXED_UPDATES = 3_600;

export const UNIFIED_INTENT_GATE2_COUNTRIES = [
    "Americans",
    "Alliance",
    "French",
    "Germans",
    "British",
    "Africans",
    "Arabs",
    "Confederation",
    "Russians",
] as const;

export const UNIFIED_INTENT_GATE2_ARMS = ["unwrapped", "disabled"] as const;
export type UnifiedIntentGate2Arm = typeof UNIFIED_INTENT_GATE2_ARMS[number];

export type UnifiedIntentGate2Map = {
    id: string;
    label: string;
    fileName: string;
    absolutePath: string;
    sha256: string;
    startA: string;
    startB: string;
    startAOrdinal: number;
    startBOrdinal: number;
};

export type UnifiedIntentGate2Case = {
    caseIndex: number;
    mapOrdinal: number;
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

export type UnifiedIntentGate2Task = UnifiedIntentGate2Case & {
    taskIndex: number;
    armOrdinal: number;
    arm: UnifiedIntentGate2Arm;
};

export type UnifiedIntentGate2Plan = {
    kind: "unified-intent-gate2-plan-v1";
    complete: true;
    passed: true;
    technicalOnly: true;
    competitiveFieldsAbsent: true;
    selectedBase: number;
    countries: readonly string[];
    arms: readonly string[];
    maps: UnifiedIntentGate2Map[];
    cases: UnifiedIntentGate2Case[];
    tasks: UnifiedIntentGate2Task[];
    counts: {
        maps: 5;
        directionsPerMap: 2;
        countries: 9;
        slots: 2;
        arms: 2;
        cases: 180;
        tasks: 360;
        distinctSeeds: 180;
    };
};

const startPair = (
    map: UnifiedIntentGate2Map,
    directionOrdinal: number,
) => directionOrdinal === 0
    ? {
        candidateStart: map.startA,
        opponentStart: map.startB,
        candidateStartOrdinal: map.startAOrdinal,
        opponentStartOrdinal: map.startBOrdinal,
    }
    : {
        candidateStart: map.startB,
        opponentStart: map.startA,
        candidateStartOrdinal: map.startBOrdinal,
        opponentStartOrdinal: map.startAOrdinal,
    };

export const buildUnifiedIntentGate2Plan = (
    maps: UnifiedIntentGate2Map[],
): UnifiedIntentGate2Plan => {
    const cases: UnifiedIntentGate2Case[] = [];
    for (const [mapOrdinal, map] of maps.entries()) {
        for (let directionOrdinal = 0; directionOrdinal < 2; directionOrdinal += 1) {
            const starts = startPair(map, directionOrdinal);
            for (const [countryOrdinal, country] of UNIFIED_INTENT_GATE2_COUNTRIES.entries()) {
                for (let candidateSlot = 0; candidateSlot < 2; candidateSlot += 1) {
                    const caseIndex = cases.length;
                    cases.push({
                        caseIndex,
                        mapOrdinal,
                        mapId: map.id,
                        directionOrdinal,
                        ...starts,
                        countryOrdinal,
                        country,
                        candidateSlot,
                        requestedEngineSeed:
                            UNIFIED_INTENT_GATE2_SELECTED_BASE +
                            mapOrdinal * 36 +
                            directionOrdinal * 18 +
                            countryOrdinal * 2 +
                            candidateSlot,
                        fixedUpdates: UNIFIED_INTENT_GATE2_FIXED_UPDATES,
                    });
                }
            }
        }
    }
    const tasks = cases.flatMap((value) =>
        UNIFIED_INTENT_GATE2_ARMS.map((arm, armOrdinal) => ({
            ...value,
            taskIndex: value.caseIndex * 2 + armOrdinal,
            armOrdinal,
            arm,
        })));
    const plan: UnifiedIntentGate2Plan = {
        kind: "unified-intent-gate2-plan-v1",
        complete: true,
        passed: true,
        technicalOnly: true,
        competitiveFieldsAbsent: true,
        selectedBase: UNIFIED_INTENT_GATE2_SELECTED_BASE,
        countries: UNIFIED_INTENT_GATE2_COUNTRIES,
        arms: UNIFIED_INTENT_GATE2_ARMS,
        maps,
        cases,
        tasks,
        counts: {
            maps: 5,
            directionsPerMap: 2,
            countries: 9,
            slots: 2,
            arms: 2,
            cases: 180,
            tasks: 360,
            distinctSeeds: 180,
        },
    };
    validateUnifiedIntentGate2Plan(plan);
    return plan;
};

export const validateUnifiedIntentGate2Plan = (
    plan: UnifiedIntentGate2Plan,
): void => {
    if (
        plan.kind !== "unified-intent-gate2-plan-v1" ||
        !plan.complete ||
        !plan.passed ||
        !plan.technicalOnly ||
        !plan.competitiveFieldsAbsent ||
        plan.selectedBase !== UNIFIED_INTENT_GATE2_SELECTED_BASE ||
        plan.maps.length !== 5 ||
        new Set(plan.maps.map((value) => value.id)).size !== 5 ||
        plan.cases.length !== 180 ||
        plan.tasks.length !== 360
    ) throw new Error("Unified intent Gate 2 plan identity drifted");
    if (
        plan.cases.some((value, index) =>
            value.caseIndex !== index ||
            value.mapOrdinal < 0 ||
            value.mapOrdinal >= 5 ||
            value.directionOrdinal < 0 ||
            value.directionOrdinal >= 2 ||
            value.countryOrdinal < 0 ||
            value.countryOrdinal >= 9 ||
            value.candidateSlot < 0 ||
            value.candidateSlot >= 2 ||
            value.fixedUpdates !== UNIFIED_INTENT_GATE2_FIXED_UPDATES ||
            value.requestedEngineSeed < UNIFIED_INTENT_GATE2_SELECTED_BASE ||
            value.requestedEngineSeed >= UNIFIED_INTENT_GATE2_SELECTED_BASE + 1_000_000)
    ) throw new Error("Unified intent Gate 2 case drifted");
    if (new Set(plan.cases.map((value) => value.requestedEngineSeed)).size !== 180) {
        throw new Error("Unified intent Gate 2 seeds are not unique by pair");
    }
    for (const value of plan.cases) {
        const pair = plan.tasks.filter((task) => task.caseIndex === value.caseIndex);
        if (
            pair.length !== 2 ||
            pair[0].arm !== "unwrapped" ||
            pair[1].arm !== "disabled" ||
            pair[0].requestedEngineSeed !== pair[1].requestedEngineSeed ||
            pair.some((task, armOrdinal) =>
                task.taskIndex !== value.caseIndex * 2 + armOrdinal ||
                task.armOrdinal !== armOrdinal)
        ) throw new Error("Unified intent Gate 2 pair drifted");
    }
    const strata = new Set(plan.cases.map((value) => [
        value.mapId,
        value.directionOrdinal,
        value.country,
        value.candidateSlot,
    ].join("|")));
    if (strata.size !== 180) {
        throw new Error("Unified intent Gate 2 stratum coverage drifted");
    }
};
