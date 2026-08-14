import {
    ArmorType,
    GameApi,
    ObjectType,
    OrderType,
    QueueType,
    SideType,
    SpeedType,
    TechnoRules,
    UnitData,
    Vector2,
    WeaponData,
} from "@chronodivide/game-api";
import {
    Mission,
    MissionAction,
    buildStructureAtLocation,
    noop,
    releaseUnits,
    requestSpecificUnits,
    requestUnits,
} from "../mission.js";
import { MissionController } from "../missionController.js";
import { MissionContext, SupabotContext } from "../../common/context.js";
import { DebugLogger, isOwnedByNeutral } from "../../common/utils.js";
import { BatchableAction } from "../actionBatcher.js";
import { manageAttackMicro, manageMoveMicro } from "./squads/common.js";
import { BUILDING_NAME_TO_RULES, getDefaultPlacementLocation } from "../../building/buildingRules.js";

export type BuildingEliminationObservationMode = "publicApi" | "visibleOnly";
export type BuildingEliminationTargetPriority = "production" | "reinforcement" | "defense" | "nearest";
export type BuildingEliminationActivationMode = "forceAdvantage" | "lowBuilding" |
    "objectiveRace" | "objectiveClearance" | "objectiveRouteClearance" |
    "objectiveTransferableRouteClearance" | "objectiveStagedRouteClearance" |
    "objectiveStagedBlockerClearance" | "objectiveVanguardRouteClearance";
export type BuildingEliminationReadinessReserveScope = "reinforcements" | "fullForce";
export type BuildingEliminationEngagementMode = "directBuilding" | "completionRace";
export type BuildingEliminationEngagementAllocationMode = "allBlocker" | "boundedScreen" | "singleScreen";

export type BuildingEliminationOptions = {
    enabled?: boolean;
    minTick?: number;
    minCombatants?: number;
    combatantAdvantage?: number;
    maxEnemyCombatants?: number;
    reserveCombatants?: number;
    orderIntervalTicks?: number;
    maxTargetGroups?: number;
    targetPriority?: BuildingEliminationTargetPriority;
    observationMode?: BuildingEliminationObservationMode;
    directVisibleAttack?: boolean;
    preemptExistingAttacks?: boolean;
    sweepWhenNoTargets?: boolean;
    sweepRevisitTicks?: number;
    capabilityAwareAttackers?: boolean;
    reachabilityAwareTargets?: boolean;
    stallTicks?: number;
    reassignStalledTargets?: boolean;
    retargetStalledBuildings?: boolean;
    adaptiveAirTargetCount?: number;
    adaptiveNavalTargetCount?: number;
    adaptiveGroundAssaultTargetCount?: number;
    adaptiveGroundAssaultInfrastructure?: boolean;
    adaptiveGroundAssaultProductionReservation?: boolean;
    adaptiveGroundAssaultProductionScopeLatch?: boolean;
    adaptiveGroundAssaultScreenTargetCount?: number;
    adaptiveGroundAssaultScreenFactoryTrigger?: boolean;
    adaptiveGroundAssaultReadinessForceOwnership?: boolean;
    progressiveRouteBlockerLaunch?: boolean;
    requireGroundAssaultCapabilityForActivation?: boolean;
    queueAwareGroundAssaultTargets?: boolean;
    positiveProgressBlockerLaunch?: boolean;
    persistentCloseoutActivationScope?: boolean;
    requireTransferredGroundAssaultCapabilityForActivation?: boolean;
    objectiveFeasibilityOverridesGroundAssaultCapability?: boolean;
    preterminalRequiresRouteFeasibleLaunch?: boolean;
    adaptiveGroundAssaultInfrastructurePriority?: number;
    adaptiveProductionPriority?: number;
    adaptiveTechPriority?: number;
    activationMode?: BuildingEliminationActivationMode;
    maxEnemyBuildings?: number;
    engagementMode?: BuildingEliminationEngagementMode;
    engagementAllocationMode?: BuildingEliminationEngagementAllocationMode;
    commitRouteBlocker?: boolean;
    routeCorridorRadius?: number;
    readinessReserve?: boolean;
    readinessReserveScope?: BuildingEliminationReadinessReserveScope;
    readinessReserveDefenseRadius?: number;
    contactOnlyBlockerClearance?: boolean;
};

export type BuildingTargetDescriptor = {
    id?: number;
    x: number;
    y: number;
    name: string;
    maxHitPoints: number;
    hitPoints: number;
    constructionYard: boolean;
    weaponsFactory: boolean;
    barracks: boolean;
    refinery: boolean;
    power: boolean;
    defense: boolean;
    visible: boolean;
};

export type PointDescriptor = { x: number; y: number };

export type BuildingEliminationTelemetryEvent =
    | {
          schemaVersion: 1;
          event: "activated";
          tick: number;
          observationMode: BuildingEliminationObservationMode;
          ownCombatants: number;
          enemyCombatants: number;
          reservedCombatants: number;
          preemptedMissions: string[];
      }
    | {
          schemaVersion: 2;
          event: "activation_blocked";
          tick: number;
          reason: "insufficient_own_combatants" | "enemy_combatant_limit" | "insufficient_advantage" |
              "no_viable_building_race" | "no_viable_objective_clearance" | "no_viable_route_clearance" |
              "no_viable_transferable_route_clearance" | "no_viable_staged_route_clearance" |
              "no_viable_staged_blocker_clearance" | "no_viable_vanguard_route_clearance";
          ownCombatants: number;
          enemyCombatants: number;
          reservedCombatants: number;
      }
    | {
          schemaVersion: 2;
          event: "target_progress";
          tick: number;
          targetId: number;
          targetName: string;
          hitPoints: number;
          previousHitPoints: number;
          damage: number;
      }
    | {
          schemaVersion: 2;
          event: "target_stalled";
          tick: number;
          targetId: number;
          targetName: string;
          hitPoints: number;
          lastDamageTick: number;
          stallTicks: number;
      }
    | {
          schemaVersion: 2;
          event: "assignment_summary";
          tick: number;
          eligibleAttackers: number;
          assignedAttackers: number;
          incompatiblePairs: number;
          unreachablePairs: number;
          targetCount: number;
      }
    | {
          schemaVersion: 2;
          event: "capability_production";
          tick: number;
          stalledBuildingIds: number[];
          incompatibleBuildingIds: number[];
          unreachableBuildingIds: number[];
          requestedStructures: string[];
          requestedUnits: string[];
      }
    | {
          schemaVersion: 1;
          event: "memory_invalidated";
          tick: number;
          buildingIds: number[];
      }
    | {
          schemaVersion: 1;
          event: "target_orders";
          tick: number;
          attackerCount: number;
          targets: Array<{ id: number | null; name: string; x: number; y: number; visible: boolean }>;
      }
    | {
          schemaVersion: 1;
          event: "sweep_orders";
          tick: number;
          attackerCount: number;
          targets: PointDescriptor[];
      }
    | {
          schemaVersion: 3;
          event: "engagement_decision";
          tick: number;
          phase: "building_strike" | "blocker_clear" | "no_compatible_target";
          reason: "direct_building" | "building_in_range" | "building_completion_race" |
              "no_route_threat" | "route_interception_wins" | "objective_advance" |
              "no_compatible_target";
          targetId: number | null;
          targetName: string | null;
          targetHitPoints: number | null;
          blockerId: number | null;
          blockerName: string | null;
          ownedAttackerCount: number;
          assignedAttackerCount: number;
          routeThreatCount: number;
          estimatedBuildingCompletionTicks: number | null;
          estimatedForceSurvivalTicks: number | null;
          earliestRouteThreatInterceptTicks: number | null;
      }
    | {
          schemaVersion: 4;
          event: "engagement_allocation";
          tick: number;
          targetId: number;
          targetName: string;
          blockerId: number | null;
          blockerName: string | null;
          assignedAttackerCount: number;
          buildingAttackerCount: number;
          blockerAttackerCount: number;
          inRangeBuildingAttackerCount: number;
      }
    | {
          schemaVersion: 5;
          event: "execution_heartbeat";
          tick: number;
          targetId: number;
          targetName: string;
          targetHitPoints: number;
          targetHitPointDelta: number | null;
          targetVisible: boolean;
          blockerId: number | null;
          blockerName: string | null;
          routeThreatCount: number;
          assignedAttackerIds: number[];
          buildingAttackerIds: number[];
          blockerAttackerIds: number[];
          assignedAttackerTypes: Record<string, number>;
          attackStateCounts: Record<string, number>;
          assignedAttackerCount: number;
          buildingAttackerCount: number;
          blockerAttackerCount: number;
          inRangeBuildingAttackerCount: number;
          totalAssignedHitPoints: number;
          totalBuildingAttackerHitPoints: number;
          totalBlockerAttackerHitPoints: number;
          idleAttackerCount: number;
          movingAttackerCount: number;
          minimumDistanceToFiringPerimeter: number | null;
          medianDistanceToFiringPerimeter: number | null;
          maximumDistanceToFiringPerimeter: number | null;
          minimumDistanceDelta: number | null;
          medianDistanceDelta: number | null;
          noLongerAssignedUnitIds: number[];
          destroyedAssignedUnitIds: number[];
          directBuildingAttackCommandCount: number;
          moveTowardBuildingCommandCount: number;
          blockerAttackCommandCount: number;
      }
    | {
          schemaVersion: 6;
          event: "readiness_reserve";
          tick: number;
          phase: "created" | "accumulating" | "released";
          stagedCombatants: number;
          eligibleCombatants: number;
          vanguardCombatants: number;
      }
    | {
          schemaVersion: 7 | 8 | 9;
          event: "activation_evaluation";
          tick: number;
          phase: "no_target" | "building_ready" | "blocker_ready" | "blocked";
          targetId: number | null;
          targetName: string | null;
          blockerId: number | null;
          blockerName: string | null;
          compatibleAttackerCount: number;
          totalCompatibleAttackerCount?: number;
          transferCertifiedAttackerCount?: number;
          stagedCompatibleAttackerCount?: number;
          routeThreatCount: number;
          estimatedBuildingCompletionTicks: number | null;
          estimatedForceSurvivalTicks: number | null;
          estimatedBlockerRemovalTicks: number | null;
          estimatedRouteClearanceTicks: number | null;
      }
    | {
          schemaVersion: 11 | 14;
          event: "assault_production";
          tick: number;
          side: SideType.Nod | SideType.GDI;
          unitName: "HTNK" | "MTNK";
          targetCount: number;
          currentCount: number;
          requested: boolean;
          available?: boolean;
          credits?: number;
          vehicleQueueStatus?: number;
          vehicleQueueItems?: Array<{ name: string; quantity: number }>;
          queuedCount?: number;
          queueAwareTargeting?: boolean;
      }
    | {
          schemaVersion: 12;
          event: "activation_evaluation";
          tick: number;
          phase: "no_target" | "building_ready" | "blocker_ready" | "blocked";
          targetId: number | null;
          targetName: string | null;
          blockerId: number | null;
          blockerName: string | null;
          compatibleAttackerCount: number;
          totalCompatibleAttackerCount: number;
          transferCertifiedAttackerCount: number;
          stagedCompatibleAttackerCount: number;
          vanguardCompatibleAttackerCount: number;
          assaultTankCount: number;
          routeThreatCount: number;
          estimatedBuildingCompletionTicks: number | null;
          estimatedForceSurvivalTicks: number | null;
          estimatedBlockerRemovalTicks: number | null;
          estimatedRouteClearanceTicks: number | null;
      }
    | {
          schemaVersion: 21;
          event: "activation_evaluation";
          tick: number;
          phase: "no_target" | "building_ready" | "blocker_ready" | "blocked";
          targetId: number | null;
          targetName: string | null;
          blockerId: number | null;
          blockerName: string | null;
          compatibleAttackerCount: number;
          totalCompatibleAttackerCount: number;
          transferCertifiedAttackerCount: number;
          stagedCompatibleAttackerCount: number;
          vanguardCompatibleAttackerCount: number;
          assaultTankCount: number;
          assaultScreenCount: number;
          transferredCapabilityReady: boolean;
          enemyBuildingCount: number;
          activationScopeLatched: boolean;
          routeThreatCount: number;
          estimatedBuildingCompletionTicks: number | null;
          estimatedForceSurvivalTicks: number | null;
          estimatedBlockerRemovalTicks: number | null;
          estimatedRouteClearanceTicks: number | null;
      }
    | {
          schemaVersion: 22;
          event: "activation_evaluation";
          tick: number;
          phase: "no_target" | "building_ready" | "blocker_ready" | "blocked";
          targetId: number | null;
          targetName: string | null;
          blockerId: number | null;
          blockerName: string | null;
          compatibleAttackerCount: number;
          totalCompatibleAttackerCount: number;
          transferCertifiedAttackerCount: number;
          stagedCompatibleAttackerCount: number;
          vanguardCompatibleAttackerCount: number;
          assaultTankCount: number;
          assaultScreenCount: number;
          readinessTankCount: number;
          readinessScreenCount: number;
          transferredCapabilityReady: boolean;
          compositionReady: boolean;
          enemyBuildingCount: number;
          activationScopeLatched: boolean;
          directObjectiveFeasible: boolean;
          completeRouteFeasible: boolean;
          partialBlockerLaunchPermitted: boolean;
          activePredecessorCompatibleAttackerCount: number;
          routeThreatCount: number;
          estimatedBuildingCompletionTicks: number | null;
          estimatedForceSurvivalTicks: number | null;
          estimatedBlockerRemovalTicks: number | null;
          estimatedRouteClearanceTicks: number | null;
      }
    | {
          schemaVersion: 13;
          event: "assault_infrastructure";
          tick: number;
          side: SideType.Nod | SideType.GDI;
          structureName: "NAWEAP" | "GAWEAP";
          currentCount: number;
          available: boolean;
          requested: boolean;
      }
    | {
          schemaVersion: 15;
          event: "assault_production_reservation";
          tick: number;
          side: SideType.Nod | SideType.GDI;
          currentTankCount: number;
          targetTankCount: number;
          retainedNames: string[];
          removedRequestNames: string[];
          canceledQueueItems: Array<{ queue: QueueType; name: string; quantity: number }>;
      }
    | {
          schemaVersion: 16;
          event: "readiness_defense";
          tick: number;
          threatId: number;
          threatName: string;
          protectedId: number;
          protectedName: string;
          distance: number;
          stagedAttackerCount: number;
      }
    | {
          schemaVersion: 17;
          event: "assault_screen_production";
          tick: number;
          side: SideType.Nod | SideType.GDI;
          unitName: "E1" | "E2";
          targetCount: number;
          currentCount: number;
          mainTankPresent: boolean;
          requested: boolean;
          factoryCount?: number;
          factoryTriggerActive?: boolean;
          readinessOwned?: boolean;
          readinessTankCount?: number;
          queuedCount?: number;
          queueAwareTargeting?: boolean;
      }
    | {
          schemaVersion: 18;
          event: "progressive_blocker_launch";
          tick: number;
          targetId: number;
          targetName: string;
          blockerId: number;
          blockerName: string;
          compatibleAttackerCount: number;
          readinessTankCount: number;
          readinessScreenCount: number;
          estimatedBlockerRemovalTicks: number;
          estimatedRouteClearanceTicks: number;
          estimatedForceSurvivalTicks: number;
      }
    | {
          schemaVersion: 19;
          event: "assault_capability_launch";
          tick: number;
          launchMode: "direct_building" | "progressive_blocker" | "conventional_blocker" |
              "attritional_blocker";
          targetId: number;
          targetName: string;
          blockerId: number | null;
          blockerName: string | null;
          compatibleAttackerCount: number;
          readinessTankCount: number;
          readinessScreenCount: number;
          routeThreatCount: number;
          staticRouteThreatCount: number;
          estimatedBuildingCompletionTicks: number | null;
          estimatedBlockerRemovalTicks: number | null;
          estimatedForceSurvivalTicks: number | null;
      }
    | {
          schemaVersion: 20;
          event: "attritional_blocker_launch";
          tick: number;
          targetId: number;
          targetName: string;
          blockerId: number;
          blockerName: string;
          blockerIsStatic: boolean;
          compatibleAttackerCount: number;
          readinessTankCount: number;
          readinessScreenCount: number;
          estimatedBlockerApproachTicks: number;
          estimatedBlockerRemovalTicks: number;
          estimatedRouteClearanceTicks: number | null;
          estimatedForceSurvivalTicks: number;
      }
    | {
          schemaVersion: 10;
          event: "launch_handoff";
          tick: number;
          expectedStagedUnitIds: number[];
          assignedExpectedUnitIds: number[];
          destroyedExpectedUnitIds: number[];
          aliveUnassignedExpectedUnitIds: number[];
      };

export type BuildingEliminationTelemetrySink = (event: BuildingEliminationTelemetryEvent) => void;

export type SweepPointDescriptor = PointDescriptor & {
    visibility: number;
    lastSwept: number;
};

const DEFAULT_OPTIONS: Required<BuildingEliminationOptions> = {
    enabled: false,
    minTick: 9000,
    minCombatants: 12,
    combatantAdvantage: 0,
    maxEnemyCombatants: 999,
    reserveCombatants: 4,
    orderIntervalTicks: 15,
    maxTargetGroups: 3,
    targetPriority: "production",
    observationMode: "publicApi",
    directVisibleAttack: true,
    preemptExistingAttacks: true,
    sweepWhenNoTargets: true,
    sweepRevisitTicks: 900,
    capabilityAwareAttackers: false,
    reachabilityAwareTargets: false,
    stallTicks: 900,
    reassignStalledTargets: false,
    retargetStalledBuildings: false,
    adaptiveAirTargetCount: 0,
    adaptiveNavalTargetCount: 0,
    adaptiveGroundAssaultTargetCount: 0,
    adaptiveGroundAssaultInfrastructure: false,
    adaptiveGroundAssaultProductionReservation: false,
    adaptiveGroundAssaultProductionScopeLatch: false,
    adaptiveGroundAssaultScreenTargetCount: 0,
    adaptiveGroundAssaultScreenFactoryTrigger: false,
    adaptiveGroundAssaultReadinessForceOwnership: false,
    progressiveRouteBlockerLaunch: false,
    requireGroundAssaultCapabilityForActivation: false,
    queueAwareGroundAssaultTargets: false,
    positiveProgressBlockerLaunch: false,
    persistentCloseoutActivationScope: false,
    requireTransferredGroundAssaultCapabilityForActivation: false,
    objectiveFeasibilityOverridesGroundAssaultCapability: false,
    preterminalRequiresRouteFeasibleLaunch: false,
    adaptiveGroundAssaultInfrastructurePriority: 130,
    adaptiveProductionPriority: 140,
    adaptiveTechPriority: 130,
    activationMode: "forceAdvantage",
    maxEnemyBuildings: 1_000,
    engagementMode: "directBuilding",
    engagementAllocationMode: "allBlocker",
    commitRouteBlocker: false,
    routeCorridorRadius: 8,
    readinessReserve: false,
    readinessReserveScope: "reinforcements",
    readinessReserveDefenseRadius: 0,
    contactOnlyBlockerClearance: false,
};

const requireIntegerInRange = (name: string, value: number, minimum: number, maximum: number): void => {
    if (!Number.isInteger(value) || value < minimum || value > maximum) {
        throw new Error(`${name} must be an integer in [${minimum}, ${maximum}], got ${value}`);
    }
};

