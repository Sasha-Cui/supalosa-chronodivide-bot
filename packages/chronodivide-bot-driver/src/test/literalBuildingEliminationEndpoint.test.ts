import { ApiEventType } from "@chronodivide/game-api";
import { describe, expect, test } from "vitest";
import {
    BuildingLedgerRow,
    EndpointEvent,
    evaluateLiteralBuildingUpdate,
} from "../training/literalBuildingEliminationEndpoint.js";

const combatants = { candidate: "Candidate", baseline: "Baseline" } as const;
const established: { candidate: boolean; baseline: boolean } = {
    candidate: true,
    baseline: true,
};

const building = (id: number, owner: string): BuildingLedgerRow => ({
    id,
    owner,
    rulesName: `BUILDING_${id}`,
    x: id,
    y: id + 1,
    hitPoints: 100,
});

const destroyed = (target: number, attackerPlayerName: string | null): EndpointEvent => ({
    type: ApiEventType.ObjectDestroy,
    target,
    attackerPlayerName,
    attackerObjectId: 900,
    weaponName: "TEST_WEAPON",
});

const evaluate = (
    pre: BuildingLedgerRow[],
    post: BuildingLedgerRow[],
    events: EndpointEvent[],
    establishedBeforeUpdate = established,
) =>
    evaluateLiteralBuildingUpdate({
        tick: 100,
        combatants,
        pre,
        post,
        events,
        establishedBeforeUpdate,
    });

describe("literal building-elimination endpoint v4", () => {
    test("credits a candidate only when every final baseline building is physically destroyed", () => {
        const candidateBuilding = building(1, combatants.candidate);
        const baselineBuildings = [building(2, combatants.baseline), building(3, combatants.baseline)];
        const result = evaluate(
            [candidateBuilding, ...baselineBuildings],
            [candidateBuilding],
            [destroyed(2, combatants.candidate), destroyed(3, combatants.candidate)],
        );

        expect(result.status).toBe("candidate_win");
        expect(result.winner).toBe("candidate");
        expect(result.zeroingDispositions.candidate).toHaveLength(2);
        expect(result.zeroingDispositions.candidate.every((row) => row.validPhysicalDestruction)).toBe(true);
    });

    test("does not require the winner to retain a building", () => {
        const baselineBuilding = building(2, combatants.baseline);
        const result = evaluate(
            [baselineBuilding],
            [],
            [destroyed(2, combatants.candidate)],
        );

        expect(result.status).toBe("candidate_win");
        expect(result.preCounts.candidate).toBe(0);
        expect(result.postCounts.candidate).toBe(0);
    });

    test("records a draw when both valid final-building destructions happen in one update", () => {
        const candidateBuilding = building(1, combatants.candidate);
        const baselineBuilding = building(2, combatants.baseline);
        const result = evaluate(
            [candidateBuilding, baselineBuilding],
            [],
            [destroyed(1, combatants.baseline), destroyed(2, combatants.candidate)],
        );

        expect(result.status).toBe("simultaneous_draw");
        expect(result.winner).toBe("draw");
        expect(result.candidatePhysicalWin).toBe(true);
        expect(result.baselinePhysicalWin).toBe(true);
    });

    test("rejects sale or unexplained disappearance as a win", () => {
        const candidateBuilding = building(1, combatants.candidate);
        const baselineBuilding = building(2, combatants.baseline);
        const result = evaluate([candidateBuilding, baselineBuilding], [candidateBuilding], []);

        expect(result.status).toBe("continue");
        expect(result.candidateZeroingTransition).toBe(true);
        expect(result.zeroingDispositions.candidate[0].kind).toBe("unexplained_removal");
    });

    test("rejects capture as a win", () => {
        const candidateBuilding = building(1, combatants.candidate);
        const baselineBuilding = building(2, combatants.baseline);
        const captured = { ...baselineBuilding, owner: combatants.candidate };
        const result = evaluate(
            [candidateBuilding, baselineBuilding],
            [candidateBuilding, captured],
            [{
                type: ApiEventType.ObjectOwnerChange,
                target: 2,
                previousOwnerName: combatants.baseline,
                newOwnerName: combatants.candidate,
            }],
        );

        expect(result.status).toBe("continue");
        expect(result.zeroingDispositions.candidate[0].kind).toBe("owner_change");
    });

    test("does not credit a destroy event when ownership also changes in the zeroing update", () => {
        const candidateBuilding = building(1, combatants.candidate);
        const baselineBuilding = building(2, combatants.baseline);
        const result = evaluate(
            [candidateBuilding, baselineBuilding],
            [candidateBuilding],
            [
                destroyed(2, combatants.candidate),
                {
                    type: ApiEventType.ObjectOwnerChange,
                    target: 2,
                    previousOwnerName: combatants.baseline,
                    newOwnerName: combatants.candidate,
                },
            ],
        );

        expect(result.status).toBe("continue");
        expect(result.zeroingDispositions.candidate[0].kind).toBe("owner_change");
        expect(result.zeroingDispositions.candidate[0].validPhysicalDestruction).toBe(false);
    });

    test("rejects undeploy or cleanup unspawn as a win", () => {
        const candidateBuilding = building(1, combatants.candidate);
        const baselineBuilding = building(2, combatants.baseline);
        const result = evaluate(
            [candidateBuilding, baselineBuilding],
            [candidateBuilding],
            [{ type: ApiEventType.ObjectUnspawn, target: 2 }],
        );

        expect(result.status).toBe("continue");
        expect(result.zeroingDispositions.candidate[0].kind).toBe("unspawn");
    });

    test("rejects self-destruction and unattributed destruction", () => {
        const candidateBuilding = building(1, combatants.candidate);
        const baselineBuilding = building(2, combatants.baseline);
        for (const attacker of [combatants.baseline, null]) {
            const result = evaluate(
                [candidateBuilding, baselineBuilding],
                [candidateBuilding],
                [destroyed(2, attacker)],
            );
            expect(result.status).toBe("continue");
            expect(result.zeroingDispositions.candidate[0].kind).toBe(
                "destroyed_without_opponent_attribution",
            );
        }
    });

    test("allows a later rebuilt building to produce a valid endpoint", () => {
        const candidateBuilding = building(1, combatants.candidate);
        const first = evaluate(
            [candidateBuilding, building(2, combatants.baseline)],
            [candidateBuilding],
            [],
        );
        expect(first.status).toBe("continue");

        const rebuilt = building(4, combatants.baseline);
        const later = evaluate(
            [candidateBuilding, rebuilt],
            [candidateBuilding],
            [destroyed(4, combatants.candidate)],
            first.establishedAfterUpdate,
        );
        expect(later.status).toBe("candidate_win");
    });

    test("does not enable the endpoint before both combatants establish a building", () => {
        const baselineBuilding = building(2, combatants.baseline);
        const result = evaluate(
            [baselineBuilding],
            [],
            [destroyed(2, combatants.candidate)],
            { candidate: false, baseline: true },
        );

        expect(result.enabledBeforeUpdate).toBe(false);
        expect(result.status).toBe("continue");
    });

    test("deduplicates the same event observed through both bots", () => {
        const candidateBuilding = building(1, combatants.candidate);
        const baselineBuilding = building(2, combatants.baseline);
        const event = destroyed(2, combatants.candidate);
        const result = evaluate(
            [candidateBuilding, baselineBuilding],
            [candidateBuilding],
            [event, { ...event }],
        );

        expect(result.status).toBe("candidate_win");
        expect(result.zeroingDispositions.candidate[0].matchedEvents).toHaveLength(1);
    });
});
