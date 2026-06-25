import { GameApi, LandType, PlayerData, Rectangle, TechnoRules, Tile, Vector2 } from "@chronodivide/game-api";
import { GlobalThreat } from "../threat/threat.js";
import { BasicBuilding } from "./basicBuilding.js";
import { getDefaultPlacementLocation } from "./buildingRules.js";

const NAVAL_PLACEMENT_SCAN_RADIUS = 36;
const NAVAL_PRIORITY_SCAN_RADIUS = 24;
const SHORE_SCAN_RADIUS = 3;
const NAVAL_YARD_PRIORITY = 34;
const MIN_WATER_TILES_NEAR_BASE = 12;

export class NavalBuilding extends BasicBuilding {
    getPriority(
        game: GameApi,
        playerData: PlayerData,
        technoRules: TechnoRules,
        _threatCache: GlobalThreat | null,
    ): number {
        const owned = game.getVisibleUnits(playerData.name, "self", (rules) => rules.name === technoRules.name).length;
        if (owned > 0) {
            return -100;
        }
        return this.countWaterTilesNearBase(game, playerData, NAVAL_PRIORITY_SCAN_RADIUS) >= MIN_WATER_TILES_NEAR_BASE
            ? NAVAL_YARD_PRIORITY
            : -100;
    }

    getMaxCount(
        _game: GameApi,
        _playerData: PlayerData,
        _technoRules: TechnoRules,
        _threatCache: GlobalThreat | null,
    ): number | null {
        return 1;
    }

    getPlacementLocation(
        game: GameApi,
        playerData: PlayerData,
        technoRules: TechnoRules,
    ): { rx: number; ry: number } | undefined {
        const anchorPoints = game
            .getVisibleUnits(playerData.name, "self", (rules) => rules.baseNormal)
            .map((id) => game.getGameObjectData(id)?.tile)
            .filter((tile): tile is Tile => !!tile)
            .map((tile) => new Vector2(tile.rx, tile.ry));

        const idealPoint = anchorPoints[0] ?? playerData.startLocation;
        const candidates = anchorPoints.length > 0 ? anchorPoints : [idealPoint];
        const seenTiles = new Set<string>();
        const validTiles: Tile[] = [];

        for (const anchor of candidates) {
            const rect: Rectangle = {
                x: anchor.x - NAVAL_PLACEMENT_SCAN_RADIUS,
                y: anchor.y - NAVAL_PLACEMENT_SCAN_RADIUS,
                width: NAVAL_PLACEMENT_SCAN_RADIUS * 2 + 1,
                height: NAVAL_PLACEMENT_SCAN_RADIUS * 2 + 1,
            };
            for (const tile of game.mapApi.getTilesInRect(rect)) {
                if (seenTiles.has(tile.id) || tile.landType !== LandType.Water) {
                    continue;
                }
                seenTiles.add(tile.id);
                if (game.canPlaceBuilding(playerData.name, technoRules.name, tile)) {
                    validTiles.push(tile);
                }
            }
        }

        const bestTile = validTiles
            .map((tile) => ({ tile, score: this.getPlacementScore(game, idealPoint, tile) }))
            .sort((a, b) => a.score - b.score)[0]?.tile;
        if (bestTile) {
            return bestTile;
        }

        return getDefaultPlacementLocation(game, playerData, idealPoint, technoRules, true, 0);
    }

    private getPlacementScore(game: GameApi, idealPoint: Vector2, tile: Tile): number {
        const point = new Vector2(tile.rx, tile.ry);
        const shorelineBonus = this.hasNearbyLand(game, tile) ? 12 : 0;
        return point.distanceTo(idealPoint) - shorelineBonus;
    }

    private countWaterTilesNearBase(game: GameApi, playerData: PlayerData, radius: number): number {
        const anchors = game
            .getVisibleUnits(playerData.name, "self", (rules) => rules.baseNormal)
            .map((id) => game.getGameObjectData(id)?.tile)
            .filter((tile): tile is Tile => !!tile);
        const points = anchors.length > 0 ? anchors : [game.mapApi.getTile(playerData.startLocation.x, playerData.startLocation.y)].filter((tile): tile is Tile => !!tile);
        const seenTiles = new Set<string>();
        let waterTiles = 0;
        for (const point of points) {
            const rect: Rectangle = {
                x: point.rx - radius,
                y: point.ry - radius,
                width: radius * 2 + 1,
                height: radius * 2 + 1,
            };
            for (const tile of game.mapApi.getTilesInRect(rect)) {
                if (!seenTiles.has(tile.id) && tile.landType === LandType.Water) {
                    seenTiles.add(tile.id);
                    waterTiles++;
                }
            }
        }
        return waterTiles;
    }

    private hasNearbyLand(game: GameApi, tile: Tile): boolean {
        for (let x = tile.rx - SHORE_SCAN_RADIUS; x <= tile.rx + SHORE_SCAN_RADIUS; x++) {
            for (let y = tile.ry - SHORE_SCAN_RADIUS; y <= tile.ry + SHORE_SCAN_RADIUS; y++) {
                const nearby = game.mapApi.getTile(x, y);
                if (nearby && nearby.landType !== LandType.Water) {
                    return true;
                }
            }
        }
        return false;
    }
}
