import { GameApi, PlayerData, TechnoRules, Tile, Vector2 } from "@chronodivide/game-api";
import { BasicBuilding } from "./basicBuilding.js";
import { getDefaultPlacementLocation } from "./buildingRules.js";

export class NavalBuilding extends BasicBuilding {
    getPlacementLocation(
        game: GameApi,
        playerData: PlayerData,
        technoRules: TechnoRules,
    ): { rx: number; ry: number } | undefined {
        const conyardVectors = game
            .getVisibleUnits(playerData.name, "self", (rules) => rules.constructionYard)
            .map((id) => game.getGameObjectData(id)?.tile)
            .filter((tile): tile is Tile => !!tile)
            .map((tile) => new Vector2(tile.rx, tile.ry));

        const idealPoint = conyardVectors[0] ?? playerData.startLocation;
        return getDefaultPlacementLocation(game, playerData, idealPoint, technoRules, true, 0);
    }
}
