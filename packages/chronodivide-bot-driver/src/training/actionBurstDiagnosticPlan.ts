import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { rejectActionBurstProhibitedFields } from "./timestampedActionAudit.js";

export const ACTION_BURST_COUNTRIES = [
    Countries.USA,
    Countries.KOREA,
    Countries.FRANCE,
    Countries.GERMANY,
    Countries.GREAT_BRITAIN,
    Countries.LIBYA,
    Countries.IRAQ,
    Countries.CUBA,
    Countries.RUSSIA,
] as const;
export const ACTION_BURST_HORIZON = 3_600;
export const ACTION_BURST_TRACE_COUNT = 1_717;
export const ACTION_BURST_BASE_TRACE_COUNT = 1_692;
export const ACTION_BURST_DUPLICATE_COUNT = 25;
export const ACTION_BURST_DISTINCT_SEEDS = 846;
export const ACTION_BURST_SELECTED_INTERVAL = [3_010_000_000, 3_011_000_000] as const;

export type ActionBurstOpponent = "pinned_supalosa" | "ra2web_advanced";
export type ActionBurstMap = {
    id: string;
    label: string;
    fileName: string;
    absolutePath: string;
    sha256: string;
    startCount: number;
    family: string;
    starts: string[];
};
export type ActionBurstTrace = {
    taskIndex: number;
    baseTraceIndex: number;
    opponent: ActionBurstOpponent;
    opponentMapOrdinal: number;
    mapId: string;
    countryOrdinal: number;
    country: Countries;
    candidateStartOrdinal: number;
    opponentStartOrdinal: number;
    candidateStart: string;
    opponentStart: string;
    candidateSlot: 0 | 1;
    executionReplicateOrdinal: 0 | 1;
    requestedEngineSeed: number;
    duplicateOfTaskIndex: number | null;
    fixedUpdates: 3_600;
};
export type ActionBurstPlan = {
    kind: "action-burst-diagnostic-plan-v1-a3";
    complete: true;
    passed: true;
    technicalOnly: true;
    competitiveFieldsAbsent: true;
    selectedInterval: [number, number];
    countries: readonly Countries[];
    maps: ActionBurstMap[];
    traces: ActionBurstTrace[];
    counts: {
        maps: 15;
        topologyFamilies: 5;
        supalosaStarts: 56;
        advancedHfoStarts: 38;
        supalosaBaseTraces: 1_008;
        advancedBaseTraces: 684;
        baseTraces: 1_692;
        deterministicDuplicates: 25;
        traces: 1_717;
        distinctSeeds: 846;
        twoTraceSeeds: 821;
        threeTraceSeeds: 25;
    };
};

const opponentStartOrdinal = (
    startCount: number,
    candidateStart: number,
    countryOrdinal: number,
): number => {
    if (!Number.isSafeInteger(startCount) || startCount < 2) {
        throw new Error("Action-burst map must have at least two starts");
    }
    return (
        candidateStart + 1 + (countryOrdinal % (startCount - 1))
    ) % startCount;
};

const validateMap = (map: ActionBurstMap): void => {
    if (
        !map.id || !map.fileName || !map.absolutePath ||
        !/^[0-9a-f]{64}$/.test(map.sha256) ||
        map.starts.length !== map.startCount ||
        new Set(map.starts).size !== map.startCount ||
        map.startCount < 2
    ) throw new Error("Action-burst map identity is invalid");
};

const topologyFamily = (mapId: string): string => {
    if (mapId.startsWith("hfo-")) return "hfo";
    if (mapId === "peak") return "peak";
    if (mapId === "tour-of-egypt") return "tour-of-egypt";
    if (mapId.startsWith("south-pacific")) return "south-pacific";
    if (mapId === "pacific-heights") return "pacific-heights";
    throw new Error("Action-burst map topology is unknown");
};

const EXPECTED_COUNTS: ActionBurstPlan["counts"] = {
    maps: 15,
    topologyFamilies: 5,
    supalosaStarts: 56,
    advancedHfoStarts: 38,
    supalosaBaseTraces: 1_008,
    advancedBaseTraces: 684,
    baseTraces: 1_692,
    deterministicDuplicates: 25,
    traces: 1_717,
    distinctSeeds: 846,
    twoTraceSeeds: 821,
    threeTraceSeeds: 25,
};

