import { describe, expect, it } from "vitest";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { derivePairedEngineSeed } from "../benchmark/seededOfflineGame.js";
import {
    MISSION_NATIVE_CLOSEOUT_ALL_COUNTRY_GATE_V33_COUNTRIES,
    MISSION_NATIVE_CLOSEOUT_ALL_COUNTRY_GATE_V33_ENGINE_SEED_BASE,
    MissionNativeCloseoutAllCountryV33CoverageRow,
    validateMissionNativeCloseoutAllCountryV33Coverage,
} from "../training/missionNativeCloseoutAllCountryGateV33.js";

const validRows = (): MissionNativeCloseoutAllCountryV33CoverageRow[] =>
    MISSION_NATIVE_CLOSEOUT_ALL_COUNTRY_GATE_V33_COUNTRIES.flatMap((country) =>
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
            productionReservationEventCount: 0,
        })),
    );

describe("mission-native closeout all-country gate v33", () => {
    it("freezes all nine countries and both reciprocal slots", () => {
        expect(MISSION_NATIVE_CLOSEOUT_ALL_COUNTRY_GATE_V33_COUNTRIES).toEqual([
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
        expect(validateMissionNativeCloseoutAllCountryV33Coverage(validRows())).toEqual([]);
    });

    it("keeps every country-slot seed inside the engine uint32 domain", () => {
        for (const index of validRows().keys()) {
            const seed = derivePairedEngineSeed(
                MISSION_NATIVE_CLOSEOUT_ALL_COUNTRY_GATE_V33_ENGINE_SEED_BASE,
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
        expect(validateMissionNativeCloseoutAllCountryV33Coverage(rows)).toEqual(expect.arrayContaining([
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
        expect(validateMissionNativeCloseoutAllCountryV33Coverage(rows)).toEqual(expect.arrayContaining([
            "Soviet rows never exposed preterminal composition blocking",
            "slot 1 rows never exposed preterminal composition blocking",
        ]));
    });

    it("requires certified post-block conversion across both factions and slots", () => {
        const rows = validRows().map((row) => row.country === Countries.USA && row.candidateSlot === 0
            ? row
            : { ...row, buildingDamage: 0 });
        expect(validateMissionNativeCloseoutAllCountryV33Coverage(rows)).toEqual(expect.arrayContaining([
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
        expect(validateMissionNativeCloseoutAllCountryV33Coverage(rows)).toEqual(expect.arrayContaining([
            "Allied rows never converted a composition block into certified building damage",
            "Soviet rows never converted a composition block into certified building damage",
        ]));
    });

    it("fails closed on destructive reservation or missing ready screen infrastructure", () => {
        const reservation = validRows().map((row, index) => index === 0
            ? { ...row, productionReservationEventCount: 1 }
            : row);
        expect(validateMissionNativeCloseoutAllCountryV33Coverage(reservation)).toContain(
            "V33 emitted destructive production-reservation telemetry",
        );
        const noSovietInfrastructure = validRows().map((row) => ({
            ...row,
            screenInfrastructureReadyCount: [
                Countries.LIBYA, Countries.IRAQ, Countries.CUBA, Countries.RUSSIA,
            ].includes(row.country) ? 0 : row.screenInfrastructureReadyCount,
        }));
        expect(validateMissionNativeCloseoutAllCountryV33Coverage(noSovietInfrastructure)).toContain(
            "Soviet rows never observed ready screen infrastructure NAHAND",
        );
    });

    it("requires active queue-safe focus across factions and reciprocal slots", () => {
        const rows = validRows().map((row) => row.country === Countries.USA && row.candidateSlot === 0
            ? row
            : { ...row, productionFocusActiveCount: 0 });
        expect(validateMissionNativeCloseoutAllCountryV33Coverage(rows)).toEqual(expect.arrayContaining([
            "Soviet rows never activated queue-safe production focus",
            "slot 1 rows never activated queue-safe production focus",
        ]));
    });

    it("requires runtime adapter execution across factions and reciprocal slots", () => {
        const rows = validRows().map((row) => row.country === Countries.USA && row.candidateSlot === 0
            ? row
            : { ...row, exclusiveSchedulerEventCount: 0 });
        expect(validateMissionNativeCloseoutAllCountryV33Coverage(rows)).toEqual(expect.arrayContaining([
            "Soviet rows never executed the external queue-controller focus adapter",
            "slot 1 rows never executed the external queue-controller focus adapter",
        ]));
    });

    it("does not require construction when side-correct screen infrastructure already exists", () => {
        const rows = validRows().map((row) => ({
            ...row,
            screenInfrastructureRequestedCount: 0,
        }));
        expect(validateMissionNativeCloseoutAllCountryV33Coverage(rows)).toEqual(
            [],
        );
    });
});
