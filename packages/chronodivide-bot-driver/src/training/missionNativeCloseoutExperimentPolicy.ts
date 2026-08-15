import { createHash } from "node:crypto";
import {
    MissionNativeCloseoutPolicyV34,
    buildMissionNativeCloseoutPolicyV34,
    missionNativeCloseoutPolicyV34Sha256,
    validateMissionNativeCloseoutPolicyV34,
} from "./missionNativeCloseoutPolicyV34.js";
import {
    MissionNativeCloseoutPolicyV35,
    buildMissionNativeCloseoutPolicyV35,
    missionNativeCloseoutPolicyV35Sha256,
    validateMissionNativeCloseoutPolicyV35,
} from "./missionNativeCloseoutPolicyV35.js";
import {
    MissionNativeCloseoutPolicyV37,
    buildMissionNativeCloseoutPolicyV37,
    missionNativeCloseoutPolicyV37Sha256,
    validateMissionNativeCloseoutPolicyV37,
} from "./missionNativeCloseoutPolicyV37.js";

export const MISSION_NATIVE_CLOSEOUT_EXPERIMENT_POLICY_SCHEMA_VERSION = 1 as const;
export const MISSION_NATIVE_CLOSEOUT_V34_POLICY_ID =
    "e7f740d2f041e4bc6aaa7ea5c77ea6fea4f7f92682288f31ec3033da26d85a48" as const;
export const MISSION_NATIVE_CLOSEOUT_V35_POLICY_ID =
    "c0e0b96567b4c6b56a4e76defebabe4e4b593c7c8f7257a5943ab27c6c8972f1" as const;
export const MISSION_NATIVE_CLOSEOUT_V37_POLICY_ID =
    "7b8e476f1cf50ee7dcda06178756fcfa5afa0757e24f36852f0c8be16c8baa24" as const;

export const MISSION_NATIVE_CLOSEOUT_ARM_ORDER = [
    "external_supalosa_control",
    "mission_native_v34_no_deadline",
    "mission_native_v35_deadline",
] as const;
export const MISSION_NATIVE_CLOSEOUT_ARM_ORDER_V2 = [
    "external_supalosa_control",
    "mission_native_v34_no_deadline",
    "mission_native_v37_recovered_deadline",
] as const;

export type MissionNativeCloseoutArmId = typeof MISSION_NATIVE_CLOSEOUT_ARM_ORDER[number];
export type MissionNativeCloseoutArmIdV2 = typeof MISSION_NATIVE_CLOSEOUT_ARM_ORDER_V2[number];
export type MissionNativeCloseoutCandidateCore =
    | "external_supalosa"
    | "mission_native_v34"
    | "mission_native_v35"
    | "mission_native_v37";
export type MissionNativeCloseoutExperimentPolicy = {
    schemaVersion: typeof MISSION_NATIVE_CLOSEOUT_EXPERIMENT_POLICY_SCHEMA_VERSION;
    candidateCore: MissionNativeCloseoutCandidateCore;
    missionPolicyId: typeof MISSION_NATIVE_CLOSEOUT_V34_POLICY_ID |
        typeof MISSION_NATIVE_CLOSEOUT_V35_POLICY_ID | typeof MISSION_NATIVE_CLOSEOUT_V37_POLICY_ID | null;
    missionPolicy: MissionNativeCloseoutPolicyV34 | MissionNativeCloseoutPolicyV35 |
        MissionNativeCloseoutPolicyV37 | null;
};
export type MissionNativeCloseoutArm = {
    armId: MissionNativeCloseoutArmId | MissionNativeCloseoutArmIdV2;
    policyId: string;
    policy: MissionNativeCloseoutExperimentPolicy;
};

const exactKeys = ["schemaVersion", "candidateCore", "missionPolicyId", "missionPolicy"].sort();