export const buildActionBurstDiagnosticPlan = (
    inputMaps: readonly ActionBurstMap[],
    selectedInterval: readonly [number, number] = ACTION_BURST_SELECTED_INTERVAL,
): ActionBurstPlan => {
    if (
        selectedInterval[1] - selectedInterval[0] !== 1_000_000 ||
        !Number.isSafeInteger(selectedInterval[0]) ||
        !Number.isSafeInteger(selectedInterval[1])
    ) throw new Error("Action-burst selected interval is invalid");
    const maps = structuredClone(inputMaps) as ActionBurstMap[];
    if (maps.length !== 15 || new Set(maps.map((map) => map.id)).size !== 15) {
        throw new Error("Action-burst plan requires 15 unique maps");
    }
    maps.forEach(validateMap);
    const hfoMaps = maps.filter((map) => map.id.startsWith("hfo-"));
    if (hfoMaps.length !== 10) throw new Error("Action-burst plan requires ten HFO maps");
    if (maps.reduce((total, map) => total + map.startCount, 0) !== 56) {
        throw new Error("Action-burst Supalosa start count drifted");
    }
    if (hfoMaps.reduce((total, map) => total + map.startCount, 0) !== 38) {
        throw new Error("Action-burst Advanced start count drifted");
    }

    const traces: ActionBurstTrace[] = [];
    const addPopulation = (
        opponent: ActionBurstOpponent,
        populationMaps: ActionBurstMap[],
        blockOffset: number,
    ): void => {
        for (const [mapOrdinal, map] of populationMaps.entries()) {
            for (const [countryOrdinal, country] of ACTION_BURST_COUNTRIES.entries()) {
                for (let start = 0; start < map.startCount; start += 1) {
                    const opposing = opponentStartOrdinal(map.startCount, start, countryOrdinal);
                    const seed = selectedInterval[0] + blockOffset + 1_000 * mapOrdinal +
                        100 * countryOrdinal + 10 * start;
                    for (const slot of [0, 1] as const) {
                        traces.push({
                            taskIndex: traces.length,
                            baseTraceIndex: traces.length,
                            opponent,
                            opponentMapOrdinal: mapOrdinal,
                            mapId: map.id,
                            countryOrdinal,
                            country,
                            candidateStartOrdinal: start,
                            opponentStartOrdinal: opposing,
                            candidateStart: map.starts[start],
                            opponentStart: map.starts[opposing],
                            candidateSlot: slot,
                            executionReplicateOrdinal: 0,
                            requestedEngineSeed: seed,
                            duplicateOfTaskIndex: null,
                            fixedUpdates: ACTION_BURST_HORIZON,
                        });
                    }
                }
            }
        }
    };
    addPopulation("pinned_supalosa", maps, 0);
    addPopulation("ra2web_advanced", hfoMaps, 100_000);
    if (traces.length !== ACTION_BURST_BASE_TRACE_COUNT) {
        throw new Error("Action-burst base trace count drifted");
    }

    const baseTraces = [...traces];
    for (const [opponent, populationMaps] of [
        ["pinned_supalosa", maps],
        ["ra2web_advanced", hfoMaps],
    ] as const) {
        for (const [mapOrdinal] of populationMaps.entries()) {
            const countryOrdinal = mapOrdinal % ACTION_BURST_COUNTRIES.length;
            const slot = (mapOrdinal % 2) as 0 | 1;
            const base = baseTraces.find((trace) =>
                trace.opponent === opponent &&
                trace.opponentMapOrdinal === mapOrdinal &&
                trace.countryOrdinal === countryOrdinal &&
                trace.candidateStartOrdinal === 0 &&
                trace.candidateSlot === slot
            );
            if (!base) throw new Error("Action-burst duplicate base is missing");
            traces.push({
                ...structuredClone(base),
                taskIndex: traces.length,
                baseTraceIndex: base.baseTraceIndex,
                executionReplicateOrdinal: 1,
                duplicateOfTaskIndex: base.taskIndex,
            });
        }
    }

    const plan: ActionBurstPlan = {
        kind: "action-burst-diagnostic-plan-v1-a3",
        complete: true,
        passed: true,
        technicalOnly: true,
        competitiveFieldsAbsent: true,
        selectedInterval: [selectedInterval[0], selectedInterval[1]],
        countries: ACTION_BURST_COUNTRIES,
        maps,
        traces,
        counts: structuredClone(EXPECTED_COUNTS),
    };
    validateActionBurstDiagnosticPlan(plan);
    return plan;
};

