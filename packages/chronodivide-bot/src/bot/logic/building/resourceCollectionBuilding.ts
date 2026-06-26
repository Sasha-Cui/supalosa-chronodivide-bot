import { Box2, BuildingPlacementData, GameApi, GameMath, PlayerData, TechnoRules, Tile, Vector2 } from "@chronodivide/game-api";
import { GlobalThreat } from "../threat/threat.js";
import { BasicBuilding } from "./basicBuilding.js";
import { getAdjacencyTiles, getDefaultPlacementLocation } from "./buildingRules.js";
import { getCachedTechnoRules } from "../common/rulesCache.js";

const NO_REFINERY_DISTANCE = 10;
const REFINERY_HARD_LIMIT = 6;
const ORE_SCAN_RADIUS = 14;
const ORE_SCAN_RADIUS_SQUARED = ORE_SCAN_RADIUS * ORE_SCAN_RADIUS;
const GEM_WEIGHT = 2.5;
const ORE_SPAWN_WEIGHT = 8;
const MIN_REFINERY_SPACING = 11;
const MIN_REFINERY_SPACING_SQUARED = MIN_REFINERY_SPACING * MIN_REFINERY_SPACING;
const REFINERY_CLUSTER_PENALTY = 20;

const distanceSquared = (a: Vector2, b: Vector2): number => {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return dx * dx + dy * dy;
};

export class ResourceCollectionBuilding extends BasicBuilding {
    constructor(basePriority: number, maxNeeded: number, onlyBuildWhenFloatingCreditsAmount?: number) {
        super(basePriority, maxNeeded, onlyBuildWhenFloatingCreditsAmount);
    }

    getPlacementLocation(
        game: GameApi,
        playerData: PlayerData,
        technoRules: TechnoRules,
    ): { rx: number; ry: number } | undefined {
        const conyardVectors = this.getConyardVectors(game, playerData);
        if (conyardVectors.length === 0) {
            return undefined;
        }

        const placementData = game.getBuildingPlacementData(technoRules.name);
        if (!placementData) {
            return this.getFallbackPlacementLocation(game, playerData, technoRules, conyardVectors);
        }

        const placementCandidates = getAdjacencyTiles(game, playerData, technoRules, false, 1).filter((tile) =>
            game.canPlaceBuilding(playerData.name, technoRules.name, tile),
        );
        if (placementCandidates.length === 0) {
            return undefined;
        }

        const resourceTiles = game.mapApi
            .getAllTilesResourceData()
            .filter((resourceData) => resourceData.spawnsOre || resourceData.ore > 0 || resourceData.gems > 0);
        if (resourceTiles.length === 0) {
            return this.getFallbackPlacementLocation(game, playerData, technoRules, conyardVectors);
        }

        const refineryVectors = this.getOwnedRefineryVectors(game, playerData);
        const best = placementCandidates
            .map((tile) => ({
                tile,
                score: this.scoreRefineryPlacement(tile, placementData, conyardVectors, refineryVectors, resourceTiles),
            }))
            .sort((a, b) => a.score - b.score)[0]?.tile;

        return best ? { rx: best.rx, ry: best.ry } : undefined;
    }

    private getConyardVectors(game: GameApi, playerData: PlayerData): Vector2[] {
        return game
            .getVisibleUnits(playerData.name, "self", (r) => r.constructionYard)
            .map((r) => game.getGameObjectData(r)?.tile)
            .filter((t): t is Tile => !!t)
            .map((t) => new Vector2(t.rx, t.ry));
    }

    private getOwnedRefineryVectors(game: GameApi, playerData: PlayerData): Vector2[] {
        return game
            .getVisibleUnits(playerData.name, "self", (r) => r.refinery)
            .map((r) => game.getGameObjectData(r)?.tile)
            .filter((t): t is Tile => !!t)
            .map((t) => new Vector2(t.rx, t.ry));
    }

