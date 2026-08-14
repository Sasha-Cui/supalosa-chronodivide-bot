import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import {
    BuildingEliminationMissionFactory,
    BuildingEliminationTelemetrySink,
} from "@supalosa/chronodivide-bot/dist/bot/logic/mission/missions/buildingEliminationMission.js";
import { BaselineFactory, InspectableBaselineBot } from "../benchmark/baselineLoader.js";
import {
    MissionNativeCloseoutPolicy,
    validateMissionNativeCloseoutPolicy,
} from "./missionNativeCloseoutPolicy.js";
import {
    MissionNativeCloseoutPolicyV2,
    validateMissionNativeCloseoutPolicyV2,
} from "./missionNativeCloseoutPolicyV2.js";
import {
    MissionNativeCloseoutPolicyV3,
    validateMissionNativeCloseoutPolicyV3,
} from "./missionNativeCloseoutPolicyV3.js";
import {
    MissionNativeCloseoutPolicyV4,
    validateMissionNativeCloseoutPolicyV4,
} from "./missionNativeCloseoutPolicyV4.js";
import {
    MissionNativeCloseoutPolicyV5,
    validateMissionNativeCloseoutPolicyV5,
} from "./missionNativeCloseoutPolicyV5.js";
import {
    MissionNativeCloseoutPolicyV6,
    validateMissionNativeCloseoutPolicyV6,
} from "./missionNativeCloseoutPolicyV6.js";
import {
    MissionNativeCloseoutPolicyV7,
    validateMissionNativeCloseoutPolicyV7,
} from "./missionNativeCloseoutPolicyV7.js";
import {
    MissionNativeCloseoutPolicyV8,
    validateMissionNativeCloseoutPolicyV8,
} from "./missionNativeCloseoutPolicyV8.js";
import {
    MissionNativeCloseoutPolicyV9,
    validateMissionNativeCloseoutPolicyV9,
} from "./missionNativeCloseoutPolicyV9.js";
import {
    MissionNativeCloseoutPolicyV10,
    validateMissionNativeCloseoutPolicyV10,
} from "./missionNativeCloseoutPolicyV10.js";
import {
    MissionNativeCloseoutPolicyV11,
    validateMissionNativeCloseoutPolicyV11,
} from "./missionNativeCloseoutPolicyV11.js";
import {
    MissionNativeCloseoutPolicyV12,
    validateMissionNativeCloseoutPolicyV12,
} from "./missionNativeCloseoutPolicyV12.js";
import {
    MissionNativeCloseoutPolicyV13,
    validateMissionNativeCloseoutPolicyV13,
} from "./missionNativeCloseoutPolicyV13.js";
import {
    MissionNativeCloseoutPolicyV14,
    validateMissionNativeCloseoutPolicyV14,
} from "./missionNativeCloseoutPolicyV14.js";
import {
    MissionNativeCloseoutPolicyV15,
    validateMissionNativeCloseoutPolicyV15,
} from "./missionNativeCloseoutPolicyV15.js";
import {
    MissionNativeCloseoutPolicyV16,
    validateMissionNativeCloseoutPolicyV16,
} from "./missionNativeCloseoutPolicyV16.js";
import {
    MissionNativeCloseoutPolicyV17,
    validateMissionNativeCloseoutPolicyV17,
} from "./missionNativeCloseoutPolicyV17.js";
import {
    MissionNativeCloseoutPolicyV18,
    validateMissionNativeCloseoutPolicyV18,
} from "./missionNativeCloseoutPolicyV18.js";
import {
    MissionNativeCloseoutPolicyV19,
    validateMissionNativeCloseoutPolicyV19,
} from "./missionNativeCloseoutPolicyV19.js";
import {
    MissionNativeCloseoutPolicyV20,
    validateMissionNativeCloseoutPolicyV20,
} from "./missionNativeCloseoutPolicyV20.js";
import {
    MissionNativeCloseoutPolicyV21,
    validateMissionNativeCloseoutPolicyV21,
} from "./missionNativeCloseoutPolicyV21.js";
import {
    MissionNativeCloseoutPolicyV22,
    validateMissionNativeCloseoutPolicyV22,
} from "./missionNativeCloseoutPolicyV22.js";
import {
    MissionNativeCloseoutPolicyV23,
    validateMissionNativeCloseoutPolicyV23,
} from "./missionNativeCloseoutPolicyV23.js";
import {
    MissionNativeCloseoutPolicyV24,
    validateMissionNativeCloseoutPolicyV24,
} from "./missionNativeCloseoutPolicyV24.js";

