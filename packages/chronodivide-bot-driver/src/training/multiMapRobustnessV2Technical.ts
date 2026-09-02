import { Bot, CreateOfflineOpts, GameApi, LandType, ObjectType, UnitData, cdapi } from "@chronodivide/game-api";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { StrongBot } from "@supalosa/chronodivide-bot/dist/bot/strongBot.js";
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { BaselineFactory, loadBaselineFactory } from "../benchmark/baselineLoader.js";
import { createExperimentManifest } from "../benchmark/provenance.js";
import { withSeededOfflineGame } from "../benchmark/seededOfflineGame.js";
import { LiteralBuildingEliminationAdjudicator, installLiteralEndpointInstrumentation } from
    "./literalBuildingEliminationEndpoint.js";

const BASELINE_COMMIT = "165b77a71d0cf5ebd27c65b19d0486bcbae78d0f";
const SHA256 = /^[0-9a-f]{64}$/;
export const MULTIMAP_V2_COUNTRIES = [Countries.USA, Countries.KOREA, Countries.FRANCE, Countries.GERMANY,
    Countries.GREAT_BRITAIN, Countries.LIBYA, Countries.IRAQ, Countries.CUBA, Countries.RUSSIA] as const;
export type MultiMapV2Spec = { id: string; label: string; fileName: string; sha256: string; startCount: number;
    family: "hfo-primary" | "hfo-secondary" | "distinct-primary" | "distinct-secondary"; seedBase: number };
export const MULTIMAP_V2_MAPS: readonly MultiMapV2Spec[] = [
    ["hfo-original", "HFO original", "cd_chrono_mp32s8.map", "907e5ab677a03c50f375da1bec4871880240de2fab790a38dac85674d0f65bf1", 8, "hfo-primary"],
    ["hfo-golden", "HFO Golden", "cd_chrono_heckgolden.mpr", "845359bfe0ea2ad3bb9dda90e0c00a7b97946fda132e87f717c22025923bd296", 6, "hfo-primary"],
    ["hfo-corners", "HFO Corners", "cd_chrono_heckcorners.map", "3aa63da555db30d0d97d9319057650c440ebf57f655c8c001705e312768e628a", 4, "hfo-primary"],
    ["hfo-corners-b", "HFO Corners B", "cd_chrono_heckcorners_b.map", "fb4ffb59de9f0ba114bd7f37a943f1ce9a4496e3ecb3e9382e72392039833a73", 4, "hfo-primary"],
    ["hfo-corners-b-golden", "HFO Corners B Golden", "cd_chrono_heckcorners_b_golden.map", "52cdb880326a3d39db5c8a9939830947496f7c009a8cbe3d02ce973563180f50", 4, "hfo-primary"],
    ["hfo-bvb", "HFO B v B", "cd_chrono_heckbvb.map", "5a7554fb64a16bd345cb42bf3bcbccd376fa92ad1c0356058f0427e9f0910f04", 2, "hfo-secondary"],
    ["hfo-lvl", "HFO L v L", "cd_chrono_hecklvl.map", "aa0b71473092d701834920275f8d42aeeb2614d4ad1244d6fb3741e8f62f7efc", 2, "hfo-secondary"],
    ["hfo-rvr", "HFO R v R", "cd_chrono_heckrvr.map", "8f17a78d2de245716b33c78b848dff13ae3db5b7ebb08d2efa4da165ac995488", 2, "hfo-secondary"],
    ["hfo-tvt", "HFO T v T", "cd_chrono_hecktvt.map", "084d215b1ccb2a30cfb467e5f009d51b77e91c6a441ed24b4a6aef24d68c0c74", 2, "hfo-secondary"],
    ["tour-of-egypt", "Tour of Egypt", "cd_chrono_tourofegypt.map", "2e660f22cf5ef994ca7453d14b9f68349063f9086b7c7c038f58e2067706236e", 6, "distinct-primary"],
    ["south-pacific", "South Pacific original", "cd_chrono_mp01t4.map", "89a428f214d5ca2a5f650b94e2847fc493d51805aac04f869f1fcc76e4db3381", 4, "distinct-primary"],
    ["south-pacific-2", "South Pacific two-start", "cd_2_south_pacific.map", "5d8122dc9234cc6fbcb68ec428cbea28b31496617253274ee15296a7c2807e2e", 2, "distinct-secondary"],
    ["pacific-heights", "Pacific Heights", "cd_chrono_pacific.map", "8ba46066a7e034c37b2367bd07df94be8d6252757d4396ea68d21bc226fa8898", 4, "distinct-primary"],
].map(([id, label, fileName, sha256, startCount, family], index) => ({ id, label, fileName, sha256,
    startCount, family, seedBase: 3_000_000_000 + index * 100_000 })) as readonly MultiMapV2Spec[];
