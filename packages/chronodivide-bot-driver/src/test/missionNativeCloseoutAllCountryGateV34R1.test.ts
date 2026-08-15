import { describe, expect, it } from "vitest";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { derivePairedEngineSeed } from "../benchmark/seededOfflineGame.js";
import {
    MISSION_NATIVE_CLOSEOUT_ALL_COUNTRY_GATE_V34_R1_COUNTRIES,
    MISSION_NATIVE_CLOSEOUT_ALL_COUNTRY_GATE_V34_R1_ENGINE_SEED_BASE,
    MissionNativeCloseoutAllCountryV34R1CoverageRow,
    validateMissionNativeCloseoutAllCountryV34R1Coverage,
    validateMissionNativeCloseoutV34R1ObjectiveRaceTelemetry,
    validateMissionNativeCloseoutV34R1QuitAudits,
} from "../training/missionNativeCloseoutAllCountryGateV34R1.js";

const validRows = (): MissionNativeCloseoutAllCountryV34R1CoverageRow[] =>
    MISSION_NATIVE_CLOSEOUT_ALL_COUNTRY_GATE_V34_R1_COUNTRIES.flatMap((country) =>
        ([0, 1] as const).map((candidateSlot) => ({
            country,
            candidateSlot,
            passed: true,
            preterminalCompositionBlockedEvaluationCount: 1,
            firstPreterminalCompositionBlockedTick: 2_700,
            capabilityLaunchCount: 1,
            launchTick: 3_600,
            launchCompositionReady: true,
            launchEnemyBuildingCount: 5,
            launchObjectiveBypassesComposition: false,
            launchHandoffCount: 1,
            buildingDamage: 100,
            screenInfrastructureEventCount: 1,
            screenInfrastructureRequestedCount: 0,
            screenInfrastructureReadyCount: 1,
            screenInfrastructureNames: [
                Countries.LIBYA, Countries.IRAQ, Countries.CUBA, Countries.RUSSIA,
            ].includes(country) ? ["NAHAND"] : ["GAPILE"],
            productionFocusEventCount: 2,
            productionFocusActiveCount: 1,
            exclusiveSchedulerEventCount: 1,
            exclusiveSchedulerPausedQueueCount: 1,
            exclusiveSchedulerDeferredQueueCount: 3,
            exclusiveSchedulerReadyQueueCount: 1,
            objectiveRaceAllocationEventCount: 2,
            boundedBlockerAllocationEventCount: 1,
            terminalPriorityEventCount: 0,
            productionReservationEventCount: 0,
        })),
    );

