import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { ActionsApi, CreateOfflineOpts, GameApi, ObjectType, cdapi } from "@chronodivide/game-api";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { InspectableBaselineBot, loadBaselineFactory } from "../benchmark/baselineLoader.js";
import { createExperimentManifest } from "../benchmark/provenance.js";
import { derivePairedEngineSeed, withSeededOfflineGame } from "../benchmark/seededOfflineGame.js";
import {
    MethodV5CloseoutTelemetry,
    createMethodV5Candidate,
    methodV5CloseoutPolicySha256,
} from "./methodV5Closeout.js";
import { buildMethodV5CloseoutArms } from "./methodV5CloseoutPolicies.js";
import { METHOD_V5_EQUIVALENCE_MAP_SHA256 } from "./methodV5BaselineEquivalence.js";
import { sha256File } from "./methodV5PlanRunner.js";

export const METHOD_V5_ALL_COUNTRY_SMOKE_MAX_TICKS = 1_800 as const;
export const METHOD_V5_ALL_COUNTRY_SMOKE_ENGINE_SEED_BASE = 3_595_000_000 as const;

type Factory = Awaited<ReturnType<typeof loadBaselineFactory>>;

const requiredPath = (name: string): string => {
    const value = process.env[name];
    if (!value) throw new Error(`${name} is required`);
    return path.resolve(value);
};

const suppressQuit = (bot: InspectableBaselineBot): { attempts: number } => {
    const audit = { attempts: 0 };
    const originalStart = bot.onGameStart.bind(bot);
    bot.onGameStart = (game: GameApi): void => {
        originalStart(game);
        const actions = bot.lastPlayerActions;
        if (!actions) throw new Error(`Missing actions after ${bot.name} onGameStart`);
        Object.defineProperty(actions as ActionsApi, "quitGame", {
            configurable: true,
            writable: true,
            value: (): void => { audit.attempts += 1; },
        });
    };
    return audit;
};

const settings = (
    mapName: string,
    candidate: InspectableBaselineBot,
    baseline: InspectableBaselineBot,
    candidateSlot: 0 | 1,
): CreateOfflineOpts => ({
    buildOffAlly: false,
    cratesAppear: false,
    credits: 10_000,
    gameMode: cdapi.getAvailableGameModes(mapName)[0],
    gameSpeed: 6,
    mapName,
    mcvRepacks: true,
    shortGame: false,
    superWeapons: false,
    unitCount: 0,
    online: false,
    agents: candidateSlot === 0 ? [candidate, baseline] : [baseline, candidate],
});

const runTrial = async (
    factory: Factory,
    mapName: string,
    country: Countries,
    candidateSlot: 0 | 1,
    requestedEngineSeed: number,
): Promise<Record<string, unknown>> => {
    const baseArm = buildMethodV5CloseoutArms().find(({ armId }) => armId === "aggressive_air4");
    if (!baseArm) throw new Error("Method-v5 capability smoke arm is unavailable");
    // This outcome-free technical policy changes only activation thresholds so every
    // country exercises the exact strategy and mission interfaces promptly. It is
    // never an evaluated or selectable scientific arm.
    const smokePolicy = { ...baseArm.policy, minTick: 0, minCombatants: 0 };
    const telemetry: MethodV5CloseoutTelemetry[] = [];
    const candidate = createMethodV5Candidate(
        factory,
        `Candidate_${country}_${candidateSlot}`,
        country,
        smokePolicy,
        (event) => telemetry.push(event),
    );
    const baseline = factory.create(`Baseline_${country}_${candidateSlot}`, country);
    const candidateQuit = suppressQuit(candidate);
    const baselineQuit = suppressQuit(baseline);
    await withSeededOfflineGame(
        cdapi,
        settings(mapName, candidate, baseline, candidateSlot),
        requestedEngineSeed,
        [{ agent: candidate, identity: "candidate" }, { agent: baseline, identity: "baseline" }],
        async (game) => {
            for (let tick = 1; tick <= METHOD_V5_ALL_COUNTRY_SMOKE_MAX_TICKS; tick++) {
                if (game.isFinished()) throw new Error(`All-country smoke ended before tick cap at tick ${tick}`);
                await game.update();
            }
        },
    );
    if (!telemetry.some(({ event }) => event === "activated")) {
        throw new Error(`Method-v5 did not activate for ${country} slot ${candidateSlot}`);
    }
    if (!telemetry.some(({ event }) => event === "capability_request")) {
        throw new Error(`Method-v5 did not exercise capability requests for ${country} slot ${candidateSlot}`);
    }
    const disallowedTelemetryKeys = telemetry.flatMap((event) =>
        Object.keys(event).filter((key) => /(^|_)(id|ids|x|y|rx|ry|location|position)s?$/i.test(key)),
    );
    if (disallowedTelemetryKeys.length > 0) {
        throw new Error(`Method-v5 smoke telemetry leaked locations or identities: ${disallowedTelemetryKeys.join(",")}`);
    }
    if (!candidate.lastGameApi) throw new Error("Candidate game state was not initialized");
    const ownBuildingCount = candidate.lastGameApi.getVisibleUnits(
        candidate.name,
        "self",
        (rules) => rules.type === ObjectType.Building,
    ).length;
    return {
        country,
        candidateSlot,
        requestedEngineSeed,
        baseArmId: baseArm.armId,
        basePolicyId: baseArm.policyId,
        technicalSmokePolicyId: methodV5CloseoutPolicySha256(smokePolicy),
        maxTicks: METHOD_V5_ALL_COUNTRY_SMOKE_MAX_TICKS,
        activatedEvents: telemetry.filter(({ event }) => event === "activated").length,
        capabilityRequestEvents: telemetry.filter(({ event }) => event === "capability_request").length,
        telemetryEventTypes: [...new Set(telemetry.map(({ event }) => event))].sort(),
        candidateQuitAttempts: candidateQuit.attempts,
        baselineQuitAttempts: baselineQuit.attempts,
        finalVisibleOwnBuildingCount: ownBuildingCount,
        outcomeInspected: false,
    };
};