export const MULTIMAP_V2_TASK_COUNT = 13 as const;

export const multiMapV2SelectedCaseCount = (spec: MultiMapV2Spec) => 9 * 2 * spec.startCount *
    (spec.startCount - 1) * (spec.startCount === 2 ? 5 : 1);
export const multiMapV2ScreenCaseCount = (spec: MultiMapV2Spec) => 9 * 2 * spec.startCount;
export const multiMapV2IsScreenCase = (spec: MultiMapV2Spec, countryOrdinal: number, candidateStartOrdinal: number,
    opponentStartOrdinal: number, repeatIndex: number) => spec.startCount === 2 ? repeatIndex === 0 :
    opponentStartOrdinal === (candidateStartOrdinal + 1 + countryOrdinal % (spec.startCount - 1)) % spec.startCount;

type SelectedCase = { mapCaseIndex: number; countryOrdinal: number; country: Countries; candidateSlot: 0 | 1;
    candidateStartOrdinal: number; opponentStartOrdinal: number; candidateStart: string; opponentStart: string;
    repeatIndex: number; requestedEngineSeed: number; seedOffset: number; stage1Screen: boolean };
const requiredPath = (name: string) => { const value = process.env[name]; if (!value) throw new Error(`${name} required`);
    return path.resolve(value); };
const requiredText = (name: string, pattern: RegExp) => { const value = process.env[name];
    if (!value || !pattern.test(value)) throw new Error(`${name} invalid`); return value; };
const hashText = (value: string) => crypto.createHash("sha256").update(value).digest("hex");
const hashFile = (file: string) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const point = (value: { x: number; y: number }) => `${value.x},${value.y}`;
const prohibited = /^(winner|wins|loss|losses|draw|draws|score|defeated|terminal|terminalBuildingCounts|finished)$/i;
const assertOutcomeFree = (value: unknown, label = "root"): void => { if (Array.isArray(value)) return value.forEach((row, index) =>
    assertOutcomeFree(row, `${label}[${index}]`)); if (!isRecord(value)) return; for (const [key, child] of Object.entries(value)) {
        if (prohibited.test(key)) throw new Error(`Multi-map prohibited field ${label}.${key}`); assertOutcomeFree(child, `${label}.${key}`); } };

const sourceIdentity = () => { const repo = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim(),
    commit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    if (execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim() !== "main" ||
        execFileSync("git", ["status", "--short", "--untracked-files=no"], { encoding: "utf8" }).trim() ||
        execFileSync("git", ["rev-parse", "fork/main"], { encoding: "utf8" }).trim() !== commit)
        throw new Error("Multi-map V2 requires clean synchronized main"); return { repo, commit }; };
const commonInputs = () => { if (process.env.SLURM_JOB_ACCOUNT !== "pi_jss233") throw new Error("Multi-map V2 requires pi_jss233");
    const mixDir = requiredPath("MIX_DIR"), protocolPath = requiredPath("PROTOCOL_PATH"),
        inventoryPath = requiredPath("INVENTORY_PATH"), assetManifestPath = requiredPath("ASSET_MANIFEST_PATH"),
        protocolSha256 = requiredText("PROTOCOL_SHA256", SHA256), inventorySha256 = requiredText("INVENTORY_SHA256", SHA256),
        assetManifestSha256 = requiredText("ASSET_MANIFEST_SHA256", SHA256);
    if (hashFile(protocolPath) !== protocolSha256 || hashFile(inventoryPath) !== inventorySha256 ||
        hashFile(assetManifestPath) !== assetManifestSha256) throw new Error("Multi-map V2 input drifted");
    const manifest = JSON.parse(fs.readFileSync(assetManifestPath, "utf8"));
    if (!isRecord(manifest) || manifest.kind !== "private-ra2-snow-runtime" ||
        path.resolve(String(manifest.runtimeDirectory)) !== mixDir) throw new Error("Multi-map V2 runtime drifted");
    return { mixDir, protocolSha256, inventorySha256, assetManifestSha256 }; };
