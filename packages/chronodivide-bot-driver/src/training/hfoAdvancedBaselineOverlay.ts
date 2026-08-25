import { Bot, CreateOfflineOpts, GameApi, ObjectType, UnitData, cdapi } from "@chronodivide/game-api";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { loadBaselineFactory } from "../benchmark/baselineLoader.js";
import { createExperimentManifest } from "../benchmark/provenance.js";
import { withSeededOfflineGame } from "../benchmark/seededOfflineGame.js";
import { createDeployedStrongBotCandidate } from "./deployedStrongBotCandidate.js";
import { RA2WEB_CLIENT_COMMIT, RA2WEB_CLIENT_RELEASE_ID, RA2WEB_FREEZE_MANIFEST_SHA256,
    createInspectableRa2WebBot, loadRa2WebOpponent } from "./ra2WebOpponentBundle.js";
import { LiteralBuildingEliminationAdjudicator, installLiteralEndpointInstrumentation,
    snapshotCombatantBuildings } from "./literalBuildingEliminationEndpoint.js";

const MAP = { name: "cd_chrono_4_heck_freezes_over_le.map",
    sha256: "e4dfc736a6355e0e68d4681e4d67419516e6bb94549e2d42880c9414e95e2e8d" } as const;
export const HFO_ADVANCED_OVERLAY_COUNTRIES = [Countries.USA, Countries.KOREA, Countries.FRANCE, Countries.GERMANY,
    Countries.GREAT_BRITAIN, Countries.LIBYA, Countries.IRAQ, Countries.CUBA, Countries.RUSSIA] as const;
const STARTS = ["39,82", "151,119", "88,34", "88,157"] as const;
type Start = typeof STARTS[number];
const OPPOSITE: Record<Start, Start> = {
    "39,82": "151,119", "151,119": "39,82", "88,34": "88,157", "88,157": "88,34",
};
const ALLIED = new Set<Countries>(HFO_ADVANCED_OVERLAY_COUNTRIES.slice(0, 5));
const BASELINE_COMMIT = "165b77a71d0cf5ebd27c65b19d0486bcbae78d0f";
const SHA256 = /^[0-9a-f]{64}$/;
export const HFO_ADVANCED_OVERLAY_SPEC = {
    seedBase: 4_264_000_000,
    casesPerCountryStartSlot: 1,
    maxOffsets: 400,
    maxTicks: 90_000,
    countryCount: 9,
    startCount: 4,
    slotCount: 2,
    caseCount: 72,
    armCount: 5,
    taskCount: 360,
    clusterCount: 36,
    clusterTCritical: 1.68957,
    pairedTCritical: 1.29376,
} as const;
type Winner = "first" | "opponent" | "draw";
type ArmId = "external_supalosa" | "overlay_full" | "overlay_guards_only" |
    "overlay_assaults_only" | "overlay_minimal";
type ArmDefinition = { id: ArmId; external: boolean; guards: boolean; assaults: boolean };
export const HFO_ADVANCED_OVERLAY_ARMS: readonly ArmDefinition[] = [
    { id: "external_supalosa", external: true, guards: false, assaults: false },
    { id: "overlay_full", external: false, guards: true, assaults: true },
    { id: "overlay_guards_only", external: false, guards: true, assaults: false },
    { id: "overlay_assaults_only", external: false, guards: false, assaults: true },
    { id: "overlay_minimal", external: false, guards: false, assaults: false },
];
type CaseSpec = { caseIndex: number; countryOrdinal: number; country: Countries; startOrdinal: number;
    desiredStart: Start; desiredOppositeStart: Start; candidateSlot: 0 | 1; repeatIndex: number;
    seedOffset: number; requestedEngineSeed: number; candidateStart: string; baselineStart: string };

const requiredPath = (name: string): string => {
    const value = process.env[name]; if (!value) throw new Error(`${name} is required`); return path.resolve(value);
};
const requiredText = (name: string, pattern: RegExp): string => {
    const value = process.env[name]; if (!value || !pattern.test(value)) throw new Error(`${name} is invalid`); return value;
};
const sha256File = (filePath: string): string =>
    crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
const isRecord = (value: unknown): value is Record<string, unknown> =>
    !!value && typeof value === "object" && !Array.isArray(value);
const startKey = (point: { x: number; y: number }): string => `${point.x},${point.y}`;
const inspectableApi = (bot: { lastGameApi: GameApi | null }): GameApi => {
    if (!bot.lastGameApi) throw new Error("Multi-opponent API unavailable"); return bot.lastGameApi;
};

const sourceIdentity = () => {
    const repo = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
    const commit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    if (execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim() !== "main" ||
        execFileSync("git", ["status", "--short", "--untracked-files=no"], { encoding: "utf8" }).trim() !== "" ||
        execFileSync("git", ["rev-parse", "fork/main"], { encoding: "utf8" }).trim() !== commit) {
        throw new Error("Confirmatory study requires clean synchronized main");
    }
    return { repo, commit };
};