export const validateActionBurstDiagnosticPlan = (plan: ActionBurstPlan): true => {
    rejectActionBurstProhibitedFields(plan);
    if (
        plan.kind !== "action-burst-diagnostic-plan-v1-a3" ||
        plan.complete !== true ||
        plan.passed !== true ||
        plan.technicalOnly !== true ||
        plan.competitiveFieldsAbsent !== true ||
        plan.traces.length !== ACTION_BURST_TRACE_COUNT ||
        plan.maps.length !== 15 ||
        JSON.stringify(plan.selectedInterval) !== JSON.stringify(ACTION_BURST_SELECTED_INTERVAL) ||
        JSON.stringify(plan.countries) !== JSON.stringify(ACTION_BURST_COUNTRIES) ||
        JSON.stringify(plan.counts) !== JSON.stringify(EXPECTED_COUNTS) ||
        new Set(plan.maps.map((map) => topologyFamily(map.id))).size !== 5
    ) throw new Error("Action-burst plan header drifted");
    if (new Set(plan.traces.map((trace) => trace.taskIndex)).size !== ACTION_BURST_TRACE_COUNT) {
        throw new Error("Action-burst task indices are not unique");
    }
    const assignmentKeys = new Set(plan.traces.map((trace) => JSON.stringify([
        trace.opponent, trace.mapId, trace.countryOrdinal,
        trace.candidateStartOrdinal, trace.candidateSlot,
        trace.executionReplicateOrdinal,
    ])));
    if (assignmentKeys.size !== ACTION_BURST_TRACE_COUNT) {
        throw new Error("Action-burst assignment tuples are not unique");
    }
    const hfoMaps = plan.maps.filter((map) => map.id.startsWith("hfo-"));
    for (const [index, trace] of plan.traces.entries()) {
        if (
            trace.taskIndex !== index ||
            trace.country !== ACTION_BURST_COUNTRIES[trace.countryOrdinal] ||
            ![0, 1].includes(trace.candidateSlot) ||
            ![0, 1].includes(trace.executionReplicateOrdinal) ||
            trace.fixedUpdates !== ACTION_BURST_HORIZON
        ) throw new Error("Action-burst trace identity drifted");
        const populationMaps = trace.opponent === "pinned_supalosa" ? plan.maps : hfoMaps;
        const map = populationMaps[trace.opponentMapOrdinal];
        const blockOffset = trace.opponent === "pinned_supalosa" ? 0 : 100_000;
        const expectedSeed = plan.selectedInterval[0] + blockOffset +
            1_000 * trace.opponentMapOrdinal + 100 * trace.countryOrdinal +
            10 * trace.candidateStartOrdinal;
        if (
            !map || map.id !== trace.mapId ||
            trace.candidateStart !== map.starts[trace.candidateStartOrdinal] ||
            trace.opponentStart !== map.starts[trace.opponentStartOrdinal] ||
            trace.opponentStartOrdinal !== opponentStartOrdinal(
                map.startCount, trace.candidateStartOrdinal, trace.countryOrdinal,
            ) ||
            trace.requestedEngineSeed !== expectedSeed ||
            trace.requestedEngineSeed < plan.selectedInterval[0] ||
            trace.requestedEngineSeed >= plan.selectedInterval[1] ||
            (trace.executionReplicateOrdinal === 0 && (
                trace.baseTraceIndex !== trace.taskIndex ||
                trace.duplicateOfTaskIndex !== null
            ))
        ) throw new Error("Action-burst trace map/seed drifted");
    }

    const bases = plan.traces.filter((trace) => trace.executionReplicateOrdinal === 0);
    const duplicates = plan.traces.filter((trace) => trace.executionReplicateOrdinal === 1);
    if (bases.length !== 1_692 || duplicates.length !== 25) {
        throw new Error("Action-burst replicate counts drifted");
    }
    for (const duplicate of duplicates) {
        const base = plan.traces[duplicate.duplicateOfTaskIndex ?? -1];
        if (
            !base || base.executionReplicateOrdinal !== 0 ||
            duplicate.baseTraceIndex !== base.baseTraceIndex ||
            duplicate.requestedEngineSeed !== base.requestedEngineSeed ||
            duplicate.opponent !== base.opponent ||
            duplicate.mapId !== base.mapId ||
            duplicate.country !== base.country ||
            duplicate.candidateStartOrdinal !== base.candidateStartOrdinal ||
            duplicate.opponentStartOrdinal !== base.opponentStartOrdinal ||
            duplicate.candidateSlot !== base.candidateSlot ||
            duplicate.countryOrdinal !== duplicate.opponentMapOrdinal % ACTION_BURST_COUNTRIES.length ||
            duplicate.candidateStartOrdinal !== 0 ||
            duplicate.candidateSlot !== duplicate.opponentMapOrdinal % 2
        ) throw new Error("Action-burst deterministic duplicate drifted");
    }

    const multiplicity = new Map<number, number>();
    for (const trace of plan.traces) {
        multiplicity.set(
            trace.requestedEngineSeed,
            (multiplicity.get(trace.requestedEngineSeed) ?? 0) + 1,
        );
    }
    if (
        multiplicity.size !== ACTION_BURST_DISTINCT_SEEDS ||
        [...multiplicity.values()].filter((value) => value === 2).length !== 821 ||
        [...multiplicity.values()].filter((value) => value === 3).length !== 25 ||
        [...multiplicity.values()].some((value) => value !== 2 && value !== 3)
    ) throw new Error("Action-burst seed multiplicity drifted");

    const supalosa = bases.filter((trace) => trace.opponent === "pinned_supalosa");
    const advanced = bases.filter((trace) => trace.opponent === "ra2web_advanced");
    if (supalosa.length !== 1_008 || advanced.length !== 684) {
        throw new Error("Action-burst opponent population drifted");
    }
    if (
        new Set(supalosa.map((trace) => trace.mapId)).size !== 15 ||
        new Set(advanced.map((trace) => trace.mapId)).size !== 10 ||
        advanced.some((trace) => !trace.mapId.startsWith("hfo-"))
    ) throw new Error("Action-burst opponent map coverage drifted");
    return true;
};
