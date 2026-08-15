import { describe, expect, it } from "vitest";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { derivePairedEngineSeed } from "../benchmark/seededOfflineGame.js";
import {
    MISSION_NATIVE_CLOSEOUT_LIVENESS_SMOKE_V35_CELLS,
    MISSION_NATIVE_CLOSEOUT_LIVENESS_SMOKE_V35_ENGINE_SEED_BASE,
} from "../training/missionNativeCloseoutLivenessSmokeV35.js";

describe("mission-native closeout V35 liveness smoke", () => {
    it("freezes one Allied and one Soviet long-route mechanism cell", () => {
        expect(MISSION_NATIVE_CLOSEOUT_LIVENESS_SMOKE_V35_CELLS).toEqual([
            { country: Countries.GERMANY, candidateSlot: 0 },
            { country: Countries.LIBYA, candidateSlot: 0 },
        ]);
    });

    it("uses a fresh valid uint32 seed block", () => {
        for (const index of MISSION_NATIVE_CLOSEOUT_LIVENESS_SMOKE_V35_CELLS.keys()) {
            const seed = derivePairedEngineSeed(
                MISSION_NATIVE_CLOSEOUT_LIVENESS_SMOKE_V35_ENGINE_SEED_BASE,
                index,
            );
            expect(seed).toBeGreaterThanOrEqual(0);
            expect(seed).toBeLessThanOrEqual(0xffff_ffff);
        }
    });
});
