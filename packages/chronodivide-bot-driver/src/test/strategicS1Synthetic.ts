import { createHash } from "node:crypto";
import { gzipSync, gunzipSync } from "node:zlib";
import { ApiEventType } from "@chronodivide/game-api";
import { buildStrategicS1Plan, S1_POLICY, StrategicS1Plan } from "../training/strategicS1Plan.js";
import { OD1_MAP_IDS } from "../training/unifiedIntentV2OD1Plan.js";
import { S1Sample, S1Unit } from "../training/strategicS1Observation.js";
import { encodeS1Ledger } from "../training/strategicS1Ledger.js";
import { PassiveDualBuildingEndpoint } from "../training/passiveDualBuildingEndpoint.js";
import { snapshotCombatantBuildings } from "../training/literalBuildingEliminationEndpoint.js";
import { snapshotLiveOwnedBuildingsCandidate } from "../training/liveOwnedBuildingSnapshotCandidate.js";
import { normalizeFreshDualEvents } from "../training/freshDualEndpointLedger.js";
export const syntheticS1Plan = () =>
    buildStrategicS1Plan(
        OD1_MAP_IDS.map((id, i) => ({
            id,
            label: id,
            fileName: id + ".map",
            absolutePath: "/synthetic/" + id + ".map",
            sha256: i.toString(16).padStart(64, "0"),
            starts: ["1,2", "3,4"],
            advancedEligible: id.startsWith("hfo-"),
        })),
    );
const names = { candidate: "OD1Candidate", baseline: "OD1Opponent" };
const hash = (data: string | Buffer) => createHash("sha256").update(data).digest("hex");
export const syntheticS1Units = (): S1Unit[] => [
    ...[
        ["candidate", 1, "GAWEAP"],
        ["baseline", 2, "NACNST"],
    ].map(
        ([side, id, rulesName]) =>
            ({
                id: Number(id),
                side,
                owner: names[side as keyof typeof names],
                rulesName,
                type: 2,
                x: Number(id),
                y: 2,
                health: 100,
                maxHealth: 100,
                purchaseValue: 1000,
                canMove: false,
                isIdle: false,
                buildStatus: 1,
                isPoweredOn: true,
                primaryWeapon: null,
                secondaryWeapon: null,
                weaponRulesObserved: true,
                primaryRule: null,
                secondaryRule: null,
            }) as S1Unit,
    ),
    ...Array.from(
        { length: 8 },
        (_, i): S1Unit => ({
            id: 10 + i,
            side: "candidate",
            owner: names.candidate,
            rulesName: "MTNK",
            type: 7,
            x: i * 10,
            y: 5,
            health: 100,
            maxHealth: 100,
            purchaseValue: i === 0 ? null : 700,
            canMove: true,
            isIdle: true,
            buildStatus: null,
            isPoweredOn: null,
            primaryWeapon: { type: 0, rulesName: "Cannon", minRange: 0, maxRange: 6, speed: 20, cooldownTicks: 0 },
            secondaryWeapon: null,
            weaponRulesObserved: true,
            primaryRule: "Cannon",
            secondaryRule: null,
        }),
    ),
];
export function syntheticS1Samples(updates = 1200, country = "Americans"): S1Sample[] {
    const ticks = [0];
    for (let t = 300; t <= updates; t += 300) ticks.push(t);
    if (ticks[ticks.length - 1] !== updates) ticks.push(updates);
    return ticks.map((tick, i) => ({
        kind: "strategic-s1-sample-v1",
        tick,
        periodic: tick > 0 && tick % 300 === 0,
        players: Object.fromEntries(
            Object.entries(names).map(([side, name]) => [
                side,
                {
                    name,
                    country,
                    credits: 3000,
                    power: { total: 100, drain: 50, isLowPower: false },
                    defeated: false,
                    queues: Array.from({ length: 6 }, (_, type) => ({
                        type,
                        status: 0,
                        size: 0,
                        maxSize: 99,
                        items: [],
                    })),
                },
            ]),
        ) as unknown as S1Sample["players"],
        units: syntheticS1Units(),
        unitCoverage: { allIds: 10, otherOwner: 0, nonLive: 0 },
        missions: [
            {
                id: 0,
                name: "attack",
                type: "AttackMission",
                priority: 10,
                active: true,
                unitIds: Array.from({ length: 8 }, (_, j) => j + 10),
                firstObservedTick: 0,
                sampledAgeLowerBound: tick,
            },
        ],
        window: {
            afterTick: i ? ticks[i - 1] : -1,
            throughTick: tick,
            calls: 0,
            bySideAndMethod: {},
            bySideAndOrder: {},
            bySideAndTarget: {},
            requestedUnitIdOccurrences: { candidate: 0, baseline: 0 },
            events: [],
        },
    }));
}
export function packS1Endpoint(records: any[]) {
    const plain = Buffer.from(records.map((r) => JSON.stringify(r) + "\n").join("")),
        gzip = gzipSync(plain, { level: 9 });
    return {
        encoding: "gzip-jsonl-base64-v1",
        records: records.length,
        plainBytes: plain.length,
        gzipBytes: gzip.length,
        plainSha256: hash(plain),
        gzipSha256: hash(gzip),
        data: gzip.toString("base64"),
    };
}
export const unpackS1Endpoint = (ledger: any) =>
    gunzipSync(Buffer.from(ledger.data, "base64"))
        .toString("utf8")
        .trimEnd()
        .split("\n")
        .map((l) => JSON.parse(l));

