import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { ActionsApi, GameApi, ProductionApi } from "@chronodivide/game-api";
import { SupalosaBot } from "@supalosa/chronodivide-bot/dist/bot/bot.js";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { DefaultStrategy } from "@supalosa/chronodivide-bot/dist/bot/strategy/defaultStrategy.js";
import { BuildingEliminationTelemetrySink } from
    "@supalosa/chronodivide-bot/dist/bot/logic/mission/missions/buildingEliminationMission.js";
import { BaselineDescriptor } from "./provenance.js";
import { ExclusiveProductionFocusQueueController } from "./exclusiveProductionFocusQueueController.js";

export type InspectableBaselineBot = SupalosaBot & {
    lastGameApi: GameApi | null;
    lastPlayerActions: ActionsApi | null;
    lastPlayerProduction: ProductionApi | null;
};

export type BaselineFactory = {
    descriptor: BaselineDescriptor;
    createDefaultStrategy?(): unknown;
    createDefaultStrategyWithAttackFactory?(attackFactory: unknown): unknown;
    replaceDefaultStrategyAttackFactory?(strategy: unknown, attackFactory: unknown): void;
    create(name: string, country: Countries): InspectableBaselineBot;
    createWithStrategy?(name: string, country: Countries, strategy: unknown): InspectableBaselineBot;
    createWithStrategyAndExclusiveProductionFocus?(
        name: string,
        country: Countries,
        strategy: unknown,
        telemetrySink: BuildingEliminationTelemetrySink,
    ): InspectableBaselineBot;
};

type BotConstructor = typeof SupalosaBot;
type StrategyConstructor = typeof DefaultStrategy;
type QueueControllerConstructor = new () => {
    onAiUpdate(
        context: any,
        threatCache: unknown,
        unitTypeRequests: Map<string, { priority: number; specificLocation: unknown }>,
        logger: (message: string) => void,
    ): void;
};

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
    createDefaultStrategyWithAttackFactory(attackFactory: unknown): unknown {
        const strategy = new DefaultStrategy();
        const record = strategy as unknown as Record<string, unknown>;
        if (!("attackFactory" in record)) throw new Error("Local DefaultStrategy lacks its attack-factory seam");
        record.attackFactory = attackFactory;
        return strategy;
    },
    replaceDefaultStrategyAttackFactory(strategy: unknown, attackFactory: unknown): void {
        const record = strategy as Record<string, unknown>;
        if (!("attackFactory" in record)) throw new Error("Local DefaultStrategy lacks its attack-factory seam");
        record.attackFactory = attackFactory;
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
    const queueControllerModulePath = path.join(
        resolvedRoot,
        "dist",
        "bot",
        "logic",
        "building",
        "queueController.js",
    );
    for (const requiredPath of [
        botModulePath,
        strategyModulePath,
        queueControllerModulePath,
        path.join(resolvedRoot, "package.json"),
    ]) {
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
    const queueControllerModule = (await import(pathToFileURL(queueControllerModulePath).href)) as {
        QueueController: QueueControllerConstructor;
    };
    const ExternalBot = botModule.SupalosaBot;
    const ExternalStrategy = strategyModule.DefaultStrategy;
    const ExternalQueueController = queueControllerModule.QueueController;

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

    class InspectableExternalFocusedBot extends InspectableExternalBot {
        constructor(
            name: string,
            country: Countries,
            strategy: InstanceType<StrategyConstructor>,
            private injectedQueueController: ExclusiveProductionFocusQueueController,
        ) {
            super(name, country, [], false, strategy);
        }

        override onGameStart(game: GameApi): void {
            super.onGameStart(game);
            (this as unknown as { queueController: ExclusiveProductionFocusQueueController }).queueController =
                this.injectedQueueController;
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
        createDefaultStrategyWithAttackFactory(attackFactory: unknown): unknown {
            const strategy = new ExternalStrategy();
            const record = strategy as unknown as Record<string, unknown>;
            if (!("attackFactory" in record)) {
                throw new Error("External DefaultStrategy lacks its pinned attack-factory seam");
            }
            record.attackFactory = attackFactory;
            return strategy;
        },
        replaceDefaultStrategyAttackFactory(strategy: unknown, attackFactory: unknown): void {
            const record = strategy as Record<string, unknown>;
            if (!("attackFactory" in record)) {
                throw new Error("External DefaultStrategy lacks its pinned attack-factory seam");
            }
            record.attackFactory = attackFactory;
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
        createWithStrategyAndExclusiveProductionFocus(
            name: string,
            country: Countries,
            strategy: unknown,
            telemetrySink: BuildingEliminationTelemetrySink,
        ): InspectableBaselineBot {
            return new InspectableExternalFocusedBot(
                name,
                country,
                strategy as InstanceType<StrategyConstructor>,
                new ExclusiveProductionFocusQueueController(new ExternalQueueController(), telemetrySink),
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
