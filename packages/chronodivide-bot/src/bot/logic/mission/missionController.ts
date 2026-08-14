// Meta-controller for forming and controlling missions.
// Missions are groups of zero or more units that aim to accomplish a particular goal.

import { ActionsApi, BotContext, GameApi, GameObjectData, Vector2 } from "@chronodivide/game-api";
import {
    Mission,
    MissionActionDisband,
    MissionActionRequestSpecificUnits,
    MissionWithAction,
    isBuildStructureAtLocation,
    isDisbandMission,
    isGrabCombatants,
    isReleaseUnits,
    isRequestSpecificUnits,
    isRequestUnits,
} from "./mission.js";
import { ActionBatcher, SubmittedBatchableAction } from "./actionBatcher.js";
import { countBy, isSelectableCombatant } from "../common/utils.js";
import { MissionContext, SupabotContext } from "../common/context.js";

// `missingUnitTypes` priority decays by this much every update loop.
const MISSING_UNIT_TYPE_REQUEST_DECAY_MULT_RATE = 0.75;
const MISSING_UNIT_TYPE_REQUEST_DECAY_FLAT_RATE = 1;

export type UnitRequest = {
    priority: number;
    // Relevant for structures only.
    specificLocation: Vector2 | null;
};
type UnitRequestWithMission = { mission: Mission<any> } & UnitRequest;

export const canTransferSpecificUnit = (
    donatingMission: Mission<any> | undefined,
    requestingMission: Mission<any>,
    requestedPriority: number,
): boolean => {
    if (!donatingMission) return true;
    if (
        donatingMission === requestingMission ||
        donatingMission.getPriority() > requestedPriority
    ) {
        return false;
    }
    return !donatingMission.isUnitsLocked() || donatingMission.canDonateLockedUnitsTo(requestingMission);
};

export const releaseTransferDisbandedUnits = (
    missions: readonly Mission<any>[],
    transferDisbandedMissionNames: ReadonlySet<string>,
    unitIdToMission: Map<number, Mission<any>>,
): number[] => {
    const released: number[] = [];
    for (const mission of missions) {
        if (!transferDisbandedMissionNames.has(mission.getUniqueName())) continue;
        for (const unitId of [...mission.getUnitIds()]) {
            mission.removeUnit(unitId);
            if (unitIdToMission.get(unitId) === mission) {
                unitIdToMission.delete(unitId);
                released.push(unitId);
            }
        }
    }
    return released.sort((left, right) => left - right);
};

export class MissionController {
    private missions: Mission<any>[] = [];

    // A mapping of unit IDs to the missions they are assigned to. This may contain units that are dead, but
    // is periodically cleaned in the update loop.
    private unitIdToMission: Map<number, Mission<any>> = new Map();

    // A mapping of unit types to the highest priority requested for a mission.
    // This decays over time if requests are not 'refreshed' by mission.
    private requestedUnitTypes: Map<string, UnitRequest> = new Map();

    // Tracks missions to be externally disbanded the next time the mission update loop occurs.
    private forceDisbandedMissions: string[] = [];

    // Tracks missions whose units must be released from both ownership representations
    // before same-update specific-unit requests are resolved.
    private transferDisbandedMissions: string[] = [];

    private recentBatchableActions: Map<number, SubmittedBatchableAction> = new Map();

    constructor(private logger: (message: string, sayInGame?: boolean) => void) {}

    private updateUnitIds(botContext: BotContext) {
        // Check for units in multiple missions, this shouldn't happen.
        this.unitIdToMission = new Map();
        this.missions.forEach((mission) => {
            const toRemove: number[] = [];
            mission.getUnitIds().forEach((unitId) => {
                if (this.unitIdToMission.has(unitId)) {
                    this.logger(`WARNING: unit ${unitId} is in multiple missions, please debug.`);
                } else if (!botContext.game.getGameObjectData(unitId)) {
                    // say, if a unit was killed
                    toRemove.push(unitId);
                } else {
                    this.unitIdToMission.set(unitId, mission);
                }
            });
            toRemove.forEach((unitId) => mission.removeUnit(unitId));
        });
    }

