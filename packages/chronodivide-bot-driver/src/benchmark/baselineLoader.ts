import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { ActionsApi, GameApi, ProductionApi } from "@chronodivide/game-api";
import { SupalosaBot } from "@supalosa/chronodivide-bot/dist/bot/bot.js";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { DefaultStrategy } from "@supalosa/chronodivide-bot/dist/bot/strategy/defaultStrategy.js";
import { BaselineDescriptor } from "./provenance.js";

export type InspectableBaselineBot = SupalosaBot & {
    lastGameApi: GameApi | null;
    lastPlayerActions: ActionsApi | null;
    lastPlayerProduction: ProductionApi | null;
};

export type BaselineFactory = {
    descriptor: BaselineDescriptor;
    createDefaultStrategy?(): unknown;
    create(name: string, country: Countries): InspectableBaselineBot;
    createWithStrategy?(name: string, country: Countries, strategy: unknown): InspectableBaselineBot;
};

type BotConstructor = typeof SupalosaBot;
type StrategyConstructor = typeof DefaultStrategy;

const parseBoolValue = (raw: string | undefined): boolean => {
    if (!raw) {
        return false;
    }
    return ["1", "true", "yes", "on"].includes(raw.toLowerCase());
};

const localFactory = (packageRoot: string): BaselineFactory => ({
    descriptor: {
        kind: "local-shared-package",
        packageRoot,
    },
    createDefaultStrategy(): unknown {
        return new DefaultStrategy();
    },
    create(name: string, country: Countries): InspectableBaselineBot {
        class InspectableLocalBot extends SupalosaBot {
            public lastGameApi: GameApi | null = null;
            public lastPlayerActions: any = null;
            public lastPlayerProduction: any = null;

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
        return new InspectableLocalBot(name, country, [], false, new DefaultStrategy());
    },
    createWithStrategy(name: string, country: Countries, strategy: unknown): InspectableBaselineBot {
        class InspectableLocalBot extends SupalosaBot {
            public lastGameApi: GameApi | null = null;
            public lastPlayerActions: any = null;
            public lastPlayerProduction: any = null;

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
        return new InspectableLocalBot(
            name,
            country,
            [],
            false,
            strategy as InstanceType<StrategyConstructor>,
        );
    },
});

const externalFactory = async (packageRoot: string): Promise<BaselineFactory> => {
    const resolvedRoot = path.resolve(packageRoot);
    const botModulePath = path.join(resolvedRoot, "dist", "bot", "bot.js");
    const strategyModulePath = path.join(resolvedRoot, "dist", "bot", "strategy", "defaultStrategy.js");
    for (const requiredPath of [botModulePath, strategyModulePath, path.join(resolvedRoot, "package.json")]) {
        if (!fs.existsSync(requiredPath)) {
            throw new Error(
                `External baseline is incomplete: ${requiredPath} is missing. Build the pinned clean checkout before evaluation.`,
            );
        }
    }

    const botModule = (await import(pathToFileURL(botModulePath).href)) as { SupalosaBot: BotConstructor };
    const strategyModule = (await import(pathToFileURL(strategyModulePath).href)) as {
        DefaultStrategy: StrategyConstructor;
    };
    const ExternalBot = botModule.SupalosaBot;
    const ExternalStrategy = strategyModule.DefaultStrategy;

    class InspectableExternalBot extends ExternalBot {
        public lastGameApi: GameApi | null = null;
        public lastPlayerActions: any = null;
        public lastPlayerProduction: any = null;

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

    return {
        descriptor: {
            kind: "external-package",
            packageRoot: resolvedRoot,
        },
        createDefaultStrategy(): unknown {
            return new ExternalStrategy();
        },
        create(name: string, country: Countries): InspectableBaselineBot {
            return new InspectableExternalBot(
                name,
                country,
                [],
                false,
                new ExternalStrategy(),
            ) as InspectableBaselineBot;
        },
        createWithStrategy(name: string, country: Countries, strategy: unknown): InspectableBaselineBot {
            return new InspectableExternalBot(
                name,
                country,
                [],
                false,
                strategy as InstanceType<StrategyConstructor>,
            ) as InspectableBaselineBot;
        },
    };
};

export const loadBaselineFactory = async (localPackageRoot: string): Promise<BaselineFactory> => {
    const externalRoot = process.env.BASELINE_PACKAGE_ROOT;
    const requireExternal = parseBoolValue(process.env.REQUIRE_EXTERNAL_BASELINE);
    if (externalRoot) {
        return externalFactory(externalRoot);
    }
    if (requireExternal) {
        throw new Error(
            "REQUIRE_EXTERNAL_BASELINE=true but BASELINE_PACKAGE_ROOT is unset. " +
                "A local shared-package baseline is invalid for confirmatory evaluation.",
        );
    }
    return localFactory(localPackageRoot);
};
