import { describe, expect, test } from "vitest";
import { buildMethodV3MechanismArms } from "../training/methodV3MechanismPolicies.js";
import {
    generateMethodV3Stage2Policies,
    METHOD_V3_STAGE2_POLICY_COUNT,
    METHOD_V3_STAGE2_SEARCH_SPACE,
} from "../training/methodV3Stage2Policies.js";
import {
    METHOD_V3_STAGE2_POLICY_SCHEMA_VERSION,
    parseResearchPolicy,
    researchPolicySha256,
} from "../training/researchPolicy.js";

describe("method-v3 Stage-2 candidate population", () => {
    test("generates five deterministic unique bounded populations", () => {
        const selected = buildMethodV3MechanismArms().find(({ armId }) => armId === "siege_finisher")!.policy;
        const crossRun = new Set<string>();
        for (let runIndex = 0; runIndex < 5; runIndex++) {
            const policies = generateMethodV3Stage2Policies(runIndex, selected);
            expect(policies).toHaveLength(METHOD_V3_STAGE2_POLICY_COUNT);
            expect(new Set(policies.map(({ policyId }) => policyId)).size).toBe(METHOD_V3_STAGE2_POLICY_COUNT);
            expect(generateMethodV3Stage2Policies(runIndex, selected)).toEqual(policies);
            for (const { policy, policyId } of policies) {
                expect(policy.schemaVersion).toBe(METHOD_V3_STAGE2_POLICY_SCHEMA_VERSION);
                expect(parseResearchPolicy(policy)).toEqual(policy);
                expect(researchPolicySha256(policy)).toBe(policyId);
            }
            const base = policies[0].policy;
            policies.slice(9).forEach(({ policy }) => {
                for (const [key, values] of Object.entries(METHOD_V3_STAGE2_SEARCH_SPACE)) {
                    const value = (policy as unknown as Record<string, unknown>)[key];
                    const baseValue = (base as unknown as Record<string, unknown>)[key];
                    if (value !== baseValue) expect(values).toContain(value);
                }
            });
            policies.forEach(({ policyId }) => crossRun.add(policyId));
        }
        expect(crossRun.size).toBeGreaterThan(METHOD_V3_STAGE2_POLICY_COUNT);
    });

    test("accepts every possible frozen Stage-1 arm as the optimizer base", () => {
        for (const selected of buildMethodV3MechanismArms()) {
            for (let runIndex = 0; runIndex < 5; runIndex++) {
                const policies = generateMethodV3Stage2Policies(runIndex, selected.policy);
                expect(policies).toHaveLength(METHOD_V3_STAGE2_POLICY_COUNT);
                expect(new Set(policies.map(({ policyId }) => policyId)).size).toBe(METHOD_V3_STAGE2_POLICY_COUNT);
                const base = policies[0].policy as unknown as Record<string, unknown>;
                for (const { policy } of policies.slice(1)) {
                    const record = policy as unknown as Record<string, unknown>;
                    for (const [key, values] of Object.entries(METHOD_V3_STAGE2_SEARCH_SPACE)) {
                        if (record[key] !== base[key]) expect(values).toContain(record[key]);
                    }
                }
            }
        }
    });

    test("freezes the eight interpretable single-mechanism anchors", () => {
        const selected = buildMethodV3MechanismArms()[0].policy;
        const policies = generateMethodV3Stage2Policies(0, selected).map(({ policy }) => policy);
        expect(policies[1].buildingEliminationEnabled).toBe(true);
        expect(policies[1].buildingEliminationMinTick).not.toBe(policies[0].buildingEliminationMinTick);
        expect(policies[2].buildingEliminationReserveCombatants).not.toBe(
            policies[0].buildingEliminationReserveCombatants,
        );
        expect(policies[3].buildingEliminationPreemptExistingAttacks).not.toBe(
            policies[0].buildingEliminationPreemptExistingAttacks,
        );
        expect(policies[4].buildingEliminationTargetPriority).not.toBe(
            policies[0].buildingEliminationTargetPriority,
        );
        expect(policies[5].buildingEliminationTargetPriority).not.toBe(
            policies[0].buildingEliminationTargetPriority,
        );
        expect(policies[6].buildingEliminationCapabilityAwareAttackers).toBe(true);
        expect(policies[7].buildingEliminationReachabilityAwareTargets).toBe(true);
        expect(policies[8].buildingEliminationReassignStalledTargets).toBe(true);
    });
});
