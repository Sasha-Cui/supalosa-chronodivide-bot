import { createHash } from "node:crypto";
import {
    ContinuousOffensePolicy,
    buildContinuousOffensePolicy,
    validateContinuousOffensePolicy,
} from "./continuousOffensePolicy.js";
import { FROZEN_MACRO_CHAMPION_POLICY_ID } from "./continuousOffenseCandidate.js";

export const CONTINUOUS_OFFENSE_EXPERIMENT_POLICY_SCHEMA_VERSION = 1 as const;

export const CONTINUOUS_OFFENSE_ARM_ORDER = [
    "external_baseline_control",
    "macro_champion_control",
    "macro_all_forces_first",
    "macro_buildings_only",
    "macro_route_blockers_minimum",
    "macro_route_blockers_full",
] as const;

export type ContinuousOffenseArmId = typeof CONTINUOUS_OFFENSE_ARM_ORDER[number];
export type ContinuousOffenseCandidateCore = "external_supalosa" | "frozen_macro_champion";

export type ContinuousOffenseExperimentPolicy = {
    schemaVersion: typeof CONTINUOUS_OFFENSE_EXPERIMENT_POLICY_SCHEMA_VERSION;
    candidateCore: ContinuousOffenseCandidateCore;
    macroPolicyId: typeof FROZEN_MACRO_CHAMPION_POLICY_ID | null;
    objectivePolicy: ContinuousOffensePolicy;
};

export type ContinuousOffenseArm = {
    armId: ContinuousOffenseArmId;
    policyId: string;
    policy: ContinuousOffenseExperimentPolicy;
};

const exactKeys = ["schemaVersion", "candidateCore", "macroPolicyId", "objectivePolicy"].sort();

export const validateContinuousOffenseExperimentPolicy = (
    value: ContinuousOffenseExperimentPolicy,
): ContinuousOffenseExperimentPolicy => {
    const actual = Object.keys(value).sort();
    if (actual.length !== exactKeys.length || actual.some((key, index) => key !== exactKeys[index])) {
        throw new Error("Continuous-offense experiment policy has an invalid exact schema");
    }
    if (value.schemaVersion !== CONTINUOUS_OFFENSE_EXPERIMENT_POLICY_SCHEMA_VERSION) {
        throw new Error("Continuous-offense experiment policy schemaVersion is invalid");
    }
    if (value.candidateCore !== "external_supalosa" && value.candidateCore !== "frozen_macro_champion") {
        throw new Error("Continuous-offense candidate core is invalid");
    }
    const objectivePolicy = validateContinuousOffensePolicy(value.objectivePolicy);
    if (value.candidateCore === "external_supalosa") {
        if (value.macroPolicyId !== null || objectivePolicy.enabled) {
            throw new Error("External control cannot declare a macro policy or objective intervention");
        }
    } else if (value.macroPolicyId !== FROZEN_MACRO_CHAMPION_POLICY_ID) {
        throw new Error("Macro candidate is not bound to the frozen champion policy");
    }
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

export const continuousOffenseExperimentPolicySha256 = (
    value: ContinuousOffenseExperimentPolicy,
): string => createHash("sha256")
    .update(JSON.stringify(canonical(validateContinuousOffenseExperimentPolicy(value))))
    .digest("hex");

export const buildContinuousOffenseArms = (): ContinuousOffenseArm[] => {
    const build = (
        armId: ContinuousOffenseArmId,
        candidateCore: ContinuousOffenseCandidateCore,
        changes: Partial<ContinuousOffensePolicy>,
    ): ContinuousOffenseArm => {
        const objectivePolicy = buildContinuousOffensePolicy(changes);
        const policy = validateContinuousOffenseExperimentPolicy({
            schemaVersion: CONTINUOUS_OFFENSE_EXPERIMENT_POLICY_SCHEMA_VERSION,
            candidateCore,
            macroPolicyId: candidateCore === "frozen_macro_champion"
                ? FROZEN_MACRO_CHAMPION_POLICY_ID
                : null,
            objectivePolicy,
        });
        return { armId, policy, policyId: continuousOffenseExperimentPolicySha256(policy) };
    };
    const arms = [
        build("external_baseline_control", "external_supalosa", { enabled: false }),
        build("macro_champion_control", "frozen_macro_champion", { enabled: false }),
        build("macro_all_forces_first", "frozen_macro_champion", {
            forceEngagementMode: "all_observed_forces_first",
        }),
        build("macro_buildings_only", "frozen_macro_champion", {
            forceEngagementMode: "buildings_only",
        }),
        build("macro_route_blockers_minimum", "frozen_macro_champion", {
            forceEngagementMode: "route_blockers_only",
            strikeGroupMode: "minimum_sufficient_force",
        }),
        build("macro_route_blockers_full", "frozen_macro_champion", {
            forceEngagementMode: "route_blockers_only",
            strikeGroupMode: "full_compatible_force",
        }),
    ];
    if (
        arms.map(({ armId }) => armId).join(",") !== CONTINUOUS_OFFENSE_ARM_ORDER.join(",") ||
        new Set(arms.map(({ policyId }) => policyId)).size !== arms.length
    ) throw new Error("Continuous-offense arm order or policy identities drifted");
    return arms;
};
