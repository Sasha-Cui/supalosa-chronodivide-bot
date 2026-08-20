import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

type Winner = "candidate" | "baseline" | "draw";
type Row = {
    endpoint: string;
    endpointVersion: number;
    endpointSha256: string;
    taskIndex: number;
    countryOrdinal: number;
    country: string;
    seedIndex: number;
    requestedEngineSeed: number;
    candidateSlot: 0 | 1;
    candidateStart: { x: number; y: number };
    baselineStart: { x: number; y: number };
    maxTicks: number;
    ticks: number;
    status: string;
    winner: Winner;
    terminalBuildingCounts: { candidate: number; baseline: number };
    quitAttempts: { candidate: number; baseline: number };
};

const SHA256 = /^[0-9a-f]{64}$/;
const T_CRITICAL_ONE_SIDED_95_DF89 = 1.662155325;
const BOOTSTRAP_REPLICATES = 200_000;
const BOOTSTRAP_SEED = 20_260_820;

const requiredPath = (name: string): string => {
    const value = process.env[name];
    if (!value) throw new Error(`${name} is required`);
    return path.resolve(value);
};

const requiredText = (name: string, pattern: RegExp): string => {
    const value = process.env[name];
    if (!value || !pattern.test(value)) throw new Error(`${name} is invalid`);
    return value;
};

const sha256File = (filePath: string): string =>
    crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
const isRecord = (value: unknown): value is Record<string, unknown> =>
    !!value && typeof value === "object" && !Array.isArray(value);
const startKey = (row: Row): string => `${row.candidateStart.x},${row.candidateStart.y}`;

const quantile = (values: number[], probability: number): number => {
    if (values.length === 0) throw new Error("Cannot compute a quantile of an empty sample");
    const sorted = [...values].sort((left, right) => left - right);
    const index = (sorted.length - 1) * probability;
    const lower = Math.floor(index), upper = Math.ceil(index);
    return lower === upper ? sorted[lower] : sorted[lower] * (upper - index) + sorted[upper] * (index - lower);
};

const mean = (values: number[]): number => values.reduce((total, value) => total + value, 0) / values.length;
const sampleStandardDeviation = (values: number[]): number => {
    const center = mean(values);
    return Math.sqrt(values.reduce((total, value) => total + (value - center) ** 2, 0) / (values.length - 1));
};

const summarize = (rows: Row[]) => {
    const wins = rows.filter((row) => row.winner === "candidate").length;
    const losses = rows.filter((row) => row.winner === "baseline").length;
    const draws = rows.length - wins - losses;
    const ticks = rows.map((row) => row.ticks);
    return {
        games: rows.length,
        wins,
        draws,
        losses,
        winRate: wins / rows.length,
        medianTicks: quantile(ticks, 0.5),
        p25Ticks: quantile(ticks, 0.25),
        p75Ticks: quantile(ticks, 0.75),
    };
};

const groupRows = (rows: Row[], key: (row: Row) => string): Record<string, ReturnType<typeof summarize>> => {
    const groups = new Map<string, Row[]>();
    for (const row of rows) {
        const groupKey = key(row), group = groups.get(groupKey) ?? [];
        group.push(row);
        groups.set(groupKey, group);
    }
    return Object.fromEntries([...groups.entries()].sort(([left], [right]) => left.localeCompare(right))
        .map(([groupKey, group]) => [groupKey, summarize(group)]));
};

const xorshift32 = (initialSeed: number): (() => number) => {
    let state = initialSeed >>> 0;
    return () => {
        state ^= state << 13;
        state ^= state >>> 17;
        state ^= state << 5;
        return (state >>> 0) / 0x1_0000_0000;
    };
};

const countBy = (values: string[]): Record<string, number> => {
    const counts = new Map<string, number>();
    for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
    return Object.fromEntries([...counts.entries()].sort(([left], [right]) => left.localeCompare(right)));
};