export const resolveBuildingEliminationOptions = (
    options: BuildingEliminationOptions = {},
): Required<BuildingEliminationOptions> => {
    const definedOptions = Object.fromEntries(
        Object.entries(options).filter(([, value]) => value !== undefined),
    ) as BuildingEliminationOptions;
    const resolved = { ...DEFAULT_OPTIONS, ...definedOptions };
    requireIntegerInRange("minTick", resolved.minTick, 0, 100_000);
    requireIntegerInRange("minCombatants", resolved.minCombatants, 0, 1_000);
    requireIntegerInRange("combatantAdvantage", resolved.combatantAdvantage, -1_000, 1_000);
    requireIntegerInRange("maxEnemyCombatants", resolved.maxEnemyCombatants, 0, 1_000);
    requireIntegerInRange("reserveCombatants", resolved.reserveCombatants, 0, 1_000);
    requireIntegerInRange("orderIntervalTicks", resolved.orderIntervalTicks, 1, 10_000);
    requireIntegerInRange("maxTargetGroups", resolved.maxTargetGroups, 1, 64);
    requireIntegerInRange("sweepRevisitTicks", resolved.sweepRevisitTicks, 0, 100_000);
    requireIntegerInRange("stallTicks", resolved.stallTicks, 1, 100_000);
    requireIntegerInRange("adaptiveAirTargetCount", resolved.adaptiveAirTargetCount, 0, 100);
    requireIntegerInRange("adaptiveNavalTargetCount", resolved.adaptiveNavalTargetCount, 0, 100);
    requireIntegerInRange("adaptiveGroundAssaultTargetCount", resolved.adaptiveGroundAssaultTargetCount, 0, 100);
    requireIntegerInRange("adaptiveGroundAssaultScreenTargetCount", resolved.adaptiveGroundAssaultScreenTargetCount, 0, 100);
    requireIntegerInRange(
        "adaptiveGroundAssaultInfrastructurePriority",
        resolved.adaptiveGroundAssaultInfrastructurePriority,
        1,
        1_000,
    );
    requireIntegerInRange("adaptiveProductionPriority", resolved.adaptiveProductionPriority, 1, 1_000);
    requireIntegerInRange("adaptiveTechPriority", resolved.adaptiveTechPriority, 1, 1_000);
    requireIntegerInRange("maxEnemyBuildings", resolved.maxEnemyBuildings, 1, 1_000);
    requireIntegerInRange("routeCorridorRadius", resolved.routeCorridorRadius, 1, 64);
    requireIntegerInRange("readinessReserveDefenseRadius", resolved.readinessReserveDefenseRadius, 0, 64);
    if (!new Set<BuildingEliminationTargetPriority>(["production", "reinforcement", "defense", "nearest"])
        .has(resolved.targetPriority)) {
        throw new Error(`Invalid building-elimination target priority: ${resolved.targetPriority}`);
    }
    if (!new Set<BuildingEliminationObservationMode>(["publicApi", "visibleOnly"]).has(resolved.observationMode)) {
        throw new Error(`Invalid building-elimination observation mode: ${resolved.observationMode}`);
    }
    if (!new Set<BuildingEliminationActivationMode>([
        "forceAdvantage", "lowBuilding", "objectiveRace", "objectiveClearance", "objectiveRouteClearance",
        "objectiveTransferableRouteClearance", "objectiveStagedRouteClearance",
        "objectiveStagedBlockerClearance", "objectiveVanguardRouteClearance",
    ])
        .has(resolved.activationMode)) {
        throw new Error(`Invalid building-elimination activation mode: ${resolved.activationMode}`);
    }
    if (!new Set<BuildingEliminationEngagementMode>(["directBuilding", "completionRace"])
        .has(resolved.engagementMode)) {
        throw new Error(`Invalid building-elimination engagement mode: ${resolved.engagementMode}`);
    }
    if (!new Set<BuildingEliminationEngagementAllocationMode>(["allBlocker", "boundedScreen", "singleScreen"])
        .has(resolved.engagementAllocationMode)) {
        throw new Error(
            `Invalid building-elimination engagement allocation mode: ${resolved.engagementAllocationMode}`,
        );
    }
    if (typeof resolved.readinessReserve !== "boolean") {
        throw new Error(`Invalid building-elimination readiness reserve: ${resolved.readinessReserve}`);
    }
    if (!new Set<BuildingEliminationReadinessReserveScope>(["reinforcements", "fullForce"])
        .has(resolved.readinessReserveScope)) {
        throw new Error(`Invalid building-elimination readiness reserve scope: ${resolved.readinessReserveScope}`);
    }
    if (typeof resolved.contactOnlyBlockerClearance !== "boolean") {
        throw new Error(
            `Invalid building-elimination contact-only blocker clearance: ${resolved.contactOnlyBlockerClearance}`,
        );
    }
    if (typeof resolved.adaptiveGroundAssaultInfrastructure !== "boolean") {
        throw new Error(
            `Invalid building-elimination ground-assault infrastructure: ${resolved.adaptiveGroundAssaultInfrastructure}`,
        );
    }
    if (typeof resolved.adaptiveGroundAssaultProductionReservation !== "boolean") {
        throw new Error(
            "Invalid building-elimination ground-assault production reservation: " +
            `${resolved.adaptiveGroundAssaultProductionReservation}`,
        );
    }
    if (typeof resolved.adaptiveGroundAssaultProductionScopeLatch !== "boolean") {
        throw new Error(
            "Invalid building-elimination ground-assault production-scope latch: " +
            `${resolved.adaptiveGroundAssaultProductionScopeLatch}`,
        );
    }
    if (typeof resolved.adaptiveGroundAssaultScreenFactoryTrigger !== "boolean") {
        throw new Error(
            "Invalid building-elimination ground-assault screen factory trigger: " +
            `${resolved.adaptiveGroundAssaultScreenFactoryTrigger}`,
        );
    }
    if (typeof resolved.adaptiveGroundAssaultReadinessForceOwnership !== "boolean") {
        throw new Error(
            "Invalid building-elimination ground-assault readiness force ownership: " +
            `${resolved.adaptiveGroundAssaultReadinessForceOwnership}`,
        );
    }
    if (typeof resolved.progressiveRouteBlockerLaunch !== "boolean") {
        throw new Error(
            `Invalid building-elimination progressive route-blocker launch: ${resolved.progressiveRouteBlockerLaunch}`,
        );
    }
    if (typeof resolved.requireGroundAssaultCapabilityForActivation !== "boolean") {
        throw new Error(
            "Invalid building-elimination ground-assault activation capability: " +
            `${resolved.requireGroundAssaultCapabilityForActivation}`,
        );
    }
    if (typeof resolved.queueAwareGroundAssaultTargets !== "boolean") {
        throw new Error(
            `Invalid building-elimination queue-aware ground-assault targets: ${resolved.queueAwareGroundAssaultTargets}`,
        );
    }
    if (typeof resolved.positiveProgressBlockerLaunch !== "boolean") {
        throw new Error(
            `Invalid building-elimination positive-progress blocker launch: ${resolved.positiveProgressBlockerLaunch}`,
        );
    }
    if (typeof resolved.persistentCloseoutActivationScope !== "boolean") {
        throw new Error(
            `Invalid building-elimination persistent activation scope: ${resolved.persistentCloseoutActivationScope}`,
        );
    }
    if (typeof resolved.requireTransferredGroundAssaultCapabilityForActivation !== "boolean") {
        throw new Error(
            "Invalid building-elimination transferred activation capability: " +
            `${resolved.requireTransferredGroundAssaultCapabilityForActivation}`,
        );
    }
    if (typeof resolved.objectiveFeasibilityOverridesGroundAssaultCapability !== "boolean") {
        throw new Error(
            "Invalid building-elimination objective-feasibility capability override: " +
            `${resolved.objectiveFeasibilityOverridesGroundAssaultCapability}`,
        );
    }
    if (typeof resolved.preterminalRequiresRouteFeasibleLaunch !== "boolean") {
        throw new Error(
            "Invalid building-elimination preterminal route-feasible launch requirement: " +
            `${resolved.preterminalRequiresRouteFeasibleLaunch}`,
        );
    }
    return resolved;
};

const BUILDING_ELIMINATION_MISSION_NAME = "buildingElimination";
const BUILDING_ELIMINATION_CAPABILITY_BUILD_MISSION_NAME = "buildingEliminationCapabilityBuild";
const BUILDING_ELIMINATION_CAPABILITY_UNIT_MISSION_NAME = "buildingEliminationCapabilityUnits";
const BUILDING_ELIMINATION_ASSAULT_PRODUCTION_MISSION_NAME = "buildingEliminationAssaultProduction";
const BUILDING_ELIMINATION_ASSAULT_BUILD_MISSION_NAME = "buildingEliminationAssaultBuild";
const BUILDING_ELIMINATION_PRIORITY = 300;
const BUILDING_ELIMINATION_READINESS_RESERVE_PRIORITY = 290;
const BUILDING_ELIMINATION_READINESS_RESERVE_MISSION_NAME = "buildingEliminationReadinessReserve";
export const BUILDING_ELIMINATION_READINESS_FORCE_MISSION_NAME = "buildingEliminationReadinessForce";
const isBuildingEliminationReadinessMissionName = (name: string | null): boolean =>
    name === BUILDING_ELIMINATION_READINESS_RESERVE_MISSION_NAME ||
    name === BUILDING_ELIMINATION_READINESS_FORCE_MISSION_NAME;
export const getBuildingEliminationReadinessMissionName = (
    forceOwnership: boolean,
): string => forceOwnership
    ? BUILDING_ELIMINATION_READINESS_FORCE_MISSION_NAME
    : BUILDING_ELIMINATION_READINESS_RESERVE_MISSION_NAME;
const TELEMETRY_HEARTBEAT_TICKS = 120;
const BLOCKED_TELEMETRY_HEARTBEAT_TICKS = 300;
const POWER_BUILDINGS = new Set(["NAPOWR", "NANRCT", "GAPOWR"]);
const DEFENSE_BUILDINGS = new Set([
    "NALASR",
    "TESLA",
    "NAFLAK",
    "NASAM",
    "GAPILL",
    "ATESLA",
    "GTGCAN",
    "GASPYSAT",
]);

export const isEnemyOwned = (game: GameApi, playerName: string, unit: UnitData): boolean => {
    if (isOwnedByNeutral(unit) || unit.owner === playerName || game.areAlliedPlayers(playerName, unit.owner)) {
        return false;
    }
    try {
        return game.getPlayerData(unit.owner).isCombatant;
    } catch {
        return false;
    }
};

const toTargetDescriptor = (unit: UnitData, visible: boolean): BuildingTargetDescriptor => ({
    id: unit.id,
    x: unit.tile.rx,
    y: unit.tile.ry,
    name: unit.rules.name,
    maxHitPoints: unit.maxHitPoints ?? 0,
    hitPoints: unit.hitPoints ?? 0,
    constructionYard: !!unit.rules.constructionYard || unit.rules.name === "AMCV" || unit.rules.name === "SMCV",
    weaponsFactory: !!unit.rules.weaponsFactory,
    barracks: !!unit.rules.nodBarracks || !!unit.rules.gdiBarracks,
    refinery: !!unit.rules.refinery,
    power: POWER_BUILDINGS.has(unit.rules.name),
    defense: DEFENSE_BUILDINGS.has(unit.rules.name),
    visible,
});

export const getBuildingTargetWeight = (
    target: BuildingTargetDescriptor,
    priority: BuildingEliminationTargetPriority,
): number => {
    if (priority === "nearest") {
        return 0;
    }
    if (priority === "reinforcement") {
        if (target.barracks) return 8_000_000 + target.maxHitPoints;
        if (target.weaponsFactory) return 7_000_000 + target.maxHitPoints;
        if (target.constructionYard) return 6_000_000 + target.maxHitPoints;
        if (target.power) return 5_000_000 + target.maxHitPoints;
        if (target.defense) return 4_000_000 + target.maxHitPoints;
        if (target.refinery) return 3_000_000 + target.maxHitPoints;
        return 2_000_000 + target.maxHitPoints;
    }
    if (priority === "defense") {
        if (target.power) return 8_000_000 + target.maxHitPoints;
        if (target.defense) return 7_000_000 + target.maxHitPoints;
        if (target.constructionYard) return 6_000_000 + target.maxHitPoints;
        if (target.weaponsFactory || target.barracks) return 5_000_000 + target.maxHitPoints;
        if (target.refinery) return 4_000_000 + target.maxHitPoints;
        return 3_000_000 + target.maxHitPoints;
    }
    if (target.constructionYard) return 8_000_000 + target.maxHitPoints;
    if (target.power) return 7_000_000 + target.maxHitPoints;
    if (target.weaponsFactory || target.barracks) return 6_000_000 + target.maxHitPoints;
    if (target.defense) return 5_000_000 + target.maxHitPoints;
    if (target.refinery) return 4_000_000 + target.maxHitPoints;
    return 3_000_000 + target.maxHitPoints;
};

const distanceSquared = (left: PointDescriptor, right: PointDescriptor): number => {
    const dx = left.x - right.x;
    const dy = left.y - right.y;
    return dx * dx + dy * dy;
};

export type BuildingTargetProgressState = {
    hitPoints: number;
    lastObservedTick: number;
    lastDamageTick: number;
    stalled: boolean;
};

export type BuildingTargetProgressUpdate = {
    state: BuildingTargetProgressState;
    previousHitPoints: number;
    damage: number;
    becameStalled: boolean;
};

export const updateBuildingTargetProgress = (
    previous: BuildingTargetProgressState | undefined,
    hitPoints: number,
    tick: number,
    stallTicks: number,
): BuildingTargetProgressUpdate => {
    requireIntegerInRange("hitPoints", hitPoints, 0, Number.MAX_SAFE_INTEGER);
    requireIntegerInRange("tick", tick, 0, Number.MAX_SAFE_INTEGER);
    requireIntegerInRange("stallTicks", stallTicks, 1, 100_000);
    const previousHitPoints = previous?.hitPoints ?? hitPoints;
    const damage = Math.max(0, previousHitPoints - hitPoints);
    const lastDamageTick = damage > 0 ? tick : (previous?.lastDamageTick ?? tick);
    const stalled = tick - lastDamageTick >= stallTicks;
    return {
        state: { hitPoints, lastObservedTick: tick, lastDamageTick, stalled },
        previousHitPoints,
        damage,
        becameStalled: stalled && previous?.stalled !== true,
    };
};

export const weaponCanDamageBuildingArmor = (
    weapon: WeaponData | undefined,
    armor: ArmorType,
): boolean => {
    if (!weapon?.projectileRules.isAntiGround || weapon.rules.damage <= 0) {
        return false;
    }
    return (weapon.warheadRules.verses.get(armor) ?? 0) > 0;
};

/**
 * The launcher weapon of a spawn carrier has synthetic damage; its spawned
 * missile/aircraft applies the real warhead. Preserve these engine-native
 * anti-structure systems rather than treating an empty launcher Verses map as
 * proof of zero damage.
 */
export const unitCanDamageBuilding = (attacker: UnitData, target: UnitData): boolean => {
    if (target.rules.type !== ObjectType.Building) {
        return false;
    }
    if ((attacker.rules.c4 || attacker.rules.ivan) && target.rules.canC4) {
        return true;
    }
    if (
        attacker.rules.spawns &&
        (attacker.primaryWeapon?.projectileRules.isAntiGround ||
            attacker.secondaryWeapon?.projectileRules.isAntiGround)
    ) {
        return true;
    }
    return [attacker.primaryWeapon, attacker.secondaryWeapon].some((weapon) =>
        weaponCanDamageBuildingArmor(weapon, target.rules.armor),
    );
};

const resolvedSpeedType = (attacker: UnitData): SpeedType | null => {
    if (attacker.rules.speedType !== undefined) {
        return attacker.rules.speedType;
    }
    if (attacker.type === ObjectType.Infantry) {
        return SpeedType.Foot;
    }
    if (attacker.type === ObjectType.Aircraft) {
        return SpeedType.Winged;
    }
    return null;
};

const maximumGroundWeaponRange = (attacker: UnitData): number =>
    Math.max(
        1,
        ...[attacker.primaryWeapon, attacker.secondaryWeapon]
            .filter((weapon): weapon is WeaponData => !!weapon?.projectileRules.isAntiGround)
            .map(({ maxRange }) => maxRange),
    );

const tileDistanceToFoundation = (x: number, y: number, target: UnitData): number => {
    const left = target.tile.rx;
    const top = target.tile.ry;
    const right = left + Math.max(1, target.foundation.width) - 1;
    const bottom = top + Math.max(1, target.foundation.height) - 1;
    const dx = x < left ? left - x : x > right ? x - right : 0;
    const dy = y < top ? top - y : y > bottom ? y - bottom : 0;
    return Math.sqrt(dx * dx + dy * dy);
};

export const canReachBuildingFiringPerimeter = (
    game: GameApi,
    attacker: UnitData,
    target: UnitData,
): boolean => {
    const speedType = resolvedSpeedType(attacker);
    if (speedType === SpeedType.Winged) {
        return true;
    }
    // Unknown custom locomotors remain assignable; target progress telemetry
    // is the authoritative stall check for interfaces the API cannot classify.
    if (speedType === null) {
        return true;
    }
    const maximumRange = maximumGroundWeaponRange(attacker);
    const padding = Math.max(1, Math.ceil(maximumRange));
    const candidates = game.mapApi.getTilesInRect({
        x: target.tile.rx - padding,
        y: target.tile.ry - padding,
        width: target.foundation.width + padding * 2,
        height: target.foundation.height + padding * 2,
    });
    const subCell = attacker.type === ObjectType.Infantry;
    const reachability = game.map.getReachabilityMap(speedType, subCell);
    const from = { tile: attacker.tile, onBridge: attacker.onBridge ?? false };
    return candidates.some((tile) =>
        tileDistanceToFoundation(tile.rx, tile.ry, target) <= maximumRange &&
        game.mapApi.isPassableTile(tile, speedType, !!tile.onBridgeLandType, subCell) &&
        reachability.isReachable(from, { tile, onBridge: !!tile.onBridgeLandType }),
    );
};

const distance = (left: PointDescriptor, right: PointDescriptor): number =>
    Math.sqrt(distanceSquared(left, right));

const distanceToSegment = (
    candidate: PointDescriptor,
    start: PointDescriptor,
    end: PointDescriptor,
): number => {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const lengthSquared = dx * dx + dy * dy;
    if (lengthSquared === 0) return distance(candidate, start);
    const projection = Math.max(0, Math.min(1,
        ((candidate.x - start.x) * dx + (candidate.y - start.y) * dy) / lengthSquared,
    ));
    return distance(candidate, {
        x: start.x + projection * dx,
        y: start.y + projection * dy,
    });
};

const weaponDamagePerTickAgainst = (weapon: WeaponData | undefined, target: UnitData): number => {
    if (!weapon?.projectileRules.isAntiGround || weapon.rules.damage <= 0 || weapon.rules.neverUse) return 0;
    const verses = weapon.warheadRules.verses.get(target.rules.armor) ?? 0;
    return verses <= 0 ? 0 : weapon.rules.damage * Math.max(1, weapon.rules.burst) * verses /
        Math.max(1, weapon.rules.rof);
};

const unitDamagePerTickAgainst = (attacker: UnitData, target: UnitData): number =>
    Math.max(0, ...[attacker.primaryWeapon, attacker.secondaryWeapon]
        .map((weapon) => weaponDamagePerTickAgainst(weapon, target)));

export const selectBuildingEliminationRouteThreatCandidates = (
    enemyUnits: UnitData[],
    attackers: UnitData[],
): UnitData[] => enemyUnits.filter((unit) => {
    if (unit.rules.harvester) return false;
    if (unit.rules.type !== ObjectType.Building) return !!unit.rules.isSelectableCombatant;
    return attackers.some((attacker) => unitDamagePerTickAgainst(unit, attacker) > 0);
});

const maximumDamageRangeAgainst = (attacker: UnitData, target: UnitData): number =>
    Math.max(0, ...[attacker.primaryWeapon, attacker.secondaryWeapon]
        .filter((weapon) => weaponDamagePerTickAgainst(weapon, target) > 0)
        .map((weapon) => weapon?.maxRange ?? 0));

const unitSpeedTilesPerTick = (unit: UnitData): number => {
    const speed = Number(unit.rules.speed ?? 0) / 256;
    return Number.isFinite(speed) && speed > 0 ? speed : 1 / 15;
};

const piecewiseForceSurvivalTicks = (
    hitPoints: number,
    arrivals: readonly { interceptTicks: number; damagePerTick: number }[],
): number => {
    const ordered = arrivals.slice().sort((left, right) => left.interceptTicks - right.interceptTicks);
    let remaining = hitPoints;
    let activeDamagePerTick = 0;
    let tick = 0;
    for (const arrival of ordered) {
        const interval = Math.max(0, arrival.interceptTicks - tick);
        const intervalDamage = activeDamagePerTick * interval;
        if (activeDamagePerTick > 0 && intervalDamage >= remaining) {
            return tick + remaining / activeDamagePerTick;
        }
        remaining -= intervalDamage;
        tick = arrival.interceptTicks;
        activeDamagePerTick += arrival.damagePerTick;
    }
    return activeDamagePerTick > 0 ? tick + remaining / activeDamagePerTick : Number.POSITIVE_INFINITY;
};

export type BuildingEliminationEngagementDecision = {
    blocker: UnitData | null;
    reason: "building_in_range" | "building_completion_race" |
        "no_route_threat" | "route_interception_wins" | "objective_advance";
    routeThreatCount: number;
    staticRouteThreatCount: number;
    estimatedBuildingCompletionTicks: number;
    estimatedForceSurvivalTicks: number;
    earliestRouteThreatInterceptTicks: number;
    estimatedBlockerApproachTicks: number;
    estimatedBlockerRemovalTicks: number;
    estimatedRouteClearanceTicks: number;
};

export const applyContactTriggeredBuildingAdvance = (
    decision: BuildingEliminationEngagementDecision,
    preserveCommittedBlocker: boolean,
): BuildingEliminationEngagementDecision =>
    decision.blocker !== null && decision.earliestRouteThreatInterceptTicks > 0 &&
    !preserveCommittedBlocker
        ? { ...decision, blocker: null, reason: "objective_advance" }
        : decision;

