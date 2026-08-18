import { Bot, CreateOfflineOpts, cdapi } from "@chronodivide/game-api";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { loadBaselineFactory } from "../benchmark/baselineLoader.js";
import { createExperimentManifest } from "../benchmark/provenance.js";
import { withSeededOfflineGame } from "../benchmark/seededOfflineGame.js";
import { buildProgressCertifiedConversionPolicyV5 } from "./progressCertifiedConversionPolicyV5.js";
import { createStagnationAssaultCandidate } from "./stagnationAssaultCandidate.js";
import {
    STAGNATION_ASSAULT_MECHANISM,
    StagnationAssaultTelemetry,
    buildStagnationAssaultPolicy,
    stagnationAssaultPolicySha256,
} from "./stagnationAssaultStrategy.js";

const COUNTRIES = [
    Countries.USA, Countries.KOREA, Countries.FRANCE, Countries.GERMANY, Countries.GREAT_BRITAIN,
    Countries.LIBYA, Countries.IRAQ, Countries.CUBA, Countries.RUSSIA,
] as const;
const ALLIED = new Set<Countries>(COUNTRIES.slice(0, 5));
const MAP_NAME = "cd_chrono_offensedefense.map";
const MAP_SHA256 = "94043927a79a30df9394ac6d6195e0d2926863fdad9c412556d0cc7af409f11a";
const SEED_BASE = 4_227_190_000;
const MAX_TICKS = 24_000;
const SHA256 = /^[0-9a-f]{64}$/;
const hash = (value: unknown): string => crypto.createHash("sha256")
    .update(JSON.stringify(value)).digest("hex");
const fileHash = (filePath: string): string => crypto.createHash("sha256")
    .update(fs.readFileSync(filePath)).digest("hex");
const requiredPath = (name: string): string => {
    const value = process.env[name];
    if (!value) throw new Error(`${name} is required`);
    return path.resolve(value);
};
const requiredSha = (name: string): string => {
    const value = process.env[name];
    if (!value || !SHA256.test(value)) throw new Error(`${name} is invalid`);
    return value;
};

const settings = (candidate: Bot, baseline: Bot, candidateSlot: 0 | 1): CreateOfflineOpts => {
    const gameMode = cdapi.getAvailableGameModes(MAP_NAME)[0];
    if (!gameMode) throw new Error(`No game mode is available for ${MAP_NAME}`);
    return {
        buildOffAlly: false,
        cratesAppear: false,
        credits: 10_000,
        gameMode,
        gameSpeed: 6,
        mapName: MAP_NAME,
        mcvRepacks: true,
        shortGame: false,
        superWeapons: false,
        unitCount: 0,
        online: false,
        agents: candidateSlot === 0 ? [candidate, baseline] : [baseline, candidate],
    };
};

const validateTelemetry = (events: readonly StagnationAssaultTelemetry[]): void => {
    for (const [index, event] of events.entries()) {
        if (
            event.schemaVersion !== 1 || event.event !== "stagnation_assault_observation" ||
            event.informationBoundary !== "public_complete_state" ||
            event.mechanism !== STAGNATION_ASSAULT_MECHANISM ||
            !Number.isSafeInteger(event.tick) || event.tick < 0 ||
            !Number.isSafeInteger(event.enemyBuildingCount) || event.enemyBuildingCount < 0 ||
            !Number.isSafeInteger(event.lastBuildingProgressTick) || event.lastBuildingProgressTick < 0 ||
            event.ticksSinceBuildingProgress !== event.tick - event.lastBuildingProgressTick ||
            !Number.isSafeInteger(event.activeAssaultMissionCount) ||
            event.activeAssaultMissionCount < 0 || event.activeAssaultMissionCount > 1 ||
            event.missionCreated && !event.triggerEligible ||
            event.triggerEligible && event.tick < 9_000 ||
            event.triggerEligible && event.ticksSinceBuildingProgress < 3_000 ||
            event.missionPrefix !== "stagnation_assault" ||
            event.minimumUnits !== 8 || event.maximumUnits !== 16 ||
            !Array.isArray(event.forbiddenFieldsEmitted) || event.forbiddenFieldsEmitted.length !== 0
        ) throw new Error(`Stagnation-assault telemetry ${index} is invalid`);
        const expected = ALLIED.has(event.country) ? { MTNK: 5, FV: 1 } : { HTNK: 5, HTK: 1 };
        if (JSON.stringify(event.requestedComposition) !== JSON.stringify(expected)) {
            throw new Error(`Stagnation-assault telemetry ${index} has the wrong faction composition`);
        }
        if (/(winner|loser|score|outcome|endpoint|resignation|evaluator)/i.test(JSON.stringify(event))) {
            throw new Error(`Stagnation-assault telemetry ${index} contains a forbidden field`);
        }
    }
};

