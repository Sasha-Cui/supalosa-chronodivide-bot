import { GameApi, ObjectType } from "@chronodivide/game-api";
import type { BuildingLedgerRow, LiteralEndpointCombatants } from "./literalBuildingEliminationEndpoint.js";

/**
 * Evaluation-only candidate snapshot. Not wired into any competitive runner.
 * Unlike getAllUnits(), each player's public self collection excludes removed
 * owned objects, including destroyed leaveRubble objects retained in the world.
 */
export const snapshotLiveOwnedBuildingsCandidate = (
    game: Pick<GameApi, "getVisibleUnits" | "getUnitData">,
    combatants: LiteralEndpointCombatants,
): BuildingLedgerRow[] => {
    const names = Object.values(combatants);
    if (names.some((name) => typeof name !== "string" || name.length === 0) || new Set(names).size !== 2)
        throw new Error("Distinct combatant names required");
    const result = new Map<number, BuildingLedgerRow>();
    for (const owner of names) {
        const ids = game.getVisibleUnits(owner, "self", (rules) => rules.type === ObjectType.Building);
        for (const id of ids) {
            const unit = game.getUnitData(id);
            if (!unit || unit.rules.type !== ObjectType.Building || unit.owner !== owner)
                throw new Error("Live-owned building collection identity mismatch");
            const hp = unit.hitPoints;
            if (typeof hp !== "number" || !Number.isFinite(hp))
                throw new Error("Live-owned building has missing or nonfinite health");
            if (hp <= 0) continue;
            result.set(id, { id, owner, rulesName: unit.rules.name, x: unit.tile.rx, y: unit.tile.ry, hitPoints: hp });
        }
    }
    return [...result.values()].sort((left, right) => left.id - right.id);
};
