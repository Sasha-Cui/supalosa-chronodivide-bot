import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { loadBaselineFactory } from "../benchmark/baselineLoader.js";
import { validateMapLoadCompatibility } from "../benchmark/mapLoadAttestation.js";
import { createExperimentManifest } from "../benchmark/provenance.js";
import { assertOfflineAgentRuntimeIdentity } from "../benchmark/seededOfflineGame.js";
import {
    OFFICIAL_MAP_LIVE_COUNTRIES,
    validateOfficialMapLiveCampaign,
} from "./officialMapLiveCompatibilityCampaign.js";
import { sha256File } from "./methodV5PlanRunner.js";

const SHA256 = /^[0-9a-f]{64}$/;
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

const main = async (): Promise<void> => {
    if (process.env.SLURM_JOB_ACCOUNT !== "pi_jss233") {
        throw new Error("Official-map runtime preflight requires Slurm account pi_jss233");
    }
    if (!process.env.BASELINE_PACKAGE_ROOT || process.env.REQUIRE_EXTERNAL_BASELINE !== "true") {
        throw new Error("Official-map runtime preflight requires exact external Supalosa");
    }
    const campaignPath = requiredPath("CAMPAIGN_PATH");
    const campaignSha256 = requiredSha256("CAMPAIGN_SHA256");
    const outFile = requiredPath("OUT_FILE");
    if (fs.existsSync(outFile)) throw new Error(`Refusing to overwrite ${outFile}`);
    if (sha256File(campaignPath) !== campaignSha256) throw new Error("Official-map preflight campaign drifted");
    const campaign = validateOfficialMapLiveCampaign(JSON.parse(fs.readFileSync(campaignPath, "utf8")));

    const repoRoot = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
    const driverRoot = path.join(repoRoot, "packages", "chronodivide-bot-driver");
    if (path.resolve(process.cwd()) !== driverRoot) {
        throw new Error(`Official-map runtime preflight must start in ${driverRoot}`);
    }
    const head = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    const forkMain = execFileSync("git", ["rev-parse", "fork/main"], { encoding: "utf8" }).trim();
    const branch = execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim();
    const trackedStatus = execFileSync(
        "git", ["status", "--short", "--untracked-files=no"], { encoding: "utf8" },
    ).trim();
    if (head !== campaign.sourceGitCommit || forkMain !== head || branch !== "main" || trackedStatus !== "") {
        throw new Error("Official-map runtime preflight requires the campaign's clean pushed main commit");
    }

    const mapRuntime = validateMapLoadCompatibility();
    if (
        mapRuntime.moduleResolutions.gameApiFileSystemAccessEntry !== mapRuntime.paths.fileSystemAccessEntry ||
        mapRuntime.moduleResolutions.gameApiNodeAdapter !== mapRuntime.paths.fileSystemAccessAdapter ||
        mapRuntime.moduleResolutions.adapterFetchBlobEntry !== mapRuntime.paths.fetchBlobEntry ||
        mapRuntime.moduleResolutions.adapterFetchBlobFrom !== mapRuntime.paths.fetchBlobFrom ||
        mapRuntime.moduleResolutions.adapterFetchBlobFile !== mapRuntime.paths.fetchBlobFile
    ) throw new Error("Official-map transitive runtime identity is not canonical");

    const factory = await loadBaselineFactory(path.join(repoRoot, "packages", "chronodivide-bot"));
    const agents = OFFICIAL_MAP_LIVE_COUNTRIES.map((country, index) =>
        factory.create(`OfficialMapRuntimePreflight_${index}`, country as Countries),
    );
    assertOfflineAgentRuntimeIdentity(agents);
    const manifest = createExperimentManifest({
        runId: `official-map-runtime-preflight-${process.env.SLURM_JOB_ID ?? "local"}`,
        mixDir: path.join(driverRoot, "data"),
        maps: [],
        effectiveConfig: {
            purpose: "outcome-free-official-map-transitive-runtime-preflight",
            campaignSha256,
            familyCount: campaign.familyCount,
            countryCount: campaign.countryCount,
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
    ) throw new Error("Official-map runtime preflight provenance contract failed");

    const output = {
        schemaVersion: 1,
        kind: "official-map-outcome-blind-runtime-preflight",
        status: "PASS_OFFICIAL_MAP_OUTCOME_BLIND_RUNTIME_PREFLIGHT",
        passed: true,
        technicalOnly: true,
        generatedAt: new Date().toISOString(),
        campaignPath,
        campaignSha256,
        sourceGitCommit: campaign.sourceGitCommit,
        sourceRuntimeSha256: campaign.sourceRuntimeSha256,
        externalBaselineGitCommit: campaign.externalBaselineGitCommit,
        externalBaselineRuntimeSha256: campaign.externalBaselineRuntimeSha256,
        gameApiRuntimeSha256: campaign.gameApiRuntimeSha256,
        schedulerJobId: process.env.SLURM_JOB_ID ?? null,
        schedulerAccount: process.env.SLURM_JOB_ACCOUNT,
        countryCount: OFFICIAL_MAP_LIVE_COUNTRIES.length,
        exactBotClassIdentityPassed: true,
        mapRuntime: {
            protocol: mapRuntime.protocol,
            versions: mapRuntime.versions,
            sha256: mapRuntime.sha256,
            implementationTrees: mapRuntime.implementationTrees,
            moduleResolutions: mapRuntime.moduleResolutions,
        },
        fieldsProvenAbsent: [
            "winner", "score", "map result", "policy action", "surviving units", "remaining buildings",
        ],
    };
    fs.mkdirSync(path.dirname(outFile), { recursive: true, mode: 0o700 });
    fs.writeFileSync(outFile, JSON.stringify(output, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({ outFile, sha256: sha256File(outFile), status: output.status }));
};

const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (import.meta.url === invoked) main().catch((error) => { console.error(error); process.exitCode = 1; });