describe("mission-native closeout all-country gate v34-r1", () => {
    it("freezes all nine countries and both reciprocal slots", () => {
        expect(MISSION_NATIVE_CLOSEOUT_ALL_COUNTRY_GATE_V34_R1_COUNTRIES).toEqual([
            Countries.USA,
            Countries.KOREA,
            Countries.FRANCE,
            Countries.GERMANY,
            Countries.GREAT_BRITAIN,
            Countries.LIBYA,
            Countries.IRAQ,
            Countries.CUBA,
            Countries.RUSSIA,
        ]);
        expect(validateMissionNativeCloseoutAllCountryV34R1Coverage(validRows())).toEqual([]);
    });

    it("keeps every country-slot seed inside the engine uint32 domain", () => {
        for (const index of validRows().keys()) {
            const seed = derivePairedEngineSeed(
                MISSION_NATIVE_CLOSEOUT_ALL_COUNTRY_GATE_V34_R1_ENGINE_SEED_BASE,
                index,
            );
            expect(seed).toBeGreaterThanOrEqual(0);
            expect(seed).toBeLessThanOrEqual(0xffff_ffff);
        }
    });

    it("fails closed on a missing reciprocal cell", () => {
        const rows = validRows().filter((row) =>
            row.country !== Countries.GERMANY || row.candidateSlot !== 1,
        );
        expect(validateMissionNativeCloseoutAllCountryV34R1Coverage(rows)).toEqual(expect.arrayContaining([
            expect.stringMatching(/exactly 18/),
            expect.stringMatching(/Germans slot 1/),
        ]));
    });

    it("requires composition-block exposure across both factions and slots", () => {
        const rows = validRows().map((row) => ({
            ...row,
            preterminalCompositionBlockedEvaluationCount:
                row.country === Countries.USA && row.candidateSlot === 0 ? 1 : 0,
            firstPreterminalCompositionBlockedTick:
                row.country === Countries.USA && row.candidateSlot === 0 ? 2_700 : null,
        }));
        expect(validateMissionNativeCloseoutAllCountryV34R1Coverage(rows)).toEqual(expect.arrayContaining([
            "Soviet rows never exposed preterminal composition blocking",
            "slot 1 rows never exposed preterminal composition blocking",
        ]));
    });

    it("requires certified post-block conversion across both factions and slots", () => {
        const rows = validRows().map((row) => row.country === Countries.USA && row.candidateSlot === 0
            ? row
            : { ...row, buildingDamage: 0 });
        expect(validateMissionNativeCloseoutAllCountryV34R1Coverage(rows)).toEqual(expect.arrayContaining([
            "Soviet rows never converted a composition block into certified building damage",
            "slot 1 rows never converted a composition block into certified building damage",
        ]));
    });

    it("does not count a terminal composition bypass as a certified post-block conversion", () => {
        const rows = validRows().map((row) => ({
            ...row,
            launchCompositionReady: false,
            launchEnemyBuildingCount: 1,
            launchObjectiveBypassesComposition: true,
        }));
        expect(validateMissionNativeCloseoutAllCountryV34R1Coverage(rows)).toEqual(expect.arrayContaining([
            "Allied rows never converted a composition block into certified building damage",
            "Soviet rows never converted a composition block into certified building damage",
        ]));
    });

    it("fails closed on destructive reservation or missing ready screen infrastructure", () => {
        const reservation = validRows().map((row, index) => index === 0
            ? { ...row, productionReservationEventCount: 1 }
            : row);
        expect(validateMissionNativeCloseoutAllCountryV34R1Coverage(reservation)).toContain(
            "V34-R1 emitted destructive production-reservation telemetry",
        );
        const noSovietInfrastructure = validRows().map((row) => ({
            ...row,
            screenInfrastructureReadyCount: [
                Countries.LIBYA, Countries.IRAQ, Countries.CUBA, Countries.RUSSIA,
            ].includes(row.country) ? 0 : row.screenInfrastructureReadyCount,
        }));
        expect(validateMissionNativeCloseoutAllCountryV34R1Coverage(noSovietInfrastructure)).toContain(
            "Soviet rows never observed ready screen infrastructure NAHAND",
        );
    });

    it("requires active queue-safe focus across factions and reciprocal slots", () => {
        const rows = validRows().map((row) => row.country === Countries.USA && row.candidateSlot === 0
            ? row
            : { ...row, productionFocusActiveCount: 0 });
        expect(validateMissionNativeCloseoutAllCountryV34R1Coverage(rows)).toEqual(expect.arrayContaining([
            "Soviet rows never activated queue-safe production focus",
            "slot 1 rows never activated queue-safe production focus",
        ]));
    });

    it("requires runtime adapter execution across factions and reciprocal slots", () => {
        const rows = validRows().map((row) => row.country === Countries.USA && row.candidateSlot === 0
            ? row
            : { ...row, exclusiveSchedulerEventCount: 0 });
        expect(validateMissionNativeCloseoutAllCountryV34R1Coverage(rows)).toEqual(expect.arrayContaining([
            "Soviet rows never executed the external queue-controller focus adapter",
            "slot 1 rows never executed the external queue-controller focus adapter",
        ]));
    });

    it("requires objective-race and bounded-blocker execution across factions and slots", () => {
        const rows = validRows().map((row) => row.country === Countries.USA && row.candidateSlot === 0
            ? row
            : {
                ...row,
                objectiveRaceAllocationEventCount: 0,
                boundedBlockerAllocationEventCount: 0,
            });
        expect(validateMissionNativeCloseoutAllCountryV34R1Coverage(rows)).toEqual(expect.arrayContaining([
            "Soviet rows never executed objective-race allocation",
            "slot 1 rows never executed objective-race allocation",
            "Soviet rows never exercised bounded blocker clearance",
            "slot 1 rows never exercised bounded blocker clearance",
        ]));
    });

    it("accepts a full-force terminal strike and a bounded nonterminal blocker screen", () => {
        expect(() => validateMissionNativeCloseoutV34R1ObjectiveRaceTelemetry([
            {
                schemaVersion: 4, event: "engagement_allocation", tick: 100, targetId: 1,
                targetName: "NAPOWR", blockerId: null, blockerName: null,
                assignedAttackerCount: 6, buildingAttackerCount: 6, blockerAttackerCount: 0,
                inRangeBuildingAttackerCount: 0,
            },
            {
                schemaVersion: 27, event: "objective_race_allocation", tick: 100, targetId: 1,
                targetName: "NAPOWR", remainingEnemyBuildingCount: 1, terminalPriorityActive: true,
                allocationMode: "boundedScreen", blockerId: null, assignedAttackerCount: 6,
                buildingAttackerCount: 6, blockerAttackerCount: 0,
            },
            {
                schemaVersion: 4, event: "engagement_allocation", tick: 200, targetId: 2,
                targetName: "NAHAND", blockerId: 9, blockerName: "E2",
                assignedAttackerCount: 7, buildingAttackerCount: 4, blockerAttackerCount: 3,
                inRangeBuildingAttackerCount: 0,
            },
            {
                schemaVersion: 27, event: "objective_race_allocation", tick: 200, targetId: 2,
                targetName: "NAHAND", remainingEnemyBuildingCount: 4, terminalPriorityActive: false,
                allocationMode: "boundedScreen", blockerId: 9, assignedAttackerCount: 7,
                buildingAttackerCount: 4, blockerAttackerCount: 3,
            },
        ] as any)).not.toThrow();
    });

    it("rejects an all-force blocker diversion and a partial feasible terminal strike", () => {
        expect(() => validateMissionNativeCloseoutV34R1ObjectiveRaceTelemetry([
            {
                schemaVersion: 4, event: "engagement_allocation", tick: 100, targetId: 1,
                targetName: "NAHAND", blockerId: 9, blockerName: "E2",
                assignedAttackerCount: 6, buildingAttackerCount: 0, blockerAttackerCount: 6,
                inRangeBuildingAttackerCount: 0,
            },
            {
                schemaVersion: 27, event: "objective_race_allocation", tick: 100, targetId: 1,
                targetName: "NAHAND", remainingEnemyBuildingCount: 4, terminalPriorityActive: false,
                allocationMode: "boundedScreen", blockerId: 9, assignedAttackerCount: 6,
                buildingAttackerCount: 0, blockerAttackerCount: 6,
            },
        ] as any)).toThrow("consumed more than the bounded screen");
        expect(() => validateMissionNativeCloseoutV34R1ObjectiveRaceTelemetry([
            {
                schemaVersion: 4, event: "engagement_allocation", tick: 200, targetId: 2,
                targetName: "NAPOWR", blockerId: null, blockerName: null,
                assignedAttackerCount: 6, buildingAttackerCount: 5, blockerAttackerCount: 1,
                inRangeBuildingAttackerCount: 0,
            },
            {
                schemaVersion: 27, event: "objective_race_allocation", tick: 200, targetId: 2,
                targetName: "NAPOWR", remainingEnemyBuildingCount: 1, terminalPriorityActive: true,
                allocationMode: "boundedScreen", blockerId: null, assignedAttackerCount: 6,
                buildingAttackerCount: 5, blockerAttackerCount: 1,
            },
        ] as any)).toThrow("full compatible force");
    });

    it("allows per-tick objective audits beyond change-throttled allocation telemetry", () => {
        expect(() => validateMissionNativeCloseoutV34R1ObjectiveRaceTelemetry([
            {
                schemaVersion: 4, event: "engagement_allocation", tick: 100, targetId: 1,
                targetName: "NAHAND", blockerId: 9, blockerName: "E2",
                assignedAttackerCount: 7, buildingAttackerCount: 4, blockerAttackerCount: 3,
                inRangeBuildingAttackerCount: 0,
            },
            {
                schemaVersion: 27, event: "objective_race_allocation", tick: 100, targetId: 1,
                targetName: "NAHAND", remainingEnemyBuildingCount: 4, terminalPriorityActive: false,
                allocationMode: "boundedScreen", blockerId: 9, assignedAttackerCount: 7,
                buildingAttackerCount: 4, blockerAttackerCount: 3,
            },
            {
                schemaVersion: 27, event: "objective_race_allocation", tick: 101, targetId: 1,
                targetName: "NAHAND", remainingEnemyBuildingCount: 4, terminalPriorityActive: false,
                allocationMode: "boundedScreen", blockerId: 9, assignedAttackerCount: 7,
                buildingAttackerCount: 4, blockerAttackerCount: 3,
            },
        ] as any)).not.toThrow();
    });

    it("requires every throttled allocation event to have an exact objective audit", () => {
        expect(() => validateMissionNativeCloseoutV34R1ObjectiveRaceTelemetry([
            {
                schemaVersion: 4, event: "engagement_allocation", tick: 100, targetId: 1,
                targetName: "NAHAND", blockerId: 9, blockerName: "E2",
                assignedAttackerCount: 7, buildingAttackerCount: 4, blockerAttackerCount: 3,
                inRangeBuildingAttackerCount: 0,
            },
        ] as any)).toThrow("did not cover a throttled live allocation");
    });

    it("permits matched control resignations but forbids enabled-policy resignations", () => {
        expect(validateMissionNativeCloseoutV34R1QuitAudits(
            { candidate: 59, baseline: 0 },
            { candidate: 59, baseline: 0 },
            { candidate: 0, baseline: 0 },
            { candidate: 0, baseline: 0 },
        )).toEqual([]);
        expect(validateMissionNativeCloseoutV34R1QuitAudits(
            { candidate: 59, baseline: 0 },
            { candidate: 0, baseline: 0 },
            { candidate: 0, baseline: 0 },
            { candidate: 0, baseline: 0 },
        )).toContain("direct and disabled control resignation audits differ");
        expect(validateMissionNativeCloseoutV34R1QuitAudits(
            { candidate: 0, baseline: 0 },
            { candidate: 0, baseline: 0 },
            { candidate: 1, baseline: 0 },
            { candidate: 0, baseline: 0 },
        )).toContain("first: enabled resignation attempt");
    });

    it("does not require construction when side-correct screen infrastructure already exists", () => {
        const rows = validRows().map((row) => ({
            ...row,
            screenInfrastructureRequestedCount: 0,
        }));
        expect(validateMissionNativeCloseoutAllCountryV34R1Coverage(rows)).toEqual(
            [],
        );
    });
});
