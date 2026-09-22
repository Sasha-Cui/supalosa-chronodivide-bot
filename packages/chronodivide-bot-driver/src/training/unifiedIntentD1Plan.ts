import { buildUnifiedIntentV2OD1Plan, OD1_MAP_IDS } from "./unifiedIntentV2OD1Plan.js";
import { UnifiedIntentGate3Map } from "./unifiedIntentGate3Plan.js";

export const D1_COUNTRIES = ["Americans", "Africans"] as const;
export const D1_ARMS = [
    { id: "disabled", enabled: false },
    { id: "separated_lanes_v2", enabled: true, budgetMode: "separated_lanes_v2", commandCeiling: 115 },
    { id: "separated_lanes_unbounded_d1", enabled: true,
        budgetMode: "separated_lanes_unbounded_d1", commandCeiling: null },
] as const;
export type D1Arm = typeof D1_ARMS[number];
export const D1_COMPETITIVE_SEED_BASE = 3_350_110_000;
export const D1_CANARY_SEED_BASE = 3_350_111_000;
export const D1_SMOKE_SEED = 3_350_111_100;
export const D1_MAX_UPDATES = 24_000;
export const D1_CANARY_UPDATES = 3_600;

/** Pure definitions only. Metadata collision audit and effective zero-update checks are separate gates. */
export const buildUnifiedIntentD1Plan = (maps: UnifiedIntentGate3Map[]) => {
    // Reuse the frozen map/start validation and configuration identities, never outcomes.
    const original = buildUnifiedIntentV2OD1Plan(maps);
    const cases: Array<typeof original.cases[number]> = [];
    for (const opponent of ["pinned_supalosa", "ra2web_advanced"] as const) {
        for (const mapId of OD1_MAP_IDS) {
            if (opponent === "ra2web_advanced" && !mapId.startsWith("hfo-")) continue;
            for (const directionOrdinal of [0, 1]) {
                for (const [countryOrdinal, country] of D1_COUNTRIES.entries()) {
                    for (const candidateSlot of [0, 1]) {
                        const value = original.cases.find(row => row.opponent === opponent &&
                            row.mapId === mapId && row.directionOrdinal === directionOrdinal &&
                            row.country === country && row.candidateSlot === candidateSlot);
                        if (!value) throw new Error("D1 frozen configuration is missing");
                        const caseIndex = cases.length;
                        cases.push({ ...value, caseIndex, countryOrdinal,
                            requestedEngineSeed: D1_COMPETITIVE_SEED_BASE + caseIndex });
                    }
                }
            }
        }
    }
    const definitions = [
        ["hfo-le", "pinned_supalosa"], ["peak", "pinned_supalosa"],
        ["tour-of-egypt", "pinned_supalosa"], ["hfo-le", "ra2web_advanced"],
    ] as const;
    const canaries = definitions.map(([mapId, opponent], index) => {
        const value = cases.find(row => row.mapId === mapId && row.opponent === opponent &&
            row.directionOrdinal === 0 && row.country === "Americans" && row.candidateSlot === 0);
        if (!value) throw new Error("D1 canary configuration is missing");
        return { ...value, role: "canary" as const, caseIndex: 200 + index,
            requestedEngineSeed: D1_CANARY_SEED_BASE + index, maxUpdates: D1_CANARY_UPDATES };
    });
    const smoke = { ...canaries[0], role: "smoke" as const, caseIndex: 204,
        requestedEngineSeed: D1_SMOKE_SEED, maxUpdates: D1_MAX_UPDATES };
    return {
        kind: "unified-intent-budget-diagnostic-d1-plan-v1" as const,
        maps: structuredClone(maps), countries: [...D1_COUNTRIES], arms: D1_ARMS,
        cases, canaries, smoke,
        counts: { zeroUpdateDefinitions: 205, competitiveBlocks: 200, competitiveEpisodes: 600,
            canaryConfigurations: 4, canaryEpisodes: 24, smokeEpisodes: 3, advancingEpisodes: 627,
            strata: 25, topologies: 5, countryDirectionClusters: 4, supalosaCases: 120, advancedCases: 80 },
    };
};
export type UnifiedIntentD1Plan = ReturnType<typeof buildUnifiedIntentD1Plan>;
export type UnifiedIntentD1Case = UnifiedIntentD1Plan["cases"][number] |
    UnifiedIntentD1Plan["canaries"][number] | UnifiedIntentD1Plan["smoke"];
export const validateUnifiedIntentD1Plan = (plan: UnifiedIntentD1Plan, frozenMaps: UnifiedIntentGate3Map[]): void => {
    if (JSON.stringify(plan) !== JSON.stringify(buildUnifiedIntentD1Plan(frozenMaps))) {
        throw new Error("D1 plan differs from its frozen reconstruction");
    }
};
