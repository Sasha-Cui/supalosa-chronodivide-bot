import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Bot, CreateOfflineOpts, ObjectType, cdapi } from "@chronodivide/game-api";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { BaselineFactory, InspectableBaselineBot, loadBaselineFactory } from "../benchmark/baselineLoader.js";
import { createExperimentManifest } from "../benchmark/provenance.js";
import { derivePairedEngineSeed, withSeededOfflineGame } from "../benchmark/seededOfflineGame.js";
import { sha256File } from "./methodV5PlanRunner.js";

export const METHOD_V6_ECONOMIC_START_GATE_SCHEMA_VERSION = 1 as const;
export const METHOD_V6_ECONOMIC_START_ENGINE_SEED_BASE = 3_690_000_000 as const;
export const METHOD_V6_ECONOMIC_START_MAX_TICKS = 3_600 as const;

export type EconomicStartTrial = {
    familyId: string;
    mapName: string;
    mapSha256: string;
    country: Countries;
    slot: 0 | 1;
    seedBlockIndex: number;
    requestedEngineSeed: number;
    ticks: number;
    candidateEstablished: boolean;
    baselineEstablished: boolean;
    candidateFirstBuildingTick: number | null;
    baselineFirstBuildingTick: number | null;
    engineFinishedBeforeEstablishment: boolean;
    technicalFailure: string | null;
};

export type EconomicStartFamily = {
    familyId: string;
    mapName: string;
    mapSha256: string;
    supported: boolean;
    trialCount: number;
    establishedTrialCount: number;
    technicalFailureCount: number;
    engineFinishedBeforeEstablishmentCount: number;
    maxEstablishmentTick: number | null;
};

type SourceFamily = { familyId: string; mapName: string; mapSha256: string };
type RecordValue = Record<string, unknown>;
const isRecord = (value: unknown): value is RecordValue =>
    typeof value === "object" && value !== null && !Array.isArray(value);
const requiredPath = (name: string): string => {
    const value = process.env[name];
    if (!value) throw new Error(`${name} is required`);
    return path.resolve(value);
};

export const reduceEconomicStartFamilies = (
    families: readonly SourceFamily[],
    trials: readonly EconomicStartTrial[],
): EconomicStartFamily[] => families.map((family) => {
    const rows = trials.filter(({ familyId }) => familyId === family.familyId);
    const established = rows.filter(({ candidateEstablished, baselineEstablished }) =>
        candidateEstablished && baselineEstablished,
    );
    const ticks = established.flatMap(({ candidateFirstBuildingTick, baselineFirstBuildingTick }) =>
        candidateFirstBuildingTick === null || baselineFirstBuildingTick === null
            ? [] : [candidateFirstBuildingTick, baselineFirstBuildingTick],
    );
    const expectedTrials = Object.values(Countries).length * 2;
    return {
        ...family,
        supported: rows.length === expectedTrials && established.length === expectedTrials &&
            rows.every(({ technicalFailure, engineFinishedBeforeEstablishment }) =>
                technicalFailure === null && !engineFinishedBeforeEstablishment,
            ),
        trialCount: rows.length,
        establishedTrialCount: established.length,
        technicalFailureCount: rows.filter(({ technicalFailure }) => technicalFailure !== null).length,
        engineFinishedBeforeEstablishmentCount: rows.filter(
            ({ engineFinishedBeforeEstablishment }) => engineFinishedBeforeEstablishment,
        ).length,
        maxEstablishmentTick: ticks.length > 0 ? Math.max(...ticks) : null,
    };
});

const loadFamilies = (campaignPath: string): SourceFamily[] => {
    const value = JSON.parse(fs.readFileSync(campaignPath, "utf8")) as unknown;
    if (!isRecord(value) || !Array.isArray(value.selectedFamilies) || value.selectedFamilies.length !== 22) {
        throw new Error("Economic-start gate requires the frozen 22-family Method-v6 campaign");
    }
    return value.selectedFamilies.map((raw, index) => {
        if (
            !isRecord(raw) || typeof raw.familyId !== "string" || typeof raw.mapName !== "string" ||
            typeof raw.mapSha256 !== "string"
        ) throw new Error(`Economic-start family ${index} is malformed`);
        return { familyId: raw.familyId, mapName: raw.mapName, mapSha256: raw.mapSha256 };
    });
};