const assertBaseline = (factory: BaselineFactory) => { if (factory.descriptor.kind !== "external-package" ||
    typeof factory.descriptor.packageRoot !== "string") throw new Error("Multi-map external baseline required");
    const packageRoot = path.resolve(factory.descriptor.packageRoot), repo = execFileSync("git",
        ["-C", packageRoot, "rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
    if (execFileSync("git", ["-C", repo, "rev-parse", "HEAD"], { encoding: "utf8" }).trim() !== BASELINE_COMMIT ||
        execFileSync("git", ["-C", repo, "status", "--short", "--untracked-files=no"], { encoding: "utf8" }).trim())
        throw new Error("Multi-map baseline drifted"); };
const settings = (spec: MultiMapV2Spec, candidate: Bot, opponent: Bot, slot: 0 | 1): CreateOfflineOpts => ({
    buildOffAlly: false, cratesAppear: false, credits: 10_000, gameMode: cdapi.getAvailableGameModes(spec.fileName)[0],
    gameSpeed: 6, mapName: spec.fileName, mcvRepacks: true, shortGame: false, superWeapons: false, unitCount: 0,
    online: false, agents: slot === 0 ? [candidate, opponent] : [opponent, candidate] });

const census = (api: GameApi) => { const size = api.map.getRealMapSize(), starts = api.map.getStartingLocations().map(point),
    landTypes: Record<string, number> = {}, terrainTypes: Record<string, number> = {}; let tiles = 0, waterTiles = 0,
    bridgeTiles = 0, highBridgeTiles = 0;
    for (let x = 0; x < size.width; x += 1) for (let y = 0; y < size.height; y += 1) { const tile = api.map.getTile(x, y);
        if (!tile) continue; tiles += 1; landTypes[String(tile.landType)] = (landTypes[String(tile.landType)] ?? 0) + 1;
        terrainTypes[String(tile.terrainType)] = (terrainTypes[String(tile.terrainType)] ?? 0) + 1;
        if (tile.landType === LandType.Water) waterTiles += 1; if (api.map.hasBridgeOnTile(tile)) bridgeTiles += 1;
        if (api.map.hasHighBridgeOnTile(tile)) highBridgeTiles += 1; }
    const neutral = api.getNeutralUnits().map((id) => api.getUnitData(id)).filter((unit): unit is UnitData => !!unit),
        neutralBuildings = neutral.filter((unit) => unit.rules.type === ObjectType.Building).map((unit) => { const rules = unit.rules as any;
            return { rule: unit.rules.name, x: unit.tile.rx, y: unit.tile.ry, capturable: !!rules.capturable,
                bridgeRepairHut: !!rules.bridgeRepairHut, techLevel: rules.techLevel ?? null }; }).sort((a, b) =>
                    JSON.stringify(a).localeCompare(JSON.stringify(b))),
        resources = api.map.getAllTilesResourceData();
    return { realMapSize: size, starts, startCount: starts.length, theater: String(api.map.getTheaterType()), tiles,
        landTypes, terrainTypes, waterTiles, bridgeTiles, highBridgeTiles, neutralUnitCount: neutral.length,
        neutralBuildings, resources: { tiles: resources.length, ore: resources.reduce((sum, row) => sum + row.ore, 0),
            gems: resources.reduce((sum, row) => sum + row.gems, 0), spawners: resources.filter((row) => row.spawnsOre).length } }; };
const stateSnapshot = (api: GameApi, candidateName: string, opponentName: string) => ({ update: api.getCurrentTick(),
    starts: { candidate: point(api.getPlayerData(candidateName).startLocation),
        opponent: point(api.getPlayerData(opponentName).startLocation) }, units: api.getAllUnits().map((id) => api.getUnitData(id))
        .filter((unit): unit is UnitData => !!unit).map((unit) => ({ owner: unit.owner === candidateName ? "candidate" :
            unit.owner === opponentName ? "opponent" : "neutral", rule: unit.rules.name, type: unit.rules.type,
            hp: unit.hitPoints, x: unit.tile.rx, y: unit.tile.ry })).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))) });

