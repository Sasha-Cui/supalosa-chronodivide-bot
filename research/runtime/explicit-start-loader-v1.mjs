import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { transformExplicitStartRuntime } from "./explicit-start-transform-v1.mjs";

const required = process.env.CHRONO_GAME_API_PATH;
if (!required) throw new Error("CHRONO_GAME_API_PATH required for evaluation-only explicit starts");
const expected = fs.realpathSync(required);
export async function load(url, context, nextLoad) {
    if (!url.startsWith("file:")) return nextLoad(url, context);
    const file = fileURLToPath(url);
    if (!file.endsWith("/game-api/dist/index.js")) return nextLoad(url, context);
    if (fs.realpathSync(file) !== expected) throw new Error("Explicit-start duplicate game-api module path");
    const loaded = await nextLoad(url, context);
    return { ...loaded, source: transformExplicitStartRuntime(loaded.source ?? fs.readFileSync(expected)) };
}