export const chooseBuildingEliminationEngagement = (
    attackers: UnitData[],
    target: UnitData,
    enemyForces: UnitData[],
    corridorRadius: number,
    preferredBlockerId: number | null = null,
): BuildingEliminationEngagementDecision => {
    const center = {
        x: attackers.reduce((sum, attacker) => sum + attacker.tile.rx, 0) / Math.max(1, attackers.length),
        y: attackers.reduce((sum, attacker) => sum + attacker.tile.ry, 0) / Math.max(1, attackers.length),
    };
    const targetPoint = { x: target.tile.rx, y: target.tile.ry };
    const buildingDamagePerTick = attackers.reduce(
        (sum, attacker) => sum + unitDamagePerTickAgainst(attacker, target),
        0,
    );
    const approachTicks = attackers.length === 0 ? Number.POSITIVE_INFINITY : Math.min(...attackers.map((attacker) =>
        Math.max(
            0,
            tileDistanceToFoundation(attacker.tile.rx, attacker.tile.ry, target) -
                maximumDamageRangeAgainst(attacker, target),
        ) / unitSpeedTilesPerTick(attacker),
    ));
    const estimatedBuildingCompletionTicks = buildingDamagePerTick > 0
        ? approachTicks + target.hitPoints / buildingDamagePerTick
        : Number.POSITIVE_INFINITY;
    const buildingInRange = attackers.some((attacker) =>
        tileDistanceToFoundation(attacker.tile.rx, attacker.tile.ry, target) <=
            maximumDamageRangeAgainst(attacker, target),
    );
    const threats = enemyForces
        .filter((force) => distanceToSegment(
            { x: force.tile.rx, y: force.tile.ry },
            center,
            targetPoint,
        ) <= corridorRadius)
        .map((force) => {
            const threatDamagePerTick = Math.max(
                0,
                ...attackers.map((attacker) => unitDamagePerTickAgainst(force, attacker)),
            );
            const interceptTicks = attackers.length === 0 ? Number.POSITIVE_INFINITY : Math.min(
                ...attackers.map((attacker) => {
                    const closingSpeed = unitSpeedTilesPerTick(force) + unitSpeedTilesPerTick(attacker);
                    const range = maximumDamageRangeAgainst(force, attacker);
                    return Math.max(
                        0,
                        distance(
                            { x: force.tile.rx, y: force.tile.ry },
                            { x: attacker.tile.rx, y: attacker.tile.ry },
                        ) - range,
                    ) / closingSpeed;
                }),
            );
            const removalDamagePerTick = attackers.reduce(
                (sum, attacker) => sum + unitDamagePerTickAgainst(attacker, force),
                0,
            );
            const removalTicks = removalDamagePerTick > 0
                ? force.hitPoints / removalDamagePerTick
                : Number.POSITIVE_INFINITY;
            const score = Number.isFinite(removalTicks) && removalTicks > 0
                ? threatDamagePerTick / removalTicks / (1 + interceptTicks)
                : 0;
            return { force, threatDamagePerTick, interceptTicks, removalTicks, score };
        })
        .filter(({ threatDamagePerTick, interceptTicks, removalTicks }) =>
            threatDamagePerTick > 0 && Number.isFinite(removalTicks) &&
            interceptTicks < estimatedBuildingCompletionTicks,
        )
        .sort((left, right) => right.score - left.score || left.force.id - right.force.id);
    const estimatedForceSurvivalTicks = piecewiseForceSurvivalTicks(
        attackers.reduce((sum, attacker) => sum + attacker.hitPoints, 0),
        threats.map(({ interceptTicks, threatDamagePerTick }) => ({
            interceptTicks,
            damagePerTick: threatDamagePerTick,
        })),
    );
    const earliestRouteThreatInterceptTicks = threats.length === 0
        ? Number.POSITIVE_INFINITY
        : Math.min(...threats.map(({ interceptTicks }) => interceptTicks));
    const selectedBlocker = threats.find(({ force }) => force.id === preferredBlockerId)?.force ??
        threats[0]?.force ?? null;
    const staticRouteThreatCount = threats.filter(({ force }) =>
        force.rules.type === ObjectType.Building,
    ).length;
    const blockerDamagePerTick = selectedBlocker === null ? 0 : attackers.reduce(
        (sum, attacker) => sum + unitDamagePerTickAgainst(attacker, selectedBlocker),
        0,
    );
    const blockerApproachTicks = selectedBlocker === null || attackers.length === 0
        ? Number.POSITIVE_INFINITY
        : Math.min(...attackers.map((attacker) => Math.max(
            0,
            distance(
                { x: attacker.tile.rx, y: attacker.tile.ry },
                { x: selectedBlocker.tile.rx, y: selectedBlocker.tile.ry },
            ) - maximumDamageRangeAgainst(attacker, selectedBlocker),
        ) / unitSpeedTilesPerTick(attacker)));
    const estimatedBlockerRemovalTicks = selectedBlocker !== null && blockerDamagePerTick > 0
        ? blockerApproachTicks + selectedBlocker.hitPoints / blockerDamagePerTick
        : Number.POSITIVE_INFINITY;
    const estimatedRouteClearanceTicks = selectedBlocker !== null &&
        threats.every(({ removalTicks }) => Number.isFinite(removalTicks))
        ? blockerApproachTicks + threats.reduce((sum, { removalTicks }) => sum + removalTicks, 0)
        : Number.POSITIVE_INFINITY;
    if (buildingInRange) return {
        blocker: null,
        reason: "building_in_range",
        routeThreatCount: threats.length,
        staticRouteThreatCount,
        estimatedBuildingCompletionTicks,
        estimatedForceSurvivalTicks,
        earliestRouteThreatInterceptTicks,
        estimatedBlockerApproachTicks: blockerApproachTicks,
        estimatedBlockerRemovalTicks,
        estimatedRouteClearanceTicks,
    };
    if (threats.length === 0) return {
        blocker: null,
        reason: "no_route_threat",
        routeThreatCount: 0,
        staticRouteThreatCount: 0,
        estimatedBuildingCompletionTicks,
        estimatedForceSurvivalTicks,
        earliestRouteThreatInterceptTicks,
        estimatedBlockerApproachTicks: blockerApproachTicks,
        estimatedBlockerRemovalTicks,
        estimatedRouteClearanceTicks,
    };
    if (estimatedBuildingCompletionTicks <= estimatedForceSurvivalTicks) return {
        blocker: null,
        reason: "building_completion_race",
        routeThreatCount: threats.length,
        staticRouteThreatCount,
        estimatedBuildingCompletionTicks,
        estimatedForceSurvivalTicks,
        earliestRouteThreatInterceptTicks,
        estimatedBlockerApproachTicks: blockerApproachTicks,
        estimatedBlockerRemovalTicks,
        estimatedRouteClearanceTicks,
    };
    return {
        blocker: selectedBlocker,
        reason: "route_interception_wins",
        routeThreatCount: threats.length,
        staticRouteThreatCount,
        estimatedBuildingCompletionTicks,
        estimatedForceSurvivalTicks,
        earliestRouteThreatInterceptTicks,
        estimatedBlockerApproachTicks: blockerApproachTicks,
        estimatedBlockerRemovalTicks,
        estimatedRouteClearanceTicks,
    };
};

export const meetsObjectiveRaceBuildingEliminationActivationGate = (
    attackers: UnitData[],
    target: UnitData,
    enemyForces: UnitData[],
    corridorRadius: number,
): boolean => chooseBuildingEliminationEngagement(
    attackers,
    target,
    enemyForces,
    corridorRadius,
).blocker === null;

export const meetsObjectiveClearanceBuildingEliminationActivationGate = (
    attackers: UnitData[],
    target: UnitData,
    enemyForces: UnitData[],
    corridorRadius: number,
): boolean => {
    const decision = chooseBuildingEliminationEngagement(attackers, target, enemyForces, corridorRadius);
    return decision.blocker === null ||
        decision.estimatedBlockerRemovalTicks <= decision.estimatedForceSurvivalTicks;
};

export const meetsObjectiveRouteClearanceBuildingEliminationActivationGate = (
    attackers: UnitData[],
    target: UnitData,
    enemyForces: UnitData[],
    corridorRadius: number,
): boolean => {
    const decision = chooseBuildingEliminationEngagement(attackers, target, enemyForces, corridorRadius);
    return decision.blocker === null ||
        decision.estimatedRouteClearanceTicks <= decision.estimatedForceSurvivalTicks;
};

export type BuildingEliminationEngagementAllocation = {
    buildingAttackers: UnitData[];
    blockerAttackers: UnitData[];
    inRangeBuildingAttackerCount: number;
};

export const allocateBuildingEliminationEngagement = (
    attackers: UnitData[],
    target: UnitData,
    blocker: UnitData | null,
    mode: BuildingEliminationEngagementAllocationMode,
): BuildingEliminationEngagementAllocation => {
    if (blocker === null) {
        return {
            buildingAttackers: attackers.slice(),
            blockerAttackers: [],
            inRangeBuildingAttackerCount: attackers.filter((attacker) =>
                tileDistanceToFoundation(attacker.tile.rx, attacker.tile.ry, target) <=
                    maximumDamageRangeAgainst(attacker, target),
            ).length,
        };
    }
    if (mode === "allBlocker") {
        const blockerAttackers = attackers.filter((attacker) => unitDamagePerTickAgainst(attacker, blocker) > 0);
        const blockerIds = new Set(blockerAttackers.map(({ id }) => id));
        return {
            buildingAttackers: attackers.filter(({ id }) => !blockerIds.has(id)),
            blockerAttackers,
            inRangeBuildingAttackerCount: 0,
        };
    }

    const inRangeIds = new Set(attackers.filter((attacker) =>
        tileDistanceToFoundation(attacker.tile.rx, attacker.tile.ry, target) <=
            maximumDamageRangeAgainst(attacker, target),
    ).map(({ id }) => id));
    const allocationLimit = mode === "singleScreen" ? 1 : Math.floor(attackers.length / 2);
    const maximumBlockerAttackers = Math.min(
        allocationLimit,
        attackers.length - Math.max(1, inRangeIds.size),
    );
    const blockerAttackers = attackers
        .filter(({ id }) => !inRangeIds.has(id))
        .filter((attacker) => unitDamagePerTickAgainst(attacker, blocker) > 0)
        .sort((left, right) => {
            const leftBlockerDamage = unitDamagePerTickAgainst(left, blocker);
            const rightBlockerDamage = unitDamagePerTickAgainst(right, blocker);
            const leftBuildingDamage = unitDamagePerTickAgainst(left, target);
            const rightBuildingDamage = unitDamagePerTickAgainst(right, target);
            const leftComparative = leftBlockerDamage / Math.max(Number.EPSILON, leftBuildingDamage);
            const rightComparative = rightBlockerDamage / Math.max(Number.EPSILON, rightBuildingDamage);
            return rightComparative - leftComparative || rightBlockerDamage - leftBlockerDamage || left.id - right.id;
        })
        .slice(0, Math.max(0, maximumBlockerAttackers));
    const blockerIds = new Set(blockerAttackers.map(({ id }) => id));
    return {
        buildingAttackers: attackers.filter(({ id }) => !blockerIds.has(id)),
        blockerAttackers,
        inRangeBuildingAttackerCount: inRangeIds.size,
    };
};

export type BuildingExecutionDistanceSummary = {
    minimum: number | null;
    median: number | null;
    maximum: number | null;
    inRangeCount: number;
};

export const summarizeBuildingExecutionDistances = (
    attackers: UnitData[],
    target: UnitData,
): BuildingExecutionDistanceSummary => {
    const distances = attackers.map((attacker) => Math.max(
        0,
        tileDistanceToFoundation(attacker.tile.rx, attacker.tile.ry, target) -
            maximumDamageRangeAgainst(attacker, target),
    )).sort((left, right) => left - right);
    if (distances.length === 0) {
        return { minimum: null, median: null, maximum: null, inRangeCount: 0 };
    }
    const middle = Math.floor(distances.length / 2);
    const median = distances.length % 2 === 0
        ? (distances[middle - 1] + distances[middle]) / 2
        : distances[middle];
    return {
        minimum: distances[0],
        median,
        maximum: distances[distances.length - 1],
        inRangeCount: distances.filter((value) => value === 0).length,
    };
};

export const assignAttackersToCompatibleTargets = <T extends PointDescriptor, U extends PointDescriptor>(
    attackers: T[],
    targets: U[],
    compatible: (attacker: T, target: U) => boolean,
): Array<{ attacker: T; target: U }> => {
    const assignedCounts = new Map<U, number>(targets.map((target) => [target, 0]));
    const result: Array<{ attacker: T; target: U }> = [];
    for (const attacker of attackers) {
        const candidates = targets.filter((target) => compatible(attacker, target));
        if (candidates.length === 0) continue;
        const target = candidates.reduce((best, candidate) => {
            const bestScore = distanceSquared(attacker, best) * (1 + (assignedCounts.get(best) ?? 0));
            const candidateScore = distanceSquared(attacker, candidate) * (1 + (assignedCounts.get(candidate) ?? 0));
            return candidateScore < bestScore ? candidate : best;
        }, candidates[0]);
        assignedCounts.set(target, (assignedCounts.get(target) ?? 0) + 1);
        result.push({ attacker, target });
    }
    return result;
};

export const selectCompatibleBuildingTargets = <T, U>(
    attackers: T[],
    rankedTargets: U[],
    maximum: number,
    compatible: (attacker: T, target: U) => boolean,
): U[] => rankedTargets
    .filter((target) => attackers.some((attacker) => compatible(attacker, target)))
    .slice(0, Math.max(1, maximum));

export const shouldDirectAttackBuildingTarget = (
    directVisibleAttack: boolean,
    targetIsVisible: boolean,
    currentTargetExists: boolean,
): boolean => directVisibleAttack && targetIsVisible && currentTargetExists;

export const prioritizeStalledBuildingTargets = (
    targets: BuildingTargetDescriptor[],
    progress: ReadonlyMap<number, BuildingTargetProgressState>,
): BuildingTargetDescriptor[] =>
    targets.slice().sort((left, right) =>
        Number(progress.get(right.id ?? -1)?.stalled === true) -
        Number(progress.get(left.id ?? -1)?.stalled === true),
    );

export const deferStalledBuildingTargets = (
    targets: BuildingTargetDescriptor[],
    progress: ReadonlyMap<number, BuildingTargetProgressState>,
): BuildingTargetDescriptor[] =>
    targets.slice().sort((left, right) =>
        Number(progress.get(left.id ?? -1)?.stalled === true) -
        Number(progress.get(right.id ?? -1)?.stalled === true),
    );

export type BuildingCapabilityGap = {
    stalledBuildingIds: number[];
    incompatibleBuildingIds: number[];
    unreachableBuildingIds: number[];
};

export const classifyBuildingCapabilityGaps = (
    attackers: UnitData[],
    buildings: UnitData[],
    stalledBuildingIds: ReadonlySet<number>,
    canDamage: (attacker: UnitData, building: UnitData) => boolean,
    canReach: (attacker: UnitData, building: UnitData) => boolean,
): BuildingCapabilityGap => {
    const incompatibleBuildingIds: number[] = [];
    const unreachableBuildingIds: number[] = [];
    for (const building of buildings) {
        const damagingAttackers = attackers.filter((attacker) => canDamage(attacker, building));
        if (damagingAttackers.length === 0) {
            incompatibleBuildingIds.push(building.id);
        } else if (!damagingAttackers.some((attacker) => canReach(attacker, building))) {
            unreachableBuildingIds.push(building.id);
        }
    }
    const presentIds = new Set(buildings.map(({ id }) => id));
    return {
        stalledBuildingIds: [...stalledBuildingIds].filter((id) => presentIds.has(id)).sort((a, b) => a - b),
        incompatibleBuildingIds: incompatibleBuildingIds.sort((a, b) => a - b),
        unreachableBuildingIds: unreachableBuildingIds.sort((a, b) => a - b),
    };
};

export type BuildingCapabilityProductionPlan = {
    structures: string[];
    units: Array<{ name: string; targetCount: number }>;
};

export const getBuildingCapabilityUnitMissionAction = (
    assignedUnitIds: number[],
    requests: Record<string, number>,
): MissionAction => {
    // Type requests assign completed units to this producer mission. Release
    // them before refreshing production so the elimination mission can claim
    // and command them on the following controller update.
    if (assignedUnitIds.length > 0) return releaseUnits(assignedUnitIds);
    return Object.keys(requests).length > 0 ? requestUnits(requests) : noop();
};

export const getBuildingCapabilityProductionPlan = (
    side: SideType.Nod | SideType.GDI,
    airTargetCount: number,
    navalTargetCount: number,
    needsNavalCapability: boolean,
): BuildingCapabilityProductionPlan => {
    const structures: string[] = [];
    const units: Array<{ name: string; targetCount: number }> = [];
    if (airTargetCount > 0) {
        if (side === SideType.Nod) {
            structures.push("NARADR", "NATECH");
            units.push({ name: "ZEP", targetCount: airTargetCount });
        } else {
            // GAAIRC is forbidden to the USA, whose rules-equivalent radar
            // and airfield is AMRADR. The production mission chooses whichever
            // prerequisite is actually exposed by the live rules.
            structures.push("GAAIRC", "AMRADR");
            units.push({ name: "JUMPJET", targetCount: airTargetCount });
        }
    }
    if (navalTargetCount > 0 && needsNavalCapability) {
        if (side === SideType.Nod) {
            structures.push("NAYARD", "NARADR", "NATECH");
            units.push({ name: "DRED", targetCount: navalTargetCount });
        } else {
            structures.push("GAYARD", "GAAIRC", "AMRADR", "GATECH");
            units.push({ name: "CARRIER", targetCount: navalTargetCount });
        }
    }
    return {
        structures: [...new Set(structures)],
        units,
    };
};

export const selectAvailableCapabilityStructures = (
    plannedStructures: string[],
    availableStructureNames: ReadonlySet<string>,
    ownedStructureNames: ReadonlySet<string>,
): string[] =>
    plannedStructures.filter(
        (name) => availableStructureNames.has(name) && !ownedStructureNames.has(name),
    );

export const rankBuildingTargets = (
    targets: BuildingTargetDescriptor[],
    priority: BuildingEliminationTargetPriority,
    attackers: PointDescriptor[],
): BuildingTargetDescriptor[] =>
    targets.slice().sort((left, right) => {
        const weightDifference = getBuildingTargetWeight(right, priority) - getBuildingTargetWeight(left, priority);
        if (weightDifference !== 0) {
            return weightDifference;
        }
        const leftDistance = attackers.reduce(
            (best, attacker) => Math.min(best, distanceSquared(attacker, left)),
            Number.POSITIVE_INFINITY,
        );
        const rightDistance = attackers.reduce(
            (best, attacker) => Math.min(best, distanceSquared(attacker, right)),
            Number.POSITIVE_INFINITY,
        );
        if (leftDistance !== rightDistance) {
            return leftDistance - rightDistance;
        }
        return (left.id ?? Number.MAX_SAFE_INTEGER) - (right.id ?? Number.MAX_SAFE_INTEGER);
    });

export const assignAttackersToTargets = <T extends PointDescriptor, U extends PointDescriptor>(
    attackers: T[],
    targets: U[],
): Array<{ attacker: T; target: U }> => {
    if (targets.length === 0) {
        return [];
    }
    const assignedCounts = new Map<U, number>(targets.map((target) => [target, 0]));
    return attackers.map((attacker) => {
        const target = targets.reduce((best, candidate) => {
            const bestScore = distanceSquared(attacker, best) * (1 + (assignedCounts.get(best) ?? 0));
            const candidateScore =
                distanceSquared(attacker, candidate) * (1 + (assignedCounts.get(candidate) ?? 0));
            return candidateScore < bestScore ? candidate : best;
        }, targets[0]);
        assignedCounts.set(target, (assignedCounts.get(target) ?? 0) + 1);
        return { attacker, target };
    });
};

export const reconcileRememberedBuildingTargets = (
    current: ReadonlyMap<number, BuildingTargetDescriptor>,
    visible: BuildingTargetDescriptor[],
    isTileVisible: (target: BuildingTargetDescriptor) => boolean,
): { remembered: Map<number, BuildingTargetDescriptor>; invalidatedIds: number[] } => {
    const remembered = new Map(current);
    for (const target of visible) {
        if (target.id !== undefined) {
            remembered.set(target.id, { ...target, visible: true });
        }
    }
    const visibleIds = new Set(visible.flatMap((target) => (target.id === undefined ? [] : [target.id])));
    const invalidatedIds: number[] = [];
    for (const [id, target] of remembered.entries()) {
        if (visibleIds.has(id)) {
            continue;
        }
        if (isTileVisible(target)) {
            remembered.delete(id);
            invalidatedIds.push(id);
        } else {
            remembered.set(id, { ...target, visible: false });
        }
    }
    return { remembered, invalidatedIds: invalidatedIds.sort((left, right) => left - right) };
};

