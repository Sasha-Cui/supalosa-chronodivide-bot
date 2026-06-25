// Used to group related actions together to minimise actionApi calls. For example, if multiple units
// are ordered to move to the same location, all of them will be ordered to move in a single action.

import { ActionsApi, OrderType, Vector2 } from "@chronodivide/game-api";
import { groupBy } from "../common/utils.js";

export type SubmittedBatchableAction = {
    action: BatchableAction;
    tick: number;
};

const DEFAULT_DEDUPE_MEMORY_TICKS = 900;

export class BatchableAction {
    private constructor(
        private _unitId: number,
        private _orderType: OrderType,
        private _point?: Vector2,
        private _targetId?: number,
        // If you don't want this action to be swallowed by dedupe, provide a unique nonce.
        private _nonce: number = 0,
    ) {}

    static noTarget(unitId: number, orderType: OrderType, nonce: number = 0) {
        return new BatchableAction(unitId, orderType, undefined, undefined, nonce);
    }

    static toPoint(unitId: number, orderType: OrderType, point: Vector2, nonce: number = 0) {
        return new BatchableAction(unitId, orderType, point, undefined, nonce);
    }

    static toTargetId(unitId: number, orderType: OrderType, targetId: number, nonce: number = 0) {
        return new BatchableAction(unitId, orderType, undefined, targetId, nonce);
    }

    public get unitId() {
        return this._unitId;
    }

    public get orderType() {
        return this._orderType;
    }

    public get point() {
        return this._point;
    }

    public get targetId() {
        return this._targetId;
    }

    public isSameAs(other: BatchableAction) {
        if (this._unitId !== other._unitId) {
            return false;
        }
        if (this._orderType !== other._orderType) {
            return false;
        }
        if (!isSamePoint(this._point, other._point)) {
            return false;
        }
        if (this._targetId !== other._targetId) {
            return false;
        }
        if (this._nonce !== other._nonce) {
            return false;
        }
        return true;
    }
}

const isSamePoint = (a: Vector2 | undefined, b: Vector2 | undefined): boolean => {
    if (!a && !b) {
        return true;
    }
    if (!a || !b) {
        return false;
    }
    return a.x === b.x && a.y === b.y;
};

export class ActionBatcher {
    private actions: BatchableAction[];

    constructor(
        private currentTick: number = 0,
        private lastSubmittedActions: Map<number, SubmittedBatchableAction> = new Map(),
        private dedupeMemoryTicks: number = DEFAULT_DEDUPE_MEMORY_TICKS,
    ) {
        this.actions = [];
    }

    push(action: BatchableAction) {
        this.actions.push(action);
    }

    resolve(actionsApi: ActionsApi) {
        const actionsToSubmit = this.getActionsToSubmit();
        const groupedCommands = groupBy(actionsToSubmit, (action) => action.orderType.valueOf().toString());
        const vectorToStr = (v: Vector2) => v.x + "," + v.y;
        const strToVector = (str: string) => {
            const [x, y] = str.split(",");
            return new Vector2(parseInt(x), parseInt(y));
        };

        // Group by command type.
        Object.entries(groupedCommands).forEach(([commandValue, commands]) => {
            // i hate this
            const commandType: OrderType = parseInt(commandValue) as OrderType;
            // Group by command target ID.
            const byTarget = groupBy(
                commands.filter((command) => command.targetId !== undefined),
                (command) => command.targetId?.toString()!,
            );
            Object.entries(byTarget).forEach(([targetId, unitCommands]) => {
                actionsApi.orderUnits(
                    unitCommands.map((command) => command.unitId),
                    commandType,
                    parseInt(targetId),
                );
            });
            // Group by position (the vector is encoded as a string of the form "x,y")
            const byPosition = groupBy(
                commands.filter((command) => command.point !== undefined),
                (command) => vectorToStr(command.point!),
            );
            Object.entries(byPosition).forEach(([point, unitCommands]) => {
                const vector = strToVector(point);
                actionsApi.orderUnits(
                    unitCommands.map((command) => command.unitId),
                    commandType,
                    vector.x,
                    vector.y,
                );
            });
            // Actions with no targets
            const noTargets = commands.filter((command) => command.targetId === undefined && command.point === undefined);
            if (noTargets.length > 0) {
                actionsApi.orderUnits(
                    noTargets.map((action) => action.unitId),
                    commandType,
                );
            }
        });

        actionsToSubmit.forEach((action) => {
            this.lastSubmittedActions.set(action.unitId, { action, tick: this.currentTick });
        });
        this.pruneHistory();
    }

    private getActionsToSubmit(): BatchableAction[] {
        const acceptedThisBatch = new Map<number, BatchableAction>();
        const actionsToSubmit: BatchableAction[] = [];
        for (const action of this.actions) {
            const acceptedAction = acceptedThisBatch.get(action.unitId);
            if (acceptedAction?.isSameAs(action) || this.wasRecentlySubmitted(action)) {
                continue;
            }
            acceptedThisBatch.set(action.unitId, action);
            actionsToSubmit.push(action);
        }
        return actionsToSubmit;
    }

    private wasRecentlySubmitted(action: BatchableAction): boolean {
        const lastSubmitted = this.lastSubmittedActions.get(action.unitId);
        if (!lastSubmitted) {
            return false;
        }
        if (this.currentTick - lastSubmitted.tick > this.dedupeMemoryTicks) {
            return false;
        }
        return lastSubmitted.action.isSameAs(action);
    }

    private pruneHistory(): void {
        for (const [unitId, submittedAction] of this.lastSubmittedActions.entries()) {
            if (this.currentTick - submittedAction.tick > this.dedupeMemoryTicks) {
                this.lastSubmittedActions.delete(unitId);
            }
        }
    }
}