const commonInputs = () => {
    if (process.env.SLURM_JOB_ACCOUNT !== "pi_jss233") throw new Error("Confirmatory study requires pi_jss233");
    const mixDir = requiredPath("MIX_DIR"), protocolPath = requiredPath("PROTOCOL_PATH");
    const assetManifestPath = requiredPath("ASSET_MANIFEST_PATH");
    const freezeRoot = requiredPath("RA2WEB_FREEZE_ROOT");
    const protocolSha256 = requiredText("PROTOCOL_SHA256", SHA256);
    const assetManifestSha256 = requiredText("ASSET_MANIFEST_SHA256", SHA256);
    if (sha256File(protocolPath) !== protocolSha256 || sha256File(assetManifestPath) !== assetManifestSha256 ||
        sha256File(path.join(mixDir, MAP.name)) !== MAP.sha256) throw new Error("Confirmatory input drifted");
    const manifest = JSON.parse(fs.readFileSync(assetManifestPath, "utf8")) as unknown;
    if (!isRecord(manifest) || manifest.kind !== "private-ra2-snow-runtime" ||
        path.resolve(String(manifest.runtimeDirectory)) !== mixDir) throw new Error("Confirmatory runtime drifted");
    return { mixDir, freezeRoot, protocolSha256, assetManifestSha256 };
};

const settings = (candidate: Bot, baseline: Bot, slot: 0 | 1): CreateOfflineOpts => {
    const gameMode = cdapi.getAvailableGameModes(MAP.name)[0];
    if (!gameMode) throw new Error("Confirmatory game mode unavailable");
    return { buildOffAlly: false, cratesAppear: false, credits: 10_000, gameMode, gameSpeed: 6,
        mapName: MAP.name, mcvRepacks: true, shortGame: false, superWeapons: false, unitCount: 0, online: false,
        agents: slot === 0 ? [candidate, baseline] : [baseline, candidate] };
};

