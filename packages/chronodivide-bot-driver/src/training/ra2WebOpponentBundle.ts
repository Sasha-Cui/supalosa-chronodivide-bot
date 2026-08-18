import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { ActionsApi, Bot, GameApi, ProductionApi } from "@chronodivide/game-api";
import * as gameApi from "@chronodivide/game-api";
import * as three from "three";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";

export const RA2WEB_FREEZE_MANIFEST_SHA256 =
    "a405c0fc6d1d6541f965582c9b53be0bfd01c0c68f4d0f340e1a5ae37671aa5d" as const;
export const RA2WEB_CLIENT_COMMIT = "218fb800614295119e25040986b175fee4c3670f" as const;
export const RA2WEB_CLIENT_RELEASE_ID = "0.84.1-r1d35349-dd6a17b9c" as const;

export type Ra2WebOpponentId = "ra2web_standard" | "ra2web_sea_land" | "ra2web_advanced_old_priest";
export type Ra2WebOpponentDescriptor = {
    opponentId: Ra2WebOpponentId;
    clientDifficulty: "Medium" | "MediumSea" | "Advanced";
    bundleFile: "spbots.min.js" | "spbots2.min.js" | "spbots3.min.js";
    bundleSha256: string;
    expectedVersion: string;
    expectedBuildId: string | null;
};

export const RA2WEB_OPPONENT_DESCRIPTORS: readonly Ra2WebOpponentDescriptor[] = Object.freeze([
    {
        opponentId: "ra2web_standard",
        clientDifficulty: "Medium",
        bundleFile: "spbots.min.js",
        bundleSha256: "00ede36939d614b96f830d288fe8ac22c1c5b95dea65c3f09e3fa3e56e99d348",
        expectedVersion: "0.84.1",
        expectedBuildId: null,
    },
    {
        opponentId: "ra2web_sea_land",
        clientDifficulty: "MediumSea",
        bundleFile: "spbots2.min.js",
        bundleSha256: "89899c6f4ba57d3e4cb6db0bca5dc0d0ae6310b10da81a77196bd1eb44f2a54f",
        expectedVersion: "0.84.1",
        expectedBuildId: null,
    },
    {
        opponentId: "ra2web_advanced_old_priest",
        clientDifficulty: "Advanced",
        bundleFile: "spbots3.min.js",
        bundleSha256: "81d8797b6dd1371ba2dcbd79e25df8b42254290c820159e121a82650fd97a143",
        expectedVersion: "0.83.1-bot3",
        expectedBuildId: "ra2web-0.83.1-ai-old-priest-phase258-20260716",
    },
]);

type RecordValue = Record<string, unknown>;
type BotConstructor = new (...args: any[]) => Bot;
export type Ra2WebBotModule = {
    SupalosaBot: BotConstructor;
    version: string;
    buildInfo: RecordValue | null;
    telemetrySchemaVersion: number | null;
};
export type InspectableRa2WebBot = Bot & {
    lastGameApi: GameApi | null;
    lastPlayerActions: ActionsApi | null;
    lastPlayerProduction: ProductionApi | null;
};
export type LoadedRa2WebOpponent = {
    descriptor: Ra2WebOpponentDescriptor;
    module: Ra2WebBotModule;
    bundlePath: string;
    bundleBytes: number;
    bundleSha256: string;
    freezeManifestPath: string;
    freezeManifestSha256: typeof RA2WEB_FREEZE_MANIFEST_SHA256;
};

const isRecord = (value: unknown): value is RecordValue =>
    !!value && typeof value === "object" && !Array.isArray(value);
const sha256Buffer = (value: Buffer | string): string => crypto.createHash("sha256").update(value).digest("hex");
const exactDescriptor = (opponentId: Ra2WebOpponentId): Ra2WebOpponentDescriptor => {
    const descriptor = RA2WEB_OPPONENT_DESCRIPTORS.find((candidate) => candidate.opponentId === opponentId);
    if (!descriptor) throw new Error(`Unknown RA2Web opponent ${opponentId}`);
    return descriptor;
};

