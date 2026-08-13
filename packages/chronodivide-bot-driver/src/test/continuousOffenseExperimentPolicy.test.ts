import { describe, expect, it } from "vitest";
import {
    CONTINUOUS_OFFENSE_ARM_ORDER,
    buildContinuousOffenseArms,
    continuousOffenseExperimentPolicySha256,
    validateContinuousOffenseExperimentPolicy,
} from "../training/continuousOffenseExperimentPolicy.js";

describe("continuous-offense experiment policies", () => {
    it("freezes six unique causal arms in their declared order", () => {
        const arms = buildContinuousOffenseArms();
        expect(arms.map(({ armId }) => armId)).toEqual(CONTINUOUS_OFFENSE_ARM_ORDER);
        expect(new Set(arms.map(({ policyId }) => policyId)).size).toBe(arms.length);
        for (const arm of arms) {
            expect(validateContinuousOffenseExperimentPolicy(arm.policy)).toEqual(arm.policy);
            expect(continuousOffenseExperimentPolicySha256(arm.policy)).toBe(arm.policyId);
        }
    });

    it("changes only the declared causal dimensions among macro interventions", () => {
        const byId = new Map(buildContinuousOffenseArms().map((arm) => [arm.armId, arm.policy]));
        const proposed = byId.get("macro_route_blockers_full")!;
        const minimum = byId.get("macro_route_blockers_minimum")!;
        const buildings = byId.get("macro_buildings_only")!;
        expect({ ...minimum.objectivePolicy, strikeGroupMode: proposed.objectivePolicy.strikeGroupMode })
            .toEqual(proposed.objectivePolicy);
        expect({ ...buildings.objectivePolicy, forceEngagementMode: proposed.objectivePolicy.forceEngagementMode })
            .toEqual(proposed.objectivePolicy);
    });

    it("fails closed if an external control enables the intervention", () => {
        const external = buildContinuousOffenseArms()[0].policy;
        expect(() => validateContinuousOffenseExperimentPolicy({
            ...external,
            objectivePolicy: { ...external.objectivePolicy, enabled: true },
        })).toThrow("External control");
    });
});