export const mergeCurrentAndRememberedBuildingTargets = (
    current: BuildingTargetDescriptor[],
    remembered: Iterable<BuildingTargetDescriptor>,
): BuildingTargetDescriptor[] => {
    const byIdentity = new Map<string, BuildingTargetDescriptor>();
    for (const target of remembered) {
        const key = target.id === undefined ? `tile:${target.x},${target.y}` : `id:${target.id}`;
        byIdentity.set(key, target);
    }
    for (const target of current) {
        const key = target.id === undefined ? `tile:${target.x},${target.y}` : `id:${target.id}`;
        byIdentity.set(key, target);
    }
    return [...byIdentity.values()];
};

export const rankSweepPoints = (
    candidates: SweepPointDescriptor[],
    tick: number,
    revisitTicks: number,
    maximum: number,
): PointDescriptor[] =>
    candidates
        .slice()
        .sort((left, right) => {
            const leftRecent = tick < left.lastSwept + revisitTicks ? 1 : 0;
            const rightRecent = tick < right.lastSwept + revisitTicks ? 1 : 0;
            if (leftRecent !== rightRecent) return leftRecent - rightRecent;
            if (left.visibility !== right.visibility) return left.visibility - right.visibility;
            if (left.lastSwept !== right.lastSwept) return left.lastSwept - right.lastSwept;
            if (left.x !== right.x) return left.x - right.x;
            return left.y - right.y;
        })
        .slice(0, Math.max(1, maximum))
        .map(({ x, y }) => ({ x, y }));

export const isPreemptibleBuildingEliminationMission = (name: string): boolean =>
    name.startsWith("attack_") || name.startsWith("retreat-from-attack") || name === "allInAttack";

export const isTransferCertifiedBuildingEliminationMission = (name: string | null): boolean =>
    name === null || isBuildingEliminationReadinessMissionName(name) ||
    isPreemptibleBuildingEliminationMission(name);

export type BuildingEliminationMissionOwnershipView = {
    getAssignedMissionName?: (unitId: number) => string | null;
    getMissions: () => Array<{
        getUniqueName: () => string;
        getUnitIds: () => number[];
    }>;
};

export const getAssignedBuildingEliminationMissionName = (
    missionController: BuildingEliminationMissionOwnershipView,
    unitId: number,
): string | null => {
    if (typeof missionController.getAssignedMissionName === "function") {
        return missionController.getAssignedMissionName(unitId);
    }
    const owners = missionController.getMissions().filter((mission) =>
        mission.getUnitIds().includes(unitId),
    );
    if (owners.length > 1) {
        throw new Error(`Unit ${unitId} is claimed by multiple missions`);
    }
    return owners[0]?.getUniqueName() ?? null;
};

export const disbandBuildingEliminationMissionForTransfer = (
    missionController: MissionController,
    missionName: string,
): void => {
    const nativeTransferDisband = (missionController as unknown as {
        disbandMissionForTransfer?: (name: string) => void;
    }).disbandMissionForTransfer;
    if (typeof nativeTransferDisband === "function") {
        nativeTransferDisband.call(missionController, missionName);
        return;
    }
    const donor = missionController.getMissions().find(
        (mission) => mission.getUniqueName() === missionName,
    );
    donor?.getUnitIds().slice().forEach((unitId) => donor.removeUnit(unitId));
    missionController.disbandMission(missionName);
};

export const selectTransferCertifiedBuildingEliminationAttackers = (
    eligibleAttackers: UnitData[],
    missionNameForUnit: (unitId: number) => string | null,
): UnitData[] => eligibleAttackers.filter(({ id }) =>
    isTransferCertifiedBuildingEliminationMission(missionNameForUnit(id)),
);

export const selectStagedBuildingEliminationAttackers = (
    eligibleAttackers: UnitData[],
    missionNameForUnit: (unitId: number) => string | null,
): UnitData[] => eligibleAttackers.filter(({ id }) =>
    isBuildingEliminationReadinessMissionName(missionNameForUnit(id)),
);

export const classifyBuildingEliminationLaunchHandoff = (
    expectedStagedUnitIds: number[],
    assignedUnitIds: number[],
    unitIsAlive: (unitId: number) => boolean,
): Omit<Extract<BuildingEliminationTelemetryEvent, { event: "launch_handoff" }>,
    "schemaVersion" | "event" | "tick"> => {
    const expected = [...new Set(expectedStagedUnitIds)].sort((left, right) => left - right);
    const assigned = new Set(assignedUnitIds);
    const assignedExpectedUnitIds = expected.filter((id) => assigned.has(id));
    const missing = expected.filter((id) => !assigned.has(id));
    const destroyedExpectedUnitIds = missing.filter((id) => !unitIsAlive(id));
    const destroyed = new Set(destroyedExpectedUnitIds);
    return {
        expectedStagedUnitIds: expected,
        assignedExpectedUnitIds,
        destroyedExpectedUnitIds,
        aliveUnassignedExpectedUnitIds: missing.filter((id) => !destroyed.has(id)),
    };
};

const getEnemyUnits = (
    context: SupabotContext,
    observationMode: BuildingEliminationObservationMode,
    filter: (unit: UnitData) => boolean,
): UnitData[] => {
    const { game, player } = context;
    const ids =
        observationMode === "visibleOnly"
            ? game.getVisibleUnits(player.name, "enemy")
            : game.getAllUnits();
    return ids
        .map((id) => game.getUnitData(id))
        .filter((unit): unit is UnitData => !!unit && isEnemyOwned(game, player.name, unit))
        .filter(filter);
};

export const getEligibleBuildingAttackers = (context: SupabotContext): UnitData[] =>
    context.game
        .getVisibleUnits(
            context.player.name,
            "self",
            (rules) => rules.isSelectableCombatant && !rules.harvester && rules.type !== ObjectType.Building,
        )
        .map((id) => context.game.getUnitData(id))
        .filter((unit): unit is UnitData => !!unit)
        .filter((unit) => unit.rules.name !== "DOG" && unit.rules.name !== "ADOG")
        .filter(
            (unit) =>
                !!unit.primaryWeapon?.projectileRules.isAntiGround ||
                !!unit.secondaryWeapon?.projectileRules.isAntiGround,
        );

export const selectCommittedBuildingAttackers = (
    eligibleAttackers: UnitData[],
    start: PointDescriptor,
    reserveCombatants: number,
): UnitData[] => eligibleAttackers
    .slice()
    .sort((left, right) => {
        // Air and naval units are the only way to finish some isolated
        // buildings, so never consume them as the generic home reserve while
        // ordinary ground attackers remain available for that role.
        const leftMobilityPriority = left.type === ObjectType.Aircraft || left.rules.speedType === SpeedType.Float
            ? 1
            : 0;
        const rightMobilityPriority = right.type === ObjectType.Aircraft || right.rules.speedType === SpeedType.Float
            ? 1
            : 0;
        if (leftMobilityPriority !== rightMobilityPriority) {
            return rightMobilityPriority - leftMobilityPriority;
        }
        return distanceSquared({ x: right.tile.rx, y: right.tile.ry }, start) -
            distanceSquared({ x: left.tile.rx, y: left.tile.ry }, start);
    })
    .slice(0, Math.max(0, eligibleAttackers.length - reserveCombatants));

export const selectBuildingEliminationReadinessReserveCandidates = (
    eligibleAttackers: UnitData[],
    vanguardUnitIds: ReadonlySet<number>,
): UnitData[] => eligibleAttackers.filter(({ id }) => !vanguardUnitIds.has(id));

export const meetsBuildingEliminationActivationGate = (
    ownCombatantCount: number,
    enemyCombatantCount: number,
    options: Pick<
        Required<BuildingEliminationOptions>,
        "minCombatants" | "reserveCombatants" | "maxEnemyCombatants" | "combatantAdvantage"
    >,
): boolean =>
    ownCombatantCount >= options.minCombatants + options.reserveCombatants &&
    enemyCombatantCount <= options.maxEnemyCombatants &&
    ownCombatantCount - options.reserveCombatants >= enemyCombatantCount + options.combatantAdvantage;

export const meetsLowBuildingEliminationActivationGate = (
    ownCombatantCount: number,
    enemyBuildingCount: number,
    options: Pick<
        Required<BuildingEliminationOptions>,
        "minCombatants" | "reserveCombatants" | "maxEnemyBuildings"
    >,
): boolean =>
    enemyBuildingCount > 0 && enemyBuildingCount <= options.maxEnemyBuildings &&
    ownCombatantCount >= options.minCombatants + options.reserveCombatants;

const getEnemyCombatantCount = (
    context: SupabotContext,
    observationMode: BuildingEliminationObservationMode,
): number => getEnemyUnits(
    context,
    observationMode,
    (unit) => unit.rules.isSelectableCombatant && !unit.rules.harvester && unit.rules.type !== ObjectType.Building,
).length;

const isBuildingEliminationCloseoutState = (
    context: SupabotContext,
    options: Required<BuildingEliminationOptions>,
): boolean => {
    const ownCombatantCount = getEligibleBuildingAttackers(context).length;
    const enemyBuildingCount = getEnemyUnits(
        context,
        options.observationMode,
        (unit) => unit.rules.type === ObjectType.Building,
    ).length;
    if (
        options.activationMode === "lowBuilding" || options.activationMode === "objectiveRace" ||
        options.activationMode === "objectiveClearance" || options.activationMode === "objectiveRouteClearance" ||
        options.activationMode === "objectiveTransferableRouteClearance" ||
        options.activationMode === "objectiveStagedRouteClearance" ||
        options.activationMode === "objectiveStagedBlockerClearance" ||
        options.activationMode === "objectiveVanguardRouteClearance"
    ) {
        return meetsLowBuildingEliminationActivationGate(
            ownCombatantCount,
            enemyBuildingCount,
            options,
        );
    }
    return enemyBuildingCount <= options.maxEnemyBuildings && meetsBuildingEliminationActivationGate(
        ownCombatantCount,
        getEnemyCombatantCount(context, options.observationMode),
        options,
    );
};

export const shouldRunBuildingEliminationCapabilityProduction = (
    closeoutWasActivated: boolean,
    currentlyMeetsCloseoutGate: boolean,
): boolean => closeoutWasActivated || currentlyMeetsCloseoutGate;

export const updateBuildingEliminationProductionScopeLatch = (
    latched: boolean,
    currentlyMeetsCloseoutGate: boolean,
    enabled: boolean,
): boolean => latched || (enabled && currentlyMeetsCloseoutGate);

export const isWithinBuildingEliminationActivationScope = (
    enemyBuildingCount: number,
    maxEnemyBuildings: number,
    activationScopeLatched: boolean,
): boolean => enemyBuildingCount > 0 && (
    enemyBuildingCount <= maxEnemyBuildings || activationScopeLatched
);

export const meetsGroundAssaultCapabilityActivationGate = (
    enabled: boolean,
    readinessTankCount: number,
    readinessScreenCount: number,
): boolean => !enabled || readinessTankCount >= 1 && readinessScreenCount >= 1;

export const meetsTransferredGroundAssaultCapabilityActivationGate = (
    enabled: boolean,
    assaultTankCount: number,
    assaultScreenCount: number,
): boolean => !enabled || assaultTankCount >= 1 && assaultScreenCount >= 1;

export const meetsProgressiveBuildingEliminationBlockerLaunchGate = (
    enabled: boolean,
    readinessTankCount: number,
    readinessScreenCount: number,
    estimatedBlockerRemovalTicks: number,
    estimatedForceSurvivalTicks: number,
): boolean => enabled && readinessTankCount >= 1 && readinessScreenCount >= 1 &&
    Number.isFinite(estimatedBlockerRemovalTicks) && estimatedBlockerRemovalTicks >= 0 &&
    Number.isFinite(estimatedForceSurvivalTicks) && estimatedForceSurvivalTicks >= 0 &&
    estimatedBlockerRemovalTicks <= estimatedForceSurvivalTicks;

export const meetsPositiveProgressBuildingEliminationBlockerLaunchGate = (
    enabled: boolean,
    readinessTankCount: number,
    readinessScreenCount: number,
    estimatedBlockerApproachTicks: number,
    estimatedBlockerRemovalTicks: number,
    estimatedForceSurvivalTicks: number,
): boolean => enabled && readinessTankCount >= 1 && readinessScreenCount >= 1 &&
    Number.isFinite(estimatedBlockerApproachTicks) && estimatedBlockerApproachTicks >= 0 &&
    Number.isFinite(estimatedBlockerRemovalTicks) &&
    estimatedBlockerRemovalTicks > estimatedBlockerApproachTicks &&
    Number.isFinite(estimatedForceSurvivalTicks) &&
    estimatedForceSurvivalTicks > estimatedBlockerApproachTicks;

export type BuildingEliminationActivationArbitration = {
    transferredCapabilityReady: boolean;
    compositionReady: boolean;
    directObjectiveFeasible: boolean;
    completeRouteFeasible: boolean;
    partialBlockerLaunchPermitted: boolean;
    conventionalBlockerReady: boolean;
    progressiveBlockerReady: boolean;
    attritionalBlockerReady: boolean;
    buildingReady: boolean;
    blockerReady: boolean;
};

export const arbitrateBuildingEliminationActivation = (args: {
    activationMode: BuildingEliminationActivationMode;
    decision: BuildingEliminationEngagementDecision | null;
    enemyBuildingCount: number;
    readinessTankCount: number;
    readinessScreenCount: number;
    assaultTankCount: number;
    assaultScreenCount: number;
    requireGroundAssaultCapabilityForActivation: boolean;
    requireTransferredGroundAssaultCapabilityForActivation: boolean;
    progressiveRouteBlockerLaunch: boolean;
    positiveProgressBlockerLaunch: boolean;
    objectiveFeasibilityOverridesGroundAssaultCapability: boolean;
    preterminalRequiresRouteFeasibleLaunch: boolean;
}): BuildingEliminationActivationArbitration => {
    const { decision } = args;
    const hasBlocker = decision?.blocker !== null && decision?.blocker !== undefined;
    const directObjectiveFeasible = decision !== null && !hasBlocker;
    const completeRouteFeasible = !!decision && hasBlocker &&
        Number.isFinite(decision.estimatedRouteClearanceTicks) &&
        Number.isFinite(decision.estimatedForceSurvivalTicks) &&
        decision.estimatedRouteClearanceTicks <= decision.estimatedForceSurvivalTicks;
    const transferredCapabilityReady = meetsTransferredGroundAssaultCapabilityActivationGate(
        args.requireTransferredGroundAssaultCapabilityForActivation,
        args.assaultTankCount,
        args.assaultScreenCount,
    );
    const launchTankCount = args.objectiveFeasibilityOverridesGroundAssaultCapability
        ? args.assaultTankCount
        : args.readinessTankCount;
    const launchScreenCount = args.objectiveFeasibilityOverridesGroundAssaultCapability
        ? args.assaultScreenCount
        : args.readinessScreenCount;
    const compositionReady = meetsGroundAssaultCapabilityActivationGate(
        args.requireGroundAssaultCapabilityForActivation,
        launchTankCount,
        launchScreenCount,
    ) && transferredCapabilityReady;
    const conventionalPolicyReady = !!decision && hasBlocker && (
        args.activationMode === "objectiveClearance" ||
        args.activationMode === "objectiveStagedBlockerClearance"
            ? decision.estimatedBlockerRemovalTicks <= decision.estimatedForceSurvivalTicks
            : (args.activationMode === "objectiveRouteClearance" ||
                args.activationMode === "objectiveTransferableRouteClearance" ||
                args.activationMode === "objectiveStagedRouteClearance" ||
                args.activationMode === "objectiveVanguardRouteClearance") &&
                decision.estimatedRouteClearanceTicks <= decision.estimatedForceSurvivalTicks
    );
    const conventionalBlockerReady = args.objectiveFeasibilityOverridesGroundAssaultCapability
        ? completeRouteFeasible
        : conventionalPolicyReady;
    const progressiveBlockerReady = !!decision && hasBlocker &&
        meetsProgressiveBuildingEliminationBlockerLaunchGate(
            args.progressiveRouteBlockerLaunch,
            launchTankCount,
            launchScreenCount,
            decision.estimatedBlockerRemovalTicks,
            decision.estimatedForceSurvivalTicks,
        );
    const attritionalBlockerReady = !!decision && hasBlocker &&
        !conventionalBlockerReady && !progressiveBlockerReady &&
        meetsPositiveProgressBuildingEliminationBlockerLaunchGate(
            args.positiveProgressBlockerLaunch,
            launchTankCount,
            launchScreenCount,
            decision.estimatedBlockerApproachTicks,
            decision.estimatedBlockerRemovalTicks,
            decision.estimatedForceSurvivalTicks,
        );
    const partialBlockerLaunchPermitted =
        !args.preterminalRequiresRouteFeasibleLaunch || args.enemyBuildingCount === 1;
    const objectiveFeasibilityBypassesComposition =
        args.objectiveFeasibilityOverridesGroundAssaultCapability;
    const buildingReady = directObjectiveFeasible &&
        (objectiveFeasibilityBypassesComposition || compositionReady);
    const blockerReady = hasBlocker && (
        conventionalBlockerReady && (objectiveFeasibilityBypassesComposition || compositionReady) ||
        partialBlockerLaunchPermitted && compositionReady &&
            (progressiveBlockerReady || attritionalBlockerReady)
    );
    return {
        transferredCapabilityReady,
        compositionReady,
        directObjectiveFeasible,
        completeRouteFeasible,
        partialBlockerLaunchPermitted,
        conventionalBlockerReady,
        progressiveBlockerReady,
        attritionalBlockerReady,
        buildingReady,
        blockerReady,
    };
};

type BuildingEliminationCloseoutLatch = {
    activated: boolean;
    readinessScreenCount: number;
    readinessTankCount: number;
};

type BuildingEliminationExecutionHeartbeatState = {
    targetId: number;
    tick: number;
    targetHitPoints: number;
    minimumDistanceToFiringPerimeter: number | null;
    medianDistanceToFiringPerimeter: number | null;
    assignedAttackerIds: number[];
};

class BuildingEliminationMission extends Mission {
    private lastOrderAt = Number.NEGATIVE_INFINITY;
    private rememberedBuildings = new Map<number, BuildingTargetDescriptor>();
    private lastSweepAt = new Map<string, number>();
    private lastOrderTelemetrySignature = "";
    private lastAssignmentTelemetrySignature = "";
    private lastAssignmentTelemetryAt = Number.NEGATIVE_INFINITY;
    private lastEngagementTelemetrySignature = "";
    private lastEngagementTelemetryAt = Number.NEGATIVE_INFINITY;
    private lastAllocationTelemetrySignature = "";
    private lastAllocationTelemetryAt = Number.NEGATIVE_INFINITY;
    private executionHeartbeatState: BuildingEliminationExecutionHeartbeatState | null = null;
    private committedTargetId: number | null = null;
    private committedRouteBlocker: { targetId: number; blockerId: number } | null = null;
    private targetProgress = new Map<number, BuildingTargetProgressState>();
    private progressTelemetry = new Map<number, { hitPoints: number; lastEmittedTick: number }>();
    private launchHandoffEmitted = false;

    constructor(
        private options: Required<BuildingEliminationOptions>,
        logger: DebugLogger,
        private telemetrySink: BuildingEliminationTelemetrySink,
        private stalledBuildingIds: Set<number>,
        private expectedStagedUnitIds: number[] = [],
    ) {
        super(BUILDING_ELIMINATION_MISSION_NAME, logger);
    }

    _onAiUpdate(context: MissionContext): MissionAction {
        const eligibleAttackers = this.selectCommittedAttackers(context);
        this.updateRememberedBuildings(context);
        this.maybeEmitLaunchHandoff(context);
        if (
            this.getUnitIds().length > 0 &&
            context.game.getCurrentTick() >= this.lastOrderAt + this.options.orderIntervalTicks
        ) {
            this.issueOrders(context);
            this.lastOrderAt = context.game.getCurrentTick();
        }
        return eligibleAttackers.length > 0
            ? requestSpecificUnits(eligibleAttackers.map((unit) => unit.id), BUILDING_ELIMINATION_PRIORITY)
            : noop();
    }

    getGlobalDebugText(): string | undefined {
        return `finish buildings=${this.rememberedBuildings.size} units=${this.getUnitIds().length}`;
    }

    getPriority(): number {
        return BUILDING_ELIMINATION_PRIORITY;
    }