const zeroUpdate = async (spec: MultiMapV2Spec, baseline: BaselineFactory, country: Countries, slot: 0 | 1, seed: number,
    suffix: string) => { const candidateName = `MMSelectCandidate_${spec.id}_${suffix}`, opponentName = `MMSelectOpponent_${spec.id}_${suffix}`,
        candidate = new StrongBot(candidateName, country, [], false), opponent = baseline.create(opponentName, country);
    return withSeededOfflineGame(cdapi, settings(spec, candidate, opponent, slot), seed,
        [{ agent: candidate, identity: "candidate" }, { agent: opponent, identity: "opponent" }], async () => { const api = candidate.lastGameApi;
            if (!api) throw new Error("Multi-map zero-update API missing"); return { candidateStart: point(api.getPlayerData(candidateName).startLocation),
                opponentStart: point(api.getPlayerData(opponentName).startLocation), starts: api.map.getStartingLocations().map(point) }; }); };
const oneUpdate = async (spec: MultiMapV2Spec, baseline: BaselineFactory, seed: number) => { const candidateName = `MMSmokeCandidate_${spec.id}`,
    opponentName = `MMSmokeOpponent_${spec.id}`, candidate = new StrongBot(candidateName, Countries.USA, [], false),
    opponent = baseline.create(opponentName, Countries.USA), adjudicator = new LiteralBuildingEliminationAdjudicator({ candidate: candidateName,
        baseline: opponentName }), { audit } = installLiteralEndpointInstrumentation({ candidate, baseline: opponent }, adjudicator);
    return withSeededOfflineGame(cdapi, settings(spec, candidate, opponent, 0), seed,
        [{ agent: candidate, identity: "candidate" }, { agent: opponent, identity: "opponent" }], async (game) => { const api = candidate.lastGameApi;
            if (!api) throw new Error("Multi-map smoke API missing"); const before = stateSnapshot(api, candidateName, opponentName), mapCensus = census(api);
            await game.update(); const after = stateSnapshot(api, candidateName, opponentName);
            return { beforeSha256: hashText(JSON.stringify(before)), afterSha256: hashText(JSON.stringify(after)), mapCensus,
                quitAttempts: { ...audit.attempts }, quitForwarded: { ...audit.forwarded } }; }); };

