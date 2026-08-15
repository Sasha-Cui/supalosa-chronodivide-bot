import { QueueStatus, QueueType } from "@chronodivide/game-api";
import {
    EXCLUSIVE_PRODUCTION_FOCUS_PRIORITY,
    QUEUES,
    selectExclusiveProductionFocusQueue,
} from "@supalosa/chronodivide-bot/dist/bot/logic/building/queueController.js";
import {
    BuildingEliminationTelemetrySink,
} from "@supalosa/chronodivide-bot/dist/bot/logic/mission/missions/buildingEliminationMission.js";

type UnitRequestLike = { priority: number; specificLocation: unknown };
type QueueControllerDelegate = {
    onAiUpdate(
        context: any,
        threatCache: unknown,
        unitTypeRequests: Map<string, UnitRequestLike>,
        logger: (message: string) => void,
    ): void;
};

export type ExclusiveProductionFocusDecision = {
    focusQueue: QueueType;
    focusRequestName: string;
    focusPriority: number;
    focusQueueStatus: QueueStatus;
    pausedQueueTypes: QueueType[];
    deferredQueueTypes: QueueType[];
    readyQueueTypes: QueueType[];
};

const queueDecision = (
    production: any,
    unitTypeRequests: Map<string, UnitRequestLike>,
    queue: QueueType,
): { queue: QueueType; name: string; priority: number } | null => {
    const ranked = production.getAvailableObjects(queue)
        .map(({ name }: { name: string }) => ({
            queue,
            name,
            priority: unitTypeRequests.get(name)?.priority ?? 0,
        }))
        .sort((left: { priority: number }, right: { priority: number }) => left.priority - right.priority);
    const top = ranked[ranked.length - 1];
    return top && top.priority > 0 ? top : null;
};

export const deriveExclusiveProductionFocusDecision = (
    production: any,
    unitTypeRequests: Map<string, UnitRequestLike>,
): ExclusiveProductionFocusDecision | null => {
    const decisions = QUEUES.flatMap((queue) => {
        const decision = queueDecision(production, unitTypeRequests, queue);
        return decision ? [decision] : [];
    });
    const focusQueue = selectExclusiveProductionFocusQueue(decisions);
    if (focusQueue === null) return null;
    const focus = decisions.find(({ queue }) => queue === focusQueue);
    if (!focus || focus.priority < EXCLUSIVE_PRODUCTION_FOCUS_PRIORITY) return null;
    const queueData = new Map(QUEUES.map((queue) => [queue, production.getQueueData(queue)]));
    const nonfocused = QUEUES.filter((queue) => queue !== focusQueue);
    return {
        focusQueue,
        focusRequestName: focus.name,
        focusPriority: focus.priority,
        focusQueueStatus: queueData.get(focusQueue).status,
        pausedQueueTypes: nonfocused.filter((queue) => queueData.get(queue).status === QueueStatus.Active),
        deferredQueueTypes: nonfocused.filter((queue) => {
            const status = queueData.get(queue).status;
            return status === QueueStatus.Idle || status === QueueStatus.OnHold;
        }),
        readyQueueTypes: nonfocused.filter((queue) => queueData.get(queue).status === QueueStatus.Ready),
    };
};

const blockedNonfocusedQueueMethods = new Set<PropertyKey>([
    "pauseProduction",
    "queueForProduction",
    "resumeProduction",
    "unqueueFromProduction",
]);

export class ExclusiveProductionFocusQueueController {
    private lastTelemetrySignature = "";
    private lastTelemetryAt = Number.NEGATIVE_INFINITY;

    constructor(
        private delegate: QueueControllerDelegate,
        private telemetrySink: BuildingEliminationTelemetrySink,
    ) {}

    onAiUpdate(
        context: any,
        threatCache: unknown,
        unitTypeRequests: Map<string, UnitRequestLike>,
        logger: (message: string) => void,
    ): void {
        const decision = deriveExclusiveProductionFocusDecision(
            context.player.production,
            unitTypeRequests,
        );
        if (!decision) {
            this.delegate.onAiUpdate(context, threatCache, unitTypeRequests, logger);
            return;
        }

        const actions = context.player.actions as any;
        const focusedActions = new Proxy(actions, {
            get(target, property) {
                const value = Reflect.get(target, property, target);
                if (blockedNonfocusedQueueMethods.has(property) && typeof value === "function") {
                    return (queue: QueueType, ...args: unknown[]) => queue === decision.focusQueue
                        ? value.call(target, queue, ...args)
                        : undefined;
                }
                return typeof value === "function" ? value.bind(target) : value;
            },
        });
        const focusedPlayer = new Proxy(context.player, {
            get(target, property) {
                if (property === "actions") return focusedActions;
                const value = Reflect.get(target, property, target);
                return typeof value === "function" ? value.bind(target) : value;
            },
        });
        this.delegate.onAiUpdate(
            { ...context, player: focusedPlayer },
            threatCache,
            unitTypeRequests,
            logger,
        );
        for (const queue of decision.pausedQueueTypes) actions.pauseProduction(queue);
        this.emitTelemetry(context.game.getCurrentTick(), decision);
    }

    private emitTelemetry(tick: number, decision: ExclusiveProductionFocusDecision): void {
        const event = {
            schemaVersion: 26,
            event: "exclusive_queue_focus_scheduler",
            tick,
            ...decision,
        } as const;
        const signature = JSON.stringify({ ...event, tick: 0 });
        if (signature === this.lastTelemetrySignature && tick < this.lastTelemetryAt + 300) return;
        this.lastTelemetrySignature = signature;
        this.lastTelemetryAt = tick;
        this.telemetrySink(event);
    }
}