    public onAiUpdate(context: SupabotContext) {
        // Remove inactive missions.
        this.missions = this.missions.filter((missions) => missions.isActive());

        this.updateUnitIds(context);

        // Batch actions to reduce spamming of actions for larger armies.
        const actionBatcher = new ActionBatcher(context.game.getCurrentTick(), this.recentBatchableActions);

        const missionContext = {
            ...context,
            actionBatcher,
        } satisfies MissionContext;

        // Poll missions for requested actions.
        const missionActions: MissionWithAction<any>[] = this.missions.map((mission) => ({
            mission,
            action: mission.onAiUpdate(missionContext),
        }));

        // Handle disbands and merges.
        const disbandedMissions: Map<string, any> = new Map();
        this.forceDisbandedMissions.forEach((name) => disbandedMissions.set(name, null));
        this.forceDisbandedMissions = [];
        const transferNames = new Set(this.transferDisbandedMissions);
        this.transferDisbandedMissions.forEach((name) => disbandedMissions.set(name, null));
        releaseTransferDisbandedUnits(this.missions, transferNames, this.unitIdToMission)
            .forEach((unitId) => context.player.actions.setUnitDebugText(unitId, undefined));
        this.transferDisbandedMissions = [];
        missionActions.filter(isDisbandMission).forEach((a) => {
            this.logger(`Mission ${a.mission.getUniqueName()} disbanding as requested.`);
            a.mission.getUnitIds().forEach((unitId) => {
                this.unitIdToMission.delete(unitId);
                context.player.actions.setUnitDebugText(unitId, undefined);
            });
            disbandedMissions.set(a.mission.getUniqueName(), (a.action as MissionActionDisband).reason);
        });

        // Handle unit requests.

        // Release units
        missionActions.filter(isReleaseUnits).forEach((a) => {
            a.action.unitIds.forEach((unitId) => {
                if (this.unitIdToMission.get(unitId)?.getUniqueName() === a.mission.getUniqueName()) {
                    this.removeUnitFromMission(a.mission, unitId, context.player.actions);
                }
            });
        });

        // Request specific units by ID
        const unitIdToHighestRequest = missionActions.filter(isRequestSpecificUnits).reduce(
            (prev, missionWithAction) => {
                const { unitIds } = missionWithAction.action;
                unitIds.forEach((unitId) => {
                    if (prev.hasOwnProperty(unitId)) {
                        if (missionWithAction.action.priority > prev[unitId].action.priority) {
                            prev[unitId] = missionWithAction;
                        }
                    } else {
                        prev[unitId] = missionWithAction;
                    }
                });
                return prev;
            },
            {} as Record<number, MissionWithAction<MissionActionRequestSpecificUnits>>,
        );

        // Map of Mission ID to Unit Type to Count.
        const newMissionAssignments = Object.entries(unitIdToHighestRequest)
            .flatMap(([id, request]) => {
                const unitId = Number.parseInt(id);
                const unit = context.game.getGameObjectData(unitId);
                const { mission: requestingMission } = request;
                const missionName = requestingMission.getUniqueName();
                if (!unit) {
                    this.logger(`mission ${missionName} requested non-existent unit ${unitId}`);
                    return [];
                }
                const donatingMission = this.unitIdToMission.get(unitId);
                if (canTransferSpecificUnit(donatingMission, requestingMission, request.action.priority)) {
                    if (donatingMission) {
                        this.removeUnitFromMission(donatingMission, unitId, context.player.actions);
                    }
                    this.addUnitToMission(requestingMission, unit, context.player.actions);
                    return [{ unitName: unit?.name, mission: requestingMission.getUniqueName() }];
                }
                return [];
            })
            .reduce(
                (acc, curr) => {
                    if (!acc[curr.mission]) {
                        acc[curr.mission] = {};
                    }
                    if (!acc[curr.mission][curr.unitName]) {
                        acc[curr.mission][curr.unitName] = 0;
                    }
                    acc[curr.mission][curr.unitName] = acc[curr.mission][curr.unitName] + 1;
                    return acc;
                },
                {} as Record<string, Record<string, number>>,
            );
        Object.entries(newMissionAssignments).forEach(([mission, assignments]) => {
            this.logger(
                `Mission ${mission} received: ${Object.entries(assignments)
                    .map(([unitType, count]) => unitType + " x " + count)
                    .join(", ")}`,
            );
        });

        // Request units by type - store the highest priority mission for each unit type.
        const unitTypeToHighestRequest = missionActions.filter(isRequestUnits).reduce(
            (prev, missionWithAction) => {
                const { unitNameToPriority } = missionWithAction.action;
                Object.entries(unitNameToPriority).forEach(([unitName, requestedPriority]) => {
                    if (prev.hasOwnProperty(unitName)) {
                        if (requestedPriority > prev[unitName].priority) {
                            prev[unitName] = {
                                mission: missionWithAction.mission,
                                priority: requestedPriority,
                                specificLocation: null,
                            };
                        }
                    } else {
                        prev[unitName] = {
                            mission: missionWithAction.mission,
                            priority: requestedPriority,
                            specificLocation: null,
                        };
                    }
                });
                return prev;
            },
            {} as Record<string, UnitRequestWithMission>,
        );

        // Request combat-capable units in an area
        const grabRequests = missionActions.filter(isGrabCombatants);

        // Find units and distribute them among all the requesting missions.
        const unitIds = context.game.getVisibleUnits(context.player.name, "self");
        type UnitWithMission = {
            unit: GameObjectData;
            mission: Mission<any> | undefined;
        };
        const candidateUnits: UnitWithMission[] = unitIds
            .map((unitId) => context.game.getGameObjectData(unitId))
            .filter((unit): unit is GameObjectData => !!unit)
            .map((unit) => ({
                unit,
                mission: this.unitIdToMission.get(unit.id),
            }));

        // Sort units so that unassigned units get chosen before assigned units.
        candidateUnits.sort((u1, u2) => (u1.mission?.getPriority() ?? 0) - (u2.mission?.getPriority() ?? 0));

        type AssignmentWithType = { unitName: string; missionName: string; method: "type" | "grab" };
        const newAssignmentsByType = candidateUnits
            .flatMap(({ unit: freeUnit, mission: donatingMission }) => {
                if (unitTypeToHighestRequest.hasOwnProperty(freeUnit.name)) {
                    if (donatingMission?.isUnitsLocked()) {
                        return [];
                    }
                    const { mission: requestingMission, priority: requestedPriority } =
                        unitTypeToHighestRequest[freeUnit.name];
                    if (donatingMission) {
                        if (
                            donatingMission === requestingMission ||
                            donatingMission.getPriority() > requestedPriority
                        ) {
                            return [];
                        }
                        this.removeUnitFromMission(donatingMission, freeUnit.id, context.player.actions);
                    }
                    this.logger(
                        `granting unit ${freeUnit.id}#${freeUnit.name} to mission ${requestingMission.getUniqueName()}`,
                    );
                    this.addUnitToMission(requestingMission, freeUnit, context.player.actions);
                    delete unitTypeToHighestRequest[freeUnit.name];
                    return [
                        { unitName: freeUnit.name, missionName: requestingMission.getUniqueName(), method: "type" },
                    ] as AssignmentWithType[];
                } else if (grabRequests.length > 0) {
                    const grantedMission = grabRequests.find((request) => {
                        const canGrabUnit = isSelectableCombatant(freeUnit);
                        const canDonateUnit =
                            !donatingMission ||
                            !donatingMission.isUnitsLocked() ||
                            donatingMission.canDonateLockedUnitsTo(request.mission);
                        return (
                            canGrabUnit &&
                            canDonateUnit &&
                            request.action.point.distanceTo(new Vector2(freeUnit.tile.rx, freeUnit.tile.ry)) <=
                                request.action.radius
                        );
                    });
                    if (grantedMission) {
                        if (donatingMission) {
                            if (
                                donatingMission === grantedMission.mission ||
                                donatingMission.getPriority() > grantedMission.mission.getPriority()
                            ) {
                                return [];
                            }
                            this.removeUnitFromMission(donatingMission, freeUnit.id, context.player.actions);
                        }
                        this.addUnitToMission(grantedMission.mission, freeUnit, context.player.actions);
                        return [
                            {
                                unitName: freeUnit.name,
                                missionName: grantedMission.mission.getUniqueName(),
                                method: "grab",
                            },
                        ] as AssignmentWithType[];
                    }
                }
                return [];
            })
            .reduce(
                (acc, curr) => {
                    if (!acc[curr.missionName]) {
                        acc[curr.missionName] = {};
                    }
                    if (!acc[curr.missionName][curr.unitName]) {
                        acc[curr.missionName][curr.unitName] = { grab: 0, type: 0 };
                    }
                    acc[curr.missionName][curr.unitName][curr.method] =
                        acc[curr.missionName][curr.unitName][curr.method] + 1;
                    return acc;
                },
                {} as Record<string, Record<string, Record<"type" | "grab", number>>>,
            );
        Object.entries(newAssignmentsByType).forEach(([mission, assignments]) => {
            this.logger(
                `Mission ${mission} received: ${Object.entries(assignments)
                    .flatMap(([unitType, methodToCount]) =>
                        Object.entries(methodToCount)
                            .filter(([, count]) => count > 0)
                            .map(([method, count]) => unitType + " x " + count + " (by " + method + ")"),
                    )
                    .join(", ")}`,
            );
        });

        // Handle structure requests.
        missionActions.filter(isBuildStructureAtLocation).forEach((a) => {
            const { rulesName, rx, ry } = a.action;
            if (rulesName in unitTypeToHighestRequest) {
                const currentPriority = unitTypeToHighestRequest[rulesName].priority;
                if (a.action.priority > currentPriority) {
                    unitTypeToHighestRequest[rulesName] = {
                        mission: a.mission,
                        priority: a.action.priority,
                        specificLocation: new Vector2(rx, ry),
                    };
                }
            } else {
                unitTypeToHighestRequest[rulesName] = {
                    mission: a.mission,
                    priority: a.action.priority,
                    specificLocation: new Vector2(rx, ry),
                };
            }
        });

        this.updateRequestedUnitTypes(unitTypeToHighestRequest);

        // Send all actions that can be batched together.
        actionBatcher.resolve(context.player.actions);

        // Remove disbanded and merged missions.
        this.missions
            .filter((missions) => disbandedMissions.has(missions.getUniqueName()))
            .forEach((disbandedMission) => {
                const reason = disbandedMissions.get(disbandedMission.getUniqueName());
                this.logger(`mission disbanded: ${disbandedMission.getUniqueName()}, reason: ${reason}`);
                disbandedMission.endMission(disbandedMissions.get(disbandedMission.getUniqueName()));
            });
        this.missions = this.missions.filter((missions) => !disbandedMissions.has(missions.getUniqueName()));
    }

