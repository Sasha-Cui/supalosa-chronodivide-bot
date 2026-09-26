import { buildUnifiedIntentD1Plan } from "./unifiedIntentD1Plan.js";
import { UnifiedIntentGate3Map } from "./unifiedIntentGate3Plan.js";
export const S1_SOURCE_PROTOCOL_SHA256 = "952bca278befb716a25551d022fd3954b9ed999be375d8d9baf1253c53dc5b54";
export const S1_SEEDS = { main: 3350120000, canary: 3350121000, smoke: 3350121100 } as const;
export const S1_POLICY = { id: "unchanged_strongbot", arbiterEnabled: false } as const;
export const S1_OBSERVERS = ["endpoint_only", "strategic"] as const;
export const buildStrategicS1Plan = (maps: UnifiedIntentGate3Map[]) => {
    const d1 = buildUnifiedIntentD1Plan(maps);
    const cases = d1.cases.map((c) => ({
        ...c,
        role: "diagnostic" as const,
        requestedEngineSeed: S1_SEEDS.main + c.caseIndex,
    }));
    const canaries = d1.canaries.map((c, i) => ({ ...c, requestedEngineSeed: S1_SEEDS.canary + i }));
    const smoke = { ...d1.smoke, requestedEngineSeed: S1_SEEDS.smoke };
    return {
        kind: "strategic-diagnostic-s1-plan-v1" as const,
        protocolSha256: S1_SOURCE_PROTOCOL_SHA256,
        maps: structuredClone(maps),
        countries: ["Americans", "Africans"],
        policy: S1_POLICY,
        observers: S1_OBSERVERS,
        cases,
        canaries,
        smoke,
        counts: {
            definitions: 205,
            mainCases: 200,
            mainEpisodes: 200,
            canaryEpisodes: 8,
            smokeEpisodes: 1,
            advancingEpisodes: 209,
            strata: 25,
            topologies: 5,
            countryDirectionClusters: 4,
            supalosaCases: 120,
            advancedCases: 80,
        },
    };
};
export type StrategicS1Plan = ReturnType<typeof buildStrategicS1Plan>;
export const validateStrategicS1Plan = (value: StrategicS1Plan) => {
    if (JSON.stringify(value) !== JSON.stringify(buildStrategicS1Plan(value.maps))) {
        throw new Error("S1 plan does not match the prospective freeze");
    }
};
