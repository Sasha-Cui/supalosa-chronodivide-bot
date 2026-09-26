import { Readable } from "node:stream";
import { createGunzip } from "node:zlib";
import { createInterface } from "node:readline";
import { createHash } from "node:crypto";
import { EmbeddedFreshDualLedger, OD1_LEDGER_LIMITS } from "./embeddedFreshDualLedger.js";
import { S1Sample, natural, finite } from "./strategicS1Observation.js";
import { exactFields } from "./strategicS1Validation.js";

/** Supplemental source-bound schema and cross-channel check after bounded endpoint replay.
 * No engine run and no independent-auditor claim. Avoid inflating 512MiB into an object array. */
export async function crossCheckS1Ledgers(ledger: EmbeddedFreshDualLedger, samples: S1Sample[]) {
    const require = (x: unknown, why: string) => {
        if (!x) throw new Error("S1 cross-ledger: " + why);
    };
    const equal = (a: unknown, b: unknown, why: string) => require(JSON.stringify(a) === JSON.stringify(b), why);
    const names = { candidate: "OD1Candidate", baseline: "OD1Opponent" };
    const input = Readable.from([Buffer.from(ledger.data, "base64")]);
    const checkSnapshots = (x: any) => {
        exactFields(x, "legacy live");
        for (const mode of ["legacy", "live"]) {
            require(Array.isArray(x[mode]), "building rows");
            let last = -1;
            for (const b of x[mode]) {
                exactFields(b, "id owner rulesName x y hitPoints");
                natural(b.id);
                require(b.id > last &&
                    Object.values(names).includes(b.owner) &&
                    typeof b.rulesName === "string" &&
                    b.rulesName.length > 0, "building identity");
                last = b.id;
                [b.x, b.y, b.hitPoints].forEach(finite);
                if (mode === "live") require(b.hitPoints > 0, "live self-collection health");
            }
        }
    };
    const checkEngine = (x: any) => {
        exactFields(x, "finished defeated");
        exactFields(x.defeated, "candidate baseline");
        require(typeof x.finished === "boolean" &&
            typeof x.defeated.candidate === "boolean" &&
            typeof x.defeated.baseline === "boolean", "engine booleans");
    };
    const emptyState = {
        v5: { firstResult: null, technicalFailure: null },
        v6: { firstResult: null, technicalFailure: null },
        complete: false,
        failed: false,
    };
    const initialEngine = { finished: false, defeated: { candidate: false, baseline: false } };
    let eventBytes = 2;

    const gunzip = createGunzip();
    input.on("error", (e) => gunzip.destroy(e));
    input.pipe(gunzip);
    let byteCount = 0;
    gunzip.on("data", (b: Buffer) => {
        byteCount += b.length;
        if (byteCount > OD1_LEDGER_LIMITS.plainBytes) gunzip.destroy(new Error("S1 cross-ledger inflation limit"));
    });
    const lines = createInterface({ input: gunzip, crlfDelay: Infinity });
    let sampleIndex = 0,
        rows = 0,
        windowEvents: unknown[] = [],
        snapshots: any = null;
    const bindings: Array<{
        tick: number;
        positiveWorld: Record<string, number>;
        liveSelfCollection: Record<string, number>;
        sameBuildingIds: boolean;
        buildingsSha256: string;
    }> = [];
    const bind = (through: number, engine: any) => {
        while (sampleIndex < samples.length && samples[sampleIndex].tick <= through) {
            const s = samples[sampleIndex];
            const world = s.units
                .filter((u) => u.type === 2)
                .map((u) => ({
                    id: u.id,
                    owner: u.owner,
                    rulesName: u.rulesName,
                    x: u.x,
                    y: u.y,
                    hitPoints: u.health,
                }));
            equal(
                world,
                snapshots.legacy.filter((b: any) => b.hitPoints > 0),
                "positive-health public-world building snapshot",
            );
            for (const side of ["candidate", "baseline"] as const)
                require(s.players[side].defeated === engine.defeated[side], "defeat sample");
            // The legacy endpoint intentionally discards startup events. Their retained S1
            // tick-0 window is source-bound only, not claimed reconstructible from that ledger.
            if (s.tick !== 0) equal(s.window.events, windowEvents, "public event window");
            windowEvents = [];
            eventBytes = 2;
            const count = (list: any[]) =>
                Object.fromEntries(
                    Object.entries(names).map(([side, name]) => [side, list.filter((b) => b.owner === name).length]),
                );
            bindings.push({
                tick: s.tick,
                positiveWorld: count(world),
                liveSelfCollection: count(snapshots.live),
                sameBuildingIds:
                    JSON.stringify(world.map((b) => b.id)) === JSON.stringify(snapshots.live.map((b: any) => b.id)),
                buildingsSha256: createHash("sha256").update(JSON.stringify(snapshots)).digest("hex"),
            });
            sampleIndex++;
        }
    };
    try {
        for await (const line of lines) {
            require(Buffer.byteLength(line) + 1 <= OD1_LEDGER_LIMITS.recordBytes, "record bytes");
            const r = JSON.parse(line);
            rows++;
            if (rows === 1) {
                exactFields(
                    r,
                    "kind schemaVersion combatants frozenLimit initialTick initial initialEngine initialState",
                );
                require(r.kind === "header" &&
                    r.schemaVersion === 1 &&
                    r.frozenLimit === 24000 &&
                    r.initialTick === 0, "header identity");
                equal(r.combatants, names, "combatant names");
                equal(r.initialState, emptyState, "header must have empty initial observer state");
                equal(r.initialEngine, initialEngine, "header initial engine");
                checkSnapshots(r.initial);
                checkEngine(r.initialEngine);
                snapshots = r.initial;
                bind(0, r.initialEngine);
            } else if (r.kind === "step") {
                exactFields(r, "kind tick pre post events engine dualState");
                checkSnapshots(r.pre);
                checkSnapshots(r.post);
                checkEngine(r.engine);
                snapshots = r.post;
                require(Array.isArray(r.events), "event array");
                for (const event of r.events) {
                    const item = { tick: r.tick, event };
                    eventBytes += Buffer.byteLength(JSON.stringify(item)) + 1;
                    // A necessary bound: these events must fit inside one 512KiB strategic sample.
                    require(eventBytes <= 512 * 1024, "event window cannot fit strategic sample bound");
                    windowEvents.push(item);
                }
                bind(r.tick, r.engine);
            } else if (r.kind === "stable") {
                exactFields(r, "kind fromTick toTick snapshotsSha256 engine dualState");
                checkEngine(r.engine);
                bind(r.toTick, r.engine);
            } else {
                exactFields(r, "kind value");
                require(r.kind === "final", "terminal record");
            }
        }
        require(byteCount === ledger.plainBytes &&
            rows === ledger.records &&
            sampleIndex === samples.length &&
            windowEvents.length === 0, "complete cross-channel population");
        return {
            sampleBindings: bindings,
            positiveTickEventWindowsMatched: true as const,
            startupEventsIndependent: false as const,
            scope: "World-positive building snapshots are matched to legacy positive-health records. Live self-collection counts are retained separately, not assumed interchangeable. Raw action arguments are not reconstructed.",
        };
    } finally {
        lines.close();
        input.destroy();
        gunzip.destroy();
    }
}
