import { describe, expect, it } from "vitest";
import { derivePairedEngineSeed } from "../benchmark/seededOfflineGame.js";
import {
    MISSION_NATIVE_CLOSEOUT_V37_OPEN_DEVELOPMENT_COUNTRIES,
    MISSION_NATIVE_CLOSEOUT_V37_OPEN_DEVELOPMENT_ENGINE_SEED_BASE,
    MISSION_NATIVE_CLOSEOUT_V37_OPEN_DEVELOPMENT_FAMILIES,
    MISSION_NATIVE_CLOSEOUT_V37_OPEN_DEVELOPMENT_LAUNCH_COUNT,
    MISSION_NATIVE_CLOSEOUT_V37_OPEN_DEVELOPMENT_SHARD_COUNT,
} from "../training/missionNativeCloseoutOpenDevelopmentV37Campaign.js";
import {
    MissionNativeCloseoutV37PositiveGateInput,
    areMissionNativeCloseoutV37CommitmentsStructurallyEqual,
    evaluateMissionNativeCloseoutV37PositiveGate,
    isMissionNativeCloseoutV37AggregationRevisionAllowed,
} from "../training/missionNativeCloseoutOpenDevelopmentV37Aggregate.js";

const passingGate = (): MissionNativeCloseoutV37PositiveGateInput => ({
    technicalPass: true,
    primaryLowerBound: 0.001,
    wins: 100,
    losses: 40,
    alliedWins: 55,
    alliedLosses: 20,
    sovietWins: 45,
    sovietLosses: 20,
    countriesWithWinsExceedingLosses: 7,
    v37FamilyMacroWinProbability: 0.6,
    externalFamilyMacroWinProbability: 0.4,
    v34FamilyMacroWinProbability: 0.5,
    v37FamilyMacroDrawProbability: 0.1,
    externalFamilyMacroDrawProbability: 0.3,
    v34FamilyMacroDrawProbability: 0.2,
    leaveOneFamilyOutEffects: Array.from({ length: 10 }, () => 0.01),
});

describe("mission-native V37 open development", () => {
    it("freezes ten unique families, nine countries, 90 shards, and 540 launches", () => {
        expect(MISSION_NATIVE_CLOSEOUT_V37_OPEN_DEVELOPMENT_FAMILIES).toHaveLength(10);
        expect(new Set(MISSION_NATIVE_CLOSEOUT_V37_OPEN_DEVELOPMENT_FAMILIES.map(({ familyId }) => familyId)).size)
            .toBe(10);
        expect(new Set(MISSION_NATIVE_CLOSEOUT_V37_OPEN_DEVELOPMENT_FAMILIES.map(({ mapSha256 }) => mapSha256)).size)
            .toBe(10);
        expect(MISSION_NATIVE_CLOSEOUT_V37_OPEN_DEVELOPMENT_FAMILIES.every(({ mapSha256 }) =>
            /^[0-9a-f]{64}$/.test(mapSha256))).toBe(true);
        expect(MISSION_NATIVE_CLOSEOUT_V37_OPEN_DEVELOPMENT_COUNTRIES).toHaveLength(9);
        expect(new Set(MISSION_NATIVE_CLOSEOUT_V37_OPEN_DEVELOPMENT_COUNTRIES).size).toBe(9);
        expect(MISSION_NATIVE_CLOSEOUT_V37_OPEN_DEVELOPMENT_SHARD_COUNT).toBe(90);
        expect(MISSION_NATIVE_CLOSEOUT_V37_OPEN_DEVELOPMENT_LAUNCH_COUNT).toBe(540);
    });

    it("assigns one unique paired engine seed to every family-country shard", () => {
        const seeds = Array.from({ length: MISSION_NATIVE_CLOSEOUT_V37_OPEN_DEVELOPMENT_SHARD_COUNT },
            (_, index) => derivePairedEngineSeed(
                MISSION_NATIVE_CLOSEOUT_V37_OPEN_DEVELOPMENT_ENGINE_SEED_BASE,
                index,
            ));
        expect(new Set(seeds).size).toBe(MISSION_NATIVE_CLOSEOUT_V37_OPEN_DEVELOPMENT_SHARD_COUNT);
        expect(seeds.every((seed) => Number.isSafeInteger(seed) && seed >= 0 && seed <= 0xffff_ffff)).toBe(true);
    });

    it("treats object-key order as irrelevant while preserving structural commitments", () => {
        const campaignArm = { armId: "arm", policy: { schemaVersion: 1, enabled: true }, policyId: "policy" };
        const parsedPlanArm = { armId: "arm", policyId: "policy", policy: { enabled: true, schemaVersion: 1 } };
        expect(areMissionNativeCloseoutV37CommitmentsStructurallyEqual(parsedPlanArm, campaignArm)).toBe(true);
        expect(areMissionNativeCloseoutV37CommitmentsStructurallyEqual(
            { ...parsedPlanArm, policyId: "changed" },
            campaignArm,
        )).toBe(false);
    });

    it("allows only clean-main aggregation repairs descended from the evaluated source", () => {
        const allowed = {
            branch: "main",
            dirty: false,
            campaignSourceIsAncestor: true,
            changedPaths: [
                "packages/chronodivide-bot-driver/src/training/missionNativeCloseoutOpenDevelopmentV37Aggregate.ts",
                "packages/chronodivide-bot-driver/src/test/missionNativeCloseoutOpenDevelopmentV37.test.ts",
            ],
        };
        expect(isMissionNativeCloseoutV37AggregationRevisionAllowed(allowed)).toBe(true);
        expect(isMissionNativeCloseoutV37AggregationRevisionAllowed({ ...allowed, dirty: true })).toBe(false);
        expect(isMissionNativeCloseoutV37AggregationRevisionAllowed({
            ...allowed,
            campaignSourceIsAncestor: false,
        })).toBe(false);
        expect(isMissionNativeCloseoutV37AggregationRevisionAllowed({
            ...allowed,
            changedPaths: [...allowed.changedPaths, "packages/chronodivide-bot/src/bot.ts"],
        })).toBe(false);
    });

    it("advances only when every prespecified positive condition passes", () => {
        const checks = evaluateMissionNativeCloseoutV37PositiveGate(passingGate());
        expect(Object.values(checks).every(Boolean)).toBe(true);
    });

    it("uses strict improvement and fails closed on an incomplete leave-family-out population", () => {
        const boundary = passingGate();
        boundary.primaryLowerBound = 0;
        expect(evaluateMissionNativeCloseoutV37PositiveGate(boundary)
            .primaryFamilyClustered80LowerPairedScoreEffectAboveZero).toBe(false);

        const tiedWins = passingGate();
        tiedWins.wins = tiedWins.losses;
        expect(evaluateMissionNativeCloseoutV37PositiveGate(tiedWins)
            .v37LiteralWinsExceedLossesOverall).toBe(false);

        const sixCountries = passingGate();
        sixCountries.countriesWithWinsExceedingLosses = 6;
        expect(evaluateMissionNativeCloseoutV37PositiveGate(sixCountries)
            .countriesWithV37WinsExceedingLossesAtLeastSeven).toBe(false);

        const incomplete = passingGate();
        incomplete.leaveOneFamilyOutEffects = incomplete.leaveOneFamilyOutEffects.slice(0, 9);
        expect(evaluateMissionNativeCloseoutV37PositiveGate(incomplete)
            .everyLeaveOneFamilyOutPrimaryEffectPositive).toBe(false);
    });
});
