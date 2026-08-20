import { ActionsApi, GameApi, ProductionApi } from "@chronodivide/game-api";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { StrongBot, StrongBotOptions } from "@supalosa/chronodivide-bot/dist/bot/strongBot.js";
import { StrongStrategy, StrongStrategyOptions } from "@supalosa/chronodivide-bot/dist/bot/strategy/strongStrategy.js";

export type InspectableDeployedStrongBot = StrongBot & {
    lastGameApi: GameApi | null;
    lastPlayerActions: ActionsApi | null;
    lastPlayerProduction: ProductionApi | null;
};

export const createDeployedStrongBotCandidate = (
    name: string,
    country: Countries,
    strategyOptions: StrongStrategyOptions = {},
    botOptions: StrongBotOptions = {},
): InspectableDeployedStrongBot => {
    class Inspectable extends StrongBot {
        public lastGameApi: GameApi | null = null;
        public lastPlayerActions: ActionsApi | null = null;
        public lastPlayerProduction: ProductionApi | null = null;
        override onGameStart(game: GameApi): void {
            this.lastGameApi = game;
            this.lastPlayerActions = this.player.actions;
            this.lastPlayerProduction = this.player.production;
            super.onGameStart(game);
        }
        override onGameTick(game: GameApi): void {
            this.lastGameApi = game;
            super.onGameTick(game);
        }
    }
    return new Inspectable(name, country, [], false, new StrongStrategy(strategyOptions), botOptions);
};