const main = async (): Promise<void> => {
    const repoRoot = path.resolve(process.cwd(), "..", "..");
    const outFile = requiredPath("OUT_FILE");
    if (fs.existsSync(outFile)) throw new Error(`Refusing to overwrite Method-v5 smoke ${outFile}`);
    if (!process.env.BASELINE_PACKAGE_ROOT || process.env.REQUIRE_EXTERNAL_BASELINE !== "true") {
        throw new Error("Method-v5 all-country smoke requires the pinned external baseline");
    }
    const mapName = "simple-1v1-no-preview.map";
    if (sha256File(path.join(process.cwd(), "data", mapName)) !== METHOD_V5_EQUIVALENCE_MAP_SHA256) {
        throw new Error("Method-v5 all-country smoke map bytes drifted");
    }
    const factory = await loadBaselineFactory(path.join(repoRoot, "packages", "chronodivide-bot"));
    const rows: Array<Record<string, unknown>> = [];
    await cdapi.init(path.join(process.cwd(), "data"));
    let seedBlockIndex = 0;
    for (const country of Object.values(Countries)) for (const candidateSlot of [0, 1] as const) {
        rows.push(await runTrial(
            factory,
            mapName,
            country,
            candidateSlot,
            derivePairedEngineSeed(METHOD_V5_ALL_COUNTRY_SMOKE_ENGINE_SEED_BASE, seedBlockIndex++),
        ));
    }
    const manifest = createExperimentManifest({
        runId: `method-v5-all-country-smoke-${process.env.SLURM_JOB_ID ?? "local"}`,
        mixDir: path.join(process.cwd(), "data"),
        maps: [mapName],
        effectiveConfig: {
            purpose: "outcome-free-all-country-strategy-capability-and-production-interface-smoke",
            countries: Object.values(Countries),
            reciprocalSlots: [0, 1],
            maxTicks: METHOD_V5_ALL_COUNTRY_SMOKE_MAX_TICKS,
            shortGame: false,
            endpointAdjudication: false,
            outcomeInspection: false,
        },
        baseline: factory.descriptor,
        gameSeedBase: METHOD_V5_ALL_COUNTRY_SMOKE_ENGINE_SEED_BASE,
    });
    if (
        manifest.scheduler.account !== "pi_jss233" || manifest.source.gitBranch !== "main" ||
        manifest.source.trackedDirty !== false || manifest.software.baseline.kind !== "external-package" ||
        manifest.software.baseline.trackedDirty !== false || rows.length !== 18
    ) throw new Error("Method-v5 all-country smoke provenance or coverage failed");
    const output = {
        schemaVersion: 1,
        status: "PASS_OUTCOME_FREE_METHOD_V5_ALL_COUNTRY_CAPABILITY_SMOKE",
        generatedAt: new Date().toISOString(),
        passed: true,
        outcomeFree: true,
        sourceGitCommit: manifest.source.gitCommit,
        scheduler: manifest.scheduler,
        externalBaseline: manifest.software.baseline,
        countryCount: Object.values(Countries).length,
        reciprocalSlotCount: 2,
        gameCount: rows.length,
        maxTicks: METHOD_V5_ALL_COUNTRY_SMOKE_MAX_TICKS,
        rows,
    };
    fs.mkdirSync(path.dirname(outFile), { recursive: true, mode: 0o700 });
    fs.writeFileSync(outFile, JSON.stringify(output, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({ outFile, sha256: sha256File(outFile), status: output.status, gameCount: rows.length }));
};

const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (import.meta.url === invoked) main().catch((error) => { console.error(error); process.exitCode = 1; });
