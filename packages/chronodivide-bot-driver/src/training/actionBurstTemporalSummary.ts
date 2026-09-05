import {
    ActionBurstClass,
    ActionBurstEvent,
    ActionBurstMethod,
    ActionBurstSide,
    rejectActionBurstProhibitedFields,
} from "./timestampedActionAudit.js";
import { FRESH_DUAL_ACTION_METHODS } from "./freshDualStudyInstrumentation.js";

export const ACTION_BURST_CLASSES: readonly ActionBurstClass[] = [
    "order", "gameplay_nonorder", "debug_or_communication", "suppressed_quit",
];
export type ActionBurstDimensionType = "all" | "method" | "class";
export type ActionBurstTemporalMetrics = {
    side: ActionBurstSide;
    dimensionType: ActionBurstDimensionType;
    dimensionValue: string;
    calls: number;
    callsPer900: number;
    quarter0: number;
    quarter1: number;
    quarter2: number;
    quarter3: number;
    maxRolling900: number;
    maxSameUpdate: number;
    multiCallUpdates: number;
    duplicateSameUpdateFraction: number;
    duplicateWithin30Fraction: number;
    orderUnitIds: number;
    orderUnitIdsPerCall: number;
    maxRolling900OrderUnitIds: number;
};
export type ActionBurstDistribution = {
    n: number;
    mean: number;
    median: number;
    q25: number;
    q75: number;
    min: number;
    max: number;
    q90: number;
    q95: number;
    q99: number;
    q999: number;
};

const quantile = (values: readonly number[], probability: number): number => {
    if (!values.length || probability < 0 || probability > 1) {
        throw new Error("Action-burst quantile request is invalid");
    }
    const ordered = [...values].sort((left, right) => left - right);
    const position = (ordered.length - 1) * probability;
    const lower = Math.floor(position);
    const upper = Math.ceil(position);
    if (lower === upper) return ordered[lower];
    const weight = position - lower;
    return ordered[lower] * (1 - weight) + ordered[upper] * weight;
};

export const actionBurstDistribution = (
    values: readonly number[],
): ActionBurstDistribution => {
    if (!values.length || values.some((value) => !Number.isFinite(value))) {
        throw new Error("Action-burst distribution values are invalid");
    }
    const result: ActionBurstDistribution = {
        n: values.length,
        mean: values.reduce((total, value) => total + value, 0) / values.length,
        median: quantile(values, 0.5),
        q25: quantile(values, 0.25),
        q75: quantile(values, 0.75),
        min: Math.min(...values),
        max: Math.max(...values),
        q90: quantile(values, 0.9),
        q95: quantile(values, 0.95),
        q99: quantile(values, 0.99),
        q999: quantile(values, 0.999),
    };
    rejectActionBurstProhibitedFields(result);
    return result;
};