/** Generate synthetic records directly; never call a game creator, initializer or update. */
export function syntheticS1Record(c: StrategicS1Plan["cases"][number], outcome = c.caseIndex % 5) {
    const cap = outcome === 4,
        updates = cap ? 24000 : 2;
    const samples = syntheticS1Samples(updates, c.country);
    let tick = 0,
        units = samples[0].units,
        engine = { finished: false, defeated: { candidate: false, baseline: false } };
    const game: any = {
        getCurrentTick: () => tick,
        getAllUnits: (filter?: any) =>
            units.filter((u) => !filter || filter({ name: u.rulesName, type: u.type })).map((u) => u.id),
        getUnitData: (id: number) => {
            const u = units.find((v) => v.id === id);
            return u
                ? {
                      id,
                      owner: u.owner,
                      hitPoints: u.health,
                      tile: { rx: u.x, ry: u.y },
                      rules: { name: u.rulesName, type: u.type },
                  }
                : undefined;
        },
        getVisibleUnits: (owner: string, _visibility: string, filter: any) =>
            units
                .filter((u) => u.owner === owner && u.health > 0 && filter({ name: u.rulesName, type: u.type }))
                .map((u) => u.id),
    };
    const snapshots = () => ({
        legacy: snapshotCombatantBuildings(game, names),
        live: snapshotLiveOwnedBuildingsCandidate(game, names),
    });
    const dual = new PassiveDualBuildingEndpoint(names, 24000),
        initial = snapshots();
    const records: any[] = [
        {
            kind: "header",
            schemaVersion: 1,
            combatants: names,
            frozenLimit: 24000,
            initialTick: 0,
            initial,
            initialEngine: structuredClone(engine),
            initialState: dual.getState(),
        },
    ];
    dual.beginUpdate(game);
    tick = 1;
    const firstState = dual.completeUpdate(game, engine);
    records.push({
        kind: "step",
        tick: 1,
        pre: initial,
        post: snapshots(),
        events: [],
        engine: structuredClone(engine),
        dualState: firstState,
    });
    let events: any[] = [];
    if (cap) {
        records.push({
            kind: "stable",
            fromTick: 2,
            toTick: 24000,
            snapshotsSha256: hash(JSON.stringify(snapshots())),
            engine: structuredClone(engine),
            dualState: dual.getState(),
        });
        tick = 24000;
    } else {
        const pre = snapshots();
        dual.beginUpdate(game);
        tick = 2;
        const removed = outcome === 0 ? [2] : outcome === 1 ? [1] : outcome === 2 ? [1, 2] : [];
        events = removed.map((target) => ({
            type: ApiEventType.ObjectDestroy,
            target,
            attackerInfo: {
                playerName: target === 1 ? names.baseline : names.candidate,
                objId: 10,
                weaponName: "Cannon",
            },
        }));
        for (const e of events) dual.observe(e);
        units = units.filter((u) => !removed.includes(u.id));
        if (outcome === 3) engine = { finished: true, defeated: { candidate: true, baseline: false } };
        const state = dual.completeUpdate(game, engine);
        records.push({
            kind: "step",
            tick: 2,
            pre,
            post: snapshots(),
            events: normalizeFreshDualEvents(events),
            engine: structuredClone(engine),
            dualState: state,
        });
        const last = samples[samples.length - 1];
        last.units = structuredClone(units);
        last.unitCoverage.allIds = units.length;
        last.players.candidate.defeated = engine.defeated.candidate;
        last.window.events = normalizeFreshDualEvents(events).map((event) => ({ tick: 2, event }));
    }
    const calls = {
        sha256: "a".repeat(64),
        bySideAndMethod: { "candidate.orderUnits": 1, "candidate.queueForProduction": 1 },
    };
    samples[0].window.calls = 1;
    samples[0].window.bySideAndMethod = { "candidate.queueForProduction": 1 };
    samples[1].window.calls = 1;
    samples[1].window.bySideAndMethod = { "candidate.orderUnits": 1 };
    samples[1].window.bySideAndOrder = { "candidate.Move": 1 };
    samples[1].window.bySideAndTarget = { "candidate.position": 1 };
    samples[1].window.requestedUnitIdOccurrences.candidate = 2;
    const actionAudit = {
        ...calls,
        callCount: 2,
        zeroHealthBuildingTargetRequests: { count: 0, first: null, last: null, bySideAndRulesName: {} },
    };
    const quitSuppression = {
        mode: "symmetric_no_forwarding",
        attempts: { candidate: 0, baseline: 0 },
        forwarded: { candidate: 0, baseline: 0 },
    };
    const state = cap ? dual.capAt(24000) : dual.getState(),
        stopReason = cap ? "tick_cap" : "dual_complete";
    records.push({ kind: "final", value: { stopReason, updates, dualState: state, actionAudit, quitSuppression } });
    const strategic = encodeS1Ledger(
        samples,
        { caseIndex: c.caseIndex, requestedEngineSeed: c.requestedEngineSeed, maxUpdates: 24000 },
        updates,
        calls,
    );
    return {
        assignment: c,
        episode: {
            kind: "strategic-s1-diagnostic-v1",
            complete: true,
            technicalPass: true,
            policy: S1_POLICY,
            caseIndex: c.caseIndex,
            requestedEngineSeed: c.requestedEngineSeed,
            updates,
            observedStarts: { candidate: c.candidateStart, opponent: c.opponentStart },
            quitSuppression,
            publicCall: calls,
            publicState: { sha256: "b".repeat(64), snapshots: cap ? 5 : 2 },
            stopReason,
            dualState: state,
            actionAudit,
            ledger: packS1Endpoint(records),
            strategicLedger: strategic.ledger,
            strategicAnalysisSha256: hash(JSON.stringify(strategic.analysis)),
        },
    };
}
export function syntheticS1Canaries(plan: StrategicS1Plan) {
    return (["canary_endpoint_only", "canary_strategic"] as const).map((mode) => ({
        kind: "strategic-s1-canary-v1",
        mode,
        complete: true,
        technicalPass: true,
        caseIndex: 200,
        requestedEngineSeed: plan.canaries[0].requestedEngineSeed,
        policy: S1_POLICY,
        updates: 3600,
        observedStarts: { candidate: plan.canaries[0].candidateStart, opponent: plan.canaries[0].opponentStart },
        quitSuppression: {
            mode: "symmetric_no_forwarding",
            attempts: { candidate: 0, baseline: 0 },
            forwarded: { candidate: 0, baseline: 0 },
        },
        publicCall: { sha256: "a".repeat(64), bySideAndMethod: {} },
        publicState: { sha256: "b".repeat(64), snapshots: 3601 },
        dualTrace: { sha256: "c".repeat(64), snapshots: 3601 },
        strategic:
            mode === "canary_endpoint_only"
                ? null
                : {
                      samples: 13,
                      schemaVerified: true,
                      replayPass: true,
                      windowConservation: true,
                      payloadDiscarded: true,
                      records: 15,
                      gzipBytes: 50,
                      plainBytes: 1000,
                  },
    }));
}
export const syntheticS1Smoke = (plan: StrategicS1Plan) => ({
    kind: "strategic-s1-smoke-technical-v1",
    complete: true,
    technicalPass: true,
    caseIndex: 204,
    requestedEngineSeed: plan.smoke.requestedEngineSeed,
    policy: S1_POLICY,
    endpointReplayPass: true,
    strategicReplayPass: true,
    schemaVerified: true,
    sampleGridVerified: true,
    windowConservation: true,
    payloadDiscarded: true,
    resignationSuppressed: true,
    combinedBytes: 1000,
    endpointStorage: { records: 4, gzipBytes: 50, plainBytes: 1000 },
    strategicStorage: { records: 4, gzipBytes: 50, plainBytes: 1000 },
});
