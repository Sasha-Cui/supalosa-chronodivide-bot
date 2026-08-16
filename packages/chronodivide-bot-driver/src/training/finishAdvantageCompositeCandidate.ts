import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { BaselineFactory, InspectableBaselineBot } from "../benchmark/baselineLoader.js";
import {
    ProgressCertifiedConversionPolicyV5,
    validateProgressCertifiedConversionPolicyV5,
} from "./progressCertifiedConversionPolicyV5.js";
import { FinishAdvantagePolicy, validateFinishAdvantagePolicy } from "./finishAdvantagePolicy.js";
import { FinishAdvantageStrategy, FinishAdvantageTelemetry } from "./finishAdvantageStrategy.js";
import { TerminalObjectiveStrategy, TerminalObjectiveTelemetry } from "./terminalObjectiveStrategy.js";
import {
    TERMINAL_BASE_RACE_MODES,
    TerminalBaseRaceMode,
} from "./terminalBaseRaceGuard.js";

type StrategyLike = {
    onAiUpdate(context: unknown, missionController: unknown, logger: unknown): unknown;
};

export type FinishAdvantageCompositeTelemetry = {
    v5: (event: TerminalObjectiveTelemetry) => void;
    finishAdvantage: (event: FinishAdvantageTelemetry) => void;
};

export type FinishAdvantageCompositeOptions = {
    terminalBaseRaceMode: TerminalBaseRaceMode;
};

export const createFinishAdvantageCompositeCandidate = (
    factory: BaselineFactory,
    name: string,
    country: Countries,
    rawV5Policy: ProgressCertifiedConversionPolicyV5,
    rawFinishPolicy: FinishAdvantagePolicy,
    options: FinishAdvantageCompositeOptions,
    telemetry: FinishAdvantageCompositeTelemetry = {
        v5: () => undefined,
        finishAdvantage: () => undefined,
    },
): InspectableBaselineBot => {
    const v5Policy = validateProgressCertifiedConversionPolicyV5(rawV5Policy);
    const finishPolicy = validateFinishAdvantagePolicy(rawFinishPolicy);
    if (!TERMINAL_BASE_RACE_MODES.includes(options.terminalBaseRaceMode)) {
        throw new Error("Finish-advantage composite terminal base-race mode is invalid");
    }
    if (!v5Policy.enabled && !finishPolicy.enabled) return factory.create(name, country);
    if (!factory.createDefaultStrategy || !factory.createWithStrategy) {
        throw new Error("Pinned baseline lacks the finish-advantage composite strategy interface");
    }
    const defaultStrategy = factory.createDefaultStrategy();
    if (!defaultStrategy || typeof (defaultStrategy as StrategyLike).onAiUpdate !== "function") {
        throw new Error("Pinned baseline DefaultStrategy does not expose onAiUpdate");
    }
    const finishInner: StrategyLike = finishPolicy.enabled
        ? new FinishAdvantageStrategy(
            defaultStrategy as never,
            country,
            finishPolicy,
            telemetry.finishAdvantage,
        ) as unknown as StrategyLike
        : defaultStrategy as StrategyLike;
    const outer: StrategyLike = v5Policy.enabled
        ? new TerminalObjectiveStrategy(
            finishInner as never,
            country,
            v5Policy,
            telemetry.v5,
            options.terminalBaseRaceMode,
        ) as unknown as StrategyLike
        : finishInner;
    return factory.createWithStrategy(name, country, outer as never);
};
