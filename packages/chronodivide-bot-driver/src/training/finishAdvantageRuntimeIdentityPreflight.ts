import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { SupalosaBot } from "@supalosa/chronodivide-bot/dist/bot/bot.js";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { DefaultStrategy } from "@supalosa/chronodivide-bot/dist/bot/strategy/defaultStrategy.js";
import { loadBaselineFactory } from "../benchmark/baselineLoader.js";
import { createExperimentManifest } from "../benchmark/provenance.js";
import { assertOfflineAgentRuntimeIdentity } from "../benchmark/seededOfflineGame.js";
import { sha256File } from "./methodV5PlanRunner.js";

type RecordValue = Record<string, unknown>;
const SHA256 = /^[0-9a-f]{64}$/;
const GIT_COMMIT = /^[0-9a-f]{40}$/;
const COUNTRIES = [
    Countries.USA,
    Countries.KOREA,
    Countries.FRANCE,
    Countries.GERMANY,
    Countries.GREAT_BRITAIN,
    Countries.LIBYA,
    Countries.IRAQ,
    Countries.CUBA,
    Countries.RUSSIA,
] as const;
const isRecord = (value: unknown): value is RecordValue =>
    !!value && typeof value === "object" && !Array.isArray(value);
const requiredPath = (name: string): string => {
    const value = process.env[name];
    if (!value) throw new Error(`${name} is required`);
    return path.resolve(value);
};
const requiredSha256 = (name: string): string => {
    const value = process.env[name];
    if (!value || !SHA256.test(value)) throw new Error(`${name} is invalid`);
    return value;
};
const digest = (value: unknown): string => crypto.createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex");

export const assertSamePhysicalRuntime = (
    driverResolvedPath: string,
    externalResolvedPath: string,
): string => {
    const driverCanonical = fs.realpathSync(driverResolvedPath);
    const externalCanonical = fs.realpathSync(externalResolvedPath);
    if (driverCanonical !== externalCanonical) {
        throw new Error(
            `game-api physical runtime mismatch: ${driverCanonical} != ${externalCanonical}`,
        );
    }
    return driverCanonical;
};