    private getFallbackPlacementLocation(
        game: GameApi,
        playerData: PlayerData,
        technoRules: TechnoRules,
        conyardVectors: Vector2[],
    ): { rx: number; ry: number } | undefined {
        var closeOre: Tile | undefined;
        var closeOreDist: number | undefined;
        let selectedLocation: Vector2 = conyardVectors[0];

        for (const conyard of conyardVectors) {
            const allTileResourceData = game.mapApi.getAllTilesResourceData();
            for (const tileResourceData of allTileResourceData) {
                if (tileResourceData.spawnsOre) {
                    const dist = GameMath.sqrt(
                        (conyard.x - tileResourceData.tile.rx) ** 2 + (conyard.y - tileResourceData.tile.ry) ** 2,
                    );
                    if (closeOreDist === undefined || dist < closeOreDist) {
                        closeOreDist = dist;
                        closeOre = tileResourceData.tile;
                    }
                }
            }
        }
        if (closeOre) {
            selectedLocation = new Vector2(closeOre.rx, closeOre.ry);
        }
        return getDefaultPlacementLocation(game, playerData, selectedLocation, technoRules);
    }

    private scoreRefineryPlacement(
        tile: Tile,
        placementData: BuildingPlacementData,
        conyardVectors: Vector2[],
        refineryVectors: Vector2[],
        resourceTiles: ReturnType<GameApi["mapApi"]["getAllTilesResourceData"]>,
    ): number {
        const center = new Vector2(
            tile.rx + (placementData.foundation.width - 1) / 2,
            tile.ry + (placementData.foundation.height - 1) / 2,
        );
        const nearestConyardDistance = GameMath.sqrt(
            Math.min(...conyardVectors.map((conyard) => distanceSquared(center, conyard))),
        );

        let oreScore = 0;
        let nearestOreDistanceSquared = Number.POSITIVE_INFINITY;
        for (const resourceData of resourceTiles) {
            const resourcePoint = new Vector2(resourceData.tile.rx, resourceData.tile.ry);
            const resourceDistanceSquared = distanceSquared(center, resourcePoint);
            nearestOreDistanceSquared = Math.min(nearestOreDistanceSquared, resourceDistanceSquared);
            if (resourceDistanceSquared > ORE_SCAN_RADIUS_SQUARED) {
                continue;
            }
            const distance = GameMath.sqrt(resourceDistanceSquared);
            const resourceValue =
                resourceData.ore + resourceData.gems * GEM_WEIGHT + (resourceData.spawnsOre ? ORE_SPAWN_WEIGHT : 0);
            oreScore += resourceValue / (1 + distance * 0.35);
        }

        const nearestOreDistance = GameMath.sqrt(nearestOreDistanceSquared);
        const refineryPenalty = refineryVectors.reduce((penalty, refinery) => {
            const spacingSquared = distanceSquared(center, refinery);
            if (spacingSquared >= MIN_REFINERY_SPACING_SQUARED) {
                return penalty;
            }
            const spacing = GameMath.sqrt(spacingSquared);
            return penalty + (MIN_REFINERY_SPACING - spacing) * REFINERY_CLUSTER_PENALTY;
        }, 0);

        return nearestOreDistance * 4 + nearestConyardDistance * 0.35 + refineryPenalty - oreScore * 3;
    }

    // Don't build/start selling these if we don't have any harvesters
    getMaxCount(
        game: GameApi,
        playerData: PlayerData,
        technoRules: TechnoRules,
        threatCache: GlobalThreat | null,
    ): number | null {
        const harvesters = game.getVisibleUnits(playerData.name, "self", (r) => r.harvester).length;
        // if there is no refinery within distance of a conyard, that conyard wants an expansion
        const conyardBoxes = game
            .getVisibleUnits(playerData.name, "self", (r) => r.constructionYard)
            .map((r) => game.getGameObjectData(r)?.tile)
            .filter((t): t is Tile => !!t)
            .map((t) => new Vector2(t.rx, t.ry))
            .map((v) => new Box2(v.clone().subScalar(NO_REFINERY_DISTANCE), v.clone().addScalar(NO_REFINERY_DISTANCE)));
        const conyardsWithRefineries = conyardBoxes
            .map((b) => game.getUnitsInArea(b))
            .filter((unitIds) => unitIds.some((unitId) => getCachedTechnoRules(game, unitId)?.refinery));
        const conyardsWithoutRefineries = conyardBoxes.length - conyardsWithRefineries.length;

        return Math.max(1, Math.min(REFINERY_HARD_LIMIT, 2 * harvesters * (conyardsWithoutRefineries + 1)));
    }
}
