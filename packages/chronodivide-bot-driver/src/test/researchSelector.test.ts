import { describe, expect, test } from "vitest";
import {
    fitResearchSelector,
    predictResearchPolicyUtilities,
    RESEARCH_SELECTOR_SWITCH_MARGIN,
    ResearchSelectorTrainingRow,
    selectConditionedPolicy,
    structuralFeatureVector,
} from "../training/researchSelector.js";
import { DEFAULT_RESEARCH_POLICY, ResearchPolicyConfig, researchPolicySha256 } from "../training/researchPolicy.js";

const policyA = DEFAULT_RESEARCH_POLICY;
const policyB: ResearchPolicyConfig = { ...DEFAULT_RESEARCH_POLICY, attackGateMinTick: 5400 };
const idA = researchPolicySha256(policyA);
const idB = researchPolicySha256(policyB);
const policies = [{ policyId: idA, policy: policyA }, { policyId: idB, policy: policyB }];

const trainingRows = (): ResearchSelectorTrainingRow[] => Array.from({ length: 10 }, (_, index) => {
    const large = index >= 5;
    return {
        familyId: `family-${index}`,
        descriptors: {
            area: large ? 15000 + index * 10 : 3000 + index * 10,
            width: large ? 150 : 60,
            height: large ? 100 : 50,
            startCount: large ? 6 : 2,
        },
        policyUtilities: {
            [idA]: large ? 0.45 : 0.75,
            [idB]: large ? 0.9 : 0.35,
        },
    };
});

describe("coordinate-free finalist selector", () => {
    test("uses only declared log-area, aspect, and start-count features", () => {
        expect(structuralFeatureVector({ area: 10000, width: 100, height: 100, startCount: 4 })).toEqual([
            Math.log(10000),
            0,
            Math.log(4),
        ]);
        expect(() => structuralFeatureVector({ area: 0, width: 100, height: 100, startCount: 4 })).toThrow(/area/);
    });

    test("fits deterministic ridge surfaces and switches only above the fixed margin", () => {
        const model = fitResearchSelector(policies, trainingRows());
        expect(fitResearchSelector(policies, trainingRows())).toEqual(model);
        expect(model.globalPolicyId).toBe(idB);
        const small = selectConditionedPolicy(model, { area: 3100, width: 60, height: 50, startCount: 2 });
        const large = selectConditionedPolicy(model, { area: 15100, width: 150, height: 100, startCount: 6 });
        expect(small).toMatchObject({ policyId: idA, switchedFromGlobal: true });
        expect(small.predictedMargin).toBeGreaterThan(RESEARCH_SELECTOR_SWITCH_MARGIN);
        expect(large).toMatchObject({ policyId: idB, switchedFromGlobal: false });
        expect(predictResearchPolicyUtilities(model, { area: 15100, width: 150, height: 100, startCount: 6 })[0].policyId).toBe(idB);
    });

    test("rejects incomplete finalist responses and degenerate descriptor populations", () => {
        const incomplete = trainingRows();
        delete incomplete[0].policyUtilities[idB];
        expect(() => fitResearchSelector(policies, incomplete)).toThrow(/one finite utility/);
        const constant = trainingRows().map((row) => ({
            ...row,
            descriptors: { area: 10000, width: 100, height: 100, startCount: 2 },
        }));
        expect(() => fitResearchSelector(policies, constant)).toThrow(/zero variance/);
    });
});
