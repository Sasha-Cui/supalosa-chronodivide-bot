import { GameApi, UnitData } from "@chronodivide/game-api";

const isEnemyOwnedCombatantUnit = (game: GameApi, playerName: string, unit: UnitData): boolean => {
    if (unit.owner === playerName || game.areAlliedPlayers(playerName, unit.owner)) return false;
    try {
        return game.getPlayerData(unit.owner).isCombatant;
    } catch {
        return false;
    }
};

/**
 * The declared public-complete-state environment interface. This module is
 * deliberately separate from endpoint adjudication and exposes only live
 * game objects owned by an enemy combatant.
 */
export const publicEnemyUnits = (
    game: GameApi,
    playerName: string,
    predicate: (unit: UnitData) => boolean,
): UnitData[] => game.getAllUnits()
    .map((id) => game.getUnitData(id))
    .filter((unit): unit is UnitData =>
        !!unit && isEnemyOwnedCombatantUnit(game, playerName, unit) && predicate(unit),
    );
