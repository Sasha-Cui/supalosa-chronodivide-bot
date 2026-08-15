import {
    ProgressCertifiedConversionPolicy,
    buildProgressCertifiedConversionPolicy,
} from "./progressCertifiedConversionPolicy.js";
import {
    ProgressCertifiedConversionPolicyV5,
    buildProgressCertifiedConversionPolicyV5,
} from "./progressCertifiedConversionPolicyV5.js";
import {
    PROGRESS_CERTIFIED_EXPERIMENT_POLICY_SCHEMA_VERSION,
    ProgressCertifiedExperimentPolicy,
    progressCertifiedExperimentPolicySha256,
    validateProgressCertifiedExperimentPolicy,
} from "./progressCertifiedExperimentPolicy.js";

export const PROGRESS_CERTIFIED_V5_ARM_ORDER = [
    "external_supalosa_control",
    "final_building_hybrid_v4",
    "visibility_aware_final_building_v5",
] as const;

export type ProgressCertifiedV5ArmId = typeof PROGRESS_CERTIFIED_V5_ARM_ORDER[number];

export type ProgressCertifiedV5Arm = {
    armId: ProgressCertifiedV5ArmId;
    policyId: string;
    policy: ProgressCertifiedExperimentPolicy;
};

const arm = (
    armId: ProgressCertifiedV5ArmId,
    objectivePolicy: ProgressCertifiedConversionPolicy | ProgressCertifiedConversionPolicyV5,
): ProgressCertifiedV5Arm => {
    const policy = validateProgressCertifiedExperimentPolicy({
        schemaVersion: PROGRESS_CERTIFIED_EXPERIMENT_POLICY_SCHEMA_VERSION,
        candidateCore: "external_supalosa",
        objectivePolicy,
    });
    return { armId, policy, policyId: progressCertifiedExperimentPolicySha256(policy) };
};

export const buildProgressCertifiedV5Arms = (): ProgressCertifiedV5Arm[] => {
    const arms = [
        arm("external_supalosa_control", buildProgressCertifiedConversionPolicyV5({ enabled: false })),
        arm("final_building_hybrid_v4", buildProgressCertifiedConversionPolicy()),
        arm("visibility_aware_final_building_v5", buildProgressCertifiedConversionPolicyV5()),
    ];
    if (
        arms.map(({ armId }) => armId).join(",") !== PROGRESS_CERTIFIED_V5_ARM_ORDER.join(",") ||
        new Set(arms.map(({ policyId }) => policyId)).size !== arms.length
    ) throw new Error("Progress-certified V5 arm order or policy identities drifted");
    return arms;
};

export const progressCertifiedV5LegacyFieldsEqual = (
    legacy: ProgressCertifiedConversionPolicy,
    visibilityAware: ProgressCertifiedConversionPolicyV5,
): boolean => {
    const { schemaVersion: legacyVersion, ...legacyFields } = legacy;
    const {
        schemaVersion: visibilityAwareVersion,
        unseenExactBuildingOrderMode,
        ...visibilityAwareLegacyFields
    } = visibilityAware;
    void legacyVersion;
    void visibilityAwareVersion;
    void unseenExactBuildingOrderMode;
    return JSON.stringify(legacyFields) === JSON.stringify(visibilityAwareLegacyFields);
};