const main = (): void => {
    const inputPath = requiredPath("INPUT_PATH"), outputPath = requiredPath("OUT_PATH");
    const inputSha256 = requiredText("INPUT_SHA256", SHA256);
    if (fs.existsSync(outputPath)) throw new Error(`Refusing to overwrite ${outputPath}`);
    if (sha256File(inputPath) !== inputSha256) throw new Error("HFO literal pilot input hash drifted");

    const parsed = JSON.parse(fs.readFileSync(inputPath, "utf8")) as unknown;
    if (!isRecord(parsed) || parsed.kind !== "hfo-literal-pilot-finalizer" ||
        parsed.status !== "ADVANCE_HFO_LITERAL_POLICY" || parsed.complete !== true || parsed.passed !== true ||
        parsed.launchedGameCount !== 180 || !Array.isArray(parsed.rows) || parsed.rows.length !== 180 ||
        !Array.isArray(parsed.schedulerJobIds) || parsed.schedulerJobIds.length !== 90 ||
        new Set(parsed.schedulerJobIds).size !== 90) {
        throw new Error("HFO literal pilot aggregate is incomplete or ineligible");
    }
    const rows = parsed.rows as Row[];
    const identities = new Set(rows.map((row) => `${row.countryOrdinal}:${row.seedIndex}:${row.candidateSlot}`));
    if (identities.size !== 180 || rows.some((row) =>
        !["candidate", "baseline", "draw"].includes(row.winner) ||
        ![0, 1].includes(row.candidateSlot) || row.ticks < 1 || row.ticks > row.maxTicks ||
        row.quitAttempts.candidate < 0 || row.quitAttempts.baseline < 0)) {
        throw new Error("HFO literal pilot row coverage or values drifted");
    }
    const endpointIdentities = new Set(rows.map((row) =>
        `${row.endpointVersion}:${row.endpointSha256}:${row.endpoint}`));
    if (endpointIdentities.size !== 1) throw new Error("Literal endpoint identity drifted across rows");

    const familyRows = new Map<string, Row[]>();
    for (const row of rows) {
        const key = `${row.countryOrdinal}:${row.seedIndex}`, family = familyRows.get(key) ?? [];
        family.push(row);
        familyRows.set(key, family);
    }
    if (familyRows.size !== 90 || [...familyRows.values()].some((family) =>
        family.length !== 2 || new Set(family.map((row) => row.candidateSlot)).size !== 2)) {
        throw new Error("Reciprocal country-seed family coverage drifted");
    }

    const familyWinRates = [...familyRows.values()].map((family) =>
        family.filter((row) => row.winner === "candidate").length / family.length);
    const clusterMean = mean(familyWinRates);
    const clusterSd = sampleStandardDeviation(familyWinRates);
    const clusterSe = clusterSd / Math.sqrt(familyWinRates.length);
    const clusterTLower = clusterMean - T_CRITICAL_ONE_SIDED_95_DF89 * clusterSe;
    const random = xorshift32(BOOTSTRAP_SEED), bootstrapMeans: number[] = [];
    for (let replicate = 0; replicate < BOOTSTRAP_REPLICATES; replicate += 1) {
        let total = 0;
        for (let draw = 0; draw < familyWinRates.length; draw += 1) {
            total += familyWinRates[Math.floor(random() * familyWinRates.length)];
        }
        bootstrapMeans.push(total / familyWinRates.length);
    }
    bootstrapMeans.sort((left, right) => left - right);
    const bootstrapAt = (probability: number): number =>
        bootstrapMeans[Math.floor(probability * (bootstrapMeans.length - 1))];

    const starts = groupRows(rows, startKey), west = starts["39,82"], bottom = starts["88,157"];
    if (!west || !bottom || Object.keys(starts).length !== 4) throw new Error("HFO start coverage drifted");
    const reciprocalPatterns = countBy([...familyRows.values()].map((family) =>
        family.sort((left, right) => left.candidateSlot - right.candidateSlot)
            .map((row) => row.winner === "candidate" ? "W" : row.winner === "baseline" ? "L" : "D").join("")));
    const statusCounts = countBy(rows.map((row) => row.status));
    const quitAttemptsByStart = Object.fromEntries(Object.keys(starts).sort().map((start) => {
        const startRows = rows.filter((row) => startKey(row) === start);
        return [start, {
            candidate: startRows.reduce((total, row) => total + row.quitAttempts.candidate, 0),
            baseline: startRows.reduce((total, row) => total + row.quitAttempts.baseline, 0),
        }];
    }));
    const drawRows = rows.filter((row) => row.winner === "draw");
    const drawBuildingAdvantage = countBy(drawRows.map((row) =>
        row.terminalBuildingCounts.candidate > row.terminalBuildingCounts.baseline ? "candidate_more" :
            row.terminalBuildingCounts.candidate < row.terminalBuildingCounts.baseline ? "candidate_fewer" : "equal"));

    const checks = {
        pooledClusterLowerAboveHalf: clusterTLower > 0.5,
        bootstrapClusterLowerAboveHalf: bootstrapAt(0.05) > 0.5,
        allStartsRepresented: Object.keys(starts).length === 4,
        westWinsExceedLosses: west.wins > west.losses,
        westRawWinRateAboveHalf: west.winRate > 0.5,
        bottomWinsExceedLosses: bottom.wins > bottom.losses,
    };
    const output = {
        schemaVersion: 1,
        kind: "hfo-literal-pilot-complete-analysis",
        generatedAt: new Date().toISOString(),
        inputPath,
        inputSha256,
        sourceGitCommit: parsed.sourceGitCommit,
        endpointIdentity: [...endpointIdentities][0],
        scheduler: { arrayJobId: parsed.arrayJobId, finalizerJobId: parsed.controllerJobId },
        overall: summarize(rows),
        uncertainty: {
            independentUnit: "country-seed reciprocal pair",
            clusterCount: familyWinRates.length,
            clusterMean,
            clusterSampleStandardDeviation: clusterSd,
            clusterStandardError: clusterSe,
            oneSided95TLower: clusterTLower,
            tCritical: T_CRITICAL_ONE_SIDED_95_DF89,
            degreesOfFreedom: 89,
            bootstrap: {
                method: "percentile cluster bootstrap",
                seed: BOOTSTRAP_SEED,
                replicates: BOOTSTRAP_REPLICATES,
                oneSided95Lower: bootstrapAt(0.05),
                twoSided95: [bootstrapAt(0.025), bootstrapAt(0.975)],
            },
        },
        byCountry: groupRows(rows, (row) => row.country),
        byCandidateSlot: groupRows(rows, (row) => String(row.candidateSlot)),
        byCandidateStart: starts,
        reciprocalPatterns,
        statusCounts,
        quitAttemptsByStart,
        drawBuildingAdvantage,
        checks,
        conclusion: checks.westWinsExceedLosses && checks.westRawWinRateAboveHalf
            ? "eligible_for_all_start_confirmation" : "pooled_positive_but_requires_west_start_repair",
    };
    fs.mkdirSync(path.dirname(outputPath), { recursive: true, mode: 0o700 });
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({ conclusion: output.conclusion, overall: output.overall,
        clusterLower: clusterTLower, bootstrapLower: output.uncertainty.bootstrap.oneSided95Lower, west }));
};

const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (import.meta.url === invoked) {
    try { main(); } catch (error) { console.error(error); process.exitCode = 1; }
}