    private maybeEmitLaunchHandoff(context: MissionContext): void {
        if (this.launchHandoffEmitted || this.expectedStagedUnitIds.length === 0 || this.getUnitIds().length === 0) {
            return;
        }
        this.telemetrySink({
            schemaVersion: 10,
            event: "launch_handoff",
            tick: context.game.getCurrentTick(),
            ...classifyBuildingEliminationLaunchHandoff(
                this.expectedStagedUnitIds,
                this.getUnitIds(),
                (id) => !!context.game.getGameObjectData(id),
            ),
        });
        this.launchHandoffEmitted = true;
    }

    private selectCommittedAttackers(context: SupabotContext): UnitData[] {
        const start = context.game.getPlayerData(context.player.name).startLocation;
        return selectCommittedBuildingAttackers(
            getEligibleBuildingAttackers(context),
            start,
            this.options.reserveCombatants,
        );
    }

    private updateRememberedBuildings(context: MissionContext): void {
        const visibleBuildings = getEnemyUnits(
            context,
            "visibleOnly",
            (unit) => unit.rules.type === ObjectType.Building,
        );
        const reconciled = reconcileRememberedBuildingTargets(
            this.rememberedBuildings,
            visibleBuildings.map((unit) => toTargetDescriptor(unit, true)),
            (target) => {
                const tile = context.game.mapApi.getTile(target.x, target.y);
                return !!tile && context.game.mapApi.isVisibleTile(tile, context.player.name);
            },
        );
        this.rememberedBuildings = reconciled.remembered;
        if (reconciled.invalidatedIds.length > 0) {
            this.telemetrySink({
                schemaVersion: 1,
                event: "memory_invalidated",
                tick: context.game.getCurrentTick(),
                buildingIds: reconciled.invalidatedIds,
            });
        }
    }

    private issueOrders(context: MissionContext): void {
        const units = this.getUnits(context.game).filter(
            (unit) =>
                !!unit.primaryWeapon?.projectileRules.isAntiGround ||
                !!unit.secondaryWeapon?.projectileRules.isAntiGround,
        );
        if (units.length === 0) {
            return;
        }
        const currentTargets = getEnemyUnits(
            context,
            this.options.observationMode,
            (unit) => unit.rules.type === ObjectType.Building,
        );
        const visibleEnemyIds = new Set(context.game.getVisibleUnits(context.player.name, "enemy"));
        const currentTargetById = new Map(currentTargets.map((unit) => [unit.id, unit]));
        this.updateTargetProgress(currentTargets, context.game.getCurrentTick());
        const descriptors = mergeCurrentAndRememberedBuildingTargets(
            currentTargets.map((unit) => toTargetDescriptor(unit, visibleEnemyIds.has(unit.id))),
            this.rememberedBuildings.values(),
        );
        let rankedTargets = rankBuildingTargets(
            descriptors,
            this.options.targetPriority,
            units.map((unit) => ({ x: unit.tile.rx, y: unit.tile.ry })),
        );
        if (this.options.reassignStalledTargets) {
            rankedTargets = prioritizeStalledBuildingTargets(rankedTargets, this.targetProgress);
        }
        if (this.options.retargetStalledBuildings) {
            rankedTargets = deferStalledBuildingTargets(rankedTargets, this.targetProgress);
        }
        if (this.options.engagementMode === "completionRace" && this.committedTargetId !== null) {
            const committed = rankedTargets.find(({ id }) => id === this.committedTargetId);
            const committedIsStalled = committed?.id !== undefined &&
                this.targetProgress.get(committed.id)?.stalled === true;
            if (committed && !(this.options.retargetStalledBuildings && committedIsStalled)) {
                rankedTargets = [committed, ...rankedTargets.filter(({ id }) => id !== this.committedTargetId)];
            } else {
                this.committedTargetId = null;
            }
        }
        if (rankedTargets.length > 0) {
            const attackerDescriptors = units.map((unit) => ({ ...unit, x: unit.tile.rx, y: unit.tile.ry }));
            let incompatiblePairs = 0;
            let unreachablePairs = 0;
            const pairCompatibility = new Map<string, boolean>();
            const compatible = (attacker: UnitData, target: BuildingTargetDescriptor): boolean => {
                const key = `${attacker.id}|${target.id ?? `${target.x},${target.y}`}`;
                const cached = pairCompatibility.get(key);
                if (cached !== undefined) return cached;
                const currentTarget = target.id === undefined ? undefined : currentTargetById.get(target.id);
                if (!currentTarget) {
                    pairCompatibility.set(key, true);
                    return true;
                }
                if (this.options.capabilityAwareAttackers && !unitCanDamageBuilding(attacker, currentTarget)) {
                    incompatiblePairs++;
                    pairCompatibility.set(key, false);
                    return false;
                }
                if (
                    this.options.reachabilityAwareTargets &&
                    !canReachBuildingFiringPerimeter(context.game, attacker, currentTarget)
                ) {
                    unreachablePairs++;
                    pairCompatibility.set(key, false);
                    return false;
                }
                pairCompatibility.set(key, true);
                return true;
            };
            const maximumTargetGroups = this.options.engagementMode === "completionRace"
                ? 1
                : this.options.maxTargetGroups;
            const selectedTargets =
                this.options.capabilityAwareAttackers || this.options.reachabilityAwareTargets
                    ? selectCompatibleBuildingTargets(
                        attackerDescriptors,
                        rankedTargets,
                        maximumTargetGroups,
                        compatible,
                    )
                    : rankedTargets.slice(0, maximumTargetGroups);
            const assignments =
                this.options.capabilityAwareAttackers || this.options.reachabilityAwareTargets
                    ? assignAttackersToCompatibleTargets(attackerDescriptors, selectedTargets, compatible)
                    : assignAttackersToTargets(
                        attackerDescriptors,
                        selectedTargets,
                    );
            this.emitAssignmentTelemetry({
                schemaVersion: 2,
                event: "assignment_summary",
                tick: context.game.getCurrentTick(),
                eligibleAttackers: units.length,
                assignedAttackers: assignments.length,
                incompatiblePairs,
                unreachablePairs,
                targetCount: selectedTargets.length,
            });
            if (selectedTargets.length === 0 || assignments.length === 0) {
                this.committedTargetId = null;
                this.committedRouteBlocker = null;
                if (this.options.engagementMode === "completionRace") {
                    this.emitEngagementTelemetry({
                        schemaVersion: 3,
                        event: "engagement_decision",
                        tick: context.game.getCurrentTick(),
                        phase: "no_compatible_target",
                        reason: "no_compatible_target",
                        targetId: null,
                        targetName: null,
                        targetHitPoints: null,
                        blockerId: null,
                        blockerName: null,
                        ownedAttackerCount: units.length,
                        assignedAttackerCount: 0,
                        routeThreatCount: 0,
                        estimatedBuildingCompletionTicks: null,
                        estimatedForceSurvivalTicks: null,
                        earliestRouteThreatInterceptTicks: null,
                    });
                }
                return;
            }
            const primaryTarget = selectedTargets[0];
            if (this.options.engagementMode === "completionRace") {
                this.committedTargetId = primaryTarget.id ?? null;
            }
            this.emitOrderTelemetry({
                schemaVersion: 1,
                event: "target_orders",
                tick: context.game.getCurrentTick(),
                attackerCount: units.length,
                targets: selectedTargets.map((target) => ({
                    id: target.id ?? null,
                    name: target.name,
                    x: target.x,
                    y: target.y,
                    visible: target.visible,
                })),
            });
            const currentPrimaryTarget = primaryTarget.id === undefined
                ? undefined
                : currentTargetById.get(primaryTarget.id);
            let blocker: UnitData | null = null;
            const blockerAttackerIds = new Set<number>();
            if (this.options.engagementMode === "completionRace" && currentPrimaryTarget) {
                const assignedUnits = assignments.map(({ attacker }) => attacker);
                const enemyForces = selectBuildingEliminationRouteThreatCandidates(
                    getEnemyUnits(context, this.options.observationMode, () => true),
                    assignedUnits,
                );
                const predictedDecision = chooseBuildingEliminationEngagement(
                    assignedUnits,
                    currentPrimaryTarget,
                    enemyForces,
                    this.options.routeCorridorRadius,
                    this.options.commitRouteBlocker &&
                        this.committedRouteBlocker?.targetId === currentPrimaryTarget.id
                        ? this.committedRouteBlocker.blockerId
                        : null,
                );
                const preserveCommittedBlocker = this.options.commitRouteBlocker &&
                    this.committedRouteBlocker?.targetId === currentPrimaryTarget.id &&
                    predictedDecision.blocker?.id === this.committedRouteBlocker.blockerId;
                const decision = this.options.contactOnlyBlockerClearance
                    ? applyContactTriggeredBuildingAdvance(predictedDecision, preserveCommittedBlocker)
                    : predictedDecision;
                blocker = decision.blocker;
                this.committedRouteBlocker = this.options.commitRouteBlocker && blocker
                    ? { targetId: currentPrimaryTarget.id, blockerId: blocker.id }
                    : null;
                const finiteOrNull = (value: number): number | null => Number.isFinite(value) ? value : null;
                this.emitEngagementTelemetry({
                    schemaVersion: 3,
                    event: "engagement_decision",
                    tick: context.game.getCurrentTick(),
                    phase: blocker ? "blocker_clear" : "building_strike",
                    reason: decision.reason,
                    targetId: currentPrimaryTarget.id,
                    targetName: currentPrimaryTarget.rules.name,
                    targetHitPoints: currentPrimaryTarget.hitPoints,
                    blockerId: blocker?.id ?? null,
                    blockerName: blocker?.rules.name ?? null,
                    ownedAttackerCount: units.length,
                    assignedAttackerCount: assignments.length,
                    routeThreatCount: decision.routeThreatCount,
                    estimatedBuildingCompletionTicks: finiteOrNull(decision.estimatedBuildingCompletionTicks),
                    estimatedForceSurvivalTicks: finiteOrNull(decision.estimatedForceSurvivalTicks),
                    earliestRouteThreatInterceptTicks: finiteOrNull(decision.earliestRouteThreatInterceptTicks),
                });
                const allocation = allocateBuildingEliminationEngagement(
                    assignedUnits,
                    currentPrimaryTarget,
                    blocker,
                    this.options.engagementAllocationMode,
                );
                for (const { id } of allocation.blockerAttackers) blockerAttackerIds.add(id);
                this.emitAllocationTelemetry({
                    schemaVersion: 4,
                    event: "engagement_allocation",
                    tick: context.game.getCurrentTick(),
                    targetId: currentPrimaryTarget.id,
                    targetName: currentPrimaryTarget.rules.name,
                    blockerId: blocker?.id ?? null,
                    blockerName: blocker?.rules.name ?? null,
                    assignedAttackerCount: assignedUnits.length,
                    buildingAttackerCount: allocation.buildingAttackers.length,
                    blockerAttackerCount: allocation.blockerAttackers.length,
                    inRangeBuildingAttackerCount: allocation.inRangeBuildingAttackerCount,
                });
                this.maybeEmitExecutionHeartbeat(
                    context,
                    currentPrimaryTarget,
                    allocation,
                    blocker,
                    decision.routeThreatCount,
                    primaryTarget.visible,
                );
            } else if (this.options.engagementMode === "completionRace") {
                this.committedRouteBlocker = null;
                this.emitEngagementTelemetry({
                    schemaVersion: 3,
                    event: "engagement_decision",
                    tick: context.game.getCurrentTick(),
                    phase: "building_strike",
                    reason: "direct_building",
                    targetId: primaryTarget.id ?? null,
                    targetName: primaryTarget.name,
                    targetHitPoints: primaryTarget.hitPoints,
                    blockerId: null,
                    blockerName: null,
                    ownedAttackerCount: units.length,
                    assignedAttackerCount: assignments.length,
                    routeThreatCount: 0,
                    estimatedBuildingCompletionTicks: null,
                    estimatedForceSurvivalTicks: null,
                    earliestRouteThreatInterceptTicks: null,
                });
            }
            for (const { attacker, target } of assignments) {
                const currentTarget = target.id === undefined ? undefined : currentTargetById.get(target.id);
                const action =
                    blocker && blockerAttackerIds.has(attacker.id)
                        ? manageAttackMicro(attacker, blocker)
                        : currentTarget && shouldDirectAttackBuildingTarget(
                        this.options.directVisibleAttack,
                        target.visible,
                        true,
                    )
                        ? manageAttackMicro(attacker, currentTarget)
                        : manageMoveMicro(attacker, new Vector2(target.x, target.y));
                context.actionBatcher.push(action);
            }
            return;
        }

        this.committedTargetId = null;
        this.committedRouteBlocker = null;

        if (!this.options.sweepWhenNoTargets) {
            return;
        }
        const sweepPoints = this.selectSweepPoints(context, this.options.maxTargetGroups);
        this.emitOrderTelemetry({
            schemaVersion: 1,
            event: "sweep_orders",
            tick: context.game.getCurrentTick(),
            attackerCount: units.length,
            targets: sweepPoints,
        });
        const assignments = assignAttackersToTargets(
            units.map((unit) => ({ ...unit, x: unit.tile.rx, y: unit.tile.ry })),
            sweepPoints,
        );
        for (const { attacker, target } of assignments) {
            context.actionBatcher.push(
                BatchableAction.toPoint(attacker.id, OrderType.AttackMove, new Vector2(target.x, target.y)),
            );
        }
        for (const target of sweepPoints) {
            this.lastSweepAt.set(`${target.x},${target.y}`, context.game.getCurrentTick());
        }
    }

    private selectSweepPoints(context: MissionContext, maximum: number): PointDescriptor[] {
        const candidates: SweepPointDescriptor[] = [];
        context.matchAwareness.getSectorCache().forEach((x, y, cell) => {
            const tile = context.game.mapApi.getTile(x, y);
            if (
                !tile ||
                !context.game.mapApi.isPassableTile(tile, SpeedType.Track, !!tile.onBridgeLandType, true)
            ) {
                return;
            }
            const key = `${x},${y}`;
            const lastSwept = this.lastSweepAt.get(key) ?? Number.NEGATIVE_INFINITY;
            candidates.push({
                x,
                y,
                visibility: cell.value.sectorVisibilityRatio ?? 0,
                lastSwept,
            });
        });
        return rankSweepPoints(
            candidates,
            context.game.getCurrentTick(),
            this.options.sweepRevisitTicks,
            maximum,
        );
    }

    private updateTargetProgress(targets: UnitData[], tick: number): void {
        const currentIds = new Set(targets.map(({ id }) => id));
        for (const target of targets) {
            const update = updateBuildingTargetProgress(
                this.targetProgress.get(target.id),
                target.hitPoints,
                tick,
                this.options.stallTicks,
            );
            this.targetProgress.set(target.id, update.state);
            if (!update.state.stalled) this.stalledBuildingIds.delete(target.id);
            const previousTelemetry = this.progressTelemetry.get(target.id);
            const shouldEmitProgress =
                update.damage > 0 &&
                (!previousTelemetry ||
                    tick >= previousTelemetry.lastEmittedTick + TELEMETRY_HEARTBEAT_TICKS ||
                    target.hitPoints === 0);
            if (shouldEmitProgress) {
                const previousHitPoints = previousTelemetry?.hitPoints ?? update.previousHitPoints;
                this.telemetrySink({
                    schemaVersion: 2,
                    event: "target_progress",
                    tick,
                    targetId: target.id,
                    targetName: target.rules.name,
                    hitPoints: target.hitPoints,
                    previousHitPoints,
                    damage: Math.max(0, previousHitPoints - target.hitPoints),
                });
                this.progressTelemetry.set(target.id, { hitPoints: target.hitPoints, lastEmittedTick: tick });
            }
            if (update.becameStalled) {
                this.stalledBuildingIds.add(target.id);
                this.telemetrySink({
                    schemaVersion: 2,
                    event: "target_stalled",
                    tick,
                    targetId: target.id,
                    targetName: target.rules.name,
                    hitPoints: target.hitPoints,
                    lastDamageTick: update.state.lastDamageTick,
                    stallTicks: this.options.stallTicks,
                });
            }
        }
        for (const id of this.targetProgress.keys()) {
            if (!currentIds.has(id)) {
                this.targetProgress.delete(id);
                this.progressTelemetry.delete(id);
                this.stalledBuildingIds.delete(id);
            }
        }
    }

    private emitAssignmentTelemetry(
        event: Extract<BuildingEliminationTelemetryEvent, { event: "assignment_summary" }>,
    ): void {
        const signature = JSON.stringify({ ...event, tick: 0 });
        if (signature === this.lastAssignmentTelemetrySignature) return;
        if (event.tick < this.lastAssignmentTelemetryAt + TELEMETRY_HEARTBEAT_TICKS) return;
        this.lastAssignmentTelemetrySignature = signature;
        this.lastAssignmentTelemetryAt = event.tick;
        this.telemetrySink(event);
    }

    private emitEngagementTelemetry(
        event: Extract<BuildingEliminationTelemetryEvent, { event: "engagement_decision" }>,
    ): void {
        const signature = JSON.stringify({ ...event, tick: 0 });
        if (
            signature === this.lastEngagementTelemetrySignature &&
            event.tick < this.lastEngagementTelemetryAt + TELEMETRY_HEARTBEAT_TICKS
        ) return;
        this.lastEngagementTelemetrySignature = signature;
        this.lastEngagementTelemetryAt = event.tick;
        this.telemetrySink(event);
    }

    private emitAllocationTelemetry(
        event: Extract<BuildingEliminationTelemetryEvent, { event: "engagement_allocation" }>,
    ): void {
        const signature = JSON.stringify({ ...event, tick: 0 });
        if (
            signature === this.lastAllocationTelemetrySignature &&
            event.tick < this.lastAllocationTelemetryAt + TELEMETRY_HEARTBEAT_TICKS
        ) return;
        this.lastAllocationTelemetrySignature = signature;
        this.lastAllocationTelemetryAt = event.tick;
        this.telemetrySink(event);
    }

    private maybeEmitExecutionHeartbeat(
        context: MissionContext,
        target: UnitData,
        allocation: BuildingEliminationEngagementAllocation,
        blocker: UnitData | null,
        routeThreatCount: number,
        targetVisible: boolean,
    ): void {
        const tick = context.game.getCurrentTick();
        const previous = this.executionHeartbeatState;
        const sameTargetPrevious = previous?.targetId === target.id ? previous : null;
        if (sameTargetPrevious && tick < sameTargetPrevious.tick + TELEMETRY_HEARTBEAT_TICKS) return;

        const buildingAttackers = allocation.buildingAttackers.slice().sort((left, right) => left.id - right.id);
        const blockerAttackers = allocation.blockerAttackers.slice().sort((left, right) => left.id - right.id);
        const assignedAttackers = [...buildingAttackers, ...blockerAttackers]
            .sort((left, right) => left.id - right.id);
        const assignedAttackerIds = assignedAttackers.map(({ id }) => id);
        const assignedIdSet = new Set(assignedAttackerIds);
        const noLongerAssignedUnitIds = sameTargetPrevious
            ? sameTargetPrevious.assignedAttackerIds
                .filter((id) => !assignedIdSet.has(id)).sort((left, right) => left - right)
            : [];
        const destroyedAssignedUnitIds = noLongerAssignedUnitIds.filter((id) => {
            const unit = context.game.getUnitData(id);
            return !unit || unit.hitPoints <= 0 || unit.owner !== context.player.name;
        });
        const distances = summarizeBuildingExecutionDistances(buildingAttackers, target);
        const typeCounts = new Map<string, number>();
        const attackStateCounts = new Map<string, number>();
        for (const attacker of assignedAttackers) {
            typeCounts.set(attacker.rules.name, (typeCounts.get(attacker.rules.name) ?? 0) + 1);
            const attackState = String(attacker.attackState ?? "unknown");
            attackStateCounts.set(attackState, (attackStateCounts.get(attackState) ?? 0) + 1);
        }
        const directBuildingAttack = shouldDirectAttackBuildingTarget(
            this.options.directVisibleAttack,
            targetVisible,
            true,
        );
        const sumHitPoints = (attackers: UnitData[]): number =>
            attackers.reduce((sum, attacker) => sum + Math.max(0, attacker.hitPoints), 0);
        this.telemetrySink({
            schemaVersion: 5,
            event: "execution_heartbeat",
            tick,
            targetId: target.id,
            targetName: target.rules.name,
            targetHitPoints: target.hitPoints,
            targetHitPointDelta: sameTargetPrevious
                ? target.hitPoints - sameTargetPrevious.targetHitPoints
                : null,
            targetVisible,
            blockerId: blocker?.id ?? null,
            blockerName: blocker?.rules.name ?? null,
            routeThreatCount,
            assignedAttackerIds,
            buildingAttackerIds: buildingAttackers.map(({ id }) => id),
            blockerAttackerIds: blockerAttackers.map(({ id }) => id),
            assignedAttackerTypes: Object.fromEntries([...typeCounts.entries()].sort(([left], [right]) =>
                left.localeCompare(right),
            )),
            attackStateCounts: Object.fromEntries([...attackStateCounts.entries()].sort(([left], [right]) =>
                left.localeCompare(right),
            )),
            assignedAttackerCount: assignedAttackers.length,
            buildingAttackerCount: buildingAttackers.length,
            blockerAttackerCount: blockerAttackers.length,
            inRangeBuildingAttackerCount: distances.inRangeCount,
            totalAssignedHitPoints: sumHitPoints(assignedAttackers),
            totalBuildingAttackerHitPoints: sumHitPoints(buildingAttackers),
            totalBlockerAttackerHitPoints: sumHitPoints(blockerAttackers),
            idleAttackerCount: assignedAttackers.filter(({ isIdle }) => isIdle === true).length,
            movingAttackerCount: assignedAttackers.filter(({ velocity }) =>
                !!velocity && Math.hypot(velocity.x, velocity.y, velocity.z) > Number.EPSILON,
            ).length,
            minimumDistanceToFiringPerimeter: distances.minimum,
            medianDistanceToFiringPerimeter: distances.median,
            maximumDistanceToFiringPerimeter: distances.maximum,
            minimumDistanceDelta: sameTargetPrevious && distances.minimum !== null &&
                sameTargetPrevious.minimumDistanceToFiringPerimeter !== null
                ? distances.minimum - sameTargetPrevious.minimumDistanceToFiringPerimeter
                : null,
            medianDistanceDelta: sameTargetPrevious && distances.median !== null &&
                sameTargetPrevious.medianDistanceToFiringPerimeter !== null
                ? distances.median - sameTargetPrevious.medianDistanceToFiringPerimeter
                : null,
            noLongerAssignedUnitIds,
            destroyedAssignedUnitIds,
            directBuildingAttackCommandCount: directBuildingAttack ? buildingAttackers.length : 0,
            moveTowardBuildingCommandCount: directBuildingAttack ? 0 : buildingAttackers.length,
            blockerAttackCommandCount: blockerAttackers.length,
        });
        this.executionHeartbeatState = {
            targetId: target.id,
            tick,
            targetHitPoints: target.hitPoints,
            minimumDistanceToFiringPerimeter: distances.minimum,
            medianDistanceToFiringPerimeter: distances.median,
            assignedAttackerIds,
        };
    }