const requireApi = (bot: InspectableBaselineBot, label: string) => {
    if (!bot.lastGameApi) throw new Error(`Missing ${label} GameApi after game creation`);
    return bot.lastGameApi;
};

const ownedBuildingCount = (bot: InspectableBaselineBot): number => {
    const game = requireApi(bot, bot.name);
    return game.getVisibleUnits(bot.name, "self", (rules) => rules.type === ObjectType.Building).length;
};

const settings = (mapName: string, alpha: Bot, beta: Bot, slot: 0 | 1): CreateOfflineOpts => {
    const gameMode = cdapi.getAvailableGameModes(mapName)[0];
    if (!gameMode) throw new Error(`No game mode is available for ${mapName}`);
    return {
        buildOffAlly: false,
        cratesAppear: false,
        credits: 10_000,
        gameMode,
        gameSpeed: 6,
        mapName,
        mcvRepacks: true,
        shortGame: false,
        superWeapons: false,
        unitCount: 0,
        online: false,
        agents: slot === 0 ? [alpha, beta] : [beta, alpha],
    };
};

const runTrial = async (
    factory: BaselineFactory,
    family: SourceFamily,
    country: Countries,
    slot: 0 | 1,
    seedBlockIndex: number,
): Promise<EconomicStartTrial> => {
    const requestedEngineSeed = derivePairedEngineSeed(METHOD_V6_ECONOMIC_START_ENGINE_SEED_BASE, seedBlockIndex);
    const candidate = factory.create(`EconomicStartCandidate_${seedBlockIndex}_${slot}`, country);
    const baseline = factory.create(`EconomicStartBaseline_${seedBlockIndex}_${slot}`, country);
    let ticks = 0;
    let candidateFirstBuildingTick: number | null = null;
    let baselineFirstBuildingTick: number | null = null;
    let engineFinishedBeforeEstablishment = false;
    let technicalFailure: string | null = null;
    try {
        await withSeededOfflineGame(
            cdapi,
            settings(family.mapName, candidate, baseline, slot),
            requestedEngineSeed,
            [{ agent: candidate, identity: "candidate" }, { agent: baseline, identity: "baseline" }],
            async (game) => {
                while (ticks < METHOD_V6_ECONOMIC_START_MAX_TICKS) {
                    await game.update();
                    ticks++;
                    if (candidateFirstBuildingTick === null && ownedBuildingCount(candidate) > 0) {
                        candidateFirstBuildingTick = ticks;
                    }
                    if (baselineFirstBuildingTick === null && ownedBuildingCount(baseline) > 0) {
                        baselineFirstBuildingTick = ticks;
                    }
                    if (candidateFirstBuildingTick !== null && baselineFirstBuildingTick !== null) break;
                    if (game.isFinished()) {
                        engineFinishedBeforeEstablishment = true;
                        break;
                    }
                }
            },
        );
    } catch (error) {
        technicalFailure = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    }
    return {
        ...family,
        country,
        slot,
        seedBlockIndex,
        requestedEngineSeed,
        ticks,
        candidateEstablished: candidateFirstBuildingTick !== null,
        baselineEstablished: baselineFirstBuildingTick !== null,
        candidateFirstBuildingTick,
        baselineFirstBuildingTick,
        engineFinishedBeforeEstablishment,
        technicalFailure,
    };
};

