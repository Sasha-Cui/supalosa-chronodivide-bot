import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { cdapi } from "@chronodivide/game-api";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { loadBaselineFactory } from "../benchmark/baselineLoader.js";
import { createExperimentManifest } from "../benchmark/provenance.js";
import { buildMethodV5CloseoutArms } from "./methodV5CloseoutPolicies.js";
import {
    METHOD_V5_EPISODE_SCHEMA_VERSION,
    MethodV5EpisodeResult,
    runMethodV5Episode,
} from "./methodV5Episode.js";
import { methodV5CloseoutPolicySha256 } from "./methodV5Closeout.js";
import { sha256File } from "./methodV5PlanRunner.js";
import { validateMethodV5Result } from "./methodV5TechnicalGate.js";

export const METHOD_V6_ENDPOINT_PROBE_MAP = "cd_chrono_hills.map" as const;
export const METHOD_V6_ENDPOINT_PROBE_MAP_SHA256 =
    "d674520bba62402d1679b5e97d391f238d9dbdd410ff22303ebf5549f26d8d3b" as const;
export const METHOD_V6_ENDPOINT_PROBE_MAX_TICKS = 24_000 as const;

const blocks = [
    { seedBlockIndex: 19, requestedEngineSeed: 3_600_000_019, country: Countries.USA },
    { seedBlockIndex: 22, requestedEngineSeed: 3_600_000_022, country: Countries.GREAT_BRITAIN },
    { seedBlockIndex: 25, requestedEngineSeed: 3_600_000_025, country: Countries.CUBA },
] as const;

const requiredPath = (name: string): string => {
    const value = process.env[name];
    if (!value) throw new Error(`${name} is required`);
    return path.resolve(value);
};

const main = async (): Promise<void> => {
    const repoRoot = path.resolve(process.cwd(), "..", "..");
    const outFile = requiredPath("OUT_FILE");
    if (fs.existsSync(outFile)) throw new Error(`Refusing to overwrite Method-v6 endpoint probe ${outFile}`);
    if (!process.env.BASELINE_PACKAGE_ROOT || process.env.REQUIRE_EXTERNAL_BASELINE !== "true") {
        throw new Error("Method-v6 endpoint probe requires the pinned external baseline");
    }
    const mapPath = path.join(process.cwd(), "data", METHOD_V6_ENDPOINT_PROBE_MAP);
    if (sha256File(mapPath) !== METHOD_V6_ENDPOINT_PROBE_MAP_SHA256) {
        throw new Error("Method-v6 endpoint-probe map bytes drifted");
    }
    const baselineFactory = await loadBaselineFactory(path.join(repoRoot, "packages", "chronodivide-bot"));
    const control = buildMethodV5CloseoutArms().find(({ armId }) => armId === "baseline_control");
    if (!control || control.policy.enabled || methodV5CloseoutPolicySha256(control.policy) !== control.policyId) {
        throw new Error("Method-v6 endpoint probe lacks the exact disabled-overlay control");
    }
    await cdapi.init(path.join(process.cwd(), "data"));
    const results: MethodV5EpisodeResult[] = [];
    for (const block of blocks) for (const candidateSlot of [0, 1] as const) {
        const episodeId = `probe-b${block.seedBlockIndex}-s${candidateSlot}`;
        const result = await runMethodV5Episode({
            schemaVersion: METHOD_V5_EPISODE_SCHEMA_VERSION,
            episodeId,
            familyId: "mf_hills",
            mapName: METHOD_V6_ENDPOINT_PROBE_MAP,
            mapSha256: METHOD_V6_ENDPOINT_PROBE_MAP_SHA256,
            policyId: control.policyId,
            policy: control.policy,
            seedBlockIndex: block.seedBlockIndex,
            requestedEngineSeed: block.requestedEngineSeed,
            candidateSlot,
            candidateCountry: block.country,
            baselineCountry: block.country,
            maxTicks: METHOD_V6_ENDPOINT_PROBE_MAX_TICKS,
        }, baselineFactory);
        results.push(validateMethodV5Result(result, {
            episodeId,
            familyId: "mf_hills",
            mapName: METHOD_V6_ENDPOINT_PROBE_MAP,
            mapSha256: METHOD_V6_ENDPOINT_PROBE_MAP_SHA256,
            policyId: control.policyId,
            candidateSlot,
            country: block.country,
            seedBlockIndex: block.seedBlockIndex,
            requestedEngineSeed: block.requestedEngineSeed,
            maxTicks: METHOD_V6_ENDPOINT_PROBE_MAX_TICKS,
        }));
    }
    const terminalClassCounts = Object.fromEntries(
        [...new Set(results.map(({ outcomeStatus }) => outcomeStatus))]
            .sort()
            .map((status) => [status, results.filter(({ outcomeStatus }) => outcomeStatus === status).length]),
    );
    const technicalFailures = results.filter(({ technicalFailure, winner }) => technicalFailure || winner === null).length;
    const nonliteralTerminationDraws = results.filter(
        ({ outcomeStatus }) => outcomeStatus === "engine_nonliteral_termination_draw",
    ).length;
    if (technicalFailures !== 0 || results.length !== 6 || nonliteralTerminationDraws < 1) {
        throw new Error(
            `Endpoint probe failed: ${technicalFailures} technical failures and ` +
            `${nonliteralTerminationDraws} nonliteral termination draws across ${results.length}/6 episodes`,
        );
    }
    const manifest = createExperimentManifest({
        runId: `method-v6-endpoint-probe-${process.env.SLURM_JOB_ID ?? "local"}`,
        mixDir: path.join(process.cwd(), "data"),
        maps: [METHOD_V6_ENDPOINT_PROBE_MAP],
        effectiveConfig: {
            purpose: "permanently-open-endpoint-v5-engine-termination-schema-probe",
            claimUse: false,
            policyArmId: control.armId,
            policyId: control.policyId,
            blocks,
            reciprocalSlots: [0, 1],
            maxTicks: METHOD_V6_ENDPOINT_PROBE_MAX_TICKS,
            shortGame: false,
        },
        baseline: baselineFactory.descriptor,
        gameSeedBase: 3_600_000_000,
    });
    if (
        manifest.scheduler.account !== "pi_jss233" || manifest.source.gitBranch !== "main" ||
        manifest.source.trackedDirty !== false || manifest.software.baseline.kind !== "external-package" ||
        manifest.software.baseline.trackedDirty !== false
    ) throw new Error("Method-v6 endpoint probe provenance failed");
    const output = {
        schemaVersion: 1,
        status: "PASS_METHOD_V6_ENDPOINT_V5_ENGINE_TERMINATION_PROBE",
        generatedAt: new Date().toISOString(),
        passed: true,
        outcomeAccess: "permanently-open-technical-probe-no-paper-claim",
        claimUse: false,
        requestedEpisodes: 6,
        completedEpisodes: results.length,
        technicalFailures,
        nonliteralTerminationDraws,
        terminalClassCounts,
        manifest,
        results,
    };
    fs.mkdirSync(path.dirname(outFile), { recursive: true, mode: 0o700 });
    fs.writeFileSync(outFile, JSON.stringify(output, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({
        outFile,
        status: output.status,
        completedEpisodes: output.completedEpisodes,
        technicalFailures,
        nonliteralTerminationDraws,
        terminalClassCounts,
    }));
};

const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (import.meta.url === invoked) {
    main().catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
}
