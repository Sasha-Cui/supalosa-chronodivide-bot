// Synthetic pre-D1 reference trace. Never initializes or advances the game engine.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { UnifiedIntentActionBoundary, withUnifiedIntentScope } from "../../packages/chronodivide-bot/dist/bot/logic/intent/unifiedIntentActionBoundary.js";
import { StrongBot } from "../../packages/chronodivide-bot/dist/bot/strongBot.js";
import { StrongStrategy } from "../../packages/chronodivide-bot/dist/bot/strategy/strongStrategy.js";
import { Countries } from "../../packages/chronodivide-bot/dist/bot/logic/common/utils.js";

export const D1_GOLDEN_SOURCE = "e03d13758bd15101e9c40732370c4f869d19b010";
export const D1_GOLDEN_URL = new URL("../fixtures/unified-intent-d1-prechange.json", import.meta.url);
const files = [
    "packages/chronodivide-bot/src/bot/logic/intent/unifiedIntentArbiter.ts",
    "packages/chronodivide-bot/src/bot/logic/intent/unifiedIntentActionBoundary.ts",
    "packages/chronodivide-bot/src/bot/strongBot.ts",
];
const hash = data => crypto.createHash("sha256").update(data).digest("hex");

export function syntheticD1Trace(mode) {
    const calls = [];
    const telemetry = [];
    let tick = 0;
    const actions = Object.fromEntries([
        "placeBuilding", "sellObject", "sellBuilding", "toggleRepairWrench", "toggleAlliance",
        "pauseProduction", "resumeProduction", "queueForProduction", "unqueueFromProduction",
        "activateSuperWeapon", "orderUnits", "sayAll", "setGlobalDebugText", "setUnitDebugText", "quitGame",
    ].map(method => [method, (...args) => {
        calls.push({ tick, method, args: structuredClone(args) });
        return method + "-result";
    }]));
    const game = {
        getUnitData: id => id >= 1 && id <= 500
            ? { id, owner: id === 499 ? "enemy" : "candidate", hitPoints: id === 498 ? 0 : 100 } : undefined,
        getGameObjectData: id => id >= 1000 && id <= 2000
            ? { id, hitPoints: id === 1999 ? 0 : 100, owner: id === 2000 ? "candidate" : "enemy" } : undefined,
        areAlliedPlayers: (a, b) => a === b,
        map: { getTile: (x, y) => x >= 0 && x < 200 && y >= 0 && y < 200 ? { x, y } : undefined },
    };
    const options = mode === "hard_total_v1" ? { totalCeiling: 150 }
        : { budgetMode: mode, commandCeiling: mode === "separated_lanes_v2" ? 115 : null };
    const boundary = mode === "disabled" ? null
        : new UnifiedIntentActionBoundary(actions, game, "candidate", options);
    const scope = (name, fn) => withUnifiedIntentScope(actions, name, fn);
    const step = (at, fn) => {
        tick = at;
        boundary?.beginUpdate(tick);
        fn();
        telemetry.push(boundary?.flush() ?? null);
    };
    actions.placeBuilding("outside", 1, 2);
    step(1, () => {
        for (let i = 0; i < 200; i++) actions.toggleRepairWrench(i);
        actions.queueForProduction(1, "MTNK", 2, 1);
        actions.unqueueFromProduction(1, "MTNK", 2, 1);
        scope("baseline_core", () => actions.orderUnits([1, 2, 3, 3], 0, 1, 2));
        scope("harassment", () => {
            for (let i = 1; i <= 126; i++) actions.orderUnits([i], 1, 1000 + i);
        });
        scope("terminal_objective", () => actions.orderUnits([1], 1, 1500));
        actions.setUnitDebugText(1, "same");
        actions.setUnitDebugText(1, "same");
        actions.sayAll("best effort");
    });
    step(2, () => {
        scope("terminal_objective", () => actions.orderUnits([1], 1, 1500));
        scope("harassment", () => actions.orderUnits([2], 1, 1002));
        scope("route_sweep", () => actions.orderUnits([498, 499, 9999], 0, 2, 3));
        scope("terminal_objective", () => actions.orderUnits([3], 1, 2000));
        scope("tactical_assault", () => actions.orderUnits([4], 1, 1999));
        scope("baseline_core", () => actions.orderUnits([5], 0, -1, 2));
    });
    step(180, () => {});
    step(181, () => {});
    step(899, () => {
        scope("terminal_objective", () => actions.orderUnits([10], 1, 1510));
        scope("harassment", () => actions.orderUnits([11], 1, 1511));
    });
    step(900, () => { boundary?.revokePending("terminal_objective", 1510); });
    step(901, () => {
        scope("baseline_core", () => actions.orderUnits(Array.from({ length: 260 }, (_, i) => 390 - i), 0, 12, 13, true));
        scope("emergency_defense", () => actions.orderUnits([131, 132], 1, 1600));
        actions.pauseProduction(1);
        actions.resumeProduction(1);
        actions.setGlobalDebugText("after orders");
    });
    step(902, () => {
        scope("baseline_core", () => actions.orderUnits([133], 0, 12, 13, true));
    });
    step(930, () => {
        scope("baseline_core", () => actions.orderUnits([133], 0, 12, 13, true));
    });
    step(931, () => {
        scope("baseline_core", () => actions.orderUnits([133], 0, 12, 13, true));
    });
    boundary?.uninstall();
    actions.orderUnits([1], 0, 2, 3);
    return { mode, calls, telemetry };
}

export function referenceD1Traces() {
    const defaultBot = new StrongBot("default", Countries.USA, [], false, new StrongStrategy(), {});
    return {
        defaultIntentOptions: defaultBot.intentArbiterOptions,
        defaultBoundaryAbsent: defaultBot.intentActionBoundary === null,
        traces: ["disabled", "hard_total_v1", "separated_lanes_v2"].map(syntheticD1Trace),
    };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const args = process.argv.slice(2);
    assert.deepEqual(args, ["--capture-prechange"]);
    const repo = fileURLToPath(new URL("../../", import.meta.url));
    const git = (...args) => execFileSync("git", args, { cwd: repo });
    assert.equal(git("rev-parse", "HEAD").toString().trim(), D1_GOLDEN_SOURCE);
    const sources = Object.fromEntries(files.map(file => {
        const bytes = fs.readFileSync(repo + file);
        assert.deepEqual(bytes, git("show", D1_GOLDEN_SOURCE + ":" + file));
        return [file, hash(bytes)];
    }));
    const data = JSON.stringify({
        kind: "unified-intent-d1-prechange-golden-v1",
        sourceCommit: D1_GOLDEN_SOURCE,
        sources,
        generatorSha256: hash(fs.readFileSync(fileURLToPath(import.meta.url))),
        syntheticOnly: true, gameInitializations: 0, advancingEpisodes: 0,
        expected: referenceD1Traces(),
    }, null, 2) + "\n";
    fs.mkdirSync(new URL("../fixtures/", import.meta.url), { recursive: true });
    fs.writeFileSync(D1_GOLDEN_URL, data, { flag: "wx" });
    assert.equal(fs.readFileSync(D1_GOLDEN_URL, "utf8"), data);
    console.log(JSON.stringify({ path: fileURLToPath(D1_GOLDEN_URL), sha256: hash(data), bytes: Buffer.byteLength(data) }));
}