    private updateRequestedUnitTypes(missingUnitTypeToHighestRequest: Record<string, UnitRequestWithMission>) {
        // Decay the priority over time.
        for (const [unitType, currentRequest] of this.requestedUnitTypes.entries()) {
            const newPriority =
                currentRequest.priority * MISSING_UNIT_TYPE_REQUEST_DECAY_MULT_RATE -
                MISSING_UNIT_TYPE_REQUEST_DECAY_FLAT_RATE;
            if (newPriority > 0.5) {
                this.requestedUnitTypes.set(unitType, {
                    ...currentRequest,
                    priority: newPriority,
                });
            } else {
                this.requestedUnitTypes.delete(unitType);
            }
        }
        // Add the new missing units to the priority set, if the request is higher than the existing value.
        Object.entries(missingUnitTypeToHighestRequest).forEach(([unitType, request]) => {
            const currentRequest = this.requestedUnitTypes.get(unitType);
            if (!currentRequest) {
                this.requestedUnitTypes.set(unitType, request);
                return;
            }
            this.requestedUnitTypes.set(
                unitType,
                request.priority > currentRequest.priority ? request : currentRequest,
            );
        });
    }

    /**
     * Returns the set of units that have been requested for production by the missions.
     *
     * @returns A map of unit type to the highest priority for that unit type.
     */
    public getRequestedUnitTypes(): Map<string, UnitRequest> {
        return this.requestedUnitTypes;
    }

