import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
    buildWorkerTechnicalDiagnostic,
    familyWorkerMain,
    getCurrentWorkerTechnicalStage,
    manifestValidationOnlyMain,
} from "./mapFidelityProbe.js";
import {
    canonicalJson,
    installPrivateDiagnosticSinkForProcess,
} from "./mapFidelityProtocol.js";

const privateDiagnosticMain = async (): Promise<void> => {
    const rootValue = process.env.MAP_FIDELITY_PRIVATE_DIAGNOSTICS_ROOT;
    const jobId = process.env.SLURM_JOB_ID;
    if (!rootValue || !path.isAbsolute(rootValue)) {
        throw new Error("MAP_FIDELITY_PRIVATE_DIAGNOSTICS_ROOT must be an absolute path");
    }
    if (!jobId || !/^\d+$/.test(jobId)) throw new Error("A numeric SLURM_JOB_ID is required");

    const diagnosticRoot = fs.realpathSync(rootValue);
    const rootStat = fs.statSync(diagnosticRoot);
    if (!rootStat.isDirectory() || (rootStat.mode & 0o077) !== 0) {
        throw new Error("Private diagnostic root must be an existing mode-0700 directory");
    }

    const diagnosticPath = path.join(diagnosticRoot, `${jobId}-${process.pid}.jsonl`);
    const descriptor = fs.openSync(diagnosticPath, "wx", 0o600);
    const removeSink = installPrivateDiagnosticSinkForProcess((warning) => {
        const record = {
            artifactKind: "private_outcome_redacted_map_fidelity_diagnostic_not_evidence",
            outcomeFree: true,
            phase: warning.phase,
            level: warning.level,
            category: warning.category,
            severity: warning.severity,
            text: warning.text,
            diagnosticSha256: createHash("sha256").update(warning.text, "utf8").digest("hex"),
        };
        fs.writeSync(descriptor, `${canonicalJson(record)}\n`, undefined, "utf8");
    });

    const selectedMain =
        process.argv[2] === "--validate-manifest-only" ? manifestValidationOnlyMain : familyWorkerMain;
    try {
        await selectedMain();
    } finally {
        removeSink();
        fs.fsyncSync(descriptor);
        fs.closeSync(descriptor);
    }
};

privateDiagnosticMain().catch((error: unknown) => {
    try {
        process.stderr.write(
            `${canonicalJson(buildWorkerTechnicalDiagnostic(getCurrentWorkerTechnicalStage(), error))}\n`,
        );
    } catch {
        // The exit status remains fail-closed if diagnostic serialization fails.
    }
    process.exitCode = 2;
});