const assertExternalBaseline = (descriptor: unknown): void => {
    if (!isRecord(descriptor) || descriptor.kind !== "external-package" ||
        typeof descriptor.packageRoot !== "string") throw new Error("Confirmatory baseline descriptor drifted");
    const packageRoot = path.resolve(descriptor.packageRoot);
    const repo = execFileSync("git", ["-C", packageRoot, "rev-parse", "--show-toplevel"],
        { encoding: "utf8" }).trim();
    const commit = execFileSync("git", ["-C", repo, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    const trackedStatus = execFileSync("git", ["-C", repo, "status", "--short", "--untracked-files=no"],
        { encoding: "utf8" }).trim();
    if (commit !== BASELINE_COMMIT || trackedStatus !== "" ||
        packageRoot !== path.join(repo, "packages", "chronodivide-bot")) {
        throw new Error("Confirmatory external baseline drifted");
    }
};

const loadAdvanced = (freezeRoot: string) => {
    const loaded = loadRa2WebOpponent(freezeRoot, "ra2web_advanced_old_priest");
    if (loaded.freezeManifestSha256 !== RA2WEB_FREEZE_MANIFEST_SHA256 ||
        loaded.bundleSha256 !== "81d8797b6dd1371ba2dcbd79e25df8b42254290c820159e121a82650fd97a143" ||
        loaded.descriptor.expectedBuildId !== "ra2web-0.83.1-ai-old-priest-phase258-20260716") {
        throw new Error("RA2Web Advanced identity drifted");
    }
    return loaded;
};

const createPolicyBot = (arm: ArmDefinition, name: string, country: Countries,
    factory: Awaited<ReturnType<typeof loadBaselineFactory>>) => {
    if (arm.external) return factory.create(name, country);
    const guards = arm.guards ? {} : {
        hfoBottomHomeGuard: { enabled: false },
        hfoWestHomeGuard: { enabled: false },
    };
    const assaults = arm.assaults ? {} : {
        hfoCloseout: { enabled: false }, hfoWestSweep: { enabled: false }, hfoEastSweep: { enabled: false },
        hfoBottomSweep: { enabled: false }, hfoBottomPincer: { enabled: false },
        hfoBottomCloseout: { enabled: false }, hfoBottomDemolition: { enabled: false },
        hfoBottomRetarget: { enabled: false },
    };
    return createDeployedStrongBotCandidate(name, country, {
        defaultMapProfiles: false,
        hfoAlliedWestProfile: false,
        hfoSovietWestProfile: false,
        preserveBaselineCore: true,
        buildingElimination: { enabled: false },
    }, {
        defaultMapProfiles: false,
        exactMapTactics: true,
        preserveBaselineCore: true,
        forceAttack: { enabled: false }, harass: { enabled: false },
        emergencyDefense: { enabled: false }, harvesterHarass: { enabled: false },
        routeAttack: { enabled: false }, hfoWestRetarget: { enabled: false },
        ...guards,
        ...assaults,
    });
};

const selectCases = async (): Promise<void> => {
    const outputPath = requiredPath("OUT_PATH"), programPath = requiredPath("PROGRAM_PATH");
    const programSha256 = requiredText("PROGRAM_SHA256", SHA256), inputs = commonInputs();
    if (fs.existsSync(outputPath) || sha256File(programPath) !== programSha256) {
        throw new Error("Confirmatory selection drifted");
    }
    const { repo, commit } = sourceIdentity();
    await cdapi.init(inputs.mixDir);
    const factory = await loadBaselineFactory(path.join(repo, "packages", "chronodivide-bot"));
    assertExternalBaseline(factory.descriptor);
    const advanced = loadAdvanced(inputs.freezeRoot);
    const cases: CaseSpec[] = [];
    let initializedGameCount = 0;
    for (const [countryOrdinal, country] of HFO_ADVANCED_OVERLAY_COUNTRIES.entries()) {
        for (const [startOrdinal, desiredStart] of STARTS.entries()) {
            for (const candidateSlot of [0, 1] as const) {
                let selected = 0;
                for (let seedOffset = 0; seedOffset < HFO_ADVANCED_OVERLAY_SPEC.maxOffsets &&
                    selected < HFO_ADVANCED_OVERLAY_SPEC.casesPerCountryStartSlot; seedOffset += 1) {
                    const requestedEngineSeed = HFO_ADVANCED_OVERLAY_SPEC.seedBase + countryOrdinal * 100_000 +
                        startOrdinal * 20_000 + candidateSlot * 10_000 + seedOffset;
                    const candidateName = `ConfirmSelectCandidate_${countryOrdinal}_${startOrdinal}_${candidateSlot}_${seedOffset}`;
                    const baselineName = `ConfirmSelectBaseline_${countryOrdinal}_${startOrdinal}_${candidateSlot}_${seedOffset}`;
                    const candidate = createDeployedStrongBotCandidate(candidateName, country);
                    const baseline = factory.create(baselineName, country);
                    const starts = await withSeededOfflineGame(cdapi, settings(candidate, baseline, candidateSlot),
                        requestedEngineSeed,
                        [{ agent: candidate, identity: "candidate" }, { agent: baseline, identity: "baseline" }],
                        async () => ({ candidateStart: startKey(inspectableApi(candidate).getPlayerData(candidateName).startLocation),
                            baselineStart: startKey(inspectableApi(candidate).getPlayerData(baselineName).startLocation) }));
                    initializedGameCount += 1;
                    if (starts.candidateStart === desiredStart && starts.baselineStart === OPPOSITE[desiredStart]) {
                        cases.push({ caseIndex: cases.length, countryOrdinal, country, startOrdinal, desiredStart,
                            desiredOppositeStart: OPPOSITE[desiredStart], candidateSlot, repeatIndex: selected,
                            seedOffset, requestedEngineSeed, ...starts });
                        selected += 1;
                    }
                }
                if (selected !== HFO_ADVANCED_OVERLAY_SPEC.casesPerCountryStartSlot) {
                    throw new Error(`Confirmatory selection incomplete for ${country} ${desiredStart} slot ${candidateSlot}`);
                }
            }
        }
    }
    const unique = new Set(cases.map((entry) => `${entry.requestedEngineSeed}:${entry.candidateSlot}`));
    const cellCounts = new Map<string, number>();
    for (const entry of cases) {
        const key = `${entry.country}:${entry.desiredStart}:${entry.candidateSlot}`;
        cellCounts.set(key, (cellCounts.get(key) ?? 0) + 1);
    }
    if (cases.length !== HFO_ADVANCED_OVERLAY_SPEC.caseCount || unique.size !== cases.length ||
        cellCounts.size !== HFO_ADVANCED_OVERLAY_SPEC.countryCount * HFO_ADVANCED_OVERLAY_SPEC.startCount *
            HFO_ADVANCED_OVERLAY_SPEC.slotCount || [...cellCounts.values()].some((count) =>
            count !== HFO_ADVANCED_OVERLAY_SPEC.casesPerCountryStartSlot)) {
        throw new Error("Confirmatory selection coverage drifted");
    }
    const artifact = { schemaVersion: 1, kind: "hfo-advanced-baseline-overlay-selection",
        status: "PASS_HFO_ADVANCED_BASELINE_OVERLAY_SELECTION", complete: true, passed: true, outcomeFree: true,
        scheduler: { jobId: process.env.SLURM_JOB_ID, account: "pi_jss233" }, sourceCommit: commit,
        programSha256, protocolSha256: inputs.protocolSha256, assetManifestSha256: inputs.assetManifestSha256,
        baselineCommit: BASELINE_COMMIT, ...HFO_ADVANCED_OVERLAY_SPEC, initializedGameCount,
        ra2webClientCommit: RA2WEB_CLIENT_COMMIT, ra2webClientReleaseId: RA2WEB_CLIENT_RELEASE_ID,
        freezeManifestSha256: advanced.freezeManifestSha256, advancedBundleSha256: advanced.bundleSha256,
        selectedCaseCount: cases.length, updateCount: 0, forbiddenOutcomeFields: [], cases };
    fs.mkdirSync(path.dirname(outputPath), { recursive: true, mode: 0o700 });
    fs.writeFileSync(outputPath, JSON.stringify(artifact, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({ status: artifact.status, initializedGameCount, cases: cases.length }));
};

const loadSelection = (selectionPath: string, selectionSha256: string,
    inputs: ReturnType<typeof commonInputs>): CaseSpec[] => {
    if (sha256File(selectionPath) !== selectionSha256) throw new Error("Confirmatory selection hash drifted");
    const selection = JSON.parse(fs.readFileSync(selectionPath, "utf8")) as unknown;
    if (!isRecord(selection) || selection.kind !== "hfo-advanced-baseline-overlay-selection" ||
        selection.status !== "PASS_HFO_ADVANCED_BASELINE_OVERLAY_SELECTION" || selection.complete !== true ||
        selection.passed !== true || selection.outcomeFree !== true || selection.updateCount !== 0 ||
        !Array.isArray(selection.forbiddenOutcomeFields) || selection.forbiddenOutcomeFields.length !== 0 ||
        selection.selectedCaseCount !== HFO_ADVANCED_OVERLAY_SPEC.caseCount ||
        selection.seedBase !== HFO_ADVANCED_OVERLAY_SPEC.seedBase || selection.baselineCommit !== BASELINE_COMMIT ||
        selection.ra2webClientCommit !== RA2WEB_CLIENT_COMMIT ||
        selection.ra2webClientReleaseId !== RA2WEB_CLIENT_RELEASE_ID ||
        selection.freezeManifestSha256 !== RA2WEB_FREEZE_MANIFEST_SHA256 ||
        selection.advancedBundleSha256 !== "81d8797b6dd1371ba2dcbd79e25df8b42254290c820159e121a82650fd97a143" ||
        selection.protocolSha256 !== inputs.protocolSha256 || selection.assetManifestSha256 !== inputs.assetManifestSha256 ||
        !Array.isArray(selection.cases) || selection.cases.length !== HFO_ADVANCED_OVERLAY_SPEC.caseCount) {
        throw new Error("Confirmatory selection is ineligible");
    }
    const cases = selection.cases as CaseSpec[];
    const cellCounts = new Map<string, number>();
    for (const entry of cases) {
        if (!STARTS.includes(entry.desiredStart) || entry.baselineStart !== OPPOSITE[entry.desiredStart] ||
            entry.candidateStart !== entry.desiredStart || entry.desiredOppositeStart !== OPPOSITE[entry.desiredStart] ||
            (entry.candidateSlot !== 0 && entry.candidateSlot !== 1)) throw new Error("Confirmatory case drifted");
        const key = `${entry.country}:${entry.desiredStart}:${entry.candidateSlot}`;
        cellCounts.set(key, (cellCounts.get(key) ?? 0) + 1);
    }
    if (cellCounts.size !== HFO_ADVANCED_OVERLAY_SPEC.countryCount * HFO_ADVANCED_OVERLAY_SPEC.startCount *
        HFO_ADVANCED_OVERLAY_SPEC.slotCount || [...cellCounts.values()].some((count) =>
        count !== HFO_ADVANCED_OVERLAY_SPEC.casesPerCountryStartSlot)) {
        throw new Error("Confirmatory selection cell balance drifted");
    }
    return cases;
};

const terminalUnitSummary = (game: GameApi, firstName: string, advancedName: string) => {
    const rows = game.getAllUnits().map((id) => game.getUnitData(id)).filter((unit): unit is UnitData => !!unit)
        .filter((unit) => unit.owner === firstName || unit.owner === advancedName);
    const summarize = (owner: string) => {
        const owned = rows.filter((unit) => unit.owner === owner);
        const byName = Object.fromEntries([...new Set(owned.map((unit) => unit.rules.name))].sort()
            .map((name) => [name, owned.filter((unit) => unit.rules.name === name).length]));
        return { total: owned.length, buildings: owned.filter((unit) => unit.rules.type === ObjectType.Building).length,
            nonBuildings: owned.filter((unit) => unit.rules.type !== ObjectType.Building).length, byName };
    };
    return { first: summarize(firstName), opponent: summarize(advancedName) };
};

const runCell = async (): Promise<void> => {
    const taskIndex = Number(requiredText("TASK_INDEX", /^\d+$/)), outputPath = requiredPath("OUT_PATH");
    const programPath = requiredPath("PROGRAM_PATH"), programSha256 = requiredText("PROGRAM_SHA256", SHA256);
    const selectionPath = requiredPath("SELECTION_PATH"), selectionSha256 = requiredText("SELECTION_SHA256", SHA256);
    const inputs = commonInputs();
    if (taskIndex < 0 || taskIndex >= HFO_ADVANCED_OVERLAY_SPEC.taskCount ||
        process.env.SLURM_ARRAY_TASK_ID !== String(taskIndex) || fs.existsSync(outputPath) ||
        sha256File(programPath) !== programSha256) throw new Error("Advanced overlay cell drifted");
    const cases = loadSelection(selectionPath, selectionSha256, inputs);
    const armIndex = Math.floor(taskIndex / HFO_ADVANCED_OVERLAY_SPEC.caseCount);
    const caseIndex = taskIndex % HFO_ADVANCED_OVERLAY_SPEC.caseCount;
    const arm = HFO_ADVANCED_OVERLAY_ARMS[armIndex];
    const caseSpec = cases[caseIndex];
    if (!arm || !caseSpec || caseSpec.caseIndex !== caseIndex ||
        HFO_ADVANCED_OVERLAY_ARMS.length !== HFO_ADVANCED_OVERLAY_SPEC.armCount) {
        throw new Error("Advanced overlay cell assignment drifted");
    }
    const { repo, commit } = sourceIdentity();
    await cdapi.init(inputs.mixDir);
    const factory = await loadBaselineFactory(path.join(repo, "packages", "chronodivide-bot"));
    assertExternalBaseline(factory.descriptor);
    const loadedAdvanced = loadAdvanced(inputs.freezeRoot);
    const firstName = `OverlayFirst_${taskIndex}`, advancedName = `OverlayAdvanced_${taskIndex}`;
    const first = createPolicyBot(arm, firstName, caseSpec.country, factory);
    const advanced = createInspectableRa2WebBot(loadedAdvanced, advancedName, caseSpec.country);
    const adjudicator = new LiteralBuildingEliminationAdjudicator({ candidate: firstName, baseline: advancedName });
    const { audit } = installLiteralEndpointInstrumentation({ candidate: first, baseline: advanced }, adjudicator);
    const result = await withSeededOfflineGame(cdapi, settings(first, advanced, caseSpec.candidateSlot),
        caseSpec.requestedEngineSeed,
        [{ agent: first, identity: "first" }, { agent: advanced, identity: "opponent" }], async (game) => {
            const gameApi = inspectableApi(first);
            if (startKey(gameApi.getPlayerData(firstName).startLocation) !== caseSpec.desiredStart ||
                startKey(gameApi.getPlayerData(advancedName).startLocation) !== caseSpec.desiredOppositeStart) {
                throw new Error("Advanced overlay selected start drifted");
            }
            let ticks = 0, terminal: any = null, failure: any = null;
            while (ticks < HFO_ADVANCED_OVERLAY_SPEC.maxTicks && !terminal && !failure) {
                adjudicator.beginUpdate(gameApi); await game.update(); ticks += 1;
                const stats = game.getPlayerStats(), firstStats = stats.find((row) => row.name === firstName);
                const advancedStats = stats.find((row) => row.name === advancedName);
                if (!firstStats || !advancedStats) throw new Error("Advanced overlay statistics unavailable");
                const endpoint = adjudicator.completeUpdate(gameApi, { finished: game.isFinished(), defeated: {
                    candidate: firstStats.defeated, baseline: advancedStats.defeated } });
                terminal = endpoint.terminal; failure = endpoint.technicalFailure;
            }
            if (failure) throw new Error(`Advanced overlay endpoint failure ${JSON.stringify(failure)}`);
            if (audit.forwarded.candidate !== 0 || audit.forwarded.baseline !== 0) {
                throw new Error("Advanced overlay resignation forwarded");
            }
            const buildings = snapshotCombatantBuildings(gameApi, { candidate: firstName, baseline: advancedName });
            const winner: Winner = terminal?.winner === "candidate" ? "first" :
                terminal?.winner === "baseline" ? "opponent" : "draw";
            return { taskIndex, armIndex, armId: arm.id, guards: arm.guards,
                assaults: arm.assaults, caseIndex, country: caseSpec.country,
                faction: ALLIED.has(caseSpec.country) ? "Allied" : "Soviet", candidateSlot: caseSpec.candidateSlot,
                requestedEngineSeed: caseSpec.requestedEngineSeed, candidateStart: caseSpec.desiredStart,
                opponentStart: caseSpec.desiredOppositeStart, ticks, maxTicks: HFO_ADVANCED_OVERLAY_SPEC.maxTicks,
                status: terminal?.status ?? "tick_cap_draw", winner,
                terminalBuildingCounts: { first: buildings.filter((row) => row.owner === firstName).length,
                    opponent: buildings.filter((row) => row.owner === advancedName).length },
                terminalUnits: terminalUnitSummary(gameApi, firstName, advancedName), quitAttempts: { ...audit.attempts } };
        });
    const provenance = createExperimentManifest({ runId: `hfo-advanced-overlay-${taskIndex}-${process.env.SLURM_JOB_ID}`,
        mixDir: inputs.mixDir, maps: [MAP.name], effectiveConfig: { taskIndex, armIndex, arm, caseSpec,
            selectionSha256, maxTicks: HFO_ADVANCED_OVERLAY_SPEC.maxTicks,
            advancedBundleSha256: loadedAdvanced.bundleSha256 }, baseline: factory.descriptor,
        gameSeedBase: caseSpec.requestedEngineSeed });
    const artifact = { schemaVersion: 1, kind: "hfo-advanced-baseline-overlay-cell",
        status: "COMPLETE_HFO_ADVANCED_BASELINE_OVERLAY_CELL", complete: true, taskIndex, armIndex,
        armId: arm.id, guards: arm.guards, assaults: arm.assaults, caseIndex,
        schedulerAccount: "pi_jss233", schedulerJobId: process.env.SLURM_JOB_ID, sourceCommit: commit,
        programSha256, protocolSha256: inputs.protocolSha256, assetManifestSha256: inputs.assetManifestSha256,
        selectionSha256, baselineCommit: BASELINE_COMMIT, ra2webClientCommit: RA2WEB_CLIENT_COMMIT,
        ra2webClientReleaseId: RA2WEB_CLIENT_RELEASE_ID, freezeManifestSha256: loadedAdvanced.freezeManifestSha256,
        advancedBundleSha256: loadedAdvanced.bundleSha256, result, provenance };
    fs.mkdirSync(path.dirname(outputPath), { recursive: true, mode: 0o700 });
    fs.writeFileSync(outputPath, JSON.stringify(artifact, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({ status: artifact.status, taskIndex, armId: arm.id, caseIndex }));
};

const wilsonLower = (wins: number, games: number): number => {
    const z = 1.6448536269514722, probability = wins / games, zSquared = z * z;
    return (probability + zSquared / (2 * games) -
        z * Math.sqrt(probability * (1 - probability) / games + zSquared / (4 * games * games))) /
        (1 + zSquared / games);
};
const sampleStandardDeviation = (values: number[]): number => {
    const mean = values.reduce((total, value) => total + value, 0) / values.length;
    return Math.sqrt(values.reduce((total, value) => total + (value - mean) ** 2, 0) / (values.length - 1));
};
const summarize = (rows: any[]) => {
    const wins = rows.filter((row) => row.winner === "first").length;
    const losses = rows.filter((row) => row.winner === "opponent").length;
    const draws = rows.length - wins - losses, ticks = rows.map((row) => row.ticks).sort((a, b) => a - b);
    const center = Math.floor(ticks.length / 2);
    const statuses = Object.fromEntries([...new Set(rows.map((row) => row.status))].sort()
        .map((status) => [status, rows.filter((row) => row.status === status).length]));
    return { games: rows.length, wins, draws, losses, winRate: wins / rows.length,
        lossRate: losses / rows.length, oneSided95WilsonLower: wilsonLower(wins, rows.length),
        medianTicks: ticks.length % 2 ? ticks[center] : (ticks[center - 1] + ticks[center]) / 2, statuses };
};

const completedTasks = (arrayJobId: string): Map<number, string> => {
    const raw = execFileSync("/opt/slurm/current/bin/sacct",
        ["-j", arrayJobId, "-n", "-P", "-X", "--format=JobID,JobIDRaw,State,ExitCode,Account"],
        { encoding: "utf8" });
    const tasks = new Map<number, string>();
    for (const line of raw.split("\n").filter(Boolean)) {
        const [label, rawId, state, exitCode, account] = line.split("|");
        const match = new RegExp(`^${arrayJobId}_(\\d+)$`).exec(label);
        if (match && state === "COMPLETED" && exitCode === "0:0" && account === "pi_jss233") {
            tasks.set(Number(match[1]), rawId);
        }
    }
    return tasks;
};

const finalize = (): void => {
    const root = requiredPath("RESULTS_ROOT"), outputPath = requiredPath("OUT_PATH");
    const arrayJobId = requiredText("ARRAY_JOB_ID", /^\d+$/), programSha256 = requiredText("PROGRAM_SHA256", SHA256);
    const selectionSha256 = requiredText("SELECTION_SHA256", SHA256), inputs = commonInputs();
    const cellProgramSha256 = process.env.CELL_PROGRAM_SHA256
        ? requiredText("CELL_PROGRAM_SHA256", SHA256) : programSha256;
    if (fs.existsSync(outputPath)) throw new Error("Advanced overlay finalizer output exists");
    const loadedAdvanced = loadAdvanced(inputs.freezeRoot);
    let tasks = new Map<number, string>();
    for (let attempt = 0; attempt < 31; attempt += 1) {
        tasks = completedTasks(arrayJobId); if (tasks.size === HFO_ADVANCED_OVERLAY_SPEC.taskCount) break;
        if (attempt < 30) execFileSync("sleep", ["2"]);
    }
    if (tasks.size !== HFO_ADVANCED_OVERLAY_SPEC.taskCount) {
        throw new Error(`Only ${tasks.size}/${HFO_ADVANCED_OVERLAY_SPEC.taskCount} overlay tasks complete`);
    }
    const rows: any[] = [], sources = new Set<string>();
    for (let taskIndex = 0; taskIndex < HFO_ADVANCED_OVERLAY_SPEC.taskCount; taskIndex += 1) {
        const cell = JSON.parse(fs.readFileSync(path.join(root,
            `task-${String(taskIndex).padStart(3, "0")}`, "cell.json"), "utf8"));
        const expectedArmIndex = Math.floor(taskIndex / HFO_ADVANCED_OVERLAY_SPEC.caseCount);
        const expectedArm = HFO_ADVANCED_OVERLAY_ARMS[expectedArmIndex];
        const expectedCaseIndex = taskIndex % HFO_ADVANCED_OVERLAY_SPEC.caseCount;
        if (!expectedArm || cell.kind !== "hfo-advanced-baseline-overlay-cell" ||
            cell.status !== "COMPLETE_HFO_ADVANCED_BASELINE_OVERLAY_CELL" || cell.complete !== true ||
            cell.taskIndex !== taskIndex || cell.armIndex !== expectedArmIndex || cell.armId !== expectedArm.id ||
            cell.guards !== expectedArm.guards || cell.assaults !== expectedArm.assaults ||
            cell.caseIndex !== expectedCaseIndex || String(cell.schedulerJobId) !== tasks.get(taskIndex) ||
            cell.programSha256 !== cellProgramSha256 || cell.protocolSha256 !== inputs.protocolSha256 ||
            cell.assetManifestSha256 !== inputs.assetManifestSha256 || cell.selectionSha256 !== selectionSha256 ||
            cell.baselineCommit !== BASELINE_COMMIT || cell.ra2webClientCommit !== RA2WEB_CLIENT_COMMIT ||
            cell.freezeManifestSha256 !== RA2WEB_FREEZE_MANIFEST_SHA256 ||
            cell.advancedBundleSha256 !== loadedAdvanced.bundleSha256) {
            throw new Error(`Multi-opponent cell ${taskIndex} drifted`);
        }
        sources.add(cell.sourceCommit); rows.push(cell.result);
    }
    if (rows.length !== HFO_ADVANCED_OVERLAY_SPEC.taskCount || sources.size !== 1 ||
        HFO_ADVANCED_OVERLAY_ARMS.some((arm) => rows.filter((row) => row.armId === arm.id).length !==
            HFO_ADVANCED_OVERLAY_SPEC.caseCount)) {
        throw new Error("Advanced overlay aggregate coverage drifted");
    }
    const analyzeArm = (armRows: any[]) => {
        const overall = summarize(armRows);
        const byCountry = Object.fromEntries(HFO_ADVANCED_OVERLAY_COUNTRIES.map((country) =>
            [country, summarize(armRows.filter((row) => row.country === country))]));
        const byStart = Object.fromEntries(STARTS.map((start) =>
            [start, summarize(armRows.filter((row) => row.candidateStart === start))]));
        const byFaction = Object.fromEntries(["Allied", "Soviet"].map((faction) =>
            [faction, summarize(armRows.filter((row) => row.faction === faction))]));
        const bySlot = Object.fromEntries([0, 1].map((slot) =>
            [String(slot), summarize(armRows.filter((row) => row.candidateSlot === slot))]));
        const cellSummaries = HFO_ADVANCED_OVERLAY_COUNTRIES.flatMap((country) => STARTS.map((start) => ({ country, start,
            ...summarize(armRows.filter((row) => row.country === country && row.candidateStart === start)) })));
        const clusterRates = cellSummaries.map((entry) => entry.winRate);
        const clusterMean = clusterRates.reduce((total, value) => total + value, 0) / clusterRates.length;
        const clusterStandardDeviation = sampleStandardDeviation(clusterRates);
        const clusterLower = clusterMean - HFO_ADVANCED_OVERLAY_SPEC.clusterTCritical *
            clusterStandardDeviation / Math.sqrt(clusterRates.length);
        return { overall, byCountry, byStart, byFaction, bySlot, cellSummaries,
            clustered: { clusterCount: clusterRates.length, meanWinRate: clusterMean,
                sampleStandardDeviation: clusterStandardDeviation,
                tCritical: HFO_ADVANCED_OVERLAY_SPEC.clusterTCritical, degreesOfFreedom: clusterRates.length - 1,
                oneSided95Lower: clusterLower } };
    };
    const score = (winner: Winner): number => winner === "first" ? 1 : winner === "draw" ? 0.5 : 0;
    const controlRows = rows.filter((row) => row.armId === "external_supalosa");
    const controlSummary = summarize(controlRows);
    const armResults = HFO_ADVANCED_OVERLAY_ARMS.map((arm, declarationIndex) => {
        const armRows = rows.filter((row) => row.armId === arm.id);
        const paired = armRows.map((row) => score(row.winner) -
            score(controlRows.find((entry) => entry.caseIndex === row.caseIndex)?.winner ?? "draw"));
        const pairedMean = paired.reduce((total, value) => total + value, 0) / paired.length;
        const pairedStandardDeviation = sampleStandardDeviation(paired);
        const pairedLower = pairedMean - HFO_ADVANCED_OVERLAY_SPEC.pairedTCritical *
            pairedStandardDeviation / Math.sqrt(paired.length);
        const analysis = analyzeArm(armRows);
        const factionSafe = Object.values(analysis.byFaction).every((entry: any) => entry.wins > entry.losses);
        const startNoninferiorityCount = Object.values(analysis.byStart)
            .filter((entry: any) => entry.wins >= entry.losses).length;
        const startSuperiorityCount = Object.values(analysis.byStart)
            .filter((entry: any) => entry.wins > entry.losses).length;
        const countryNoninferiorityCount = Object.values(analysis.byCountry)
            .filter((entry: any) => entry.wins >= entry.losses).length;
        const countrySuperiorityCount = Object.values(analysis.byCountry)
            .filter((entry: any) => entry.wins > entry.losses).length;
        const slotSafe = Object.values(analysis.bySlot).every((entry: any) => entry.wins > entry.losses);
        const minimumCountryStartWinRate = Math.min(...[
            ...Object.values(analysis.byCountry), ...Object.values(analysis.byStart),
        ].map((entry: any) => entry.winRate));
        const eligible = !arm.external && analysis.overall.wins > analysis.overall.losses &&
            analysis.overall.oneSided95WilsonLower > 0.5 && analysis.overall.losses < controlSummary.losses &&
            pairedLower > 0 && factionSafe && startNoninferiorityCount === 4 && startSuperiorityCount >= 3 &&
            countryNoninferiorityCount === 9 && countrySuperiorityCount >= 7 && slotSafe;
        return { ...arm, declarationIndex, ...analysis,
            meanScore: (analysis.overall.wins + 0.5 * analysis.overall.draws) / analysis.overall.games,
            pairedVersusExternal: { meanScoreDifference: pairedMean,
                sampleStandardDeviation: pairedStandardDeviation, tCritical: HFO_ADVANCED_OVERLAY_SPEC.pairedTCritical,
                degreesOfFreedom: paired.length - 1, oneSided90Lower: pairedLower,
                improved: paired.filter((value) => value > 0).length,
                tied: paired.filter((value) => value === 0).length,
                worsened: paired.filter((value) => value < 0).length },
            factionSafe, startNoninferiorityCount, startSuperiorityCount,
            countryNoninferiorityCount, countrySuperiorityCount, slotSafe,
            minimumCountryStartWinRate, eligible };
    });
    const resultFor = (armId: ArmId) => {
        const result = armResults.find((entry) => entry.id === armId);
        if (!result) throw new Error(`Missing Advanced overlay arm ${armId}`);
        return result;
    };
    const ranking = armResults.filter((entry) => !entry.external).sort((left, right) =>
        right.minimumCountryStartWinRate - left.minimumCountryStartWinRate ||
        right.overall.winRate - left.overall.winRate || left.overall.losses - right.overall.losses ||
        right.pairedVersusExternal.meanScoreDifference - left.pairedVersusExternal.meanScoreDifference ||
        left.declarationIndex - right.declarationIndex);
    const winner = ranking.find((entry) => entry.eligible) ?? null;
    const full = resultFor("overlay_full").meanScore, guards = resultFor("overlay_guards_only").meanScore;
    const assaults = resultFor("overlay_assaults_only").meanScore, minimal = resultFor("overlay_minimal").meanScore;
    const factorialEffects = {
        guardOnMainEffect: ((full - assaults) + (guards - minimal)) / 2,
        assaultOnMainEffect: ((full - guards) + (assaults - minimal)) / 2,
        interaction: full - guards - assaults + minimal,
    };
    const passed = winner !== null;
    const artifact = { schemaVersion: 1, kind: "hfo-advanced-baseline-overlay-finalizer",
        status: passed ? "PASS_HFO_ADVANCED_BASELINE_OVERLAY" : "FAIL_HFO_ADVANCED_BASELINE_OVERLAY",
        complete: true, passed, schedulerAccount: "pi_jss233", arrayJobId,
        finalizerJobId: process.env.SLURM_JOB_ID, sourceCommit: [...sources][0], programSha256,
        cellProgramSha256, protocolSha256: inputs.protocolSha256, assetManifestSha256: inputs.assetManifestSha256,
        selectionSha256, baselineCommit: BASELINE_COMMIT, ra2webClientCommit: RA2WEB_CLIENT_COMMIT,
        ra2webClientReleaseId: RA2WEB_CLIENT_RELEASE_ID, freezeManifestSha256: loadedAdvanced.freezeManifestSha256,
        advancedBundleSha256: loadedAdvanced.bundleSha256, launchedGameCount: rows.length,
        armResults, factorialEffects, ranking: ranking.map((entry) => entry.id), winner,
        schedulerJobIds: [...tasks.values()], rows };
    fs.mkdirSync(path.dirname(outputPath), { recursive: true, mode: 0o700 });
    fs.writeFileSync(outputPath, JSON.stringify(artifact, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({ status: artifact.status, ranking: artifact.ranking, winner, factorialEffects }));
};

const main = async (): Promise<void> => {
    const mode = requiredText("MODE", /^(select|cell|finalize)$/);
    if (mode === "select") await selectCases(); else if (mode === "cell") await runCell(); else finalize();
};
const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (import.meta.url === invoked) main().catch((error) => { console.error(error); process.exitCode = 1; });
