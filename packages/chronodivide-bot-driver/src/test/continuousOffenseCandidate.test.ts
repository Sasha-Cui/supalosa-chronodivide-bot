import { describe, expect, it } from "vitest";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import {
    FROZEN_MACRO_CHAMPION_POLICY,
    FROZEN_MACRO_CHAMPION_POLICY_ID,
    createContinuousOffenseChampionCandidate,
} from "../training/continuousOffenseCandidate.js";
import { buildContinuousOffensePolicy } from "../training/continuousOffensePolicy.js";
import {
    buildResearchBotOptions,
    buildResearchStrategyOptions,
    researchPolicySha256,
} from "../training/researchPolicy.js";

describe("continuous-offense champion candidate", () => {
    it("pins the exact trained macro champion and disables map-specific tuning", () => {
        expect(researchPolicySha256(FROZEN_MACRO_CHAMPION_POLICY))
            .toBe(FROZEN_MACRO_CHAMPION_POLICY_ID);
        expect(buildResearchStrategyOptions(FROZEN_MACRO_CHAMPION_POLICY).defaultMapProfiles)
            .toBe(false);
        expect(buildResearchBotOptions(FROZEN_MACRO_CHAMPION_POLICY).exactMapTactics)
            .toBe(false);
    });

    it("constructs an inspectable local champion for the literal endpoint", () => {
        const candidate = createContinuousOffenseChampionCandidate(
            "candidate",
            Countries.USA,
            buildContinuousOffensePolicy(),
        );
        expect(candidate.name).toBe("candidate");
        expect(candidate.lastGameApi).toBeNull();
        expect(candidate.lastPlayerActions).toBeNull();
        expect(candidate.lastPlayerProduction).toBeNull();
    });

    it("supports a macro-only causal control without constructing an objective overlay", () => {
        const candidate = createContinuousOffenseChampionCandidate(
            "macro-control",
            Countries.IRAQ,
            buildContinuousOffensePolicy({ enabled: false }),
        );
        expect(candidate.name).toBe("macro-control");
    });
});
