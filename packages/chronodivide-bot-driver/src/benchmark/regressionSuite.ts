import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

type BenchmarkSummary = {
    generatedAt: string;
    maps: string[];
    matchesPerPair: number;
    maxTicks: number;
    results: Array<{
        winner: "candidate" | "baseline" | "draw";
        ticks: number;
        candidateCombatants: number;
        baselineCombatants: number;
        candidateBuildings: number;
        baselineBuildings: number;
        candidateHarvesters?: number;
        baselineHarvesters?: number;
        candidateFactories?: number;
        baselineFactories?: number;
        candidateRefineries?: number;
        baselineRefineries?: number;
    }>;
    candidateWins: number;
    baselineWins: number;
    draws: number;
    candidateWinRate: number;
};

type Scenario = {
    name: string;
    description: string;
    env: Record<string, string>;
    minWinRate: number;
    maxBaselineWins?: number;
    maxDrawRate?: number;
    optional?: boolean;
};

type ScenarioResult = {
    name: string;
    description: string;
    outDir: string;
    summaryPath: string;
    summary: BenchmarkSummary;
    passed: boolean;
    failures: string[];
};

const scenarios: Scenario[] = [
    {
        name: "simple-arabs-core",
        description: "Tuned simple-map profile versus stock Arabs/French baselines from both slots.",
        env: {
            MAPS: "simple-1v1-no-preview.map",
            CANDIDATE_COUNTRIES: "Arabs",
            BASELINE_COUNTRIES: "Arabs,French",
            MATCHES_PER_PAIR: "1",
            CANDIDATE_SLOTS: "0,1",
            MAX_TICKS: "18000",
        },
        minWinRate: 0.75,
        maxBaselineWins: 1,
        maxDrawRate: 0.25,
    },
    {
        name: "peak-profile-core",
        description: "Peak of Perfection weak-start profile smoke check.",
        env: {
            MAPS: "cd_2_peak_of_perfection.map",
            CANDIDATE_COUNTRIES: "Arabs",
            BASELINE_COUNTRIES: "Arabs",
            MATCHES_PER_PAIR: "1",
            CANDIDATE_SLOTS: "0,1",
            CANDIDATE_STARTS: "37,73",
            BASELINE_STARTS: "118,73",
            START_FILTER_MAX_ATTEMPTS: "60",
            MAX_TICKS: "24000",
        },
        minWinRate: 0.5,
        maxBaselineWins: 1,
        maxDrawRate: 0.5,
        optional: true,
    },
    {
        name: "tikal-profile-core",
        description: "Tikal lower-start rush profile smoke check.",
        env: {
            MAPS: "cd_2_tikal.map",
            CANDIDATE_COUNTRIES: "Arabs",
            BASELINE_COUNTRIES: "Arabs",
            MATCHES_PER_PAIR: "1",
            CANDIDATE_SLOTS: "0,1",
            CANDIDATE_STARTS: "50,119",
            BASELINE_STARTS: "92,22",
            START_FILTER_MAX_ATTEMPTS: "60",
            MAX_TICKS: "24000",
        },
        minWinRate: 0.5,
        maxBaselineWins: 0,
        optional: true,
    },
];

const parseScenarioFilter = (): Set<string> | null => {
    const raw = process.env.REGRESSION_SCENARIOS;
    if (!raw) {
        return null;
    }
    return new Set(raw.split(",").map((name) => name.trim()).filter((name) => name.length > 0));
};

const getSelectedScenarios = (): Scenario[] => {
    const filter = parseScenarioFilter();
    if (!filter) {
        return scenarios;
    }
    return scenarios.filter((scenario) => filter.has(scenario.name));
};