const temporalMetrics = (
    events: readonly ActionBurstEvent[],
    side: ActionBurstSide,
    dimensionType: ActionBurstDimensionType,
    dimensionValue: string,
    horizon: number,
): ActionBurstTemporalMetrics => {
    const ordered = [...events].sort((left, right) => left.update - right.update);
    const quarters = [0, 0, 0, 0];
    const byUpdate = new Map<number, number>();
    let duplicateSame = 0;
    let duplicateWithin = 0;
    const seenAtUpdate = new Set<string>();
    const last = new Map<string, number>();
    let orderUnitIds = 0;
    for (const event of ordered) {
        quarters[Math.min(3, Math.floor(event.update / 900))] += 1;
        byUpdate.set(event.update, (byUpdate.get(event.update) ?? 0) + 1);
        const key = event.method + "|" + event.argumentSha256;
        const sameKey = event.update + "|" + key;
        if (seenAtUpdate.has(sameKey)) duplicateSame += 1;
        seenAtUpdate.add(sameKey);
        const previous = last.get(key);
        if (previous !== undefined && event.update - previous <= 30) duplicateWithin += 1;
        last.set(key, event.update);
        orderUnitIds += event.order?.unitCount ?? 0;
    }
    let right = 0;
    let rollingIds = 0;
    let maxRolling = 0;
    let maxRollingIds = 0;
    for (let left = 0; left < ordered.length; left += 1) {
        if (right < left) {
            right = left;
            rollingIds = 0;
        }
        while (
            right < ordered.length &&
            ordered[right].update < ordered[left].update + 900
        ) {
            rollingIds += ordered[right].order?.unitCount ?? 0;
            right += 1;
        }
        maxRolling = Math.max(maxRolling, right - left);
        maxRollingIds = Math.max(maxRollingIds, rollingIds);
        rollingIds -= ordered[left].order?.unitCount ?? 0;
    }
    const calls = ordered.length;
    const result: ActionBurstTemporalMetrics = {
        side,
        dimensionType,
        dimensionValue,
        calls,
        callsPer900: calls * 900 / horizon,
        quarter0: quarters[0],
        quarter1: quarters[1],
        quarter2: quarters[2],
        quarter3: quarters[3],
        maxRolling900: maxRolling,
        maxSameUpdate: Math.max(0, ...byUpdate.values()),
        multiCallUpdates: [...byUpdate.values()].filter((value) => value > 1).length,
        duplicateSameUpdateFraction: calls ? duplicateSame / calls : 0,
        duplicateWithin30Fraction: calls ? duplicateWithin / calls : 0,
        orderUnitIds,
        orderUnitIdsPerCall: calls ? orderUnitIds / calls : 0,
        maxRolling900OrderUnitIds: maxRollingIds,
    };
    rejectActionBurstProhibitedFields(result);
    return result;
};

export const summarizeActionBurstEvents = (
    events: readonly ActionBurstEvent[],
    horizon = 3_600,
): ActionBurstTemporalMetrics[] => {
    if (horizon !== 3_600) throw new Error("Action-burst horizon must be exactly 3600");
    let previous = -1;
    for (const event of events) {
        rejectActionBurstProhibitedFields(event);
        if (
            !Number.isSafeInteger(event.update) ||
            event.update < 0 ||
            event.update >= horizon ||
            event.update < previous
        ) throw new Error("Action-burst event update drifted");
        previous = event.update;
    }
    const output: ActionBurstTemporalMetrics[] = [];
    for (const side of ["candidate", "baseline"] as const) {
        const sideEvents = events.filter((event) => event.side === side);
        output.push(temporalMetrics(sideEvents, side, "all", "all", horizon));
        for (const method of FRESH_DUAL_ACTION_METHODS) {
            output.push(temporalMetrics(
                sideEvents.filter((event) => event.method === method),
                side,
                "method",
                method,
                horizon,
            ));
        }
        for (const value of ACTION_BURST_CLASSES) {
            output.push(temporalMetrics(
                sideEvents.filter((event) => event.actionClass === value),
                side,
                "class",
                value,
                horizon,
            ));
        }
    }
    if (output.length !== 40) throw new Error("Action-burst temporal row count drifted");
    return output;
};

export const deriveActionBurstReserve = (
    rows: readonly ActionBurstTemporalMetrics[],
): {
    maximumRollingGameplayNonorder: number;
    protectedReserve: number;
    smallestCeilingFeasible: boolean;
} => {
    const eligible = rows.filter((row) =>
        row.dimensionType === "class" &&
        row.dimensionValue === "gameplay_nonorder"
    );
    if (!eligible.length) throw new Error("Action-burst reserve rows are missing");
    const maximum = Math.max(...eligible.map((row) => row.maxRolling900));
    const result = {
        maximumRollingGameplayNonorder: maximum,
        protectedReserve: Math.max(8, Math.ceil(maximum) + 4),
        smallestCeilingFeasible: Math.max(8, Math.ceil(maximum) + 4) < 75,
    };
    rejectActionBurstProhibitedFields(result);
    return result;
};
