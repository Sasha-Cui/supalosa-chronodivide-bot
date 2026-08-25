import { ApiEvent, GameApi } from "@chronodivide/game-api";
import { InspectableBaselineBot } from "../benchmark/baselineLoader.js";

export type ExternalBaselineLifecycleOverlay<T extends InspectableBaselineBot = InspectableBaselineBot> = {
    afterGameStart?: (game: GameApi, bot: T) => void;
    afterGameTick?: (game: GameApi, bot: T) => void;
    afterGameEvent?: (event: ApiEvent, bot: T) => void;
};

const decorated = new WeakSet<object>();

/** Decorate the pinned baseline without replacing its strategy, queue, missions, or state. */
export const decorateExternalBaselineLifecycle = <T extends InspectableBaselineBot>(
    bot: T,
    overlay: ExternalBaselineLifecycleOverlay<T>,
): T => {
    if (decorated.has(bot)) throw new Error("External baseline lifecycle is already decorated");
    const originalStart = bot.onGameStart.bind(bot);
    const originalTick = bot.onGameTick.bind(bot);
    const originalEvent = bot.onGameEvent.bind(bot);
    bot.onGameStart = (game: GameApi): void => {
        originalStart(game);
        overlay.afterGameStart?.(game, bot);
    };
    bot.onGameTick = (game: GameApi): void => {
        originalTick(game);
        overlay.afterGameTick?.(game, bot);
    };
    bot.onGameEvent = (event: ApiEvent): void => {
        originalEvent(event);
        overlay.afterGameEvent?.(event, bot);
    };
    decorated.add(bot);
    return bot;
};