const evaluateScenario = (scenario: Scenario, summary: BenchmarkSummary): string[] => {
    const failures: string[] = [];
    const drawRate = summary.results.length > 0 ? summary.draws / summary.results.length : 1;
    if (summary.results.length === 0) {
        failures.push("no matches completed");
    }
    if (summary.candidateWinRate < scenario.minWinRate) {
        failures.push(
            `win rate ${(summary.candidateWinRate * 100).toFixed(1)}% < required ${(scenario.minWinRate * 100).toFixed(1)}%`,
        );
    }
    if (scenario.maxBaselineWins !== undefined && summary.baselineWins > scenario.maxBaselineWins) {
        failures.push(`baseline wins ${summary.baselineWins} > allowed ${scenario.maxBaselineWins}`);
    }
    if (scenario.maxDrawRate !== undefined && drawRate > scenario.maxDrawRate) {
        failures.push(`draw rate ${(drawRate * 100).toFixed(1)}% > allowed ${(scenario.maxDrawRate * 100).toFixed(1)}%`);
    }
    return failures;
};

const runScenario = (scenario: Scenario, rootOutDir: string): ScenarioResult => {
    const outDir = path.join(rootOutDir, scenario.name);
    fs.mkdirSync(outDir, { recursive: true });
    const childEnv = {
        ...process.env,
        ...scenario.env,
        OUT_DIR: outDir,
    };
    const headToHeadPath = path.join(process.cwd(), "dist", "benchmark", "headToHead.js");
    const result = spawnSync(process.execPath, [headToHeadPath, "--es-module-specifier-resolution=node"], {
        cwd: process.cwd(),
        env: childEnv,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
    });
    process.stdout.write(result.stdout);
    process.stderr.write(result.stderr);
    if (result.status !== 0) {
        if (scenario.optional) {
            const summary: BenchmarkSummary = {
                generatedAt: new Date().toISOString(),
                maps: scenario.env.MAPS.split(","),
                matchesPerPair: Number.parseInt(scenario.env.MATCHES_PER_PAIR, 10),
                maxTicks: Number.parseInt(scenario.env.MAX_TICKS, 10),
                results: [],
                candidateWins: 0,
                baselineWins: 0,
                draws: 0,
                candidateWinRate: 0,
            };
            return {
                name: scenario.name,
                description: scenario.description,
                outDir,
                summaryPath: "",
                summary,
                passed: true,
                failures: [`optional scenario could not run; exit status ${result.status}`],
            };
        }
        throw new Error(`Scenario ${scenario.name} failed to run with status ${result.status}`);
    }
    const summaryLine = result.stdout.split(/\r?\n/).find((line) => line.startsWith("summary="));
    if (!summaryLine) {
        throw new Error(`Scenario ${scenario.name} did not print a summary path`);
    }
    const summaryPath = summaryLine.slice("summary=".length).trim();
    const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8")) as BenchmarkSummary;
    const failures = evaluateScenario(scenario, summary);
    return {
        name: scenario.name,
        description: scenario.description,
        outDir,
        summaryPath,
        summary,
        passed: failures.length === 0,
        failures,
    };
};

const main = () => {
    const selectedScenarios = getSelectedScenarios();
    if (selectedScenarios.length === 0) {
        throw new Error("No regression scenarios selected");
    }
    const rootOutDir = process.env.OUT_DIR || path.join("benchmark-results", `regression-${Date.now()}`);
    fs.mkdirSync(rootOutDir, { recursive: true });
    const results = selectedScenarios.map((scenario) => runScenario(scenario, rootOutDir));
    const aggregatePath = path.join(rootOutDir, "regression-summary.json");
    fs.writeFileSync(aggregatePath, JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2));
    for (const result of results) {
        const status = result.passed ? "PASS" : "FAIL";
        const failures = result.failures.length > 0 ? ` (${result.failures.join("; ")})` : "";
        console.log(`${status} ${result.name}: ${result.summary.candidateWins}-${result.summary.baselineWins}-${result.summary.draws}${failures}`);
    }
    console.log(`regressionSummary=${aggregatePath}`);
    if (results.some((result) => !result.passed)) {
        process.exit(1);
    }
};

main();
