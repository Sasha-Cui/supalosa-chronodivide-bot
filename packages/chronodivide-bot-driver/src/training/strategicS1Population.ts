import { StrategicS1Plan, validateStrategicS1Plan } from "./strategicS1Plan.js";
import { exactFields } from "./strategicS1Validation.js";
import { natural, S1_ENUMS, S1_SIDES } from "./strategicS1Observation.js";
import { validateS1Diagnostic, s1Require, s1Equal, s1Hash } from "./strategicS1Results.js";
import { describeS1Episode, S1_SCREENS, S1_TARGET_CATEGORIES } from "./strategicS1Descriptions.js";
import { S1Distribution, S1MetricDefinition, S1MetricRow, mergeS1Distributions } from "./strategicS1Distributions.js";
import { FRESH_DUAL_ACTION_METHODS } from "./freshDualStudyInstrumentation.js";

export const S1_STATUSES = [
    "candidate_win",
    "baseline_win",
    "simultaneous_draw",
    "engine_nonliteral_termination_draw",
    "tick_cap_draw",
] as const;
const OUTCOMES = ["W", "D", "L"] as const;
const sum = (x: number[]) => x.reduce((n, v) => n + v, 0);
const distribution = (x: number[]) => {
    const d = new S1Distribution();
    x.forEach((v) => d.add(v));
    return d.finish();
};
const missingMetric = (definition: S1MetricDefinition, samples: number): S1MetricRow => {
    const d = new S1Distribution();
    if (definition.absent === "zero") {
        s1Require(definition.basis === "sample", "zero-fill basis");
        d.add(0, "", samples);
    }
    return { key: definition.key, ...d.finish() };
};
const endpoint = (r: any, version: "v5" | "v6") => {
    const value = r.dualState[version].firstResult;
    s1Require(
        S1_STATUSES.includes(value.status) && ["candidate", "baseline", "draw"].includes(value.winner),
        "endpoint labels",
    );
    const outcome =
        value.winner === "candidate" ? ("W" as const) : value.winner === "baseline" ? ("L" as const) : ("D" as const);
    return { status: value.status as (typeof S1_STATUSES)[number], outcome, firstResultTick: value.tick };
};

/** Fails closed unless the ENTIRE frozen population is present and both ledgers of
 * every case replay. There is deliberately no partial/subset/candidate-selection mode. */
