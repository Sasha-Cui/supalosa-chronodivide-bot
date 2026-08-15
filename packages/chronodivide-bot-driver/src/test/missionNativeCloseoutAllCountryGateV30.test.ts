import { describe, expect, it } from "vitest";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { derivePairedEngineSeed } from "../benchmark/seededOfflineGame.js";
import {
    MISSION_NATIVE_CLOSEOUT_ALL_COUNTRY_GATE_V30_COUNTRIES,
    MISSION_NATIVE_CLOSEOUT_ALL_COUNTRY_GATE_V30_ENGINE_SEED_BASE,
    MissionNativeCloseoutAllCountryV30CoverageRow,
    validateMissionNativeCloseoutAllCountryV30Coverage,
} from "../training/missionNativeCloseoutAllCountryGateV30.js";

const validRows = (): MissionNativeCloseoutAllCountryV30CoverageRow[] =>
    MISSION_NATIVE_CLOSEOUT_ALL_COUNTRY_GATE_V30_COUNTRIES.flatMap((country) =>
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
            screenInfrastructureRequestedCount: [
                Countries.LIBYA, Countries.IRAQ, Countries.CUBA, Countries.RUSSIA,
            ].includes(country) ? 1 : 0,
            screenInfrastructureNames: [
                Countries.LIBYA, Countries.IRAQ, Countries.CUBA, Countries.RUSSIA,
            ].includes(country) ? ["NAHAND"] : ["GAPILE"],
            productionReservationEventCount: 0,
        })),
    );

describe("mission-native closeout all-country gate v30", () => {
    it("freezes all nine countries and both reciprocal slots", () => {
        expect(MISSION_NATIVE_CLOSEOUT_ALL_COUNTRY_GATE_V30_COUNTRIES).toEqual([
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
        expect(validateMissionNativeCloseoutAllCountryV30Coverage(validRows())).toEqual([]);
    });

    it("keeps every country-slot seed inside the engine uint32 domain", () => {
        for (const index of validRows().keys()) {
            const seed = derivePairedEngineSeed(
                MISSION_NATIVE_CLOSEOUT_ALL_COUNTRY_GATE_V30_ENGINE_SEED_BASE,
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
        expect(validateMissionNativeCloseoutAllCountryV30Coverage(rows)).toEqual(expect.arrayContaining([
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
        expect(validateMissionNativeCloseoutAllCountryV30Coverage(rows)).toEqual(expect.arrayContaining([
            "Soviet rows never exposed preterminal composition blocking",
            "slot 1 rows never exposed preterminal composition blocking",
        ]));
    });

    it("requires certified post-block conversion across both factions and slots", () => {
        const rows = validRows().map((row) => row.country === Countries.USA && row.candidateSlot === 0
            ? row
            : { ...row, buildingDamage: 0 });
        expect(validateMissionNativeCloseoutAllCountryV30Coverage(rows)).toEqual(expect.arrayContaining([
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
        expect(validateMissionNativeCloseoutAllCountryV30Coverage(rows)).toEqual(expect.arrayContaining([
            "Allied rows never converted a composition block into certified building damage",
            "Soviet rows never converted a composition block into certified building damage",
        ]));
    });

    it("fails closed on destructive reservation or missing Soviet barracks requests", () => {
        const reservation = validRows().map((row, index) => index === 0
            ? { ...row, productionReservationEventCount: 1 }
            : row);
        expect(validateMissionNativeCloseoutAllCountryV30Coverage(reservation)).toContain(
            "V30 emitted destructive production-reservation telemetry",
        );
        const noSovietRequest = validRows().map((row) => ({
            ...row,
            screenInfrastructureRequestedCount: 0,
        }));
        expect(validateMissionNativeCloseoutAllCountryV30Coverage(noSovietRequest)).toContain(
            "Soviet rows never requested missing screen infrastructure",
        );
    });
});