type MissionNativePolicy = MissionNativeCloseoutPolicy | MissionNativeCloseoutPolicyV2 |
    MissionNativeCloseoutPolicyV3 | MissionNativeCloseoutPolicyV4 | MissionNativeCloseoutPolicyV5 |
    MissionNativeCloseoutPolicyV6 | MissionNativeCloseoutPolicyV7 | MissionNativeCloseoutPolicyV8 |
    MissionNativeCloseoutPolicyV9 | MissionNativeCloseoutPolicyV10 | MissionNativeCloseoutPolicyV11 |
    MissionNativeCloseoutPolicyV12 | MissionNativeCloseoutPolicyV13 | MissionNativeCloseoutPolicyV14 |
    MissionNativeCloseoutPolicyV15 | MissionNativeCloseoutPolicyV16 | MissionNativeCloseoutPolicyV17 |
    MissionNativeCloseoutPolicyV18 | MissionNativeCloseoutPolicyV19 | MissionNativeCloseoutPolicyV20 |
    MissionNativeCloseoutPolicyV21 | MissionNativeCloseoutPolicyV22 | MissionNativeCloseoutPolicyV23 |
    MissionNativeCloseoutPolicyV24;

type StrategyLike = {
    onAiUpdate(context: any, missionController: any, logger: any): StrategyLike;
};

class MissionNativeCloseoutStrategy implements StrategyLike {
    private readonly factory: BuildingEliminationMissionFactory;

    constructor(
        private inner: StrategyLike,
        policy: MissionNativePolicy,
        telemetrySink: BuildingEliminationTelemetrySink,
    ) {
        this.factory = new BuildingEliminationMissionFactory({
            enabled: true,
            activationMode: policy.activationMode,
            maxEnemyBuildings: policy.maxEnemyBuildings,
            minTick: policy.minTick,
            minCombatants: policy.minCombatants,
            combatantAdvantage: -1_000,
            maxEnemyCombatants: 1_000,
            reserveCombatants: policy.reserveCombatants,
            orderIntervalTicks: policy.orderIntervalTicks,
            maxTargetGroups: policy.maxTargetGroups,
            targetPriority: policy.targetPriority,
            observationMode: policy.observationMode,
            directVisibleAttack: policy.directVisibleAttack,
            preemptExistingAttacks: policy.preemptExistingAttacks,
            sweepWhenNoTargets: policy.sweepWhenNoTargets,
            capabilityAwareAttackers: policy.capabilityAwareAttackers,
            reachabilityAwareTargets: policy.reachabilityAwareTargets,
            stallTicks: policy.stallTicks,
            reassignStalledTargets: policy.reassignStalledTargets,
            adaptiveAirTargetCount: 0,
            adaptiveNavalTargetCount: 0,
            adaptiveGroundAssaultTargetCount: "adaptiveGroundAssaultTargetCount" in policy
                ? policy.adaptiveGroundAssaultTargetCount
                : 0,
            adaptiveGroundAssaultInfrastructure: "adaptiveGroundAssaultInfrastructure" in policy
                ? policy.adaptiveGroundAssaultInfrastructure
                : false,
            adaptiveGroundAssaultProductionReservation:
                "adaptiveGroundAssaultProductionReservation" in policy
                    ? policy.adaptiveGroundAssaultProductionReservation
                    : false,
            adaptiveGroundAssaultProductionScopeLatch:
                "adaptiveGroundAssaultProductionScopeLatch" in policy
                    ? policy.adaptiveGroundAssaultProductionScopeLatch
                    : false,
            adaptiveGroundAssaultScreenTargetCount:
                "adaptiveGroundAssaultScreenTargetCount" in policy
                    ? policy.adaptiveGroundAssaultScreenTargetCount
                    : 0,
            adaptiveGroundAssaultScreenFactoryTrigger:
                "adaptiveGroundAssaultScreenFactoryTrigger" in policy
                    ? policy.adaptiveGroundAssaultScreenFactoryTrigger
                    : false,
            adaptiveGroundAssaultReadinessForceOwnership:
                "adaptiveGroundAssaultReadinessForceOwnership" in policy
                    ? policy.adaptiveGroundAssaultReadinessForceOwnership
                    : false,
            progressiveRouteBlockerLaunch:
                "progressiveRouteBlockerLaunch" in policy
                    ? policy.progressiveRouteBlockerLaunch
                    : false,
            adaptiveGroundAssaultInfrastructurePriority:
                "adaptiveGroundAssaultInfrastructurePriority" in policy
                    ? policy.adaptiveGroundAssaultInfrastructurePriority
                    : 130,
            engagementMode: "engagementMode" in policy ? policy.engagementMode : "directBuilding",
            engagementAllocationMode: "engagementAllocationMode" in policy
                ? policy.engagementAllocationMode
                : "allBlocker",
            commitRouteBlocker: "commitRouteBlocker" in policy ? policy.commitRouteBlocker : false,
            retargetStalledBuildings: "retargetStalledBuildings" in policy
                ? policy.retargetStalledBuildings
                : false,
            routeCorridorRadius: "routeCorridorRadius" in policy ? policy.routeCorridorRadius : 8,
            readinessReserve: "readinessReserve" in policy ? policy.readinessReserve : false,
            readinessReserveScope: "readinessReserveScope" in policy
                ? policy.readinessReserveScope
                : "reinforcements",
            readinessReserveDefenseRadius: "readinessReserveDefenseRadius" in policy
                ? policy.readinessReserveDefenseRadius
                : 0,
            contactOnlyBlockerClearance: "contactOnlyBlockerClearance" in policy
                ? policy.contactOnlyBlockerClearance
                : false,
        }, telemetrySink);
    }