    private emitOrderTelemetry(
        event: Extract<BuildingEliminationTelemetryEvent, { event: "target_orders" | "sweep_orders" }>,
    ): void {
        const signature = JSON.stringify({ ...event, tick: 0 });
        if (signature === this.lastOrderTelemetrySignature) {
            return;
        }
        this.lastOrderTelemetrySignature = signature;
        this.telemetrySink(event);
    }
}

const getCapabilityGap = (
    context: SupabotContext,
    observationMode: BuildingEliminationObservationMode,
    stalledBuildingIds: ReadonlySet<number>,
    reserveCombatants: number,
): BuildingCapabilityGap => {
    const buildings = getEnemyUnits(context, observationMode, (unit) => unit.rules.type === ObjectType.Building);
    const attackers = selectCommittedBuildingAttackers(
        getEligibleBuildingAttackers(context),
        context.game.getPlayerData(context.player.name).startLocation,
        reserveCombatants,
    );
    return classifyBuildingCapabilityGaps(
        attackers,
        buildings,
        stalledBuildingIds,
        unitCanDamageBuilding,
        (attacker, building) => canReachBuildingFiringPerimeter(context.game, attacker, building),
    );
};

const hasCapabilityGap = (gap: BuildingCapabilityGap): boolean =>
    gap.stalledBuildingIds.length > 0 ||
    gap.incompatibleBuildingIds.length > 0 ||
    gap.unreachableBuildingIds.length > 0;

/**
 * Reachability checks build engine path maps and are substantially more
 * expensive than emitting a cached production request. The build and unit
 * missions share this cache so a closeout position is classified at most once
 * per telemetry heartbeat, while the resulting request remains active on
 * every AI update.
 */
class BuildingCapabilityGapCache {
    private lastEvaluationAt = Number.NEGATIVE_INFINITY;
    private gap: BuildingCapabilityGap = {
        stalledBuildingIds: [],
        incompatibleBuildingIds: [],
        unreachableBuildingIds: [],
    };

    constructor(
        private observationMode: BuildingEliminationObservationMode,
        private stalledBuildingIds: ReadonlySet<number>,
        private reserveCombatants: number,
    ) {}

    get(context: SupabotContext): BuildingCapabilityGap {
        const tick = context.game.getCurrentTick();
        if (tick >= this.lastEvaluationAt + TELEMETRY_HEARTBEAT_TICKS) {
            this.gap = getCapabilityGap(
                context,
                this.observationMode,
                this.stalledBuildingIds,
                this.reserveCombatants,
            );
            this.lastEvaluationAt = tick;
        }
        return this.gap;
    }
}

const getPlayerSide = (context: SupabotContext): SideType.Nod | SideType.GDI | null => {
    const side = context.game.getPlayerData(context.player.name).country?.side;
    return side === SideType.Nod || side === SideType.GDI ? side : null;
};

const countOwnVisibleUnits = (context: SupabotContext, name: string): number =>
    context.game.getVisibleUnits(context.player.name, "self", (rules) => rules.name === name).length;

export const getBuildingEliminationGroundAssaultUnitName = (
    side: SideType.Nod | SideType.GDI,
): "HTNK" | "MTNK" => side === SideType.Nod ? "HTNK" : "MTNK";

export const getBuildingEliminationGroundAssaultStructureName = (
    side: SideType.Nod | SideType.GDI,
): "NAWEAP" | "GAWEAP" => side === SideType.Nod ? "NAWEAP" : "GAWEAP";

export const getBuildingEliminationGroundAssaultScreenUnitName = (
    side: SideType.Nod | SideType.GDI,
): "E2" | "E1" => side === SideType.Nod ? "E2" : "E1";

export const getBuildingEliminationAssaultProductionRequests = (
    unitName: "HTNK" | "MTNK",
    currentCount: number,
    targetCount: number,
    screenUnitName: "E1" | "E2",
    currentScreenCount: number,
    screenTargetCount: number,
    priority: number,
    screenTriggerActive = currentCount >= 1,
    queuedUnitCount = 0,
    queuedScreenCount = 0,
): Record<string, number> => ({
    ...(currentCount + queuedUnitCount < targetCount ? { [unitName]: priority } : {}),
    ...(screenTriggerActive && currentScreenCount + queuedScreenCount < screenTargetCount
        ? { [screenUnitName]: priority }
        : {}),
});

export const getSaturatedGroundAssaultRequestNames = (
    unitName: "HTNK" | "MTNK",
    currentCount: number,
    queuedUnitCount: number,
    targetCount: number,
    screenUnitName: "E1" | "E2",
    currentScreenCount: number,
    queuedScreenCount: number,
    screenTargetCount: number,
): string[] => [
    ...(currentCount + queuedUnitCount >= targetCount ? [unitName] : []),
    ...(currentScreenCount + queuedScreenCount >= screenTargetCount ? [screenUnitName] : []),
].sort((left, right) => left.localeCompare(right));

export type BuildingEliminationProductionReservationQueueItem = {
    queue: QueueType;
    name: string;
    quantity: number;
};

export type BuildingEliminationProductionReservationPlan = {
    removedRequestNames: string[];
    canceledQueueItems: BuildingEliminationProductionReservationQueueItem[];
};

/**
 * Produces the deterministic, public-interface-only mutation plan used by the
 * terminal production reservation. Keeping selection pure makes it possible
 * to verify that side-specific factory/tank requests are never removed while
 * every unrelated production claim is suppressed.
 */
export const planBuildingEliminationProductionReservation = (
    requestedNames: Iterable<string>,
    queueItems: readonly BuildingEliminationProductionReservationQueueItem[],
    retainedNames: ReadonlySet<string>,
): BuildingEliminationProductionReservationPlan => ({
    removedRequestNames: [...requestedNames]
        .filter((name) => !retainedNames.has(name))
        .sort((left, right) => left.localeCompare(right)),
    canceledQueueItems: queueItems
        .filter(({ name }) => !retainedNames.has(name))
        .map((item) => ({ ...item }))
        .sort((left, right) =>
            left.queue - right.queue || left.name.localeCompare(right.name) || left.quantity - right.quantity,
        ),
});

export const getBuildingEliminationAssaultProductionAction = (
    assignedUnitIds: number[],
    unitName: "HTNK" | "MTNK",
    currentCount: number,
    targetCount: number,
    priority: number,
): MissionAction => {
    if (assignedUnitIds.length > 0) return releaseUnits(assignedUnitIds);
    return currentCount < targetCount ? requestUnits({ [unitName]: priority }) : noop();
};

class BuildingEliminationAssaultBuildMission extends Mission {
    private lastTelemetrySignature = "";
    private lastTelemetryAt = Number.NEGATIVE_INFINITY;

    constructor(
        private options: Required<BuildingEliminationOptions>,
        private closeoutLatch: BuildingEliminationCloseoutLatch,
        logger: DebugLogger,
        private telemetrySink: BuildingEliminationTelemetrySink,
    ) {
        super(BUILDING_ELIMINATION_ASSAULT_BUILD_MISSION_NAME, logger);
    }

    _onAiUpdate(context: MissionContext): MissionAction {
        const side = getPlayerSide(context);
        if (side === null || context.game.getCurrentTick() < this.options.minTick) return noop();
        if (!shouldRunBuildingEliminationCapabilityProduction(
            this.closeoutLatch.activated,
            isBuildingEliminationCloseoutState(context, this.options),
        )) return noop();
        const structureName = getBuildingEliminationGroundAssaultStructureName(side);
        const currentCount = countOwnVisibleUnits(context, structureName);
        const availableRules = [
            ...context.player.production.getAvailableObjects(QueueType.Structures),
            ...context.player.production.getAvailableObjects(QueueType.Armory),
        ].find(({ name }) => name === structureName);
        const playerData = context.game.getPlayerData(context.player.name);
        const buildingRules = BUILDING_NAME_TO_RULES.get(structureName);
        const location = currentCount === 0 && availableRules
            ? buildingRules?.getPlacementLocation(context.game, playerData, availableRules) ??
                getDefaultPlacementLocation(context.game, playerData, playerData.startLocation, availableRules)
            : null;
        const requested = currentCount === 0 && location !== null && location !== undefined;
        this.emitTelemetry(
            context.game.getCurrentTick(),
            side,
            structureName,
            currentCount,
            availableRules !== undefined,
            requested,
        );
        return requested && location
            ? buildStructureAtLocation(
                structureName,
                this.options.adaptiveGroundAssaultInfrastructurePriority,
                location.rx,
                location.ry,
            )
            : noop();
    }

    getGlobalDebugText(): string | undefined {
        return "finish assault infrastructure";
    }

    getPriority(): number {
        return 0;
    }

    private emitTelemetry(
        tick: number,
        side: SideType.Nod | SideType.GDI,
        structureName: "NAWEAP" | "GAWEAP",
        currentCount: number,
        available: boolean,
        requested: boolean,
    ): void {
        const event: Extract<BuildingEliminationTelemetryEvent, { event: "assault_infrastructure" }> = {
            schemaVersion: 13,
            event: "assault_infrastructure",
            tick,
            side,
            structureName,
            currentCount,
            available,
            requested,
        };
        const signature = JSON.stringify({ ...event, tick: 0 });
        if (signature === this.lastTelemetrySignature && tick < this.lastTelemetryAt + TELEMETRY_HEARTBEAT_TICKS) {
            return;
        }
        this.lastTelemetrySignature = signature;
        this.lastTelemetryAt = tick;
        this.telemetrySink(event);
    }
}

class BuildingEliminationAssaultProductionMission extends Mission {
    private lastTelemetrySignature = "";
    private lastTelemetryAt = Number.NEGATIVE_INFINITY;
    private lastScreenTelemetrySignature = "";
    private lastScreenTelemetryAt = Number.NEGATIVE_INFINITY;

    constructor(
        private options: Required<BuildingEliminationOptions>,
        private closeoutLatch: BuildingEliminationCloseoutLatch,
        logger: DebugLogger,
        private telemetrySink: BuildingEliminationTelemetrySink,
    ) {
        super(BUILDING_ELIMINATION_ASSAULT_PRODUCTION_MISSION_NAME, logger);
    }

    _onAiUpdate(context: MissionContext): MissionAction {
        if (this.getUnitIds().length > 0) return releaseUnits(this.getUnitIds());
        const side = getPlayerSide(context);
        if (side === null || context.game.getCurrentTick() < this.options.minTick) return noop();
        if (!shouldRunBuildingEliminationCapabilityProduction(
            this.closeoutLatch.activated,
            isBuildingEliminationCloseoutState(context, this.options),
        )) return noop();
        const unitName = getBuildingEliminationGroundAssaultUnitName(side);
        const currentCount = countOwnVisibleUnits(context, unitName);
        const screenUnitName = getBuildingEliminationGroundAssaultScreenUnitName(side);
        const structureName = getBuildingEliminationGroundAssaultStructureName(side);
        const factoryCount = countOwnVisibleUnits(context, structureName);
        const factoryTriggeredScreen = this.options.adaptiveGroundAssaultScreenFactoryTrigger;
        const currentScreenCount = factoryTriggeredScreen
            ? this.closeoutLatch.readinessScreenCount
            : countOwnVisibleUnits(context, screenUnitName);
        const screenTriggerActive = factoryTriggeredScreen ? factoryCount >= 1 : currentCount >= 1;
        const available = context.player.production.getAvailableObjects(QueueType.Vehicles)
            .some(({ name }) => name === unitName);
        const vehicleQueue = context.player.production.getQueueData(QueueType.Vehicles);
        const infantryQueue = context.player.production.getQueueData(QueueType.Infantry);
        const queuedUnitCount = this.options.queueAwareGroundAssaultTargets
            ? vehicleQueue.items.find(({ rules }) => rules.name === unitName)?.quantity ?? 0
            : 0;
        const queuedScreenCount = this.options.queueAwareGroundAssaultTargets
            ? infantryQueue.items.find(({ rules }) => rules.name === screenUnitName)?.quantity ?? 0
            : 0;
        const requested = currentCount + queuedUnitCount < this.options.adaptiveGroundAssaultTargetCount;
        this.emitTelemetry(
            context.game.getCurrentTick(),
            side,
            unitName,
            currentCount,
            requested,
            available,
            context.game.getPlayerData(context.player.name).credits,
            vehicleQueue.status,
            vehicleQueue.items.map(({ rules, quantity }) => ({ name: rules.name, quantity })),
            queuedUnitCount,
            this.options.queueAwareGroundAssaultTargets,
        );
        const screenRequested = screenTriggerActive &&
            currentScreenCount + queuedScreenCount < this.options.adaptiveGroundAssaultScreenTargetCount;
        this.emitScreenTelemetry(
            context.game.getCurrentTick(),
            side,
            screenUnitName,
            currentScreenCount,
            currentCount >= 1,
            screenRequested,
            factoryTriggeredScreen ? factoryCount : undefined,
            factoryTriggeredScreen ? screenTriggerActive : undefined,
            factoryTriggeredScreen ? true : undefined,
            this.options.adaptiveGroundAssaultReadinessForceOwnership
                ? this.closeoutLatch.readinessTankCount
                : undefined,
            this.options.queueAwareGroundAssaultTargets ? queuedScreenCount : undefined,
            this.options.queueAwareGroundAssaultTargets ? true : undefined,
        );
        const requests = getBuildingEliminationAssaultProductionRequests(
            unitName,
            currentCount,
            this.options.adaptiveGroundAssaultTargetCount,
            screenUnitName,
            currentScreenCount,
            this.options.adaptiveGroundAssaultScreenTargetCount,
            this.options.adaptiveProductionPriority,
            screenTriggerActive,
            queuedUnitCount,
            queuedScreenCount,
        );
        return Object.keys(requests).length > 0 ? requestUnits(requests) : noop();
    }

    getGlobalDebugText(): string | undefined {
        return "finish assault production";
    }

    getPriority(): number {
        return 0;
    }

    isUnitsLocked(): boolean {
        return false;
    }

    private emitTelemetry(
        tick: number,
        side: SideType.Nod | SideType.GDI,
        unitName: "HTNK" | "MTNK",
        currentCount: number,
        requested: boolean,
        available: boolean,
        credits: number,
        vehicleQueueStatus: number,
        vehicleQueueItems: Array<{ name: string; quantity: number }>,
        queuedCount: number,
        queueAwareTargeting: boolean,
    ): void {
        const event: Extract<BuildingEliminationTelemetryEvent, { event: "assault_production" }> = {
            schemaVersion: 14,
            event: "assault_production",
            tick,
            side,
            unitName,
            targetCount: this.options.adaptiveGroundAssaultTargetCount,
            currentCount,
            requested,
            available,
            credits,
            vehicleQueueStatus,
            vehicleQueueItems,
            ...(queueAwareTargeting ? { queuedCount, queueAwareTargeting } : {}),
        };
        const signature = JSON.stringify({ ...event, tick: 0 });
        if (signature === this.lastTelemetrySignature && tick < this.lastTelemetryAt + TELEMETRY_HEARTBEAT_TICKS) {
            return;
        }
        this.lastTelemetrySignature = signature;
        this.lastTelemetryAt = tick;
        this.telemetrySink(event);
    }

    private emitScreenTelemetry(
        tick: number,
        side: SideType.Nod | SideType.GDI,
        unitName: "E1" | "E2",
        currentCount: number,
        mainTankPresent: boolean,
        requested: boolean,
        factoryCount?: number,
        factoryTriggerActive?: boolean,
        readinessOwned?: boolean,
        readinessTankCount?: number,
        queuedCount?: number,
        queueAwareTargeting?: boolean,
    ): void {
        if (this.options.adaptiveGroundAssaultScreenTargetCount <= 0) return;
        const event: Extract<BuildingEliminationTelemetryEvent, { event: "assault_screen_production" }> = {
            schemaVersion: 17,
            event: "assault_screen_production",
            tick,
            side,
            unitName,
            targetCount: this.options.adaptiveGroundAssaultScreenTargetCount,
            currentCount,
            mainTankPresent,
            requested,
            ...(factoryCount === undefined ? {} : { factoryCount }),
            ...(factoryTriggerActive === undefined ? {} : { factoryTriggerActive }),
            ...(readinessOwned === undefined ? {} : { readinessOwned }),
            ...(readinessTankCount === undefined ? {} : { readinessTankCount }),
            ...(queuedCount === undefined ? {} : { queuedCount }),
            ...(queueAwareTargeting === undefined ? {} : { queueAwareTargeting }),
        };
        const signature = JSON.stringify({ ...event, tick: 0 });
        if (signature === this.lastScreenTelemetrySignature &&
            tick < this.lastScreenTelemetryAt + TELEMETRY_HEARTBEAT_TICKS) return;
        this.lastScreenTelemetrySignature = signature;
        this.lastScreenTelemetryAt = tick;
        this.telemetrySink(event);
    }
}

class BuildingEliminationCapabilityBuildMission extends Mission {
    constructor(
        private options: Required<BuildingEliminationOptions>,
        private capabilityGapCache: BuildingCapabilityGapCache,
        private closeoutLatch: BuildingEliminationCloseoutLatch,
        logger: DebugLogger,
    ) {
        super(BUILDING_ELIMINATION_CAPABILITY_BUILD_MISSION_NAME, logger);
    }

    _onAiUpdate(context: MissionContext): MissionAction {
        const side = getPlayerSide(context);
        if (side === null || context.game.getCurrentTick() < this.options.minTick) return noop();
        if (!shouldRunBuildingEliminationCapabilityProduction(
            this.closeoutLatch.activated,
            isBuildingEliminationCloseoutState(context, this.options),
        )) return noop();
        const gap = this.capabilityGapCache.get(context);
        if (!hasCapabilityGap(gap)) return noop();
        const plan = getBuildingCapabilityProductionPlan(
            side,
            this.options.adaptiveAirTargetCount,
            this.options.adaptiveNavalTargetCount,
            gap.unreachableBuildingIds.length > 0 ||
                (this.options.adaptiveAirTargetCount <= 0 && gap.incompatibleBuildingIds.length > 0),
        );
        const available = [
            ...context.player.production.getAvailableObjects(QueueType.Structures),
            ...context.player.production.getAvailableObjects(QueueType.Armory),
        ];
        const availableByName = new Map(available.map((rules) => [rules.name, rules]));
        const playerData = context.game.getPlayerData(context.player.name);
        const ownedStructureNames = new Set(
            plan.structures.filter((name) => countOwnVisibleUnits(context, name) > 0),
        );
        const buildCandidates = selectAvailableCapabilityStructures(
            plan.structures,
            new Set(availableByName.keys()),
            ownedStructureNames,
        );
        for (const name of buildCandidates) {
            const rules = availableByName.get(name);
            if (!rules) continue; // Narrowing guard for independently supplied sets.
            const buildingRules = BUILDING_NAME_TO_RULES.get(name);
            const location =
                buildingRules?.getPlacementLocation(context.game, playerData, rules) ??
                getDefaultPlacementLocation(context.game, playerData, playerData.startLocation, rules);
            if (location) {
                return buildStructureAtLocation(
                    name,
                    this.options.adaptiveTechPriority,
                    location.rx,
                    location.ry,
                );
            }
        }
        return noop();
    }