    /**
     * Returns the current mission name for a unit without exposing mutable
     * mission-controller state. The assignment map is refreshed at the start
     * of every AI update before strategies and mission factories run.
     */
    public getAssignedMissionName(unitId: number): string | null {
        return this.unitIdToMission.get(unitId)?.getUniqueName() ?? null;
    }

    private addUnitToMission(mission: Mission<any>, unit: GameObjectData, actionsApi: ActionsApi) {
        mission.addUnit(unit.id);
        this.unitIdToMission.set(unit.id, mission);
        actionsApi.setUnitDebugText(unit.id, mission.getUniqueName() + "_" + unit.id);
    }

    private removeUnitFromMission(mission: Mission<any>, unitId: number, actionsApi: ActionsApi) {
        mission.removeUnit(unitId);
        this.unitIdToMission.delete(unitId);
        actionsApi.setUnitDebugText(unitId, undefined);
    }

    /**
     * Attempts to add a mission to the active set.
     * @param mission
     * @returns The mission if it was accepted, or null if it was not.
     */
    public addMission(mission: Mission<any>): Mission<any> | null {
        if (this.missions.some((m) => m.getUniqueName() === mission.getUniqueName())) {
            // reject non-unique mission names
            return null;
        }
        this.logger(`Added mission: ${mission.getUniqueName()}`);
        this.missions.push(mission);
        return mission;
    }

