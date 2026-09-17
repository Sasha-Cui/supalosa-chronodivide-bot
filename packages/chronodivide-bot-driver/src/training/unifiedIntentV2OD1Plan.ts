import { buildUnifiedIntentV2Gate2Plan } from "./unifiedIntentV2Gate2Plan.js";
import { UnifiedIntentGate3Map } from "./unifiedIntentGate3Plan.js";

export const OD1_MAP_IDS = [
    "hfo-le", "peak", "hfo-original", "hfo-golden", "hfo-corners",
    "hfo-corners-b", "hfo-corners-b-golden", "hfo-bvb", "hfo-lvl",
    "hfo-rvr", "hfo-tvt", "tour-of-egypt", "south-pacific",
    "south-pacific-2", "pacific-heights",
] as const;
export const OD1_ARMS = [
    { id: "disabled", enabled: false },
    { id: "separated_lanes_v2", enabled: true, budgetMode: "separated_lanes_v2", commandCeiling: 115 },
] as const;
export type OD1Arm = typeof OD1_ARMS[number];
export const OD1_COMPETITIVE_SEED_BASE = 3_350_106_000;
export const OD1_CANARY_SEED_BASE = 3_350_107_000;
export const OD1_SMOKE_SEED = 3_350_107_100;
export const OD1_MAX_UPDATES = 24_000;
export const OD1_CANARY_UPDATES = 3_600;

export const od1Topology = (id: string): string => {
    if (!OD1_MAP_IDS.includes(id as typeof OD1_MAP_IDS[number])) throw new Error("Unknown OD1 map");
    if (id.startsWith("hfo-")) return "hfo";
    if (id.startsWith("south-pacific")) return "south-pacific";
    return id;
};

export const buildUnifiedIntentV2OD1Plan = (maps: UnifiedIntentGate3Map[]) => {
    if (JSON.stringify(maps.map((map) => map.id)) !== JSON.stringify(OD1_MAP_IDS) ||
        maps.some((map) => !/^[0-9a-f]{64}$/.test(map.sha256) ||
            map.advancedEligible !== map.id.startsWith("hfo-") ||
            map.starts.length < 2 || new Set(map.starts).size !== map.starts.length ||
            map.starts.some((start) => !/^\d+,\d+$/.test(start)))) {
        throw new Error("OD1 frozen map order, identity, eligibility, or starts drifted");
    }
    const base = buildUnifiedIntentV2Gate2Plan(maps);
    const cases = base.cases.map(({ arm: _arm, familyId, ...value }) => ({
        ...value, stratumId: familyId, topologyId: od1Topology(value.mapId),
        requestedEngineSeed: OD1_COMPETITIVE_SEED_BASE + value.caseIndex,
        role: "competitive" as const,
    }));
    const canaryDefinitions = [
        ["hfo-le", "pinned_supalosa"], ["peak", "pinned_supalosa"],
        ["tour-of-egypt", "pinned_supalosa"], ["hfo-le", "ra2web_advanced"],
    ] as const;
    const canaries = canaryDefinitions.map(([mapId, opponent], index) => {
        const source = cases.find((value) => value.mapId === mapId && value.opponent === opponent &&
            value.directionOrdinal === 0 && value.country === "Americans" && value.candidateSlot === 0);
        if (!source) throw new Error("OD1 canary configuration unavailable");
        return { ...source, caseIndex: 900 + index, role: "canary" as const,
            requestedEngineSeed: OD1_CANARY_SEED_BASE + index, maxUpdates: OD1_CANARY_UPDATES };
    });
    const smoke = { ...canaries[0], caseIndex: 904, role: "smoke" as const,
        requestedEngineSeed: OD1_SMOKE_SEED, maxUpdates: OD1_MAX_UPDATES };
    return {
        kind: "unified-intent-v2-od1-plan-v1" as const,
        maps: structuredClone(maps), countries: [...base.countries], arms: OD1_ARMS,
        cases, canaries, smoke,
        counts: { zeroUpdateDefinitions: 905, competitivePairs: 900, competitiveEpisodes: 1800,
            canaryConfigurations: 4, canaryEpisodes: 16, smokeEpisodes: 2, advancingEpisodes: 1818,
            strata: 25, topologies: 5, supalosaCases: 540, advancedCases: 360 },
    };
};
export type UnifiedIntentV2OD1Plan = ReturnType<typeof buildUnifiedIntentV2OD1Plan>;
export type UnifiedIntentV2OD1Case = UnifiedIntentV2OD1Plan["cases"][number] |
    UnifiedIntentV2OD1Plan["canaries"][number] | UnifiedIntentV2OD1Plan["smoke"];

/** Reconstruct every field, not merely counts; callers bind map bytes to the audited Gate 2 manifest. */
export const validateUnifiedIntentV2OD1Plan = (
    plan: UnifiedIntentV2OD1Plan, frozenMaps: UnifiedIntentGate3Map[],
): void => {
    if (JSON.stringify(plan) !== JSON.stringify(buildUnifiedIntentV2OD1Plan(frozenMaps))) {
        throw new Error("OD1 plan differs from its frozen reconstruction");
    }
};
