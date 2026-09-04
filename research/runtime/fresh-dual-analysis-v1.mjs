import assert from "node:assert/strict";

export const FRESH_DUAL_WILSON_Z95 = 1.6448536269514722;
export const FRESH_DUAL_T = Object.freeze({
    hfoCountryStart: 1.68957,
    peakCountryStart: 1.73961,
    peakPairedCases: 1.65341,
});
const ALLIED = new Set(["Americans", "Alliance", "French", "Germans", "British"]);
const ENDPOINTS = ["v5", "v6"];

export const freshDualFaction = (country) => ALLIED.has(country) ? "Allied" : "Soviet";
export const freshDualScore = (winner) =>
    winner === "candidate" ? 1 : winner === "draw" ? 0.5 : winner === "baseline" ? 0 : NaN;

export const freshDualWilsonLower = (wins, total, z = FRESH_DUAL_WILSON_Z95) => {
    assert.ok(Number.isSafeInteger(wins) && Number.isSafeInteger(total) && total > 0 && wins >= 0 && wins <= total);
    const p = wins / total;
    const denominator = 1 + z * z / total;
    const center = p + z * z / (2 * total);
    const radius = z * Math.sqrt((p * (1 - p) + z * z / (4 * total)) / total);
    return (center - radius) / denominator;
};

const mean = (values) => values.reduce((total, value) => total + value, 0) / values.length;
const sampleSd = (values) => {
    if (values.length < 2) return 0;
    const center = mean(values);
    return Math.sqrt(values.reduce((total, value) => total + (value - center) ** 2, 0) / (values.length - 1));
};
export const freshDualTLower = (values, criticalValue) => {
    assert.ok(values.length > 0 && Number.isFinite(criticalValue) && criticalValue > 0);
    return mean(values) - criticalValue * sampleSd(values) / Math.sqrt(values.length);
};
const median = (values) => {
    const sorted = values.slice().sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};
const endpoint = (row, name) => {
    const value = row[name];
    assert.ok(value && ["candidate", "baseline", "draw"].includes(value.winner));
    assert.equal(typeof value.status, "string");
    assert.ok(Number.isSafeInteger(value.tick) && value.tick > 0 && value.tick <= 90_000);
    return value;
};
const canonical = (value) => JSON.stringify(value);
const groupBy = (rows, fields) => {
    const groups = new Map();
    for (const row of rows) {
        const values = fields.map((field) => field === "faction"
            ? row.faction ?? freshDualFaction(row.country) : row[field]);
        const key = canonical(values);
        if (!groups.has(key)) groups.set(key, { values, rows: [] });
        groups.get(key).rows.push(row);
    }
    return [...groups.values()].sort((left, right) => canonical(left.values).localeCompare(canonical(right.values)));
};
const dimensionRecord = (fields, values) => {
    const base = {
        cohort: "",
        mapId: "",
        arm: "",
        country: "",
        faction: "",
        start: "",
        slot: "",
    };
    fields.forEach((field, index) => {
        const key = field === "candidateStart" ? "start" : field === "candidateSlot" ? "slot" : field;
        base[key] = values[index];
    });
    return base;
};

export const summarizeFreshDualOutcomes = (rows, endpointName) => {
    assert.ok(rows.length > 0 && ENDPOINTS.includes(endpointName));
    const values = rows.map((row) => endpoint(row, endpointName));
    const wins = values.filter((value) => value.winner === "candidate").length;
    const draws = values.filter((value) => value.winner === "draw").length;
    const losses = values.filter((value) => value.winner === "baseline").length;
    const statuses = {};
    for (const value of values) statuses[value.status] = (statuses[value.status] ?? 0) + 1;
    return {
        n: rows.length,
        wins,
        draws,
        losses,
        winRate: wins / rows.length,
        scoreMean: (wins + 0.5 * draws) / rows.length,
        wilsonWinLower95: freshDualWilsonLower(wins, rows.length),
        meanFirstResultUpdate: mean(values.map((value) => value.tick)),
        medianFirstResultUpdate: median(values.map((value) => value.tick)),
        tickCapDraws: values.filter((value) => value.status === "tick_cap_draw").length,
        nonliteralDraws: values.filter((value) => value.status === "engine_nonliteral_termination_draw").length,
        statusCounts: statuses,
    };
};

