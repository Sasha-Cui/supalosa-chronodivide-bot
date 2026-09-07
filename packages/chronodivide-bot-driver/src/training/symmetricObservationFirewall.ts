import {
    Bot,
    GameApi,
    GameObjectData,
    PlayerData,
    TechnoRules,
    UnitData,
} from "@chronodivide/game-api";

export type SymmetricObservationMode = "api_full_state" | "fog_respecting";

export type ObservationFirewallAudit = {
    mode: SymmetricObservationMode;
    viewer: string;
    hiddenObjectQueries: number;
    filteredObjectIds: number;
    foreignVisibilityQueries: number;
    redactedPlayerFieldReads: number;
    unclassifiedQueries: number;
};

export type SymmetricObservationViews = {
    mode: SymmetricObservationMode;
    views: Readonly<Record<string, GameApi>>;
    getAudit: (viewer: string) => ObservationFirewallAudit;
};

type AnyRecord = Record<PropertyKey, unknown>;

const PLAYER_PUBLIC_FIELDS = new Set<PropertyKey>([
    "name",
    "country",
    "startLocation",
    "isObserver",
    "isAi",
    "isCombatant",
]);

const shallowUnitCopy = <T extends GameObjectData>(value: T): T =>
    Object.freeze({ ...value }) as T;

const ownPlayerCopy = (value: PlayerData): PlayerData => Object.freeze({
    ...value,
    power: Object.freeze({ ...value.power }),
});

const redactedPlayerCopy = (
    value: PlayerData,
    audit: ObservationFirewallAudit,
): PlayerData => new Proxy({} as PlayerData, {
    get: (_target, property) => {
        if (!PLAYER_PUBLIC_FIELDS.has(property)) {
            audit.redactedPlayerFieldReads += 1;
            throw new Error("Fog-respecting opponent PlayerData field is private: " + String(property));
        }
        return Reflect.get(value as unknown as AnyRecord, property);
    },
    set: () => false,
    deleteProperty: () => false,
    ownKeys: () => [...PLAYER_PUBLIC_FIELDS].filter((value): value is string =>
        typeof value === "string"),
    getOwnPropertyDescriptor: (_target, property) => PLAYER_PUBLIC_FIELDS.has(property)
        ? { configurable: true, enumerable: true }
        : undefined,
});

const bind = <T extends (...args: any[]) => any>(target: object, value: T): T =>
    value.bind(target) as T;

const createFogView = (
    game: GameApi,
    viewer: string,
    audit: ObservationFirewallAudit,
): GameApi => {
    let visibilityTick = Number.NaN;
    let visibleIds = new Set<number>();
    const refreshVisibility = (): Set<number> => {
        const tick = game.getCurrentTick();
        if (tick !== visibilityTick) {
            visibilityTick = tick;
            visibleIds = new Set([
                ...game.getVisibleUnits(viewer, "allied"),
                ...game.getVisibleUnits(viewer, "hostile"),
            ]);
        }
        return visibleIds;
    };
    const filterIds = (ids: readonly number[]): number[] => {
        const allowed = refreshVisibility();
        const result = ids.filter((id) => allowed.has(id));
        audit.filteredObjectIds += ids.length - result.length;
        return result;
    };
    const visibleObject = (id: number): GameObjectData | undefined => {
        if (!refreshVisibility().has(id)) {
            audit.hiddenObjectQueries += 1;
            return undefined;
        }
        const value = game.getGameObjectData(id);
        return value ? shallowUnitCopy(value) : undefined;
    };
    const visibleUnit = (id: number): UnitData | undefined => {
        if (!refreshVisibility().has(id)) {
            audit.hiddenObjectQueries += 1;
            return undefined;
        }
        const value = game.getUnitData(id);
        return value ? shallowUnitCopy(value) : undefined;
    };
    const assertViewer = (name: string): void => {
        if (name !== viewer) {
            audit.foreignVisibilityQueries += 1;
            throw new Error("Fog-respecting visibility query is bound to " + viewer);
        }
    };
    const assertOwnOrAllied = (name: string): void => {
        if (name !== viewer && !game.areAlliedPlayers(viewer, name)) {
            audit.foreignVisibilityQueries += 1;
            throw new Error("Fog-respecting private player query is forbidden");
        }
    };
    const map = new Proxy(game.map as unknown as AnyRecord, {
        get: (target, property) => {
            if (property === "getObjectsOnTile") {
                return (...args: unknown[]) =>
                    filterIds((game.map.getObjectsOnTile as any)(...args));
            }
            if (property === "isVisibleTile") {
                return (tile: unknown, name: string, elevation?: number) => {
                    assertViewer(name);
                    return (game.map.isVisibleTile as any)(tile, viewer, elevation);
                };
            }
            if ([
                "getRealMapSize",
                "getStartingLocations",
                "getTheaterType",
                "getTile",
                "getTilesInRect",
                "hasBridgeOnTile",
                "hasHighBridgeOnTile",
                "isPassableTile",
                "findPath",
                "getReachabilityMap",
                "getTileResourceData",
                "getAllTilesResourceData",
            ].includes(String(property))) {
                const value = Reflect.get(target, property, game.map);
                if (typeof value !== "function") {
                    audit.unclassifiedQueries += 1;
                    throw new Error("Fog-respecting MapApi member changed type");
                }
                return bind(game.map, value as (...args: any[]) => any);
            }
            if (property === "constructor") return Reflect.get(target, property, game.map);
            if (typeof property === "symbol") return Reflect.get(target, property, game.map);
            audit.unclassifiedQueries += 1;
            throw new Error("Fog-respecting MapApi member is unclassified: " + String(property));
        },
        set: () => false,
        deleteProperty: () => false,
    });
    const methods: AnyRecord = {
        isPlayerDefeated: (name: string) => game.isPlayerDefeated(name),
        areAlliedPlayers: (left: string, right: string) => game.areAlliedPlayers(left, right),
        canPlaceBuilding: (name: string, ...args: unknown[]) => {
            assertOwnOrAllied(name);
            return (game.canPlaceBuilding as any)(name, ...args);
        },
        getBuildingPlacementData: bind(game, game.getBuildingPlacementData),
        getPlayers: () => [...game.getPlayers()],
        getPlayerData: (name: string): PlayerData => {
            const value = game.getPlayerData(name);
            return name === viewer || game.areAlliedPlayers(viewer, name)
                ? ownPlayerCopy(value)
                : redactedPlayerCopy(value, audit);
        },
        getAllTerrainObjects: () => [...game.getAllTerrainObjects()],
        getAllUnits: (filter?: (rules: TechnoRules) => boolean): number[] =>
            filterIds(game.getAllUnits()).filter((id) => {
                if (!filter) return true;
                const value = game.getUnitData(id);
                return !!value && filter(value.rules);
            }),
        getNeutralUnits: (filter?: (rules: TechnoRules) => boolean): number[] =>
            filterIds(game.getNeutralUnits()).filter((id) => {
                if (!filter) return true;
                const value = game.getUnitData(id);
                return !!value && filter(value.rules);
            }),
        getUnitsInArea: (...args: unknown[]) =>
            filterIds((game.getUnitsInArea as any)(...args)),
        getVisibleUnits: (
            name: string,
            relation: "self" | "allied" | "hostile" | "enemy",
            filter?: (rules: TechnoRules) => boolean,
        ): number[] => {
            assertViewer(name);
            return [...game.getVisibleUnits(viewer, relation, filter)];
        },
        getGameObjectData: visibleObject,
        getUnitData: visibleUnit,
        getAllSuperWeaponData: () => game.getAllSuperWeaponData()
            .filter((value) =>
                value.playerName === viewer ||
                game.areAlliedPlayers(viewer, value.playerName))
            .map((value) => Object.freeze({ ...value })),
        getGeneralRules: bind(game, game.getGeneralRules),
        getRulesIni: bind(game, game.getRulesIni),
        getArtIni: bind(game, game.getArtIni),
        getAiIni: bind(game, game.getAiIni),
        generateRandomInt: bind(game, game.generateRandomInt),
        generateRandom: bind(game, game.generateRandom),
        getTickRate: bind(game, game.getTickRate),
        getBaseTickRate: bind(game, game.getBaseTickRate),
        getCurrentTick: bind(game, game.getCurrentTick),
        getCurrentTime: bind(game, game.getCurrentTime),
    };
    return new Proxy(game as unknown as AnyRecord, {
        get: (target, property) => {
            if (property === "map" || property === "mapApi") return map;
            if (property === "rules" || property === "rulesApi") return game.rules;
            if (Object.prototype.hasOwnProperty.call(methods, property)) return methods[property];
            if (property === "constructor") return Reflect.get(target, property, game);
            if (typeof property === "symbol") return Reflect.get(target, property, game);
            audit.unclassifiedQueries += 1;
            throw new Error("Fog-respecting GameApi member is unclassified: " + String(property));
        },
        set: () => false,
        deleteProperty: () => false,
    }) as unknown as GameApi;
};