const runRepeat = async (
    factory: Awaited<ReturnType<typeof loadBaselineFactory>>,
    country: Countries,
    countryOrdinal: number,
    candidateSlot: 0 | 1,
): Promise<StagnationAssaultTelemetry[]> => {
    const events: StagnationAssaultTelemetry[] = [];
    const candidateName = `StagnationGateCandidate_${countryOrdinal}_${candidateSlot}`;
    const baselineName = `StagnationGateBaseline_${countryOrdinal}_${candidateSlot}`;
    const candidate = createStagnationAssaultCandidate(
        factory,
        candidateName,
        country,
        buildProgressCertifiedConversionPolicyV5(),
        buildStagnationAssaultPolicy("early_strong"),
        { v5: () => undefined, assault: (event) => events.push(event) },
    );
    const baseline = factory.create(baselineName, country);
    await withSeededOfflineGame(
        cdapi,
        settings(candidate, baseline, candidateSlot),
        SEED_BASE + countryOrdinal,
        [{ agent: candidate, identity: "candidate" }, { agent: baseline, identity: "baseline" }],
        async (game) => {
            for (let tick = 0; tick < MAX_TICKS && !game.isFinished(); tick += 1) await game.update();
        },
    );
    validateTelemetry(events);
    return events;
};

const main = async (): Promise<void> => {
    if (process.env.SLURM_JOB_ACCOUNT !== "pi_jss233" || !process.env.SLURM_JOB_ID) {
        throw new Error("Stagnation-assault compatibility gate requires Slurm account pi_jss233");
    }
    if (!process.env.BASELINE_PACKAGE_ROOT || process.env.REQUIRE_EXTERNAL_BASELINE !== "true") {
        throw new Error("Stagnation-assault compatibility gate requires the pinned external baseline");
    }
    const outFile = requiredPath("OUT_FILE");
    const protocolPath = requiredPath("PROTOCOL_PATH");
    const programPath = requiredPath("PROGRAM_PATH");
    const protocolSha256 = requiredSha("PROTOCOL_SHA256");
    const programSha256 = requiredSha("PROGRAM_SHA256");
    if (fs.existsSync(outFile)) throw new Error(`Refusing to overwrite ${outFile}`);
    if (fileHash(protocolPath) !== protocolSha256 || fileHash(programPath) !== programSha256) {
        throw new Error("Stagnation-assault gate program or protocol drifted");
    }
    const repoRoot = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
    const driverRoot = path.join(repoRoot, "packages", "chronodivide-bot-driver");
    if (path.resolve(process.cwd()) !== driverRoot) throw new Error(`Gate must start in ${driverRoot}`);
    const sourceCommit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    if (
        execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim() !== "main" ||
        execFileSync("git", ["status", "--short", "--untracked-files=no"], { encoding: "utf8" }).trim() !== "" ||
        execFileSync("git", ["rev-parse", "fork/main"], { encoding: "utf8" }).trim() !== sourceCommit ||
        fileHash(path.join(driverRoot, "data", MAP_NAME)) !== MAP_SHA256
    ) throw new Error("Stagnation-assault gate source or map contract failed");

    await cdapi.init(path.join(driverRoot, "data"));
    const factory = await loadBaselineFactory(path.join(repoRoot, "packages", "chronodivide-bot"));
    const policy = buildStagnationAssaultPolicy("early_strong");
    const manifest = createExperimentManifest({
        runId: `stagnation-assault-compatibility-${process.env.SLURM_JOB_ID}`,
        mixDir: path.join(driverRoot, "data"),
        maps: [MAP_NAME],
        effectiveConfig: {
            purpose: "outcome-blind-stagnation-assault-compatibility-v1",
            countries: COUNTRIES,
            candidateSlots: [0, 1],
            deterministicRepeats: 2,
            seedBase: SEED_BASE,
            maxTicks: MAX_TICKS,
            policy,
            policySha256: stagnationAssaultPolicySha256(policy),
            outcomeFieldsWritten: false,
        },
        baseline: factory.descriptor,
        gameSeedBase: SEED_BASE,
    });
    if (
        manifest.scheduler.account !== "pi_jss233" || manifest.scheduler.jobId !== process.env.SLURM_JOB_ID ||
        manifest.source.gitCommit !== sourceCommit || manifest.source.gitBranch !== "main" ||
        manifest.source.trackedDirty !== false || manifest.software.baseline.kind !== "external-package" ||
        manifest.software.baseline.trackedDirty !== false || manifest.inputs.maps[0]?.sha256 !== MAP_SHA256
    ) throw new Error("Stagnation-assault gate provenance failed");

    const cells = [];
    for (const [countryOrdinal, country] of COUNTRIES.entries()) for (const candidateSlot of [0, 1] as const) {
        const first = await runRepeat(factory, country, countryOrdinal, candidateSlot);
        const second = await runRepeat(factory, country, countryOrdinal, candidateSlot);
        if (JSON.stringify(first) !== JSON.stringify(second)) {
            throw new Error(`Stagnation-assault telemetry is nondeterministic for ${country} slot ${candidateSlot}`);
        }
        cells.push({
            country,
            candidateSlot,
            telemetrySha256: hash(first),
            observationCount: first.length,
            triggerCount: first.filter(({ triggerEligible }) => triggerEligible).length,
            missionCreationCount: first.filter(({ missionCreated }) => missionCreated).length,
            compositionBuildableCount: first.filter(({ compositionBuildable }) => compositionBuildable).length,
            maximumActiveAssaultMissions: Math.max(0, ...first.map(({ activeAssaultMissionCount }) =>
                activeAssaultMissionCount)),
        });
    }
    const witnesses = {
        alliedMissionCreations: cells.filter(({ country }) => ALLIED.has(country))
            .reduce((sum, cell) => sum + cell.missionCreationCount, 0),
        sovietMissionCreations: cells.filter(({ country }) => !ALLIED.has(country))
            .reduce((sum, cell) => sum + cell.missionCreationCount, 0),
        slot0MissionCreations: cells.filter(({ candidateSlot }) => candidateSlot === 0)
            .reduce((sum, cell) => sum + cell.missionCreationCount, 0),
        slot1MissionCreations: cells.filter(({ candidateSlot }) => candidateSlot === 1)
            .reduce((sum, cell) => sum + cell.missionCreationCount, 0),
    };
    const passed = cells.length === 18 && cells.every(({ observationCount, maximumActiveAssaultMissions }) =>
        observationCount > 0 && maximumActiveAssaultMissions <= 1) &&
        Object.values(witnesses).every((count) => count > 0);
    const artifact = {
        schemaVersion: 1,
        kind: "stagnation-assault-outcome-blind-live-compatibility-gate",
        status: passed ? "PASS_OUTCOME_BLIND_STAGNATION_ASSAULT_COMPATIBILITY" :
            "FAIL_OUTCOME_BLIND_STAGNATION_ASSAULT_COMPATIBILITY",
        complete: true,
        passed,
        outcomeFree: true,
        schedulerAccount: "pi_jss233",
        schedulerJobId: process.env.SLURM_JOB_ID,
        sourceGitCommit: sourceCommit,
        protocol: { path: protocolPath, sha256: protocolSha256 },
        program: { path: programPath, sha256: programSha256 },
        map: { name: MAP_NAME, sha256: MAP_SHA256 },
        policy,
        policySha256: stagnationAssaultPolicySha256(policy),
        launchedGameCount: 36,
        countryCount: 9,
        reciprocalSlotCount: 2,
        deterministicRepeatCount: 2,
        cells,
        witnesses,
        provenance: manifest,
    };
    fs.writeFileSync(outFile, JSON.stringify(artifact, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({ status: artifact.status, witnesses, schedulerJobId: artifact.schedulerJobId }));
    if (!passed) process.exitCode = 2;
};

const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (import.meta.url === invoked) main().catch((error) => { console.error(error); process.exitCode = 1; });