const outcomeTables = (rows) => {
    const specifications = [
        ["overall", []],
        ["cohort_arm", ["cohort", "arm"]],
        ["map_arm", ["cohort", "mapId", "arm"]],
        ["map_arm_country", ["cohort", "mapId", "arm", "country"]],
        ["map_arm_faction", ["cohort", "mapId", "arm", "faction"]],
        ["map_arm_start", ["cohort", "mapId", "arm", "candidateStart"]],
        ["map_arm_slot", ["cohort", "mapId", "arm", "candidateSlot"]],
        ["map_arm_country_start", ["cohort", "mapId", "arm", "country", "candidateStart"]],
    ];
    const output = [];
    for (const endpointName of ENDPOINTS) {
        for (const [level, fields] of specifications) {
            for (const group of groupBy(rows, fields)) {
                output.push({
                    endpoint: endpointName,
                    level,
                    ...dimensionRecord(fields, group.values),
                    ...summarizeFreshDualOutcomes(group.rows, endpointName),
                });
            }
        }
    }
    return output;
};

const transitionTables = (rows) => {
    const output = [];
    for (const [level, fields] of [
        ["overall", []],
        ["cohort_arm", ["cohort", "arm"]],
        ["map_arm", ["cohort", "mapId", "arm"]],
    ]) {
        for (const group of groupBy(rows, fields)) {
            const counts = new Map();
            for (const row of group.rows) {
                const from = endpoint(row, "v5");
                const to = endpoint(row, "v6");
                const key = canonical([from.winner, from.status, to.winner, to.status]);
                const previous = counts.get(key) ?? {
                    v5Winner: from.winner,
                    v5Status: from.status,
                    v6Winner: to.winner,
                    v6Status: to.status,
                    count: 0,
                };
                previous.count += 1;
                counts.set(key, previous);
            }
            for (const value of [...counts.values()].sort((a, b) => canonical(a).localeCompare(canonical(b)))) {
                output.push({ level, ...dimensionRecord(fields, group.values), ...value });
            }
        }
    }
    return output;
};

const countryStartMeans = (rows, value) =>
    groupBy(rows, ["country", "candidateStart"]).map((group) => mean(group.rows.map(value)));

const endpointEffects = (rows) => {
    const output = [];
    for (const [level, fields] of [
        ["overall", []],
        ["cohort_arm", ["cohort", "arm"]],
        ["map_arm", ["cohort", "mapId", "arm"]],
    ]) {
        for (const group of groupBy(rows, fields)) {
            const differences = group.rows.map((row) =>
                freshDualScore(endpoint(row, "v6").winner) - freshDualScore(endpoint(row, "v5").winner));
            const clusters = countryStartMeans(group.rows, (row) =>
                freshDualScore(endpoint(row, "v6").winner) - freshDualScore(endpoint(row, "v5").winner));
            output.push({
                level,
                ...dimensionRecord(fields, group.values),
                n: differences.length,
                meanScoreDifference: mean(differences),
                favorable: differences.filter((value) => value > 0).length,
                unchanged: differences.filter((value) => value === 0).length,
                unfavorable: differences.filter((value) => value < 0).length,
                countryStartClusters: clusters.length,
                countryStartMeanDifference: mean(clusters),
                countryStartLower95: clusters.length > 1
                    ? freshDualTLower(clusters, clusters.length === 36
                        ? FRESH_DUAL_T.hfoCountryStart
                        : FRESH_DUAL_T.peakCountryStart)
                    : null,
            });
        }
    }
    return output;
};

const hfoAbsoluteGate = (rows, endpointName) => {
    const overall = summarizeFreshDualOutcomes(rows, endpointName);
    const country = groupBy(rows, ["country"]).map((group) => ({
        country: group.values[0],
        ...summarizeFreshDualOutcomes(group.rows, endpointName),
    }));
    const starts = groupBy(rows, ["candidateStart"]).map((group) => summarizeFreshDualOutcomes(group.rows, endpointName));
    const factions = groupBy(rows, ["faction"]).map((group) => summarizeFreshDualOutcomes(group.rows, endpointName));
    const slots = groupBy(rows, ["candidateSlot"]).map((group) => summarizeFreshDualOutcomes(group.rows, endpointName));
    const cells = groupBy(rows, ["country", "candidateStart"]).map((group) => ({
        country: group.values[0],
        start: group.values[1],
        ...summarizeFreshDualOutcomes(group.rows, endpointName),
    }));
    assert.equal(cells.length, 36);
    const cellWinRates = cells.map((cell) => cell.winRate);
    const superiority = {
        overallWinsExceedLosses: overall.wins > overall.losses,
        everyCountryWinsExceedLosses: country.every((value) => value.wins > value.losses),
        pooledWilsonLowerAboveHalf: overall.wilsonWinLower95 > 0.5,
        countryStartLowerAboveHalf: freshDualTLower(cellWinRates, FRESH_DUAL_T.hfoCountryStart) > 0.5,
        everyStartWilsonLowerAboveHalf: starts.every((value) => value.wilsonWinLower95 > 0.5),
        everyFactionWilsonLowerAboveHalf: factions.every((value) => value.wilsonWinLower95 > 0.5),
        everySlotWilsonLowerAboveHalf: slots.every((value) => value.wilsonWinLower95 > 0.5),
        countriesWithWilsonLowerAboveHalf: country.filter((value) => value.wilsonWinLower95 > 0.5).length,
        strictPositiveCountryStartCells: cells.filter((value) => value.wins > value.losses).length,
        nonnegativeRemainingCountryStartCells: cells.every((value) => value.wins >= value.losses),
    };
    const superiorityPassed = Object.entries(superiority).every(([key, value]) =>
        key === "countriesWithWilsonLowerAboveHalf" ? value >= 7 :
        key === "strictPositiveCountryStartCells" ? value >= 30 : value === true);
    const dominance = {
        pointWinRateAtLeast80: overall.winRate >= 0.8,
        pooledWilsonLowerAbove75: overall.wilsonWinLower95 > 0.75,
        allCountryStartCellsStrictlyPositive: cells.every((value) => value.wins > value.losses),
    };
    return {
        n: rows.length,
        endpoint: endpointName,
        overall,
        countryStartWinRateMean: mean(cellWinRates),
        countryStartWinRateLower95: freshDualTLower(cellWinRates, FRESH_DUAL_T.hfoCountryStart),
        superiority,
        superiorityPassed,
        dominance,
        dominancePassed: superiorityPassed && Object.values(dominance).every(Boolean),
    };
};

