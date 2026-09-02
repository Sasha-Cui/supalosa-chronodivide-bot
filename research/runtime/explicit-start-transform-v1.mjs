import crypto from "node:crypto";

export const ORIGINAL_GAME_API_SHA256 = "dd398f5c8c2b4c3e3d6eb0f9ca6d7549bf70fee16c5950cd8902616ac922497d";
export const EXPLICIT_START_SYMBOL = "chrono.research.explicit-start.v1";
export const sha256 = (source) => crypto.createHash("sha256").update(source).digest("hex");

// Only the evaluator supplies this property. Bot policies never read it.
export function validateExplicitStartAgents(options) {
    const agents = options.agents;
    if (!Array.isArray(agents)) throw new Error("Explicit-start agents must be an array");
    if (!agents.some((agent) => agent.chronoResearchStartPos !== undefined)) return agents;
    if (options.online) throw new Error("Explicit starts are offline-evaluation only");
    if (agents.length !== 2) throw new Error("Explicit starts require exactly two participants");
    const positions = agents.map((agent) => agent.chronoResearchStartPos);
    if (agents.some((agent) => typeof agent.country !== "string" || !agent.country.length) ||
        positions.some((position) => !Number.isSafeInteger(position) || position < 0 || position > 7) ||
        new Set(positions).size !== positions.length)
        throw new Error("Invalid explicit-start participant assignment");
    return agents;
}

export function transformExplicitStartRuntime(original) {
    const source = ArrayBuffer.isView(original) ? Buffer.from(original.buffer, original.byteOffset, original.byteLength).toString("utf8") : String(original);
    if (sha256(source) !== ORIGINAL_GAME_API_SHA256) throw new Error("Explicit-start original runtime hash mismatch");
    const mapping = "humanPlayers:t.agents.map((t,e)=>", position = "startPos:RANDOM_START_POS";
    if (source.split(mapping).length !== 2 || source.split(position).length !== 2)
        throw new Error("Explicit-start runtime seam is not unique");
    const helper = "__chronoValidatedExplicitStartAgentsV1";
    if (source.includes(helper)) throw new Error("Explicit-start adapter already installed");
    const patched = source.replace(mapping, "humanPlayers:" + helper + "(t).map((t,e)=>")
        .replace(position, "startPos:(t.chronoResearchStartPos===undefined?RANDOM_START_POS:t.chronoResearchStartPos)");
    const metadata = { method: "evaluation-only-explicit-start-v1", originalSha256: ORIGINAL_GAME_API_SHA256 };
    return "const " + helper + " = " + validateExplicitStartAgents.toString() + ";\n" + patched +
        "\nObject.defineProperty(globalThis, Symbol.for(" + JSON.stringify(EXPLICIT_START_SYMBOL) +
        "), { value: Object.freeze(" + JSON.stringify(metadata) + "), writable: false, configurable: false });\n";
}
