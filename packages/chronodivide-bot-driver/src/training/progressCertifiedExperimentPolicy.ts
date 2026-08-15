import { createHash } from "node:crypto";
import {
    ProgressCertifiedConversionPolicy,
    buildProgressCertifiedConversionPolicy,
    validateProgressCertifiedConversionPolicy,
} from "./progressCertifiedConversionPolicy.js";
import {
    ProgressCertifiedConversionPolicyV5,
    validateProgressCertifiedConversionPolicyV5,
} from "./progressCertifiedConversionPolicyV5.js";

export const PROGRESS_CERTIFIED_EXPERIMENT_POLICY_SCHEMA_VERSION = 1 as const;

export const PROGRESS_CERTIFIED_ARM_ORDER = [
    "external_baseline_control",
    "external_final_building_direct",
    "external_final_building_hybrid",
    "external_low_count_direct",
    "external_low_count_route_no_deadline",
    "external_low_count_progress_hybrid",
] as const;

export type ProgressCertifiedArmId = typeof PROGRESS_CERTIFIED_ARM_ORDER[number];

export type ProgressCertifiedExperimentPolicy = {
    schemaVersion: typeof PROGRESS_CERTIFIED_EXPERIMENT_POLICY_SCHEMA_VERSION;
    candidateCore: "external_supalosa";
    objectivePolicy: ProgressCertifiedConversionPolicy | ProgressCertifiedConversionPolicyV5;
};

export type ProgressCertifiedArm = {
    armId: ProgressCertifiedArmId;
    policyId: string;
    policy: ProgressCertifiedExperimentPolicy;
};

const exactKeys = ["schemaVersion", "candidateCore", "objectivePolicy"].sort();

export const validateProgressCertifiedExperimentPolicy = (
    value: ProgressCertifiedExperimentPolicy,
): ProgressCertifiedExperimentPolicy => {
    const actual = Object.keys(value).sort();
    if (actual.length !== exactKeys.length || actual.some((key, index) => key !== exactKeys[index])) {
        throw new Error("Progress-certified experiment policy has an invalid exact schema");
    }
    if (value.schemaVersion !== PROGRESS_CERTIFIED_EXPERIMENT_POLICY_SCHEMA_VERSION) {
        throw new Error("Progress-certified experiment policy schemaVersion is invalid");
    }
    if (value.candidateCore !== "external_supalosa") {
        throw new Error("Progress-certified experiment requires the exact external Supalosa core");
    }
    const objectivePolicy = value.objectivePolicy.schemaVersion === 5
        ? validateProgressCertifiedConversionPolicyV5(value.objectivePolicy)
        : validateProgressCertifiedConversionPolicy(value.objectivePolicy);
    return { ...value, objectivePolicy };
};

const canonical = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(canonical);
    if (value && typeof value === "object") {
        return Object.fromEntries(Object.entries(value as Record<string, unknown>)
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([key, item]) => [key, canonical(item)]));
    }
    return value;
};

export const progressCertifiedExperimentPolicySha256 = (
    value: ProgressCertifiedExperimentPolicy,
): string => createHash("sha256")
    .update(JSON.stringify(canonical(validateProgressCertifiedExperimentPolicy(value))))
    .digest("hex");

export const buildProgressCertifiedArms = (): ProgressCertifiedArm[] => {
    const build = (
        armId: ProgressCertifiedArmId,
        changes: Partial<ProgressCertifiedConversionPolicy>,
    ): ProgressCertifiedArm => {
        const policy = validateProgressCertifiedExperimentPolicy({
            schemaVersion: PROGRESS_CERTIFIED_EXPERIMENT_POLICY_SCHEMA_VERSION,
            candidateCore: "external_supalosa",
            objectivePolicy: buildProgressCertifiedConversionPolicy(changes),
        });
        return { armId, policy, policyId: progressCertifiedExperimentPolicySha256(policy) };
    };
    const lowCount = {
        conversionScope: "guarded_low_building_count" as const,
        activationBuildingCount: 5,
        activationMinTick: 3_600,
        requireObservedCountAboveThreshold: true,
        minTick: 7_200,
    };
    const arms = [
        build("external_baseline_control", { enabled: false }),
        build("external_final_building_direct", { terminalForceMode: "direct_building" }),
        build("external_final_building_hybrid", { terminalForceMode: "progress_certified_hybrid" }),
        build("external_low_count_direct", {
            ...lowCount,
            terminalForceMode: "direct_building",
        }),
        build("external_low_count_route_no_deadline", {
            ...lowCount,
            terminalForceMode: "route_blockers",
            blockerNoDamageDeadlineTicks: 100_000,
            buildingNoDamageDeadlineTicks: 100_000,
        }),
        build("external_low_count_progress_hybrid", {
            ...lowCount,
            terminalForceMode: "progress_certified_hybrid",
        }),
    ];
    if (
        arms.map(({ armId }) => armId).join(",") !== PROGRESS_CERTIFIED_ARM_ORDER.join(",") ||
        new Set(arms.map(({ policyId }) => policyId)).size !== arms.length
    ) throw new Error("Progress-certified arm order or policy identities drifted");
    return arms;
};