export const evaluateRa2WebAmdBundle = (
    code: string,
    descriptor: Ra2WebOpponentDescriptor,
): Ra2WebBotModule => {
    const actualSha256 = sha256Buffer(code);
    if (actualSha256 !== descriptor.bundleSha256) {
        throw new Error(`RA2Web ${descriptor.opponentId} bundle SHA-256 drifted`);
    }
    let definitionCount = 0;
    let captured: unknown;
    const define = (
        moduleName: unknown,
        dependencies: unknown,
        factory: unknown,
    ): void => {
        definitionCount += 1;
        if (definitionCount !== 1) throw new Error("RA2Web bundle defined more than once");
        if (moduleName !== "SPBots" || !Array.isArray(dependencies) || typeof factory !== "function") {
            throw new Error("RA2Web bundle has an invalid AMD definition");
        }
        if (
            dependencies.length !== 2 || dependencies[0] !== "@chronodivide/game-api" ||
            dependencies[1] !== "three"
        ) throw new Error("RA2Web bundle dependencies drifted");
        captured = (factory as (...args: unknown[]) => unknown)(gameApi, three);
    };
    Object.assign(define, { amd: true });
    const context = vm.createContext({
        define,
        console,
        setTimeout,
        clearTimeout,
        TextEncoder,
        TextDecoder,
        structuredClone,
        performance,
    });
    new vm.Script(code, {
        filename: descriptor.bundleFile,
        displayErrors: true,
    }).runInContext(context, { timeout: 10_000 });
    if (definitionCount !== 1 || !isRecord(captured) || typeof captured.SupalosaBot !== "function") {
        throw new Error("RA2Web bundle did not export one SupalosaBot constructor");
    }
    if (captured.version !== descriptor.expectedVersion) {
        throw new Error(`RA2Web ${descriptor.opponentId} version drifted`);
    }
    const buildInfo = isRecord(captured.buildInfo) ? captured.buildInfo : null;
    const telemetrySchemaVersion = typeof captured.telemetrySchemaVersion === "number"
        ? captured.telemetrySchemaVersion
        : null;
    if (descriptor.opponentId === "ra2web_advanced_old_priest") {
        if (
            !buildInfo || buildInfo.generation !== 3 || buildInfo.rulesDriven !== true ||
            buildInfo.buildId !== descriptor.expectedBuildId || buildInfo.replacesExistingDifficulty !== false ||
            buildInfo.telemetrySchemaVersion !== telemetrySchemaVersion || telemetrySchemaVersion !== 111
        ) throw new Error("RA2Web Advanced build identity drifted");
    } else if (buildInfo !== null || telemetrySchemaVersion !== null) {
        throw new Error(`RA2Web ${descriptor.opponentId} unexpectedly exported Bot3 metadata`);
    }
    const module: Ra2WebBotModule = {
        SupalosaBot: captured.SupalosaBot as BotConstructor,
        version: captured.version,
        buildInfo,
        telemetrySchemaVersion,
    };
    const identityProbe = new module.SupalosaBot(`RA2WebIdentity_${descriptor.opponentId}`, Countries.USA);
    if (!(identityProbe instanceof Bot)) {
        throw new Error(`RA2Web ${descriptor.opponentId} loaded a second physical game-api Bot class`);
    }
    return module;
};

const validateFreezeManifest = (manifestPath: string): void => {
    const bytes = fs.readFileSync(manifestPath);
    if (sha256Buffer(bytes) !== RA2WEB_FREEZE_MANIFEST_SHA256) {
        throw new Error("RA2Web source-freeze manifest drifted");
    }
    const value = JSON.parse(bytes.toString("utf8")) as unknown;
    if (
        !isRecord(value) || value.schemaVersion !== 1 ||
        value.kind !== "ra2web-opponent-source-freeze" ||
        value.status !== "FROZEN_RA2WEB_EXTERNAL_OPPONENTS_V1_NO_STRENGTH_CLAIM" ||
        value.clientCommit !== RA2WEB_CLIENT_COMMIT || value.clientReleaseId !== RA2WEB_CLIENT_RELEASE_ID ||
        value.outcomeAccess !== "no-policy-outcome-generated-or-inspected" ||
        !Array.isArray(value.opponents) || value.opponents.length !== RA2WEB_OPPONENT_DESCRIPTORS.length
    ) throw new Error("RA2Web source-freeze manifest has an invalid schema");
    for (const descriptor of RA2WEB_OPPONENT_DESCRIPTORS) {
        const row = value.opponents.find((item): item is RecordValue =>
            isRecord(item) && item.opponentId === descriptor.opponentId,
        );
        if (
            !row || row.bundleFile !== descriptor.bundleFile ||
            row.bundleSha256 !== descriptor.bundleSha256 || row.clientDifficulty !== descriptor.clientDifficulty
        ) throw new Error(`RA2Web freeze row drifted for ${descriptor.opponentId}`);
    }
};

export const loadRa2WebOpponent = (
    freezeRoot: string,
    opponentId: Ra2WebOpponentId,
): LoadedRa2WebOpponent => {
    const resolvedRoot = path.resolve(freezeRoot);
    const manifestPath = path.join(resolvedRoot, "freeze-manifest-v1.json");
    validateFreezeManifest(manifestPath);
    const descriptor = exactDescriptor(opponentId);
    const bundlePath = path.join(resolvedRoot, descriptor.bundleFile);
    const stat = fs.lstatSync(bundlePath);
    if (!stat.isFile() || stat.isSymbolicLink()) {
        throw new Error(`RA2Web ${opponentId} bundle must be a regular non-symlink file`);
    }
    const code = fs.readFileSync(bundlePath, "utf8");
    const module = evaluateRa2WebAmdBundle(code, descriptor);
    return {
        descriptor,
        module,
        bundlePath,
        bundleBytes: stat.size,
        bundleSha256: sha256Buffer(code),
        freezeManifestPath: manifestPath,
        freezeManifestSha256: RA2WEB_FREEZE_MANIFEST_SHA256,
    };
};

export const createInspectableRa2WebBot = (
    loaded: LoadedRa2WebOpponent,
    name: string,
    country: Countries,
): InspectableRa2WebBot => {
    const Base = loaded.module.SupalosaBot;
    class InspectableBot extends Base {
        public lastGameApi: GameApi | null = null;
        public lastPlayerActions: ActionsApi | null = null;
        public lastPlayerProduction: ProductionApi | null = null;

        override onGameStart(game: GameApi): void {
            this.lastGameApi = game;
            this.lastPlayerActions = (this as unknown as { player: { actions: ActionsApi } }).player.actions;
            this.lastPlayerProduction =
                (this as unknown as { player: { production: ProductionApi } }).player.production;
            super.onGameStart(game);
        }

        override onGameTick(game: GameApi): void {
            this.lastGameApi = game;
            super.onGameTick(game);
        }
    }
    const bot = new InspectableBot(name, country) as InspectableRa2WebBot;
    if (!(bot instanceof Bot)) throw new Error(`RA2Web ${loaded.descriptor.opponentId} Bot identity failed`);
    return bot;
};
