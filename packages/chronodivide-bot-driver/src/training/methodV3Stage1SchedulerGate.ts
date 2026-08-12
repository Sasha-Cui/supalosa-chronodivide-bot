import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
    METHOD_V3_STAGE1_LAUNCH_COUNT,
    METHOD_V3_STAGE1_SHARD_COUNT,
} from "./methodV3MechanismPlanGenerator.js";
import { validateMethodV3MechanismCampaign } from "./methodV3MechanismTechnicalGate.js";
import { sha256File } from "./researchPlanRunner.js";

export type Stage1SchedulerTask = {
    arrayTaskId: number;
    schedulerJobId: string;
    state: "COMPLETED";
    exitCode: "0:0";
    account: "pi_jss233";
};

export const hasCompleteMethodV3Stage1SchedulerTasks = (value: unknown): value is Stage1SchedulerTask[] =>
    Array.isArray(value) &&
    value.length === METHOD_V3_STAGE1_SHARD_COUNT &&
    value.every((task, index) =>
        isRecord(task) &&
        task.arrayTaskId === index &&
        typeof task.schedulerJobId === "string" &&
        /^\d+$/.test(task.schedulerJobId) &&
        task.state === "COMPLETED" &&
        task.exitCode === "0:0" &&
        task.account === "pi_jss233"
    ) &&
    new Set(value.map(({ schedulerJobId }) => schedulerJobId)).size === METHOD_V3_STAGE1_SHARD_COUNT;

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);

const requiredPath = (name: string): string => {
    const value = process.env[name];
    if (!value) throw new Error(`${name} is required`);
    return path.resolve(value);
};

const requiredArrayJobId = (): string => {
    const value = process.env.ARRAY_JOB_ID;
    if (!value || !/^\d+$/.test(value)) throw new Error("ARRAY_JOB_ID must be numeric");
    return value;
};

export const parseMethodV3Stage1Sacct = (
    raw: string,
    arrayJobId: string,
    expectedTaskCount = METHOD_V3_STAGE1_SHARD_COUNT,
): Stage1SchedulerTask[] => {
    const rows = new Map<number, Stage1SchedulerTask>();
    for (const [lineIndex, line] of raw.split("\n").entries()) {
        if (!line) continue;
        const fields = line.split("|");
        if (fields.length !== 5) {
            throw new Error(`Stage-1 sacct line ${lineIndex + 1} has ${fields.length} fields, expected 5`);
        }
        const [logicalJobId, schedulerJobId, state, exitCode, account] = fields;
        const match = new RegExp(`^${arrayJobId}_(\\d+)$`).exec(logicalJobId);
        if (!match) throw new Error(`Stage-1 sacct row has unexpected logical job ID ${logicalJobId}`);
        const arrayTaskId = Number(match[1]);
        if (
            !/^\d+$/.test(schedulerJobId) ||
            arrayTaskId < 0 ||
            arrayTaskId >= expectedTaskCount ||
            rows.has(arrayTaskId) ||
            state !== "COMPLETED" ||
            exitCode !== "0:0" ||
            account !== "pi_jss233"
        ) {
            throw new Error(`Stage-1 sacct task ${arrayTaskId} is duplicate, failed, or outside the frozen campaign`);
        }
        rows.set(arrayTaskId, {
            arrayTaskId,
            schedulerJobId,
            state,
            exitCode,
            account,
        });
    }
    if (rows.size !== expectedTaskCount) {
        throw new Error(`Stage-1 sacct returned ${rows.size}/${expectedTaskCount} exact task rows`);
    }
    return [...rows.values()].sort((left, right) => left.arrayTaskId - right.arrayTaskId);
};

const main = (): void => {
    const campaignPath = requiredPath("CAMPAIGN");
    const technicalGatePath = requiredPath("TECHNICAL_GATE");
    const outputPath = requiredPath("OUT_FILE");
    const arrayJobId = requiredArrayJobId();
    if (fs.existsSync(outputPath)) throw new Error(`Refusing to overwrite Stage-1 scheduler gate ${outputPath}`);
    const campaign = validateMethodV3MechanismCampaign(JSON.parse(fs.readFileSync(campaignPath, "utf8")));
    const gate = JSON.parse(fs.readFileSync(technicalGatePath, "utf8")) as unknown;
    if (
        !isRecord(gate) ||
        gate.status !== "PASSED_METHOD_V3_STAGE1_TECHNICAL_GATE_OUTCOMES_NOT_SUMMARIZED" ||
        gate.campaignSha256 !== sha256File(campaignPath) ||
        String(gate.arrayJobId) !== arrayJobId ||
        gate.schedulerAccount !== "pi_jss233" ||
        gate.accountedLaunches !== METHOD_V3_STAGE1_LAUNCH_COUNT ||
        gate.completedLaunches !== METHOD_V3_STAGE1_LAUNCH_COUNT ||
        gate.technicalFailures !== 0 ||
        gate.actualWinInvariantViolations !== 0 ||
        !Array.isArray(gate.schedulerJobIds) ||
        gate.schedulerJobIds.length !== METHOD_V3_STAGE1_SHARD_COUNT
    ) {
        throw new Error("Stage-1 technical gate does not authorize scheduler reconciliation");
    }
    const raw = execFileSync(
        "/opt/slurm/25.11.6/bin/sacct",
        ["-j", arrayJobId, "-n", "-P", "-X", "--format=JobID,JobIDRaw,State,ExitCode,Account"],
        { encoding: "utf8" },
    );
    const tasks = parseMethodV3Stage1Sacct(raw, arrayJobId);
    const manifestIds = (gate.schedulerJobIds as unknown[]).map(String).sort((left, right) => Number(left) - Number(right));
    const schedulerIds = tasks.map(({ schedulerJobId }) => schedulerJobId).sort((left, right) => Number(left) - Number(right));
    if (JSON.stringify(manifestIds) !== JSON.stringify(schedulerIds)) {
        throw new Error("Stage-1 manifest scheduler job IDs differ from authoritative sacct accounting");
    }
    if (campaign.shards.length !== tasks.length) throw new Error("Stage-1 campaign and scheduler task counts differ");
    const output = {
        schemaVersion: 1,
        status: "PASSED_METHOD_V3_STAGE1_SCHEDULER_GATE",
        generatedAt: new Date().toISOString(),
        campaignPath,
        campaignSha256: sha256File(campaignPath),
        technicalGatePath,
        technicalGateSha256: sha256File(technicalGatePath),
        arrayJobId,
        schedulerAccount: "pi_jss233",
        shardCount: METHOD_V3_STAGE1_SHARD_COUNT,
        launchedGameCount: METHOD_V3_STAGE1_LAUNCH_COUNT,
        tasks,
        outcomeFieldsEmitted: [],
        authorizedNextPhase: "method-v3-stage2-plan-generation",
    };
    fs.mkdirSync(path.dirname(outputPath), { recursive: true, mode: 0o700 });
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({
        outputPath,
        outputSha256: sha256File(outputPath),
        status: output.status,
        taskCount: tasks.length,
        schedulerAccount: output.schedulerAccount,
    }));
};

const invokedModuleUrl = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (import.meta.url === invokedModuleUrl) {
    try {
        main();
    } catch (error) {
        console.error(error);
        process.exitCode = 1;
    }
}