const main = async (): Promise<void> => {
    const campaignPath = requiredPath("METHOD_V6_SOURCE_CAMPAIGN");
    const outputPath = requiredPath("OUT_FILE");
    if (fs.existsSync(outputPath)) throw new Error(`Refusing to overwrite ${outputPath}`);
    if (!process.env.BASELINE_PACKAGE_ROOT || process.env.REQUIRE_EXTERNAL_BASELINE !== "true") {
        throw new Error("Economic-start gate requires the pinned external baseline");
    }
    const repoRoot = path.resolve(process.cwd(), "..", "..");
    const mixDir = path.join(process.cwd(), "data");
    const families = loadFamilies(campaignPath);
    for (const family of families) {
        if (sha256File(path.join(mixDir, family.mapName)) !== family.mapSha256) {
            throw new Error(`Economic-start map bytes drifted for ${family.familyId}`);
        }
    }
    const factory = await loadBaselineFactory(path.join(repoRoot, "packages", "chronodivide-bot"));
    await cdapi.init(mixDir);
    const trials: EconomicStartTrial[] = [];
    let seedBlockIndex = 0;
    for (const family of families) for (const country of Object.values(Countries)) for (const slot of [0, 1] as const) {
        trials.push(await runTrial(factory, family, country, slot, seedBlockIndex++));
    }
    const familyResults = reduceEconomicStartFamilies(families, trials);
    const manifest = createExperimentManifest({
        runId: `method-v6-economic-start-${process.env.SLURM_JOB_ID ?? "local"}`,
        mixDir,
        maps: families.map(({ mapName }) => mapName),
        effectiveConfig: {
            purpose: "outcome-free-external-supalosa-economic-start-and-endpoint-establishment-compatibility",
            countries: Object.values(Countries),
            reciprocalSlots: [0, 1],
            maxTicks: METHOD_V6_ECONOMIC_START_MAX_TICKS,
            shortGame: false,
            policyComparison: false,
            winnerFieldsRecorded: false,
            scoreFieldsRecorded: false,
        },
        baseline: factory.descriptor,
        gameSeedBase: METHOD_V6_ECONOMIC_START_ENGINE_SEED_BASE,
    });
    if (
        manifest.scheduler.account !== "pi_jss233" || manifest.source.gitBranch !== "main" ||
        manifest.source.trackedDirty !== false || manifest.software.baseline.kind !== "external-package" ||
        manifest.software.baseline.trackedDirty !== false || trials.length !== families.length * 18
    ) throw new Error("Economic-start provenance or coverage failed");
    const supported = familyResults.filter(({ supported }) => supported);
    const unsupported = familyResults.filter(({ supported }) => !supported);
    const output = {
        schemaVersion: METHOD_V6_ECONOMIC_START_GATE_SCHEMA_VERSION,
        status: unsupported.length === 0
            ? "PASS_METHOD_V6_ECONOMIC_START_GATE_ALL_FAMILIES_SUPPORTED"
            : "COMPLETE_METHOD_V6_ECONOMIC_START_GATE_WITH_UNSUPPORTED_FAMILIES",
        generatedAt: new Date().toISOString(),
        outcomeFree: true,
        sourceCampaignPath: campaignPath,
        sourceCampaignSha256: sha256File(campaignPath),
        sourceGitCommit: manifest.source.gitCommit,
        scheduler: manifest.scheduler,
        externalBaseline: manifest.software.baseline,
        gameApiRuntimeTree: manifest.software.gameApiRuntimeTree,
        packageLockSha256: manifest.software.packageLockSha256,
        familyCount: families.length,
        countryCount: Object.values(Countries).length,
        reciprocalSlotCount: 2,
        trialCount: trials.length,
        maxTicks: METHOD_V6_ECONOMIC_START_MAX_TICKS,
        supportedFamilyCount: supported.length,
        unsupportedFamilyCount: unsupported.length,
        supportedFamilyIds: supported.map(({ familyId }) => familyId),
        unsupportedFamilyIds: unsupported.map(({ familyId }) => familyId),
        familyResults,
        trials,
        forbiddenOutcomeFields: ["winner", "score", "candidateScore", "outcomeStatus"],
        authorizedUse: "freeze-supported-subset-and-rerun-complete-open-training-campaign",
    };
    fs.mkdirSync(path.dirname(outputPath), { recursive: true, mode: 0o700 });
    fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({
        outputPath,
        outputSha256: sha256File(outputPath),
        status: output.status,
        supportedFamilyCount: supported.length,
        unsupportedFamilyCount: unsupported.length,
    }));
};

const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (import.meta.url === invoked) main().catch((error) => { console.error(error); process.exitCode = 1; });