const pairedArmEffect = (candidateRows, controlRows, endpointName, criticalValue) => {
    const control = new Map(controlRows.map((row) => [row.caseIndex, row]));
    assert.equal(control.size, controlRows.length);
    const pairs = candidateRows.map((row) => {
        const other = control.get(row.caseIndex);
        assert.ok(other, `Missing paired control for case ${row.caseIndex}`);
        assert.equal(row.requestedEngineSeed, other.requestedEngineSeed);
        assert.equal(row.candidateSlot, other.candidateSlot);
        assert.equal(row.candidateStart, other.candidateStart);
        return {
            candidate: row,
            control: other,
            difference: freshDualScore(endpoint(row, endpointName).winner) -
                freshDualScore(endpoint(other, endpointName).winner),
        };
    });
    assert.equal(pairs.length, controlRows.length);
    const differences = pairs.map((pair) => pair.difference);
    const clusterValues = groupBy(pairs.map((pair) => ({
        ...pair,
        country: pair.candidate.country,
        candidateStart: pair.candidate.candidateStart,
    })), ["country", "candidateStart"]).map((group) => mean(group.rows.map((row) => row.difference)));
    return {
        n: differences.length,
        meanScoreDifference: mean(differences),
        pairedCaseLower95: freshDualTLower(differences, criticalValue),
        favorable: differences.filter((value) => value > 0).length,
        unchanged: differences.filter((value) => value === 0).length,
        unfavorable: differences.filter((value) => value < 0).length,
        countryStartClusters: clusterValues.length,
        countryStartMeanDifference: mean(clusterValues),
        countryStartLower95: freshDualTLower(
            clusterValues,
            clusterValues.length === 36 ? FRESH_DUAL_T.hfoCountryStart : FRESH_DUAL_T.peakCountryStart,
        ),
        byStart: Object.fromEntries(groupBy(pairs.map((pair) => ({
            ...pair, candidateStart: pair.candidate.candidateStart,
        })), ["candidateStart"]).map((group) => [group.values[0], mean(group.rows.map((row) => row.difference))])),
        byFaction: Object.fromEntries(groupBy(pairs.map((pair) => ({
            ...pair, faction: freshDualFaction(pair.candidate.country),
        })), ["faction"]).map((group) => [group.values[0], mean(group.rows.map((row) => row.difference))])),
        bySlot: Object.fromEntries(groupBy(pairs.map((pair) => ({
            ...pair, slot: pair.candidate.candidateSlot,
        })), ["slot"]).map((group) => [group.values[0], mean(group.rows.map((row) => row.difference))])),
        byCountry: Object.fromEntries(groupBy(pairs.map((pair) => ({
            ...pair, country: pair.candidate.country,
        })), ["country"]).map((group) => [group.values[0], mean(group.rows.map((row) => row.difference))])),
        pairs,
    };
};