export const createSymmetricObservationViews = (
    game: GameApi,
    players: readonly string[],
    mode: SymmetricObservationMode,
): SymmetricObservationViews => {
    if (!["api_full_state", "fog_respecting"].includes(mode)) {
        throw new Error("Observation firewall mode is invalid");
    }
    if (players.length < 2 || new Set(players).size !== players.length) {
        throw new Error("Observation firewall player identities are invalid");
    }
    const audits = new Map<string, ObservationFirewallAudit>();
    const views = Object.fromEntries(players.map((viewer) => {
        const audit: ObservationFirewallAudit = {
            mode,
            viewer,
            hiddenObjectQueries: 0,
            filteredObjectIds: 0,
            foreignVisibilityQueries: 0,
            redactedPlayerFieldReads: 0,
            unclassifiedQueries: 0,
        };
        audits.set(viewer, audit);
        return [viewer, mode === "api_full_state" ? game : createFogView(game, viewer, audit)];
    }));
    return {
        mode,
        views,
        getAudit: (viewer: string) => {
            const value = audits.get(viewer);
            if (!value) throw new Error("Observation firewall viewer is unknown");
            return structuredClone(value);
        },
    };
};

export const installSymmetricObservationFirewall = (
    bots: readonly Bot[],
    mode: SymmetricObservationMode,
): void => {
    if (bots.length < 2 || new Set(bots.map((bot) => bot.name)).size !== bots.length) {
        throw new Error("Observation firewall bot identities are invalid");
    }
    const cache = new WeakMap<GameApi, SymmetricObservationViews>();
    const view = (game: GameApi, name: string): GameApi => {
        let value = cache.get(game);
        if (!value) {
            value = createSymmetricObservationViews(game, bots.map((bot) => bot.name), mode);
            cache.set(game, value);
        }
        const result = value.views[name];
        if (!result) throw new Error("Observation firewall view is unavailable");
        return result;
    };
    for (const bot of bots) {
        const init = bot.onGameInit.bind(bot);
        const start = bot.onGameStart.bind(bot);
        const tick = bot.onGameTick.bind(bot);
        const event = bot.onGameEvent.bind(bot);
        bot.onGameInit = (game) => init(view(game, bot.name));
        bot.onGameStart = (game) => start(view(game, bot.name));
        bot.onGameTick = (game) => tick(view(game, bot.name));
        bot.onGameEvent = (value, game) => event(value, view(game, bot.name));
    }
};