    /**
     * Disband the provided mission on the next possible opportunity.
     */
    public disbandMission(missionName: string) {
        this.forceDisbandedMissions.push(missionName);
    }

    /**
     * Disband a mission while making its units available to specific-unit
     * requests in the same controller update. Unlike ordinary forced disband,
     * this also empties the donor's unit list before its completion callback.
     */
    public disbandMissionForTransfer(missionName: string) {
        this.transferDisbandedMissions.push(missionName);
    }

    // return text to display for global debug
    public getGlobalDebugText(gameApi: GameApi): string {
        const unitsInMission = (unitIds: number[]) =>
            countBy(unitIds, (unitId) => gameApi.getGameObjectData(unitId)?.name);

        let globalDebugText = "";

        this.missions.forEach((mission) => {
            this.logger(
                `Mission ${mission.getUniqueName()}: ${Object.entries(unitsInMission(mission.getUnitIds()))
                    .map(([unitName, count]) => `${unitName} x ${count}`)
                    .join(", ")}`,
            );
            const missionDebugText = mission.getGlobalDebugText();
            if (missionDebugText) {
                globalDebugText += mission.getUniqueName() + ": " + missionDebugText + "\n";
            }
        });
        return globalDebugText;
    }

    public updateDebugText(actionsApi: ActionsApi) {
        this.missions.forEach((mission) => {
            mission
                .getUnitIds()
                .forEach((unitId) => actionsApi.setUnitDebugText(unitId, `${unitId}: ${mission.getUniqueName()}`));
        });
    }

    public getMissions() {
        return this.missions;
    }
}