const peakGate = (rows) => {
    const champion = rows.filter((row) => row.cohort === "peak" && row.arm === "strategy_both");
    const control = rows.filter((row) => row.cohort === "peak" && row.arm === "deployed");
    assert.equal(champion.length, 180);
    assert.equal(control.length, 180);
    const absolute = summarizeFreshDualOutcomes(champion, "v6");
    const cells = groupBy(champion, ["country", "candidateStart"]).map((group) =>
        summarizeFreshDualOutcomes(group.rows, "v6"));
    assert.equal(cells.length, 18);
    const startOutcomes = groupBy(champion, ["candidateStart"]).map((group) =>
        summarizeFreshDualOutcomes(group.rows, "v6"));
    const factionOutcomes = groupBy(champion, ["faction"]).map((group) =>
        summarizeFreshDualOutcomes(group.rows, "v6"));
    const slotOutcomes = groupBy(champion, ["candidateSlot"]).map((group) =>
        summarizeFreshDualOutcomes(group.rows, "v6"));
    const paired = pairedArmEffect(champion, control, "v6", FRESH_DUAL_T.peakPairedCases);
    const weakPairs = paired.pairs.filter((pair) => pair.candidate.candidateStart === "37,73");
    const weakStartExact = weakPairs.length === 90 && weakPairs.every((pair) =>
        pair.candidate.actionSha256 === pair.control.actionSha256 &&
        pair.candidate.ledgerPlainSha256 === pair.control.ledgerPlainSha256 &&
        canonical(pair.candidate.v5) === canonical(pair.control.v5) &&
        canonical(pair.candidate.v6) === canonical(pair.control.v6));
    const checks = {
        winsExceedLosses: absolute.wins > absolute.losses,
        pooledWilsonLowerAboveHalf: absolute.wilsonWinLower95 > 0.5,
        pairedMeanPositive: paired.meanScoreDifference > 0,
        pairedCaseLowerPositive: paired.pairedCaseLower95 > 0,
        everyStartPositive: startOutcomes.every((value) => value.wins > value.losses),
        everyFactionPositive: factionOutcomes.every((value) => value.wins > value.losses),
        everySlotPositive: slotOutcomes.every((value) => value.wins > value.losses),
        everyCountryNoninferior: Object.values(paired.byCountry).every((value) => value >= 0),
        positiveCountries: Object.values(paired.byCountry).filter((value) => value > 0).length,
        countryStartWinRateLowerAboveHalf:
            freshDualTLower(cells.map((cell) => cell.winRate), FRESH_DUAL_T.peakCountryStart) > 0.5,
        pairedCountryStartLowerPositive: paired.countryStartLower95 > 0,
        weakStartExact,
    };
    const passed = Object.entries(checks).every(([key, value]) =>
        key === "positiveCountries" ? value >= 7 : value === true);
    const { pairs, ...pairedSummary } = paired;
    return { absolute, paired: pairedSummary, weakStartPairs: weakPairs.length, checks, passed };
};

const advancedGate = (rows) => {
    const deployed = rows.filter((row) => row.cohort === "advanced" && row.arm === "deployed");
    const control = rows.filter((row) => row.cohort === "advanced" && row.arm === "supalosa_reference");
    assert.equal(deployed.length, 360);
    assert.equal(control.length, 360);
    const paired = pairedArmEffect(deployed, control, "v6", FRESH_DUAL_T.hfoCountryStart);
    const deployedAbsolute = hfoAbsoluteGate(deployed, "v6");
    const controlAbsolute = hfoAbsoluteGate(control, "v6");
    const improvement = {
        pairedMeanPositive: paired.meanScoreDifference > 0,
        pairedCountryStartLowerPositive: paired.countryStartLower95 > 0,
    };
    const { pairs, ...pairedSummary } = paired;
    return {
        deployedAbsolute,
        externalSupalosaAbsolute: controlAbsolute,
        paired: pairedSummary,
        improvement,
        superiorityPassed: deployedAbsolute.superiorityPassed && Object.values(improvement).every(Boolean),
        dominancePassed: deployedAbsolute.dominancePassed && Object.values(improvement).every(Boolean),
    };
};

export const analyzeFreshDualRows = (rows) => {
    assert.equal(rows.length, 2700);
    assert.equal(new Set(rows.map((row) => row.gameIndex)).size, 2700);
    for (const row of rows) {
        endpoint(row, "v5");
        endpoint(row, "v6");
        assert.ok(typeof row.actionSha256 === "string" && /^[0-9a-f]{64}$/.test(row.actionSha256));
        assert.ok(typeof row.ledgerPlainSha256 === "string" && /^[0-9a-f]{64}$/.test(row.ledgerPlainSha256));
    }
    const central = rows.filter((row) => row.cohort === "central" && row.arm === "deployed");
    assert.equal(central.length, 720);
    return {
        complete: true,
        rows: rows.length,
        outcomes: outcomeTables(rows),
        transitions: transitionTables(rows),
        endpointEffects: endpointEffects(rows),
        gates: {
            central: hfoAbsoluteGate(central, "v6"),
            peak: peakGate(rows),
            advanced: advancedGate(rows),
            transferInterpretation: "descriptive-only-no-family-or-general-map-dominance-claim",
        },
    };
};