export async function analyzeStrategicS1Population(
    plan: StrategicS1Plan,
    input: Array<{ assignment: StrategicS1Plan["cases"][number]; episode: unknown }>,
) {
    validateStrategicS1Plan(plan);
    s1Require(Array.isArray(input) && input.length === 200, "complete 200-case population");
    const seen = new Set<number>();
    for (const record of input) {
        exactFields(record, "assignment episode");
        natural(record.assignment?.caseIndex);
        const index = record.assignment.caseIndex;
        s1Require(index < 200 && !seen.has(index), "duplicate/out-of-population case");
        seen.add(index);
        exactFields(record.assignment, Object.keys(plan.cases[index]).join(" "));
        s1Equal(record.assignment, plan.cases[index], "complete frozen assignment");
    }
    type Case = Omit<ReturnType<typeof describeS1Episode>, "definitions"> & {
        assignment: StrategicS1Plan["cases"][number];
        updates: number;
        endpoints: { v5: ReturnType<typeof endpoint>; v6: ReturnType<typeof endpoint> };
        provenance: Awaited<ReturnType<typeof validateS1Diagnostic>>["provenance"];
        crossLedger: Awaited<ReturnType<typeof validateS1Diagnostic>>["crossLedger"];
    };
    const cases: Case[] = [],
        definitions = new Map<string, S1MetricDefinition>();
    for (const record of input.slice().sort((a, b) => a.assignment.caseIndex - b.assignment.caseIndex)) {
        const checked = await validateS1Diagnostic(record.episode, record.assignment);
        const described = describeS1Episode(checked.samples, checked.episode.updates);
        for (const definition of described.definitions) {
            const prior = definitions.get(definition.key);
            if (prior) s1Equal(definition, prior, "metric definition consistency");
            else definitions.set(definition.key, definition);
        }
        const { definitions: _definitions, ...description } = described;
        cases.push({
            assignment: record.assignment,
            updates: checked.episode.updates,
            endpoints: { v5: endpoint(checked.episode, "v5"), v6: endpoint(checked.episode, "v6") },
            provenance: checked.provenance,
            crossLedger: checked.crossLedger,
            ...description,
        });
    }
    const metricDefinitions = [...definitions.values()].sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
    // Complete rule/type census makes absence of a particular observed catalog entry
    // a measured zero. Missing optional fields and empty mission/unit domains are NOT zero.
    for (const c of cases) {
        const existing = new Map(c.metrics.map((m) => [m.key, m]));
        c.metrics = metricDefinitions.map((d) => existing.get(d.key) ?? missingMetric(d, c.sampleCount));
    }
    const metricsByCase = new Map(
        cases.map((c) => [c.assignment.caseIndex, new Map(c.metrics.map((m) => [m.key, m]))]),
    );
    const selectors: Array<{ family: string; value: string; select: (c: Case) => boolean }> = [
        { family: "overall", value: "all", select: () => true },
    ];
    const partition = (family: string, values: string[], value: (c: Case) => string) => {
        for (const label of values) selectors.push({ family, value: label, select: (c) => value(c) === label });
    };
    partition("opponent", ["pinned_supalosa", "ra2web_advanced"], (c) => c.assignment.opponent);
    partition("stratum", [...new Set(plan.cases.map((c) => c.stratumId))], (c) => c.assignment.stratumId);
    partition(
        "map",
        plan.maps.map((m: { id: string }) => m.id),
        (c) => c.assignment.mapId,
    );
    partition("country", ["Americans", "Africans"], (c) => c.assignment.country);
    partition("faction", ["Allied", "Soviet"], (c) => (c.assignment.country === "Americans" ? "Allied" : "Soviet"));
    partition("slot", ["0", "1"], (c) => String(c.assignment.candidateSlot));
    partition("direction", ["0", "1"], (c) => String(c.assignment.directionOrdinal));
    partition("topology", [...new Set(plan.cases.map((c) => c.topologyId))], (c) => c.assignment.topologyId);
    for (const version of ["v5", "v6"] as const) {
        partition(version + "_status", [...S1_STATUSES], (c) => c.endpoints[version].status);
        partition(version + "_outcome", [...OUTCOMES], (c) => c.endpoints[version].outcome);
    }
    const groups = selectors.map((selector) => {
        const selected = cases.filter(selector.select);
        const endpoints = Object.fromEntries(
            (["v5", "v6"] as const).map((version) => [
                version,
                {
                    W: selected.filter((c) => c.endpoints[version].outcome === "W").length,
                    D: selected.filter((c) => c.endpoints[version].outcome === "D").length,
                    L: selected.filter((c) => c.endpoints[version].outcome === "L").length,
                    statuses: Object.fromEntries(
                        S1_STATUSES.map((status) => [
                            status,
                            selected.filter((c) => c.endpoints[version].status === status).length,
                        ]),
                    ),
                    firstResultTicks: distribution(selected.map((c) => c.endpoints[version].firstResultTick)),
                },
            ]),
        );
        const screens = Object.fromEntries(
            S1_SCREENS.map((name) => {
                const values = selected.map((c) => c.screens[name]);
                const eligible = sum(values.map((v) => v.eligibleSamples)),
                    unavailable = sum(values.map((v) => v.unavailableSamples)),
                    trueSamples = sum(values.map((v) => v.trueSamples));
                const reasons: Record<string, number> = {};
                for (const c of selected)
                    for (const [key, count] of Object.entries(c.screenAvailability[name].reasons))
                        reasons[key] = (reasons[key] ?? 0) + count;
                const positiveCases = values.filter((v) => v.anyFourSampleScreen).length;
                return [
                    name,
                    {
                        positiveCases,
                        cases: selected.length,
                        incidence: selected.length ? positiveCases / selected.length : null,
                        casesWithEligibleSamples: values.filter((v) => v.eligibleSamples > 0).length,
                        casesWithFourPeriodicSamples: selected.filter((c) => c.periodicSamples >= 4).length,
                        casesWithUnavailableSamples: values.filter((v) => v.unavailableSamples > 0).length,
                        periodicSamples: sum(selected.map((c) => c.periodicSamples)),
                        eligibleSamples: eligible,
                        unavailableSamples: unavailable,
                        trueSamples,
                        trueFractionAmongEligible: eligible ? trueSamples / eligible : null,
                        unavailableReasons: reasons,
                        unavailableReasonsMayOverlap: true,
                        maxConsecutivePeriodicSamples: distribution(values.map((v) => v.maxConsecutivePeriodicSamples)),
                    },
                ];
            }),
        );
        const totalUpdates = sum(selected.map((c) => c.updates));
        const actions = Object.fromEntries(
            S1_SIDES.map((side) => {
                const collect = (kind: "methods" | "orders" | "targets", keys: readonly string[]) =>
                    Object.fromEntries(
                        keys.map((key) => {
                            const total = sum(selected.map((c) => c.actionTotals[side][kind][key]));
                            return [
                                key,
                                {
                                    count: total,
                                    updates: totalUpdates,
                                    perObservedUpdateIncludingStartup: totalUpdates ? total / totalUpdates : null,
                                },
                            ];
                        }),
                    );
                return [
                    side,
                    {
                        methods: collect("methods", FRESH_DUAL_ACTION_METHODS),
                        orders: collect("orders", S1_ENUMS.order),
                        targets: collect("targets", S1_TARGET_CATEGORIES),
                        startupCalls: sum(selected.map((c) => c.actionTotals[side].startupCalls)),
                        requestedUnitIdOccurrences: sum(
                            selected.map((c) => c.actionTotals[side].requestedUnitIdOccurrences),
                        ),
                    },
                ];
            }),
        );
        return {
            family: selector.family,
            value: selector.value,
            cases: selected.length,
            caseIndices: selected.map((c) => c.assignment.caseIndex),
            endpoints,
            observedUpdates: distribution(selected.map((c) => c.updates)),
            metrics: metricDefinitions.map((d) => ({
                key: d.key,
                ...mergeS1Distributions(selected.map((c) => metricsByCase.get(c.assignment.caseIndex)!.get(d.key)!)),
            })),
            screens,
            actions,
        };
    });
    for (const family of new Set(selectors.map((s) => s.family)))
        s1Require(
            sum(groups.filter((g) => g.family === family).map((g) => g.cases)) === 200,
            "complete group partition " + family,
        );
    s1Require(
        groups.filter((g) => g.family === "stratum").length === 25 &&
            groups.filter((g) => g.family === "stratum").every((g) => g.cases === 8) &&
            groups.filter((g) => g.family === "topology").length === 5,
        "frozen grouping counts",
    );
    const measurementTransitions = S1_STATUSES.flatMap((v5) =>
        S1_STATUSES.map((v6) => ({
            v5,
            v6,
            count: cases.filter((c) => c.endpoints.v5.status === v5 && c.endpoints.v6.status === v6).length,
        })),
    );
    return {
        kind: "strategic-s1-population-analysis-v1" as const,
        complete: true as const,
        policyComparison: false as const,
        policySelectionAuthorized: false as const,
        independentAudit: false as const,
        planSha256: s1Hash(plan),
        counts: {
            cases: 200,
            endpointReplays: 200,
            strategicReplays: 200,
            samples: sum(cases.map((c) => c.sampleCount)),
            periodicSamples: sum(cases.map((c) => c.periodicSamples)),
            strata: 25,
            topologies: 5,
            groups: groups.length,
            metrics: metricDefinitions.length,
        },
        conventions: {
            quantiles: "zero-based sorted rank min(n-1,floor(q*n)); no interpolation",
            weighting:
                "Pooled distributions weight retained observations in the declared domain, not elapsed time. Equal-case distributions summarize each case's observed mean separately.",
            absentCatalogRows:
                "Zero only for complete sample censuses of an observed rule/queue-item/mission-type catalog entry. No-observation domains and missing optional fields remain unavailable.",
            rates: "Aggregate action rates use total calls including startup divided by actual observed advancing updates; startup window rates are unavailable.",
            screens:
                "Four consecutive periodic samples of the same predicate/mission span900updates but do not prove continuous truth. Unobserved screens do not prove absence. Missing-reason counts can overlap.",
            scientificScope:
                "One unchanged policy, descriptive diagnosis only. No superiority test, historical win-rate comparison, automatic intervention, causal inference, income estimate or combat-strength calibration.",
        },
        enums: S1_ENUMS,
        metricDefinitions,
        cases,
        groups,
        measurementTransitions,
    };
}