    onAiUpdate(context: any, missionController: any, logger: any): StrategyLike {
        const next = this.inner.onAiUpdate(context, missionController, logger);
        if (next && typeof next.onAiUpdate === "function") this.inner = next;
        this.factory.maybeCreateMissions(context, missionController, logger);
        return this;
    }
}

export const createMissionNativeCloseoutCandidate = (
    baselineFactory: BaselineFactory,
    name: string,
    country: Countries,
    rawPolicy: MissionNativePolicy,
    telemetrySink: BuildingEliminationTelemetrySink = () => undefined,
): InspectableBaselineBot => {
    const policy = rawPolicy.schemaVersion === 24
        ? validateMissionNativeCloseoutPolicyV24(rawPolicy)
        : rawPolicy.schemaVersion === 23
        ? validateMissionNativeCloseoutPolicyV23(rawPolicy)
        : rawPolicy.schemaVersion === 22
        ? validateMissionNativeCloseoutPolicyV22(rawPolicy)
        : rawPolicy.schemaVersion === 21
        ? validateMissionNativeCloseoutPolicyV21(rawPolicy)
        : rawPolicy.schemaVersion === 20
        ? validateMissionNativeCloseoutPolicyV20(rawPolicy)
        : rawPolicy.schemaVersion === 19
        ? validateMissionNativeCloseoutPolicyV19(rawPolicy)
        : rawPolicy.schemaVersion === 18
        ? validateMissionNativeCloseoutPolicyV18(rawPolicy)
        : rawPolicy.schemaVersion === 17
        ? validateMissionNativeCloseoutPolicyV17(rawPolicy)
        : rawPolicy.schemaVersion === 16
        ? validateMissionNativeCloseoutPolicyV16(rawPolicy)
        : rawPolicy.schemaVersion === 15
        ? validateMissionNativeCloseoutPolicyV15(rawPolicy)
        : rawPolicy.schemaVersion === 14
            ? validateMissionNativeCloseoutPolicyV14(rawPolicy)
            : rawPolicy.schemaVersion === 13
            ? validateMissionNativeCloseoutPolicyV13(rawPolicy)
            : rawPolicy.schemaVersion === 12
            ? validateMissionNativeCloseoutPolicyV12(rawPolicy)
            : rawPolicy.schemaVersion === 11
            ? validateMissionNativeCloseoutPolicyV11(rawPolicy)
            : rawPolicy.schemaVersion === 10
            ? validateMissionNativeCloseoutPolicyV10(rawPolicy)
            : rawPolicy.schemaVersion === 9
            ? validateMissionNativeCloseoutPolicyV9(rawPolicy)
            : rawPolicy.schemaVersion === 8
            ? validateMissionNativeCloseoutPolicyV8(rawPolicy)
            : rawPolicy.schemaVersion === 7
            ? validateMissionNativeCloseoutPolicyV7(rawPolicy)
            : rawPolicy.schemaVersion === 6
                ? validateMissionNativeCloseoutPolicyV6(rawPolicy)
                : rawPolicy.schemaVersion === 5
                    ? validateMissionNativeCloseoutPolicyV5(rawPolicy)
                    : rawPolicy.schemaVersion === 4
                        ? validateMissionNativeCloseoutPolicyV4(rawPolicy)
                        : rawPolicy.schemaVersion === 3
                            ? validateMissionNativeCloseoutPolicyV3(rawPolicy)
                            : rawPolicy.schemaVersion === 2
                                ? validateMissionNativeCloseoutPolicyV2(rawPolicy)
                                : validateMissionNativeCloseoutPolicy(rawPolicy);
    if (!policy.enabled) return baselineFactory.create(name, country);
    if (!baselineFactory.createDefaultStrategy || !baselineFactory.createWithStrategy) {
        throw new Error("Mission-native closeout requires an injectable external baseline strategy");
    }
    const inner = baselineFactory.createDefaultStrategy() as StrategyLike;
    return baselineFactory.createWithStrategy(
        name,
        country,
        new MissionNativeCloseoutStrategy(inner, policy, telemetrySink),
    );
};