const runCell = async () => { const taskIndex = Number(requiredText("TASK_INDEX", /^\d+$/)), out = requiredPath("OUT_PATH"),
    programPath = requiredPath("PROGRAM_PATH"), programSha256 = requiredText("PROGRAM_SHA256", SHA256), inputs = commonInputs();
    if (taskIndex < 0 || taskIndex >= MULTIMAP_V2_TASK_COUNT || process.env.SLURM_ARRAY_TASK_ID !== String(taskIndex) ||
        hashFile(programPath) !== programSha256 || fs.existsSync(out)) throw new Error("Multi-map task drifted");
    const spec = MULTIMAP_V2_MAPS[taskIndex], { repo, commit } = sourceIdentity();
    if (hashFile(path.join(inputs.mixDir, spec.fileName)) !== spec.sha256) throw new Error("Multi-map bytes drifted");
    await cdapi.init(inputs.mixDir); if (!cdapi.getAvailableMaps().includes(spec.fileName.toLowerCase()) ||
        cdapi.getAvailableGameModes(spec.fileName).length < 1) throw new Error("Multi-map unavailable");
    const baseline = await loadBaselineFactory(path.join(repo, "packages", "chronodivide-bot")); assertBaseline(baseline);
    const cases: SelectedCase[] = []; let canonicalStarts: string[] | null = null, initializedGameCount = 0;
    const repeatTarget = spec.startCount === 2 ? 5 : 1;
    for (const [countryOrdinal, country] of MULTIMAP_V2_COUNTRIES.entries()) for (const candidateSlot of [0, 1] as const) {
        const counts = new Map<string, number>();
        for (let offset = 0; offset < 5_000; offset += 1) { const seed = spec.seedBase + countryOrdinal * 10_000 + candidateSlot * 5_000 + offset,
            observed = await zeroUpdate(spec, baseline, country, candidateSlot, seed, `${countryOrdinal}_${candidateSlot}_${offset}`);
            initializedGameCount += 1; if (!canonicalStarts) canonicalStarts = observed.starts;
            if (JSON.stringify(observed.starts) !== JSON.stringify(canonicalStarts) || canonicalStarts.length !== spec.startCount)
                throw new Error("Multi-map start census drifted");
            const candidateStartOrdinal = canonicalStarts.indexOf(observed.candidateStart),
                opponentStartOrdinal = canonicalStarts.indexOf(observed.opponentStart), key = `${candidateStartOrdinal}:${opponentStartOrdinal}`,
                used = counts.get(key) ?? 0;
            if (candidateStartOrdinal >= 0 && opponentStartOrdinal >= 0 && candidateStartOrdinal !== opponentStartOrdinal && used < repeatTarget) {
                counts.set(key, used + 1); cases.push({ mapCaseIndex: -1, countryOrdinal, country, candidateSlot, candidateStartOrdinal,
                    opponentStartOrdinal, candidateStart: observed.candidateStart, opponentStart: observed.opponentStart, repeatIndex: used,
                    requestedEngineSeed: seed, seedOffset: offset, stage1Screen: multiMapV2IsScreenCase(spec, countryOrdinal,
                        candidateStartOrdinal, opponentStartOrdinal, used) }); }
            if (counts.size === spec.startCount * (spec.startCount - 1) && [...counts.values()].every((value) => value === repeatTarget)) break;
        }
        if (counts.size !== spec.startCount * (spec.startCount - 1) || [...counts.values()].some((value) => value !== repeatTarget))
            throw new Error(`Multi-map selection incomplete ${spec.id} ${countryOrdinal} ${candidateSlot}`); }
    cases.sort((a, b) => a.countryOrdinal - b.countryOrdinal || a.candidateSlot - b.candidateSlot ||
        a.candidateStartOrdinal - b.candidateStartOrdinal || a.opponentStartOrdinal - b.opponentStartOrdinal || a.repeatIndex - b.repeatIndex)
        .forEach((row, index) => { row.mapCaseIndex = index; });
    if (cases.length !== multiMapV2SelectedCaseCount(spec) || cases.filter((row) => row.stage1Screen).length !==
        multiMapV2ScreenCaseCount(spec) || new Set(cases.map((row) => `${row.requestedEngineSeed}:${row.candidateSlot}`)).size !== cases.length)
        throw new Error("Multi-map case coverage drifted");
    const smokeSeed = spec.seedBase + 99_000, smokeA = await oneUpdate(spec, baseline, smokeSeed),
        smokeB = await oneUpdate(spec, baseline, smokeSeed);
    if (JSON.stringify(smokeA) !== JSON.stringify(smokeB) || smokeA.mapCensus.startCount !== spec.startCount ||
        smokeA.quitForwarded.candidate !== 0 || smokeA.quitForwarded.baseline !== 0) throw new Error("Multi-map deterministic smoke failed");
    const provenance = createExperimentManifest({ runId: `multimap-v2-${spec.id}-${process.env.SLURM_JOB_ID}`, mixDir: inputs.mixDir,
        maps: [spec.fileName], effectiveConfig: { taskIndex, spec, selectedCases: cases.length, screenCases: cases.filter((row) =>
            row.stage1Screen).length, smokeSeed }, baseline: baseline.descriptor, gameSeedBase: spec.seedBase });
    const artifact = { schemaVersion: 1, kind: "multimap-v2-technical-selection-cell", status: "PASS_MULTIMAP_V2_TECHNICAL_CELL",
        complete: true, passed: true, outcomeFree: true, taskIndex, map: spec, schedulerAccount: "pi_jss233",
        schedulerJobId: process.env.SLURM_JOB_ID, sourceCommit: commit, programSha256, protocolSha256: inputs.protocolSha256,
        inventorySha256: inputs.inventorySha256, assetManifestSha256: inputs.assetManifestSha256,
        availableGameModes: cdapi.getAvailableGameModes(spec.fileName), initializedGameCount, selectedCaseCount: cases.length,
        screenCaseCount: cases.filter((row) => row.stage1Screen).length, cases, deterministicSmoke: smokeA, provenance };
    assertOutcomeFree(artifact); fs.mkdirSync(path.dirname(out), { recursive: true, mode: 0o700 });
    fs.writeFileSync(out, JSON.stringify(artifact, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({ status: artifact.status, map: spec.id, selected: cases.length })); };

const completedTasks = (job: string) => { const raw = execFileSync("/opt/slurm/current/bin/sacct",
    ["-j", job, "-n", "-P", "-X", "--format=JobID,JobIDRaw,State,ExitCode,Account"], { encoding: "utf8" }), tasks = new Map<number, string>();
    for (const line of raw.split("\n").filter(Boolean)) { const [label, rawId, state, exit, account] = line.split("|"),
        match = new RegExp(`^${job}_(\\d+)$`).exec(label); if (match && state === "COMPLETED" && exit === "0:0" && account === "pi_jss233")
            tasks.set(+match[1], rawId); } return tasks; };
const finalize = () => { const root = requiredPath("RESULTS_ROOT"), out = requiredPath("OUT_PATH"),
    arrayJobId = requiredText("ARRAY_JOB_ID", /^\d+$/), programSha256 = requiredText("PROGRAM_SHA256", SHA256),
    cellProgramSha256 = requiredText("CELL_PROGRAM_SHA256", SHA256), inputs = commonInputs();
    if (fs.existsSync(out)) throw new Error("Multi-map aggregate exists"); const { commit } = sourceIdentity(), tasks = completedTasks(arrayJobId);
    if (tasks.size !== MULTIMAP_V2_TASK_COUNT) throw new Error(`Multi-map scheduler ${tasks.size}/${MULTIMAP_V2_TASK_COUNT}`);
    const maps: any[] = [];
    for (let taskIndex = 0; taskIndex < MULTIMAP_V2_TASK_COUNT; taskIndex += 1) { const spec = MULTIMAP_V2_MAPS[taskIndex],
        taskRoot = path.join(root, `task-${String(taskIndex).padStart(2, "0")}`), file = path.join(taskRoot, "cell.json"),
        expected = fs.readFileSync(path.join(taskRoot, "cell.sha256"), "utf8").trim().split(/\s+/)[0];
        if (hashFile(file) !== expected) throw new Error(`Multi-map checksum ${taskIndex}`); const cell = JSON.parse(fs.readFileSync(file, "utf8"));
        if (cell.kind !== "multimap-v2-technical-selection-cell" || cell.complete !== true || cell.passed !== true ||
            cell.outcomeFree !== true || cell.taskIndex !== taskIndex || cell.map.id !== spec.id || cell.map.sha256 !== spec.sha256 ||
            String(cell.schedulerJobId) !== tasks.get(taskIndex) || cell.sourceCommit !== commit ||
            cell.programSha256 !== cellProgramSha256 || cell.protocolSha256 !== inputs.protocolSha256 ||
            cell.inventorySha256 !== inputs.inventorySha256 || cell.assetManifestSha256 !== inputs.assetManifestSha256 ||
            cell.selectedCaseCount !== multiMapV2SelectedCaseCount(spec) || cell.screenCaseCount !== multiMapV2ScreenCaseCount(spec))
            throw new Error(`Multi-map identity ${taskIndex}`); assertOutcomeFree(cell); maps.push(cell); }
    const allCases = maps.flatMap((row) => row.cases.map((caseSpec: any) => ({ mapId: row.map.id, ...caseSpec })));
    if (new Set(allCases.map((row) => `${row.requestedEngineSeed}:${row.candidateSlot}`)).size !== allCases.length)
        throw new Error("Multi-map global seed collision");
    const artifact = { schemaVersion: 1, kind: "multimap-v2-technical-census-selection",
        status: "PASS_MULTIMAP_V2_TECHNICAL_CENSUS_SELECTION", complete: true, passed: true, outcomeFree: true,
        scheduler: { account: "pi_jss233", arrayJobId, taskJobIds: Object.fromEntries(tasks) }, sourceCommit: commit,
        programSha256, cellProgramSha256, protocolSha256: inputs.protocolSha256, inventorySha256: inputs.inventorySha256,
        assetManifestSha256: inputs.assetManifestSha256, mapCount: maps.length,
        selectedCaseCount: allCases.length, screenCaseCount: allCases.filter((row) => row.stage1Screen).length,
        maps: maps.map((row) => ({ map: row.map, availableGameModes: row.availableGameModes,
            initializedGameCount: row.initializedGameCount, selectedCaseCount: row.selectedCaseCount,
            screenCaseCount: row.screenCaseCount, cases: row.cases, deterministicSmoke: row.deterministicSmoke })) };
    assertOutcomeFree(artifact); fs.mkdirSync(path.dirname(out), { recursive: true, mode: 0o700 });
    fs.writeFileSync(out, JSON.stringify(artifact, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({ status: artifact.status, maps: maps.length, selected: allCases.length,
        screen: artifact.screenCaseCount })); };

const main = async () => { const mode = process.env.MODE; if (mode === "cell") return runCell();
    if (mode === "finalize") return finalize(); throw new Error("MODE must be cell or finalize"); };
if (process.env.MODE && process.env.MODE !== "test") void main().catch((error) => { console.error(error); process.exitCode = 1; });