export const validateMissionNativeCloseoutExperimentPolicy = (
    value: MissionNativeCloseoutExperimentPolicy,
): MissionNativeCloseoutExperimentPolicy => {
    const actual = Object.keys(value).sort();
    if (actual.length !== exactKeys.length || actual.some((key, index) => key !== exactKeys[index])) {
        throw new Error("Mission-native closeout experiment policy has an invalid exact schema");
    }
    if (value.schemaVersion !== MISSION_NATIVE_CLOSEOUT_EXPERIMENT_POLICY_SCHEMA_VERSION) {
        throw new Error("Mission-native closeout experiment policy schemaVersion is invalid");
    }
    if (value.candidateCore === "external_supalosa") {
        if (value.missionPolicy !== null || value.missionPolicyId !== null) {
            throw new Error("External Supalosa control cannot declare a mission policy");
        }
        return { ...value };
    }
    if (!value.missionPolicy) throw new Error("Mission-native candidate lacks a mission policy");
    if (value.candidateCore === "mission_native_v34") {
        const missionPolicy = validateMissionNativeCloseoutPolicyV34(value.missionPolicy as MissionNativeCloseoutPolicyV34);
        const missionPolicyId = missionNativeCloseoutPolicyV34Sha256(missionPolicy);
        if (!missionPolicy.enabled || missionPolicyId !== MISSION_NATIVE_CLOSEOUT_V34_POLICY_ID ||
            value.missionPolicyId !== missionPolicyId) {
            throw new Error("Mission-native V34 arm drifted from its frozen enabled policy");
        }
        return { ...value, missionPolicy, missionPolicyId };
    }
    if (value.candidateCore === "mission_native_v35") {
        const missionPolicy = validateMissionNativeCloseoutPolicyV35(value.missionPolicy as MissionNativeCloseoutPolicyV35);
        const missionPolicyId = missionNativeCloseoutPolicyV35Sha256(missionPolicy);
        if (!missionPolicy.enabled || missionPolicyId !== MISSION_NATIVE_CLOSEOUT_V35_POLICY_ID ||
            value.missionPolicyId !== missionPolicyId) {
            throw new Error("Mission-native V35 arm drifted from its frozen enabled policy");
        }
        return { ...value, missionPolicy, missionPolicyId };
    }
    if (value.candidateCore === "mission_native_v37") {
        const missionPolicy = validateMissionNativeCloseoutPolicyV37(
            value.missionPolicy as MissionNativeCloseoutPolicyV37,
        );
        const missionPolicyId = missionNativeCloseoutPolicyV37Sha256(missionPolicy);
        if (!missionPolicy.enabled || missionPolicyId !== MISSION_NATIVE_CLOSEOUT_V37_POLICY_ID ||
            value.missionPolicyId !== missionPolicyId) {
            throw new Error("Mission-native V37 arm drifted from its frozen enabled policy");
        }
        return { ...value, missionPolicy, missionPolicyId };
    }
    throw new Error("Mission-native closeout candidate core is invalid");
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

export const missionNativeCloseoutExperimentPolicySha256 = (
    value: MissionNativeCloseoutExperimentPolicy,
): string => createHash("sha256")
    .update(JSON.stringify(canonical(validateMissionNativeCloseoutExperimentPolicy(value))))
    .digest("hex");

export const buildMissionNativeCloseoutArms = (): MissionNativeCloseoutArm[] => {
    const build = (
        armId: MissionNativeCloseoutArmId | MissionNativeCloseoutArmIdV2,
        candidateCore: MissionNativeCloseoutCandidateCore,
        missionPolicy: MissionNativeCloseoutPolicyV34 | MissionNativeCloseoutPolicyV35 |
            MissionNativeCloseoutPolicyV37 | null,
    ): MissionNativeCloseoutArm => {
        const missionPolicyId = (missionPolicy === null ? null : missionPolicy.schemaVersion === 34
            ? missionNativeCloseoutPolicyV34Sha256(missionPolicy)
            : missionPolicy.schemaVersion === 35
            ? missionNativeCloseoutPolicyV35Sha256(missionPolicy)
            : missionNativeCloseoutPolicyV37Sha256(missionPolicy)) as
                MissionNativeCloseoutExperimentPolicy["missionPolicyId"];
        const policy = validateMissionNativeCloseoutExperimentPolicy({
            schemaVersion: MISSION_NATIVE_CLOSEOUT_EXPERIMENT_POLICY_SCHEMA_VERSION,
            candidateCore,
            missionPolicyId,
            missionPolicy,
        });
        return { armId, policy, policyId: missionNativeCloseoutExperimentPolicySha256(policy) };
    };
    const arms = [
        build("external_supalosa_control", "external_supalosa", null),
        build("mission_native_v34_no_deadline", "mission_native_v34", buildMissionNativeCloseoutPolicyV34(true)),
        build("mission_native_v35_deadline", "mission_native_v35", buildMissionNativeCloseoutPolicyV35(true)),
    ];
    if (arms.map(({ armId }) => armId).join(",") !== MISSION_NATIVE_CLOSEOUT_ARM_ORDER.join(",") ||
        new Set(arms.map(({ policyId }) => policyId)).size !== arms.length) {
        throw new Error("Mission-native closeout arm order or policy identities drifted");
    }
    return arms;
};

export const buildMissionNativeCloseoutArmsV2 = (): MissionNativeCloseoutArm[] => {
    const [external, v34] = buildMissionNativeCloseoutArms();
    const missionPolicy = buildMissionNativeCloseoutPolicyV37(true);
    if (missionNativeCloseoutPolicyV37Sha256(missionPolicy) !== MISSION_NATIVE_CLOSEOUT_V37_POLICY_ID) {
        throw new Error("Mission-native V37 frozen policy identity drifted");
    }
    const missionPolicyId = MISSION_NATIVE_CLOSEOUT_V37_POLICY_ID;
    const policy = validateMissionNativeCloseoutExperimentPolicy({
        schemaVersion: MISSION_NATIVE_CLOSEOUT_EXPERIMENT_POLICY_SCHEMA_VERSION,
        candidateCore: "mission_native_v37",
        missionPolicyId,
        missionPolicy,
    });
    const v37: MissionNativeCloseoutArm = {
        armId: "mission_native_v37_recovered_deadline",
        policy,
        policyId: missionNativeCloseoutExperimentPolicySha256(policy),
    };
    const arms = [external, v34, v37];
    if (
        arms.map(({ armId }) => armId).join(",") !== MISSION_NATIVE_CLOSEOUT_ARM_ORDER_V2.join(",") ||
        new Set(arms.map(({ policyId }) => policyId)).size !== arms.length
    ) throw new Error("Mission-native closeout V2 arm order or policy identities drifted");
    return arms;
};