    getGlobalDebugText(): string | undefined {
        return "finish capability build";
    }

    getPriority(): number {
        return 0;
    }
}

class BuildingEliminationCapabilityUnitMission extends Mission {
    private lastTelemetrySignature = "";
    private lastTelemetryAt = Number.NEGATIVE_INFINITY;

    constructor(
        private options: Required<BuildingEliminationOptions>,
        private capabilityGapCache: BuildingCapabilityGapCache,
        private closeoutLatch: BuildingEliminationCloseoutLatch,
        logger: DebugLogger,
        private telemetrySink: BuildingEliminationTelemetrySink,
    ) {
        super(BUILDING_ELIMINATION_CAPABILITY_UNIT_MISSION_NAME, logger);
    }

    _onAiUpdate(context: MissionContext): MissionAction {
        if (this.getUnitIds().length > 0) return releaseUnits(this.getUnitIds());
        const side = getPlayerSide(context);
        if (side === null || context.game.getCurrentTick() < this.options.minTick) return noop();
        if (!shouldRunBuildingEliminationCapabilityProduction(
            this.closeoutLatch.activated,
            isBuildingEliminationCloseoutState(context, this.options),
        )) return noop();
        const gap = this.capabilityGapCache.get(context);
        if (!hasCapabilityGap(gap)) return noop();
        const plan = getBuildingCapabilityProductionPlan(
            side,
            this.options.adaptiveAirTargetCount,
            this.options.adaptiveNavalTargetCount,
            gap.unreachableBuildingIds.length > 0 ||
                (this.options.adaptiveAirTargetCount <= 0 && gap.incompatibleBuildingIds.length > 0),
        );
        const requests = Object.fromEntries(
            plan.units
                .filter(({ name, targetCount }) => countOwnVisibleUnits(context, name) < targetCount)
                .map(({ name }) => [name, this.options.adaptiveProductionPriority]),
        );
        this.emitTelemetry(context, gap, plan.structures, Object.keys(requests));
        return getBuildingCapabilityUnitMissionAction([], requests);
    }

    getGlobalDebugText(): string | undefined {
        return "finish capability units";
    }

    getPriority(): number {
        return 0;
    }

    isUnitsLocked(): boolean {
        return false;
    }

    private emitTelemetry(
        context: MissionContext,
        gap: BuildingCapabilityGap,
        requestedStructures: string[],
        requestedUnits: string[],
    ): void {
        const event: Extract<BuildingEliminationTelemetryEvent, { event: "capability_production" }> = {
            schemaVersion: 2,
            event: "capability_production",
            tick: context.game.getCurrentTick(),
            ...gap,
            requestedStructures,
            requestedUnits,
        };
        const signature = JSON.stringify({ ...event, tick: 0 });
        if (signature === this.lastTelemetrySignature && event.tick < this.lastTelemetryAt + TELEMETRY_HEARTBEAT_TICKS) {
            return;
        }
        this.lastTelemetrySignature = signature;
        this.lastTelemetryAt = event.tick;
        this.telemetrySink(event);
    }
}

export type BuildingEliminationReadinessDefenseDecision = {
    threat: UnitData;
    protectedObject: UnitData;
    distanceSquared: number;
};

export const selectBuildingEliminationReadinessDefense = (
    stagedCombatants: readonly UnitData[],
    protectedStructures: readonly UnitData[],
    visibleThreats: readonly UnitData[],
    radius: number,
): BuildingEliminationReadinessDefenseDecision | null => {
    if (radius <= 0 || stagedCombatants.length === 0) return null;
    const protectedObjects = [...stagedCombatants, ...protectedStructures];
    const candidates = visibleThreats.flatMap((threat) => protectedObjects.map((protectedObject) => ({
        threat,
        protectedObject,
        distanceSquared: distanceSquared(
            { x: threat.tile.rx, y: threat.tile.ry },
            { x: protectedObject.tile.rx, y: protectedObject.tile.ry },
        ),
    }))).filter(({ distanceSquared: distance }) => distance <= radius * radius);
    candidates.sort((left, right) =>
        left.distanceSquared - right.distanceSquared ||
        left.threat.id - right.threat.id ||
        left.protectedObject.id - right.protectedObject.id,
    );
    return candidates[0] ?? null;
};

class BuildingEliminationReadinessReserveMission extends Mission {
    private lastOrderAt = Number.NEGATIVE_INFINITY;
    private lastTelemetryAt = Number.NEGATIVE_INFINITY;
    private lastTelemetrySignature = "";

    constructor(
        private options: Required<BuildingEliminationOptions>,
        private vanguardUnitIds: ReadonlySet<number>,
        private closeoutLatch: BuildingEliminationCloseoutLatch,
        logger: DebugLogger,
        private telemetrySink: BuildingEliminationTelemetrySink,
    ) {
        super(
            options.adaptiveGroundAssaultReadinessForceOwnership
                ? BUILDING_ELIMINATION_READINESS_FORCE_MISSION_NAME
                : BUILDING_ELIMINATION_READINESS_RESERVE_MISSION_NAME,
            logger,
        );
    }

    _onAiUpdate(context: MissionContext): MissionAction {
        const eligibleAttackers = getEligibleBuildingAttackers(context);
        const reserveCandidates = selectBuildingEliminationReadinessReserveCandidates(
            eligibleAttackers,
            this.vanguardUnitIds,
        );
        const stagedCombatants = this.getUnits(context.game);
        const side = getPlayerSide(context);
        const screenUnitName = side === null ? null : getBuildingEliminationGroundAssaultScreenUnitName(side);
        this.closeoutLatch.readinessScreenCount = screenUnitName === null
            ? 0
            : stagedCombatants.filter(({ rules }) => rules.name === screenUnitName).length;
        const tankUnitName = side === null ? null : getBuildingEliminationGroundAssaultUnitName(side);
        this.closeoutLatch.readinessTankCount = tankUnitName === null
            ? 0
            : stagedCombatants.filter(({ rules }) => rules.name === tankUnitName).length;
        const tick = context.game.getCurrentTick();
        if (tick >= this.lastOrderAt + this.options.orderIntervalTicks) {
            const start = context.game.getPlayerData(context.player.name).startLocation;
            const visibleThreats = context.game.getVisibleUnits(context.player.name, "enemy")
                .map((id) => context.game.getUnitData(id))
                .filter((unit): unit is UnitData => !!unit && unit.rules.isSelectableCombatant &&
                    !unit.rules.harvester && unit.rules.type !== ObjectType.Building);
            const protectedStructures = side === null ? [] : context.game
                .getVisibleUnits(context.player.name, "self", (rules) =>
                    rules.name === getBuildingEliminationGroundAssaultStructureName(side),
                )
                .map((id) => context.game.getUnitData(id))
                .filter((unit): unit is UnitData => !!unit);
            const defense = selectBuildingEliminationReadinessDefense(
                stagedCombatants,
                protectedStructures,
                visibleThreats,
                this.options.readinessReserveDefenseRadius,
            );
            if (defense) {
                for (const unit of stagedCombatants) {
                    context.actionBatcher.push(BatchableAction.toTargetId(
                        unit.id,
                        OrderType.Attack,
                        defense.threat.id,
                    ));
                }
                this.telemetrySink({
                    schemaVersion: 16,
                    event: "readiness_defense",
                    tick,
                    threatId: defense.threat.id,
                    threatName: defense.threat.rules.name,
                    protectedId: defense.protectedObject.id,
                    protectedName: defense.protectedObject.rules.name,
                    distance: Math.sqrt(defense.distanceSquared),
                    stagedAttackerCount: stagedCombatants.length,
                });
            } else {
                for (const unit of stagedCombatants) {
                    if (distanceSquared(
                        { x: unit.tile.rx, y: unit.tile.ry },
                        { x: start.x, y: start.y },
                    ) > 16) {
                        context.actionBatcher.push(BatchableAction.toPoint(
                            unit.id,
                            OrderType.Move,
                            new Vector2(start.x, start.y),
                        ));
                    }
                }
            }
            this.lastOrderAt = tick;
        }
        this.emitTelemetry(
            tick,
            stagedCombatants.length,
            eligibleAttackers.length,
            eligibleAttackers.filter(({ id }) => this.vanguardUnitIds.has(id)).length,
        );
        return requestSpecificUnits(
            reserveCandidates.map(({ id }) => id),
            BUILDING_ELIMINATION_READINESS_RESERVE_PRIORITY,
        );
    }

    getGlobalDebugText(): string | undefined {
        return `finish reserve=${this.getUnitIds().length}`;
    }

    getPriority(): number {
        return BUILDING_ELIMINATION_READINESS_RESERVE_PRIORITY;
    }

    canDonateLockedUnitsTo(requestingMission: Mission<any>): boolean {
        return requestingMission.getUniqueName() === BUILDING_ELIMINATION_MISSION_NAME;
    }

    private emitTelemetry(
        tick: number,
        stagedCombatants: number,
        eligibleCombatants: number,
        vanguardCombatants: number,
    ): void {
        const event: Extract<BuildingEliminationTelemetryEvent, { event: "readiness_reserve" }> = {
            schemaVersion: 6,
            event: "readiness_reserve",
            tick,
            phase: "accumulating",
            stagedCombatants,
            eligibleCombatants,
            vanguardCombatants,
        };
        const signature = JSON.stringify({ ...event, tick: 0 });
        if (
            signature === this.lastTelemetrySignature &&
            tick < this.lastTelemetryAt + TELEMETRY_HEARTBEAT_TICKS
        ) return;
        this.lastTelemetrySignature = signature;
        this.lastTelemetryAt = tick;
        this.telemetrySink(event);
    }
}

export class BuildingEliminationMissionFactory {
    private options: Required<BuildingEliminationOptions>;
    private lastBlockedTelemetrySignature = "";
    private lastBlockedTelemetryAt = Number.NEGATIVE_INFINITY;
    private lastActivationEvaluationSignature = "";
    private lastActivationEvaluationAt = Number.NEGATIVE_INFINITY;
    private lastProductionReservationTelemetrySignature = "";
    private lastProductionReservationTelemetryAt = Number.NEGATIVE_INFINITY;
    private stalledBuildingIds = new Set<number>();
    private capabilityGapCache: BuildingCapabilityGapCache;
    private closeoutLatch: BuildingEliminationCloseoutLatch = {
        activated: false,
        readinessScreenCount: 0,
        readinessTankCount: 0,
    };
    private readinessVanguardUnitIds: Set<number> | null = null;

    constructor(
        options: BuildingEliminationOptions = {},
        private telemetrySink: BuildingEliminationTelemetrySink = () => undefined,
    ) {
        this.options = resolveBuildingEliminationOptions(options);
        this.capabilityGapCache = new BuildingCapabilityGapCache(
            this.options.observationMode,
            this.stalledBuildingIds,
            this.options.reserveCombatants,
        );
    }

    maybeCreateMissions(
        context: SupabotContext,
        missionController: MissionController,
        logger: DebugLogger,
    ): void {
        if (!this.options.enabled || context.game.getCurrentTick() < this.options.minTick) {
            return;
        }
        this.closeoutLatch.activated = updateBuildingEliminationProductionScopeLatch(
            this.closeoutLatch.activated,
            isBuildingEliminationCloseoutState(context, this.options),
            this.options.adaptiveGroundAssaultProductionScopeLatch ||
                this.options.persistentCloseoutActivationScope,
        );
        this.maybeCreateCapabilityMissions(missionController, logger);
        this.applyGroundAssaultProductionReservation(context, missionController);
        const existing = missionController
            .getMissions()
            .find((mission) => mission.getUniqueName() === BUILDING_ELIMINATION_MISSION_NAME);
        if (existing) {
            this.closeoutLatch.activated = true;
            this.preemptAttacks(missionController);
            return;
        }

        const ownCombatants = getEligibleBuildingAttackers(context);
        const enemyBuildings = getEnemyUnits(
            context,
            this.options.observationMode,
            (unit) => unit.rules.type === ObjectType.Building,
        );
        const enemyBuildingCount = enemyBuildings.length;
        const activationScopeLatched = this.options.persistentCloseoutActivationScope &&
            this.closeoutLatch.activated;
        if (!isWithinBuildingEliminationActivationScope(
            enemyBuildingCount,
            this.options.maxEnemyBuildings,
            activationScopeLatched,
        )) {
            return;
        }
        if (ownCombatants.length < this.options.minCombatants + this.options.reserveCombatants) {
            this.emitBlockedTelemetry(context, "insufficient_own_combatants", ownCombatants.length, 0);
            return;
        }
        const enemyCombatantCount = getEnemyCombatantCount(context, this.options.observationMode);
        let certifiedLaunchUnitIds: number[] = [];
        if (this.options.activationMode === "forceAdvantage" && enemyCombatantCount > this.options.maxEnemyCombatants) {
            this.emitBlockedTelemetry(context, "enemy_combatant_limit", ownCombatants.length, enemyCombatantCount);
            return;
        }
        if (
            this.options.activationMode === "forceAdvantage" &&
            ownCombatants.length - this.options.reserveCombatants <
            enemyCombatantCount + this.options.combatantAdvantage
        ) {
            this.emitBlockedTelemetry(context, "insufficient_advantage", ownCombatants.length, enemyCombatantCount);
            return;
        }
        if (
            this.options.activationMode === "objectiveRace" ||
            this.options.activationMode === "objectiveClearance" ||
            this.options.activationMode === "objectiveRouteClearance" ||
            this.options.activationMode === "objectiveTransferableRouteClearance" ||
            this.options.activationMode === "objectiveStagedRouteClearance" ||
            this.options.activationMode === "objectiveStagedBlockerClearance" ||
            this.options.activationMode === "objectiveVanguardRouteClearance"
        ) {
            const totalCommittedAttackers = selectCommittedBuildingAttackers(
                ownCombatants,
                context.game.getPlayerData(context.player.name).startLocation,
                this.options.reserveCombatants,
            );
            const committedAttackers = (
                this.options.activationMode === "objectiveStagedRouteClearance" ||
                this.options.activationMode === "objectiveStagedBlockerClearance"
            )
                ? selectStagedBuildingEliminationAttackers(
                    totalCommittedAttackers,
                    (unitId) => getAssignedBuildingEliminationMissionName(missionController, unitId),
                )
                : this.options.activationMode === "objectiveTransferableRouteClearance" ||
                    this.options.activationMode === "objectiveVanguardRouteClearance"
                    ? selectTransferCertifiedBuildingEliminationAttackers(
                        totalCommittedAttackers,
                        (unitId) => getAssignedBuildingEliminationMissionName(missionController, unitId),
                    )
                    : totalCommittedAttackers;
            const visibleEnemyIds = new Set(context.game.getVisibleUnits(context.player.name, "enemy"));
            const rankedTargets = rankBuildingTargets(
                enemyBuildings.map((building) => toTargetDescriptor(
                    building,
                    visibleEnemyIds.has(building.id),
                )),
                this.options.targetPriority,
                committedAttackers.map((unit) => ({ x: unit.tile.rx, y: unit.tile.ry })),
            );
            const buildingById = new Map(enemyBuildings.map((building) => [building.id, building]));
            const pairIsCompatible = (attacker: UnitData, descriptor: BuildingTargetDescriptor): boolean => {
                const target = descriptor.id === undefined ? undefined : buildingById.get(descriptor.id);
                if (!target) return false;
                if (this.options.capabilityAwareAttackers && !unitCanDamageBuilding(attacker, target)) return false;
                return !this.options.reachabilityAwareTargets ||
                    canReachBuildingFiringPerimeter(context.game, attacker, target);
            };
            const descriptor = selectCompatibleBuildingTargets(
                committedAttackers,
                rankedTargets,
                1,
                pairIsCompatible,
            )[0];
            const target = descriptor?.id === undefined ? undefined : buildingById.get(descriptor.id);
            const compatibleAttackers = target && descriptor
                ? committedAttackers.filter((attacker) => pairIsCompatible(attacker, descriptor))
                : [];
            const totalCompatibleAttackerCount = target && descriptor
                ? totalCommittedAttackers.filter((attacker) => pairIsCompatible(attacker, descriptor)).length
                : 0;
            const stagedCompatibleAttackerCount = compatibleAttackers.filter((attacker) =>
                isBuildingEliminationReadinessMissionName(
                    getAssignedBuildingEliminationMissionName(missionController, attacker.id),
                ),
            ).length;
            const activePredecessorCompatibleAttackerCount = compatibleAttackers.filter((attacker) => {
                const missionName = getAssignedBuildingEliminationMissionName(missionController, attacker.id);
                return missionName !== null && isPreemptibleBuildingEliminationMission(missionName);
            }).length;
            const assaultTankCount = compatibleAttackers.filter(({ rules }) =>
                rules.name === "HTNK" || rules.name === "MTNK",
            ).length;
            const assaultScreenCount = compatibleAttackers.filter(({ rules }) =>
                rules.name === "E1" || rules.name === "E2",
            ).length;
            if (this.options.activationMode === "objectiveVanguardRouteClearance") {
                certifiedLaunchUnitIds = compatibleAttackers.map(({ id }) => id).sort((left, right) => left - right);
            }
            const enemyForces = selectBuildingEliminationRouteThreatCandidates(
                getEnemyUnits(context, this.options.observationMode, () => true),
                compatibleAttackers,
            );
            const decision = target && compatibleAttackers.length > 0
                ? chooseBuildingEliminationEngagement(
                    compatibleAttackers,
                    target,
                    enemyForces,
                    this.options.routeCorridorRadius,
                )
                : null;
            const arbitration = arbitrateBuildingEliminationActivation({
                activationMode: this.options.activationMode,
                decision,
                enemyBuildingCount,
                readinessTankCount: this.closeoutLatch.readinessTankCount,
                readinessScreenCount: this.closeoutLatch.readinessScreenCount,
                assaultTankCount,
                assaultScreenCount,
                requireGroundAssaultCapabilityForActivation:
                    this.options.requireGroundAssaultCapabilityForActivation,
                requireTransferredGroundAssaultCapabilityForActivation:
                    this.options.requireTransferredGroundAssaultCapabilityForActivation,
                progressiveRouteBlockerLaunch: this.options.progressiveRouteBlockerLaunch,
                positiveProgressBlockerLaunch: this.options.positiveProgressBlockerLaunch,
                objectiveFeasibilityOverridesGroundAssaultCapability:
                    this.options.objectiveFeasibilityOverridesGroundAssaultCapability,
                preterminalRequiresRouteFeasibleLaunch:
                    this.options.preterminalRequiresRouteFeasibleLaunch,
            });
            const {
                transferredCapabilityReady,
                compositionReady,
                directObjectiveFeasible,
                completeRouteFeasible,
                partialBlockerLaunchPermitted,
                conventionalBlockerReady,
                progressiveBlockerReady,
                attritionalBlockerReady,
                buildingReady,
                blockerReady,
            } = arbitration;
            if (
                blockerReady && !conventionalBlockerReady && partialBlockerLaunchPermitted &&
                progressiveBlockerReady && target && decision?.blocker
            ) {
                this.telemetrySink({
                    schemaVersion: 18,
                    event: "progressive_blocker_launch",
                    tick: context.game.getCurrentTick(),
                    targetId: target.id,
                    targetName: target.rules.name,
                    blockerId: decision.blocker.id,
                    blockerName: decision.blocker.rules.name,
                    compatibleAttackerCount: compatibleAttackers.length,
                    readinessTankCount: this.closeoutLatch.readinessTankCount,
                    readinessScreenCount: this.closeoutLatch.readinessScreenCount,
                    estimatedBlockerRemovalTicks: decision.estimatedBlockerRemovalTicks,
                    estimatedRouteClearanceTicks: decision.estimatedRouteClearanceTicks,
                    estimatedForceSurvivalTicks: decision.estimatedForceSurvivalTicks,
                });
            }
            if (
                blockerReady && !conventionalBlockerReady && partialBlockerLaunchPermitted &&
                attritionalBlockerReady && target && decision?.blocker
            ) {
                this.telemetrySink({
                    schemaVersion: 20,
                    event: "attritional_blocker_launch",
                    tick: context.game.getCurrentTick(),
                    targetId: target.id,
                    targetName: target.rules.name,
                    blockerId: decision.blocker.id,
                    blockerName: decision.blocker.rules.name,
                    blockerIsStatic: decision.blocker.rules.type === ObjectType.Building,
                    compatibleAttackerCount: compatibleAttackers.length,
                    readinessTankCount: this.closeoutLatch.readinessTankCount,
                    readinessScreenCount: this.closeoutLatch.readinessScreenCount,
                    estimatedBlockerApproachTicks: decision.estimatedBlockerApproachTicks,
                    estimatedBlockerRemovalTicks: decision.estimatedBlockerRemovalTicks,
                    estimatedRouteClearanceTicks: Number.isFinite(decision.estimatedRouteClearanceTicks)
                        ? decision.estimatedRouteClearanceTicks
                        : null,
                    estimatedForceSurvivalTicks: decision.estimatedForceSurvivalTicks,
                });
            }
            const activationPhase = !target || compatibleAttackers.length === 0 || decision === null
                ? "no_target"
                : buildingReady
                    ? "building_ready"
                    : blockerReady
                        ? "blocker_ready"
                        : "blocked";
            if (
                this.options.requireGroundAssaultCapabilityForActivation && target && decision &&
                (buildingReady || blockerReady)
            ) {
                const finiteOrNull = (value: number): number | null => Number.isFinite(value) ? value : null;
                this.telemetrySink({
                    schemaVersion: 19,
                    event: "assault_capability_launch",
                    tick: context.game.getCurrentTick(),
                    launchMode: buildingReady
                        ? "direct_building"
                        : conventionalBlockerReady
                            ? "conventional_blocker"
                            : progressiveBlockerReady
                                ? "progressive_blocker"
                                : "attritional_blocker",
                    targetId: target.id,
                    targetName: target.rules.name,
                    blockerId: decision.blocker?.id ?? null,
                    blockerName: decision.blocker?.rules.name ?? null,
                    compatibleAttackerCount: compatibleAttackers.length,
                    readinessTankCount: this.closeoutLatch.readinessTankCount,
                    readinessScreenCount: this.closeoutLatch.readinessScreenCount,
                    routeThreatCount: decision.routeThreatCount,
                    staticRouteThreatCount: decision.staticRouteThreatCount,
                    estimatedBuildingCompletionTicks: finiteOrNull(decision.estimatedBuildingCompletionTicks),
                    estimatedBlockerRemovalTicks: finiteOrNull(decision.estimatedBlockerRemovalTicks),
                    estimatedForceSurvivalTicks: finiteOrNull(decision.estimatedForceSurvivalTicks),
                });
            }
            this.emitActivationEvaluation(
                context,
                activationPhase,
                target ?? null,
                compatibleAttackers.length,
                totalCompatibleAttackerCount,
                this.options.activationMode === "objectiveTransferableRouteClearance",
                this.options.activationMode === "objectiveStagedRouteClearance" ||
                    this.options.activationMode === "objectiveStagedBlockerClearance",
                this.options.activationMode === "objectiveVanguardRouteClearance",
                stagedCompatibleAttackerCount,
                assaultTankCount,
                assaultScreenCount,
                this.closeoutLatch.readinessTankCount,
                this.closeoutLatch.readinessScreenCount,
                transferredCapabilityReady,
                compositionReady,
                enemyBuildingCount,
                activationScopeLatched,
                directObjectiveFeasible,
                completeRouteFeasible,
                partialBlockerLaunchPermitted,
                activePredecessorCompatibleAttackerCount,
                decision,
            );
            if (!buildingReady && !blockerReady) {
                this.emitBlockedTelemetry(
                    context,
                    this.options.activationMode === "objectiveStagedBlockerClearance"
                        ? "no_viable_staged_blocker_clearance"
                        : this.options.activationMode === "objectiveVanguardRouteClearance"
                            ? "no_viable_vanguard_route_clearance"
                        : this.options.activationMode === "objectiveStagedRouteClearance"
                            ? "no_viable_staged_route_clearance"
                        : this.options.activationMode === "objectiveTransferableRouteClearance"
                            ? "no_viable_transferable_route_clearance"
                        : this.options.activationMode === "objectiveRouteClearance"
                            ? "no_viable_route_clearance"
                        : this.options.activationMode === "objectiveClearance"
                            ? "no_viable_objective_clearance"
                            : "no_viable_building_race",
                    ownCombatants.length,
                    enemyCombatantCount,
                );
                this.maybeCreateReadinessReserve(
                    context,
                    missionController,
                    logger,
                    ownCombatants,
                );
                return;
            }
        }

        const expectedStagedUnitIds = this.options.activationMode === "objectiveVanguardRouteClearance"
            ? certifiedLaunchUnitIds
            : this.options.activationMode === "objectiveStagedBlockerClearance"
            ? missionController.getMissions().find((mission) =>
                isBuildingEliminationReadinessMissionName(mission.getUniqueName()),
            )?.getUnitIds().slice().sort((left, right) => left - right) ?? []
            : [];
        this.releaseReadinessReserve(context, missionController, ownCombatants);
        const preemptedMissions = this.preemptAttacks(missionController);
        this.closeoutLatch.activated = true;
        this.telemetrySink({
            schemaVersion: 1,
            event: "activated",
            tick: context.game.getCurrentTick(),
            observationMode: this.options.observationMode,
            ownCombatants: ownCombatants.length,
            enemyCombatants: enemyCombatantCount,
            reservedCombatants: this.options.reserveCombatants,
            preemptedMissions,
        });
        missionController.addMission(
            new BuildingEliminationMission(
                this.options,
                logger,
                this.telemetrySink,
                this.stalledBuildingIds,
                expectedStagedUnitIds,
            ),
        );
        this.lastBlockedTelemetrySignature = "";
    }

