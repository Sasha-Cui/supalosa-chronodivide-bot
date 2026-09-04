import assert from "node:assert/strict";

import {
    analyzeFreshDualRows,
    freshDualScore,
    freshDualTLower,
} from "./fresh-dual-analysis-v1.mjs";

export const FRESH_DUAL_ANALYSIS_V2 = "fresh-dual-analysis-v2-map-aware-endpoint-effects";
export const FRESH_DUAL_T95_BY_CLUSTER_COUNT = Object.freeze({
    18: 1.7396067260750672,
    36: 1.6895724577802655,
    54: 1.674116236703115,
    72: 1.6665996583285084,
    450: 1.6482543776503167,
});

const mean = (values) => values.reduce((total, value) => total + value, 0) / values.length;
const canonical = (value) => JSON.stringify(value);
const groupBy = (rows, fields) => {
    const groups = new Map();
    for (const row of rows) {
        const values = fields.map((field) => row[field]);
        const key = canonical(values);
        if (!groups.has(key)) groups.set(key, { values, rows: [] });
        groups.get(key).rows.push(row);
    }
    return [...groups.values()].sort((left, right) =>
        canonical(left.values).localeCompare(canonical(right.values)));
};
const dimensions = (fields, values) => {
    const output = { cohort: "", mapId: "", arm: "" };
    fields.forEach((field, index) => {
        output[field] = values[index];
    });
    return output;
};
const endpointWinner = (row, endpointName) => {
    const value = row[endpointName];
    assert.ok(value && ["candidate", "baseline", "draw"].includes(value.winner));
    return value.winner;
};

export const freshDualT95ForClusterCount = (clusterCount) => {
    assert.ok(Number.isSafeInteger(clusterCount) && clusterCount > 1);
    const critical = FRESH_DUAL_T95_BY_CLUSTER_COUNT[clusterCount];
    assert.ok(Number.isFinite(critical), `Unsupported endpoint-effect cluster count ${clusterCount}`);
    return critical;
};

const difference = (row) =>
    freshDualScore(endpointWinner(row, "v6")) - freshDualScore(endpointWinner(row, "v5"));

/**
 * Correct only the descriptive endpoint-effect table. Scientific gates remain
 * delegated to the frozen V1 implementation.
 */
export const correctedFreshDualEndpointEffects = (rows) => {
    assert.ok(Array.isArray(rows) && rows.length > 0);
    const output = [];
    for (const [level, fields] of [
        ["overall", []],
        ["cohort_arm", ["cohort", "arm"]],
        ["map_arm", ["cohort", "mapId", "arm"]],
    ]) {
        for (const group of groupBy(rows, fields)) {
            const differences = group.rows.map(difference);
            const common = {
                level,
                ...dimensions(fields, group.values),
                n: differences.length,
                meanScoreDifference: mean(differences),
                favorable: differences.filter((value) => value > 0).length,
                unchanged: differences.filter((value) => value === 0).length,
                unfavorable: differences.filter((value) => value < 0).length,
            };
            if (level === "overall") {
                output.push({
                    ...common,
                    countryStartClusters: null,
                    countryStartMeanDifference: null,
                    countryStartLower95: null,
                    tCritical95: null,
                    inferenceStatus: "omitted-heterogeneous-all-row-mixture",
                });
                continue;
            }
            const clusters = groupBy(
                group.rows,
                ["mapId", "country", "candidateStart"],
            ).map((cluster) => mean(cluster.rows.map(difference)));
            const critical = freshDualT95ForClusterCount(clusters.length);
            output.push({
                ...common,
                countryStartClusters: clusters.length,
                countryStartMeanDifference: mean(clusters),
                countryStartLower95: freshDualTLower(clusters, critical),
                tCritical95: critical,
                inferenceStatus: "map-country-start-clustered-one-sided-95",
            });
        }
    }
    return output;
};

export const analyzeFreshDualRowsV2 = (rows) => {
    const frozen = analyzeFreshDualRows(rows);
    return {
        ...frozen,
        analysisRevision: FRESH_DUAL_ANALYSIS_V2,
        endpointEffects: correctedFreshDualEndpointEffects(rows),
        frozenGateImplementation: "fresh-dual-analysis-v1",
        heterogeneousOverallEndpointEffectInference: "omitted",
    };
};
