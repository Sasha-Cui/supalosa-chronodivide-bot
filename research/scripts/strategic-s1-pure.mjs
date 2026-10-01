#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
    REPO,
    DRIVER,
    STUDY,
    required,
    hash,
    encode,
    exact,
    fileIdentity,
    writeExclusive,
    schedulerIdentity,
} from "../runtime/strategic-s1-io.mjs";
import { assertSource, verifyRuntime } from "../runtime/strategic-s1-provenance.mjs";
import { VITEST_NAMES, VITEST_PASSED, NODE_TESTS, NODE_PASSED, TOTAL_PASSED } from "../runtime/strategic-s1-tests.mjs";
import { artifactInventory, validateVitestReport, validateNodeLog } from "../runtime/strategic-s1-gates.mjs";
import { stageRequest } from "../runtime/strategic-s1-stages.mjs";
import { verifySubmission } from "./submit-strategic-s1.mjs";
export async function runPure() {
    const out = path.resolve(required("OUT_DIR"));
    if (out !== path.join(STUDY, "pure-v1") || fs.existsSync(out))
        throw new Error("S1 pure already attempted or wrong output");
    const before = assertSource("pure");
    verifySubmission("pure", before, verifyRuntime(), schedulerIdentity("pure"));
    fs.mkdirSync(out, { recursive: true, mode: 0o700 });
    const write = (n, v) => writeExclusive(path.join(out, n), encode(v));
    write("STARTED.json", { source: before, scheduler: schedulerIdentity("pure") });
    const run = (label, exe, args, cwd = REPO) => {
        const r = spawnSync(exe, args, {
            cwd,
            encoding: "utf8",
            maxBuffer: 32 * 1024 * 1024,
            env: { ...process.env, S1_TEST_ROOT: path.join(out, "test-fixtures") },
        });
        write(label + "-run.json", {
            status: r.status,
            signal: r.signal,
            stdout: r.stdout,
            stderr: r.stderr,
            error: r.error?.message ?? null,
        });
        if (r.status !== 0) throw new Error("S1 pure subcommand failed: " + label);
        return r.stdout;
    };
    try {
        run("build", path.join(REPO, "node_modules/.bin/tsc"), ["--build"]);
        const post = assertSource("pure");
        exact(post.files, before.files, "pure tracked source stability");
        run(
            "vitest",
            path.join(DRIVER, "node_modules/.bin/vitest"),
            [
                "run",
                "--maxWorkers=1",
                "--reporter=json",
                "--outputFile=" + path.join(out, "vitest.json"),
                ...VITEST_NAMES.map((n) => "src/test/" + n + ".test.ts"),
            ],
            DRIVER,
        );
        validateVitestReport(JSON.parse(fs.readFileSync(path.join(out, "vitest.json"))));
        const nodeRuns = [];
        for (const [name, count] of NODE_TESTS) {
            const test = path.join(REPO, "research/tests/" + name + ".test.mjs");
            const log = run(name, process.execPath, ["--test", test]);
            validateNodeLog(log, count);
            nodeRuns.push({
                name,
                passed: count,
                test: fileIdentity(test),
                log: fileIdentity(path.join(out, name + "-run.json")),
            });
        }
        exact(assertSource("pure"), post, "pure source/compiled stability after build");
        const runtime = verifyRuntime();
        const value = {
            kind: "strategic-s1-pure-v1",
            stage: "pure",
            complete: true,
            passed: true,
            technicalOnly: true,
            source: post,
            runtime,
            scheduler: schedulerIdentity("pure"),
            request: stageRequest("pure"),
            tests: {
                vitestFiles: VITEST_NAMES.length,
                vitestPassed: VITEST_PASSED,
                nodePassed: NODE_PASSED,
                totalPassed: TOTAL_PASSED,
                report: fileIdentity(path.join(out, "vitest.json")),
                build: fileIdentity(path.join(out, "build-run.json")),
                nodeRuns,
            },
            artifacts: artifactInventory(out),
        };
        const data = encode(value);
        writeExclusive(path.join(out, "pure.json"), data);
        writeExclusive(
            path.join(out, "COMPLETE"),
            "COMPLETE_S1_PURE_V1 " + hash(data) + " " + Buffer.byteLength(data) + "\n",
        );
        console.log(JSON.stringify({ complete: true, tests: TOTAL_PASSED, sha256: hash(data) }));
    } catch (error) {
        write("FAILED.json", {
            complete: false,
            passed: false,
            sourceCommit: before.sourceCommit,
            errorType: error.name,
            message: String(error.message),
            stack: String(error.stack),
        });
        throw error;
    }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
    runPure().catch(() => {
        process.exitCode = 1;
    });
