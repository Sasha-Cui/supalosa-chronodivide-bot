import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { BaselineFactory, InspectableBaselineBot } from "../benchmark/baselineLoader.js";
import {
    ProgressCertifiedConversionPolicyV5,
    validateProgressCertifiedConversionPolicyV5,
} from "./progressCertifiedConversionPolicyV5.js";
import { TerminalObjectiveStrategy, TerminalObjectiveTelemetry } from "./terminalObjectiveStrategy.js";
import {
    StagnationAssaultPolicy,
    StagnationAssaultStrategy,
    StagnationAssaultTelemetry,
    validateStagnationAssaultPolicy,
} from "./stagnationAssaultStrategy.js";

type StrategyLike = { onAiUpdate(context: unknown, missionController: unknown, logger: unknown): unknown };

export const createStagnationAssaultCandidate = (
    factory: BaselineFactory,
    name: string,
    country: Countries,
    rawV5Policy: ProgressCertifiedConversionPolicyV5,
    rawAssaultPolicy: StagnationAssaultPolicy,
    telemetry: {
        v5: (event: TerminalObjectiveTelemetry) => void;
        assault: (event: StagnationAssaultTelemetry) => void;
    } = { v5: () => undefined, assault: () => undefined },
): InspectableBaselineBot => {
    const v5 = validateProgressCertifiedConversionPolicyV5(rawV5Policy);
    const assault = validateStagnationAssaultPolicy(rawAssaultPolicy);
    if (!v5.enabled && !assault.enabled) return factory.create(name, country);
    if (!factory.createDefaultStrategy || !factory.createWithStrategy) {
        throw new Error("Pinned baseline lacks the stagnation-assault strategy interface");
    }
    const exact = factory.createDefaultStrategy();
    if (!exact || typeof (exact as StrategyLike).onAiUpdate !== "function") {
        throw new Error("Pinned baseline DefaultStrategy does not expose onAiUpdate");
    }
    const withAssault: StrategyLike = assault.enabled
        ? new StagnationAssaultStrategy(exact as never, country, assault, telemetry.assault) as unknown as StrategyLike
        : exact as StrategyLike;
    const outer: StrategyLike = v5.enabled
        ? new TerminalObjectiveStrategy(
            withAssault as never,
            country,
            v5,
            telemetry.v5,
            "strict_literal_endpoint_base_race",
        ) as unknown as StrategyLike
        : withAssault;
    return factory.createWithStrategy(name, country, outer as never);
};