const main = async (): Promise<void> => {
    if (process.env.SLURM_JOB_ACCOUNT !== "pi_jss233") {
        throw new Error("Finish-advantage runtime preflight requires Slurm account pi_jss233");
    }
    if (!process.env.BASELINE_PACKAGE_ROOT || process.env.REQUIRE_EXTERNAL_BASELINE !== "true") {
        throw new Error("Finish-advantage runtime preflight requires the pinned external baseline");
    }
    const campaignPath = requiredPath("CAMPAIGN_PATH");
    const campaignSha256 = requiredSha256("CAMPAIGN_SHA256");
    const outFile = requiredPath("OUT_FILE");
    if (fs.existsSync(outFile)) throw new Error(`Refusing to overwrite ${outFile}`);
    if (sha256File(campaignPath) !== campaignSha256) throw new Error("Preflight campaign drifted");
    const campaign = JSON.parse(fs.readFileSync(campaignPath, "utf8")) as unknown;
    if (
        !isRecord(campaign) || campaign.schemaVersion !== 2 ||
        campaign.kind !== "finish-advantage-outcome-blind-state-audit" ||
        campaign.status !== "FROZEN_FINISH_ADVANTAGE_OUTCOME_BLIND_STATE_AUDIT_V2_RUNTIME_REPAIR" ||
        typeof campaign.sourceGitCommit !== "string" || !GIT_COMMIT.test(campaign.sourceGitCommit) ||
        typeof campaign.sourceRuntimeSha256 !== "string" || !SHA256.test(campaign.sourceRuntimeSha256) ||
        typeof campaign.externalBaselineGitCommit !== "string" ||
        !GIT_COMMIT.test(campaign.externalBaselineGitCommit) ||
        typeof campaign.externalBaselineRuntimeSha256 !== "string" ||
        !SHA256.test(campaign.externalBaselineRuntimeSha256) ||
        typeof campaign.gameApiRuntimeSha256 !== "string" || !SHA256.test(campaign.gameApiRuntimeSha256) ||
        typeof campaign.packageLockSha256 !== "string" || !SHA256.test(campaign.packageLockSha256) ||
        typeof campaign.engineSeedBase !== "number" || !Array.isArray(campaign.selectedFamilies) ||
        campaign.selectedFamilies.length !== 10
    ) throw new Error("Runtime-preflight campaign contract drifted");

    const repoRoot = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
    const driverRoot = path.join(repoRoot, "packages", "chronodivide-bot-driver");
    if (path.resolve(process.cwd()) !== driverRoot) {
        throw new Error(`Runtime preflight must start in ${driverRoot}`);
    }
    const head = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    const forkMain = execFileSync("git", ["rev-parse", "fork/main"], { encoding: "utf8" }).trim();
    const branch = execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim();
    const trackedStatus = execFileSync(
        "git", ["status", "--short", "--untracked-files=no"], { encoding: "utf8" },
    ).trim();
    if (head !== campaign.sourceGitCommit || forkMain !== head || branch !== "main" || trackedStatus !== "") {
        throw new Error("Runtime preflight requires the campaign's clean pushed main commit");
    }

    const driverRequire = createRequire(import.meta.url);
    const externalRequire = createRequire(path.join(process.env.BASELINE_PACKAGE_ROOT, "package.json"));
    const driverResolvedPath = driverRequire.resolve("@chronodivide/game-api");
    const externalResolvedPath = externalRequire.resolve("@chronodivide/game-api");
    const canonicalGameApiPath = assertSamePhysicalRuntime(driverResolvedPath, externalResolvedPath);

    const localBotResolvedPath = driverRequire.resolve("@supalosa/chronodivide-bot/dist/bot/bot.js");
    const canonicalLocalBotPath = fs.realpathSync(path.join(
        repoRoot,
        "packages",
        "chronodivide-bot",
        "dist",
        "bot",
        "bot.js",
    ));
    if (fs.realpathSync(localBotResolvedPath) !== canonicalLocalBotPath) {
        throw new Error("driver Supalosa dependency is not the canonical local workspace package");
    }

    const factory = await loadBaselineFactory(path.join(repoRoot, "packages", "chronodivide-bot"));
    const agents = COUNTRIES.map((country, index) =>
        factory.create(`FinishAdvantageRuntimePreflight_${index}`, country),
    );
    const localWorkspaceAgent = new SupalosaBot(
        "FinishAdvantageLocalWorkspacePreflight", Countries.USA, [], false, new DefaultStrategy(),
    );
    assertOfflineAgentRuntimeIdentity([...agents, localWorkspaceAgent]);
    const firstFamily = campaign.selectedFamilies[0];
    if (!isRecord(firstFamily) || typeof firstFamily.mapName !== "string") {
        throw new Error("Runtime preflight lacks a committed map witness");
    }
    const manifest = createExperimentManifest({
        runId: `finish-advantage-runtime-identity-preflight-${process.env.SLURM_JOB_ID ?? "local"}`,
        mixDir: path.join(driverRoot, "data"),
        maps: [firstFamily.mapName],
        effectiveConfig: {
            purpose: "outcome-free-physical-runtime-and-external-agent-identity-preflight",
            campaignSha256,
            countryCount: COUNTRIES.length,
            outcomeInspection: false,
        },
        baseline: factory.descriptor,
        gameSeedBase: campaign.engineSeedBase,
    });
    if (
        manifest.scheduler.account !== "pi_jss233" || manifest.source.gitCommit !== campaign.sourceGitCommit ||
        manifest.source.gitBranch !== "main" || manifest.source.trackedDirty !== false ||
        digest(manifest.source.runtimeTrees) !== campaign.sourceRuntimeSha256 ||
        manifest.software.baseline.kind !== "external-package" ||
        manifest.software.baseline.gitCommit !== campaign.externalBaselineGitCommit ||
        manifest.software.baseline.trackedDirty !== false ||
        manifest.software.baseline.runtimeTree.sha256 !== campaign.externalBaselineRuntimeSha256 ||
        manifest.software.gameApiRuntimeTree.sha256 !== campaign.gameApiRuntimeSha256 ||
        manifest.software.packageLockSha256 !== campaign.packageLockSha256
    ) throw new Error("Runtime preflight provenance contract failed");

    const output = {
        schemaVersion: 1,
        kind: "finish-advantage-runtime-identity-preflight",
        status: "PASS_OUTCOME_FREE_FINISH_ADVANTAGE_RUNTIME_IDENTITY_PREFLIGHT",
        passed: true,
        outcomeFree: true,
        generatedAt: new Date().toISOString(),
        campaignPath,
        campaignSha256,
        sourceGitCommit: campaign.sourceGitCommit,
        sourceRuntimeSha256: campaign.sourceRuntimeSha256,
        baselineGitCommit: campaign.externalBaselineGitCommit,
        baselineRuntimeSha256: campaign.externalBaselineRuntimeSha256,
        gameApiRuntimeSha256: campaign.gameApiRuntimeSha256,
        schedulerJobId: process.env.SLURM_JOB_ID ?? null,
        schedulerAccount: process.env.SLURM_JOB_ACCOUNT,
        canonicalGameApiPath,
        driverResolvedPath,
        externalResolvedPath,
        canonicalLocalBotPath,
        localBotResolvedPath,
        countries: COUNTRIES,
        externalAgentCount: agents.length,
        localWorkspaceAgentCount: 1,
        exactBotClassIdentityPassed: true,
        fieldsProvenAbsent: ["winner", "score", "outcome", "policy action", "state exposure"],
    };
    fs.mkdirSync(path.dirname(outFile), { recursive: true, mode: 0o700 });
    fs.writeFileSync(outFile, JSON.stringify(output, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({ outFile, sha256: sha256File(outFile), status: output.status }));
};

const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (import.meta.url === invoked) main().catch((error) => { console.error(error); process.exitCode = 1; });