    private emitActivationEvaluation(
        context: SupabotContext,
        phase: Extract<BuildingEliminationTelemetryEvent, { event: "activation_evaluation" }>["phase"],
        target: UnitData | null,
        compatibleAttackerCount: number,
        totalCompatibleAttackerCount: number,
        transferCertified: boolean,
        stagedCertified: boolean,
        vanguardCertified: boolean,
        stagedCompatibleAttackerCount: number,
        assaultTankCount: number,
        assaultScreenCount: number,
        readinessTankCount: number,
        readinessScreenCount: number,
        transferredCapabilityReady: boolean,
        compositionReady: boolean,
        enemyBuildingCount: number,
        activationScopeLatched: boolean,
        directObjectiveFeasible: boolean,
        completeRouteFeasible: boolean,
        partialBlockerLaunchPermitted: boolean,
        activePredecessorCompatibleAttackerCount: number,
        decision: BuildingEliminationEngagementDecision | null,
    ): void {
        const finiteOrNull = (value: number | undefined): number | null =>
            value !== undefined && Number.isFinite(value) ? value : null;
        const common = {
            event: "activation_evaluation" as const,
            tick: context.game.getCurrentTick(),
            phase,
            targetId: target?.id ?? null,
            targetName: target?.rules.name ?? null,
            blockerId: decision?.blocker?.id ?? null,
            blockerName: decision?.blocker?.rules.name ?? null,
            compatibleAttackerCount,
            ...(transferCertified || stagedCertified ? {
                totalCompatibleAttackerCount,
                transferCertifiedAttackerCount: compatibleAttackerCount,
            } : {}),
            ...(stagedCertified ? { stagedCompatibleAttackerCount: compatibleAttackerCount } : {}),
            routeThreatCount: decision?.routeThreatCount ?? 0,
            estimatedBuildingCompletionTicks: finiteOrNull(decision?.estimatedBuildingCompletionTicks),
            estimatedForceSurvivalTicks: finiteOrNull(decision?.estimatedForceSurvivalTicks),
            estimatedBlockerRemovalTicks: finiteOrNull(decision?.estimatedBlockerRemovalTicks),
            estimatedRouteClearanceTicks: finiteOrNull(decision?.estimatedRouteClearanceTicks),
        };
        const event: Extract<BuildingEliminationTelemetryEvent, { event: "activation_evaluation" }> =
            vanguardCertified && (
                this.options.objectiveFeasibilityOverridesGroundAssaultCapability ||
                this.options.preterminalRequiresRouteFeasibleLaunch
            )
                ? {
                    ...common,
                    schemaVersion: 22,
                    totalCompatibleAttackerCount,
                    transferCertifiedAttackerCount: compatibleAttackerCount,
                    stagedCompatibleAttackerCount,
                    vanguardCompatibleAttackerCount: compatibleAttackerCount - stagedCompatibleAttackerCount,
                    assaultTankCount,
                    assaultScreenCount,
                    readinessTankCount,
                    readinessScreenCount,
                    transferredCapabilityReady,
                    compositionReady,
                    enemyBuildingCount,
                    activationScopeLatched,
                    directObjectiveFeasible,
                    completeRouteFeasible,
                    partialBlockerLaunchPermitted,
                    activePredecessorCompatibleAttackerCount,
                }
                : vanguardCertified && this.options.requireTransferredGroundAssaultCapabilityForActivation
                ? {
                    ...common,
                    schemaVersion: 21,
                    totalCompatibleAttackerCount,
                    transferCertifiedAttackerCount: compatibleAttackerCount,
                    stagedCompatibleAttackerCount,
                    vanguardCompatibleAttackerCount: compatibleAttackerCount - stagedCompatibleAttackerCount,
                    assaultTankCount,
                    assaultScreenCount,
                    transferredCapabilityReady,
                    enemyBuildingCount,
                    activationScopeLatched,
                }
                : vanguardCertified
                ? {
                    ...common,
                    schemaVersion: 12,
                    totalCompatibleAttackerCount,
                    transferCertifiedAttackerCount: compatibleAttackerCount,
                    stagedCompatibleAttackerCount,
                    vanguardCompatibleAttackerCount: compatibleAttackerCount - stagedCompatibleAttackerCount,
                    assaultTankCount,
                }
                : {
                    ...common,
                    schemaVersion: stagedCertified ? 9 : transferCertified ? 8 : 7,
                    ...(transferCertified || stagedCertified ? {
                        totalCompatibleAttackerCount,
                        transferCertifiedAttackerCount: compatibleAttackerCount,
                    } : {}),
                    ...(stagedCertified ? { stagedCompatibleAttackerCount: compatibleAttackerCount } : {}),
                };
        const signature = JSON.stringify({ ...event, tick: 0 });
        const ready = phase === "building_ready" || phase === "blocker_ready";
        if (
            !ready && signature === this.lastActivationEvaluationSignature &&
            event.tick < this.lastActivationEvaluationAt + BLOCKED_TELEMETRY_HEARTBEAT_TICKS
        ) return;
        this.lastActivationEvaluationSignature = signature;
        this.lastActivationEvaluationAt = event.tick;
        this.telemetrySink(event);
    }

    private maybeCreateReadinessReserve(
        context: SupabotContext,
        missionController: MissionController,
        logger: DebugLogger,
        ownCombatants: UnitData[],
    ): void {
        if (!this.options.readinessReserve || this.readinessVanguardUnitIds !== null) return;
        if (missionController.getMissions().some(
            (mission) => isBuildingEliminationReadinessMissionName(mission.getUniqueName()),
        )) return;
        const fullForce = this.options.readinessReserveScope === "fullForce";
        this.readinessVanguardUnitIds = new Set(fullForce ? [] : ownCombatants.map(({ id }) => id));
        if (fullForce) this.preemptAttacks(missionController);
        missionController.addMission(new BuildingEliminationReadinessReserveMission(
            this.options,
            this.readinessVanguardUnitIds,
            this.closeoutLatch,
            logger,
            this.telemetrySink,
        ));
        this.telemetrySink({
            schemaVersion: 6,
            event: "readiness_reserve",
            tick: context.game.getCurrentTick(),
            phase: "created",
            stagedCombatants: 0,
            eligibleCombatants: ownCombatants.length,
            vanguardCombatants: this.readinessVanguardUnitIds.size,
        });
    }

    private releaseReadinessReserve(
        context: SupabotContext,
        missionController: MissionController,
        ownCombatants: UnitData[],
    ): void {
        if (this.readinessVanguardUnitIds === null) return;
        const reserve = missionController.getMissions().find(
            (mission) => isBuildingEliminationReadinessMissionName(mission.getUniqueName()),
        );
        if (reserve) {
            this.telemetrySink({
                schemaVersion: 6,
                event: "readiness_reserve",
                tick: context.game.getCurrentTick(),
                phase: "released",
                stagedCombatants: reserve.getUnitIds().length,
                eligibleCombatants: ownCombatants.length,
                vanguardCombatants: ownCombatants.filter(({ id }) =>
                    this.readinessVanguardUnitIds?.has(id) === true,
                ).length,
            });
            disbandBuildingEliminationMissionForTransfer(
                missionController,
                reserve.getUniqueName(),
            );
        }
        this.closeoutLatch.readinessScreenCount = 0;
        this.closeoutLatch.readinessTankCount = 0;
        this.readinessVanguardUnitIds = null;
    }

    private maybeCreateCapabilityMissions(missionController: MissionController, logger: DebugLogger): void {
        const needsCapabilityProduction = this.options.adaptiveAirTargetCount > 0 ||
            this.options.adaptiveNavalTargetCount > 0;
        const needsAssaultProduction = this.options.adaptiveGroundAssaultTargetCount > 0;
        const needsAssaultInfrastructure = this.options.adaptiveGroundAssaultInfrastructure;
        if (!needsCapabilityProduction && !needsAssaultProduction && !needsAssaultInfrastructure) return;
        const names = new Set(missionController.getMissions().map((mission) => mission.getUniqueName()));
        if (needsCapabilityProduction && !names.has(BUILDING_ELIMINATION_CAPABILITY_BUILD_MISSION_NAME)) {
            missionController.addMission(
                new BuildingEliminationCapabilityBuildMission(
                    this.options,
                    this.capabilityGapCache,
                    this.closeoutLatch,
                    logger,
                ),
            );
        }
        if (needsCapabilityProduction && !names.has(BUILDING_ELIMINATION_CAPABILITY_UNIT_MISSION_NAME)) {
            missionController.addMission(
                new BuildingEliminationCapabilityUnitMission(
                    this.options,
                    this.capabilityGapCache,
                    this.closeoutLatch,
                    logger,
                    this.telemetrySink,
                ),
            );
        }
        if (needsAssaultProduction && !names.has(BUILDING_ELIMINATION_ASSAULT_PRODUCTION_MISSION_NAME)) {
            missionController.addMission(
                new BuildingEliminationAssaultProductionMission(
                    this.options,
                    this.closeoutLatch,
                    logger,
                    this.telemetrySink,
                ),
            );
        }
        if (needsAssaultInfrastructure && !names.has(BUILDING_ELIMINATION_ASSAULT_BUILD_MISSION_NAME)) {
            missionController.addMission(
                new BuildingEliminationAssaultBuildMission(
                    this.options,
                    this.closeoutLatch,
                    logger,
                    this.telemetrySink,
                ),
            );
        }
    }

    private applyGroundAssaultProductionReservation(
        context: SupabotContext,
        missionController: MissionController,
    ): void {
        if (!this.options.adaptiveGroundAssaultProductionReservation) return;
        const side = getPlayerSide(context);
        if (side === null) return;
        if (!shouldRunBuildingEliminationCapabilityProduction(
            this.closeoutLatch.activated,
            isBuildingEliminationCloseoutState(context, this.options),
        )) return;

        const unitName = getBuildingEliminationGroundAssaultUnitName(side);
        const structureName = getBuildingEliminationGroundAssaultStructureName(side);
        const currentTankCount = countOwnVisibleUnits(context, unitName);
        const factoryCount = countOwnVisibleUnits(context, structureName);
        const factoryTriggeredScreen = this.options.adaptiveGroundAssaultScreenFactoryTrigger;
        const screenTriggerActive = factoryTriggeredScreen ? factoryCount >= 1 : currentTankCount >= 1;
        const needsScreen = screenTriggerActive && this.options.adaptiveGroundAssaultScreenTargetCount > 0 &&
            (factoryTriggeredScreen
                ? this.closeoutLatch.readinessScreenCount
                : countOwnVisibleUnits(context, getBuildingEliminationGroundAssaultScreenUnitName(side))) <
                    this.options.adaptiveGroundAssaultScreenTargetCount;
        if (!this.options.queueAwareGroundAssaultTargets &&
            currentTankCount >= this.options.adaptiveGroundAssaultTargetCount &&
            (!factoryTriggeredScreen || !needsScreen)) return;

        const retainedNames = new Set<string>([structureName, unitName]);
        if (screenTriggerActive && this.options.adaptiveGroundAssaultScreenTargetCount > 0) {
            retainedNames.add(getBuildingEliminationGroundAssaultScreenUnitName(side));
        }
        const queueTypes = [
            QueueType.Structures,
            QueueType.Armory,
            QueueType.Infantry,
            QueueType.Vehicles,
            QueueType.Aircrafts,
            QueueType.Ships,
        ];
        const queueItems = queueTypes.flatMap((queue) =>
            context.player.production.getQueueData(queue).items.map(({ rules, quantity }) => ({
                queue,
                name: rules.name,
                quantity,
            })),
        );
        const requestedUnitTypes = missionController.getRequestedUnitTypes();
        if (this.options.queueAwareGroundAssaultTargets) {
            const screenUnitName = getBuildingEliminationGroundAssaultScreenUnitName(side);
            const queuedTankCount = queueItems
                .find(({ queue, name }) => queue === QueueType.Vehicles && name === unitName)?.quantity ?? 0;
            const queuedScreenCount = queueItems
                .find(({ queue, name }) => queue === QueueType.Infantry && name === screenUnitName)?.quantity ?? 0;
            getSaturatedGroundAssaultRequestNames(
                unitName,
                currentTankCount,
                queuedTankCount,
                this.options.adaptiveGroundAssaultTargetCount,
                screenUnitName,
                factoryTriggeredScreen
                    ? this.closeoutLatch.readinessScreenCount
                    : countOwnVisibleUnits(context, screenUnitName),
                queuedScreenCount,
                this.options.adaptiveGroundAssaultScreenTargetCount,
            ).forEach((name) => requestedUnitTypes.delete(name));
        }
        const plan = planBuildingEliminationProductionReservation(
            requestedUnitTypes.keys(),
            queueItems,
            retainedNames,
        );
        plan.removedRequestNames.forEach((name) => requestedUnitTypes.delete(name));
        for (const item of plan.canceledQueueItems) {
            const queued = context.player.production.getQueueData(item.queue).items.find(
                ({ rules }) => rules.name === item.name,
            );
            if (!queued) continue;
            context.player.actions.unqueueFromProduction(
                item.queue,
                queued.rules.name,
                queued.rules.type,
                item.quantity,
            );
        }

        const event: Extract<
            BuildingEliminationTelemetryEvent,
            { event: "assault_production_reservation" }
        > = {
            schemaVersion: 15,
            event: "assault_production_reservation",
            tick: context.game.getCurrentTick(),
            side,
            currentTankCount,
            targetTankCount: this.options.adaptiveGroundAssaultTargetCount,
            retainedNames: [...retainedNames].sort((left, right) => left.localeCompare(right)),
            removedRequestNames: plan.removedRequestNames,
            canceledQueueItems: plan.canceledQueueItems,
        };
        const signature = JSON.stringify({ ...event, tick: 0 });
        if (
            signature === this.lastProductionReservationTelemetrySignature &&
            event.tick < this.lastProductionReservationTelemetryAt + TELEMETRY_HEARTBEAT_TICKS
        ) return;
        this.lastProductionReservationTelemetrySignature = signature;
        this.lastProductionReservationTelemetryAt = event.tick;
        this.telemetrySink(event);
    }

    private emitBlockedTelemetry(
        context: SupabotContext,
        reason: Extract<BuildingEliminationTelemetryEvent, { event: "activation_blocked" }>["reason"],
        ownCombatants: number,
        enemyCombatants: number,
    ): void {
        const event: Extract<BuildingEliminationTelemetryEvent, { event: "activation_blocked" }> = {
            schemaVersion: 2,
            event: "activation_blocked",
            tick: context.game.getCurrentTick(),
            reason,
            ownCombatants,
            enemyCombatants,
            reservedCombatants: this.options.reserveCombatants,
        };
        const signature = event.reason;
        if (
            signature === this.lastBlockedTelemetrySignature &&
            event.tick < this.lastBlockedTelemetryAt + BLOCKED_TELEMETRY_HEARTBEAT_TICKS
        ) {
            return;
        }
        this.lastBlockedTelemetrySignature = signature;
        this.lastBlockedTelemetryAt = event.tick;
        this.telemetrySink(event);
    }

    private preemptAttacks(missionController: MissionController): string[] {
        if (!this.options.preemptExistingAttacks) {
            return [];
        }
        const names = missionController
            .getMissions()
            .map((mission) => mission.getUniqueName())
            .filter(isPreemptibleBuildingEliminationMission)
            .sort();
        names.forEach((name) => disbandBuildingEliminationMissionForTransfer(missionController, name));
        return names;
    }
}
