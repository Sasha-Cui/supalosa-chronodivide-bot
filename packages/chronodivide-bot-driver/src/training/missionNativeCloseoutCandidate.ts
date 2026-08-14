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

type MissionNativePolicy = MissionNativeCloseoutPolicy | MissionNativeCloseoutPolicyV2 |
    MissionNativeCloseoutPolicyV3 | MissionNativeCloseoutPolicyV4 | MissionNativeCloseoutPolicyV5 |
    MissionNativeCloseoutPolicyV6;

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
            engagementMode: "engagementMode" in policy ? policy.engagementMode : "directBuilding",
            engagementAllocationMode: "engagementAllocationMode" in policy
                ? policy.engagementAllocationMode
                : "allBlocker",
            commitRouteBlocker: "commitRouteBlocker" in policy ? policy.commitRouteBlocker : false,
            retargetStalledBuildings: "retargetStalledBuildings" in policy
                ? policy.retargetStalledBuildings
                : false,
            routeCorridorRadius: "routeCorridorRadius" in policy ? policy.routeCorridorRadius : 8,
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
    const policy = rawPolicy.schemaVersion === 6
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
