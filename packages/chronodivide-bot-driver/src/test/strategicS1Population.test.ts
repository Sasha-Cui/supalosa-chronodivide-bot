import { describe, it, expect, beforeAll } from "vitest";
import { verifyEmbeddedFreshDualLedger } from "../training/embeddedFreshDualLedger.js";
import { verifyFreshDualLedgerRecords } from "../training/freshDualEndpointLedger.js";
import { S1Distribution, mergeS1Distributions } from "../training/strategicS1Distributions.js";
import { describeS1Episode } from "../training/strategicS1Descriptions.js";
import { validateS1CanaryPair, validateS1Smoke, validateS1Diagnostic, s1Hash } from "../training/strategicS1Results.js";
import { analyzeStrategicS1Population, S1_STATUSES } from "../training/strategicS1Population.js";
import { replayS1Ledger, encodeS1Ledger } from "../training/strategicS1Ledger.js";
import {
    syntheticS1Plan,
    syntheticS1Samples,
    syntheticS1Record,
    syntheticS1Canaries,
    syntheticS1Smoke,
    packS1Endpoint,
    unpackS1Endpoint,
} from "./strategicS1Synthetic.js";
const metric = (r: ReturnType<typeof describeS1Episode>, key: string) => {
    const value = r.metrics.find((m) => m.key === key);
    if (!value) throw new Error("missing metric " + key);
    return value;
};
describe("S1 complete distributions and missingness (pure synthetic records)", () => {
    it("keeps measured zero distinct from unavailable and uses fixed noninterpolated quantiles", () => {
        const d = new S1Distribution();
        [0, 10, 20, 30, 40].forEach((x) => d.add(x));
        d.add(null, "missing_field", 2);
        const r = d.finish();
        expect(r.coverage).toEqual({
            eligible: 7,
            observed: 5,
            unavailable: 2,
            missingReasons: { missing_field: 2 },
            emptyReason: null,
        });
        expect(r.distribution?.median).toBe(20);
        expect(r.distribution?.p90).toBe(40);
        expect(r.distribution?.mean).toBe(20);
    });
    it("separates pooled observation weights from equal-case means", () => {
        const a = new S1Distribution(),
            b = new S1Distribution();
        a.add(0);
        b.add(100, "", 9);
        const r = mergeS1Distributions([
            { key: "x", ...a.finish() },
            { key: "x", ...b.finish() },
        ]);
        expect(r.distribution?.mean).toBe(90);
        expect(r.equalCaseMeans.distribution?.mean).toBe(50);
        expect(mergeS1Distributions([]).distribution).toBe(null);
    });
    it("rejects nonfinite measurements and nonintegral frequency counts", () => {
        const d = new S1Distribution();
        for (const x of [NaN, Infinity, -Infinity]) expect(() => d.add(x)).toThrow();
        expect(() => d.add(1, "", 0.5)).toThrow();
        expect(() => d.add(null, "")).toThrow();
    });
    it("retains both-player economy, all queues, inventory, mission, action and event domains", () => {
        const r = describeS1Episode(syntheticS1Samples(), 1200);
        for (const key of [
            "candidate.credits",
            "baseline.power.total",
            "candidate.queue.Vehicles.size",
            "baseline.queue.Ships.status.Ready",
            "candidate.inventory.type.Vehicle.knownPurchaseValue",
            "candidate.mission.knownMobile.distanceP90",
            "candidate.target.position",
            "events.physicalDestruction",
        ])
            expect(metric(r, key)).toBeDefined();
        expect(metric(r, "candidate.inventory.all.missingPurchaseValue").distribution?.mean).toBe(1);
        expect(r.buildingTrajectory).toHaveLength(5);
        expect(r.screens.dispersedMission.anyFourSampleScreen).toBe(true);
        expect(metric(r, "candidate.mission.membershipIdOccurrences").distribution?.mean).toBe(8);
    });
    it("zero-fills complete-census queue/rule absences without imputing missing purchase values", () => {
        const s = syntheticS1Samples();
        s[1].players.candidate.queues[3].items = [{ rulesName: "MTNK", rulesType: 7, quantity: 5 }];
        s[1].players.candidate.queues[3].size = 5;
        s[1].players.candidate.queues[3].status = 1;
        const r = describeS1Episode(s, 1200),
            item = metric(r, "candidate.queue.Vehicles.item.7.MTNK.quantity");
        expect(item.coverage.observed).toBe(5);
        expect(item.distribution?.mean).toBe(1);
        expect(metric(r, "candidate.unit.purchaseValue").coverage.unavailable).toBe(5);
    });
    it("preserves first/gapped membership changes as unavailable with exact reasons", () => {
        const s = syntheticS1Samples();
        s[1].missions = [];
        const r = describeS1Episode(s, 1200),
            m = metric(r, "candidate.mission.membershipAdded");
        expect(m.coverage.missingReasons).toEqual({
            first_sample_not_observed_transfer: 1,
            gap_since_previous_sample: 1,
        });
        expect(metric(r, "candidate.missionType.AttackMission.priority.10.count").distribution?.mean).toBe(0.8);
    });
    it("keeps required metric definitions when unit/mission domains are empty", () => {
        const s = syntheticS1Samples();
        for (const row of s) {
            row.units = [];
            row.unitCoverage.allIds = 0;
            row.missions = [];
            row.players.candidate.credits = 0;
        }
        const r = describeS1Episode(s, 1200);
        expect(metric(r, "candidate.credits").distribution?.mean).toBe(0);
        expect(metric(r, "candidate.unit.health").distribution).toBe(null);
        expect(metric(r, "candidate.mission.priority").coverage.emptyReason).toBe("no_observations_in_this_domain");
    });
    it("reports all applicable missingness reasons without counting startup as an update", () => {
        const s = syntheticS1Samples();
        for (const row of s) {
            row.units[2].canMove = null;
            row.units[3].isIdle = null;
        }
        const r = describeS1Episode(s, 1200);
        expect(r.screenAvailability.idleForce.reasons).toEqual({
            candidate_armed_or_mobility_unknown: 4,
            candidate_idle_state_unknown: 4,
        });
        expect(metric(r, "candidate.method.orderUnits.perObservedUpdate").coverage.missingReasons).toEqual({
            startup_window_has_zero_advancing_updates: 1,
        });
    });
});
describe("S1 strict projections and cross-ledger bindings (no game initialization)", () => {
    const plan = syntheticS1Plan();
    it("replays all five endpoint status fixtures and both retained channels", async () => {
        for (let i = 0; i < 5; i++) {
            const r = syntheticS1Record(plan.cases[i]);
            const v = await validateS1Diagnostic(r.episode, r.assignment);
            expect(v.provenance.independentAudit).toBe(false);
            expect(v.crossLedger.sampleBindings).toHaveLength(i === 4 ? 81 : 2);
            expect(v.episode.dualState.v6.firstResult.status).toBe(S1_STATUSES[i]);
        }
    });
    it("accepts only the exact ordered canary projection and no leaked nested payload", () => {
        const pair = syntheticS1Canaries(plan);
        expect(validateS1CanaryPair(pair, plan.canaries[0]).comparisons).toBe(1);
        expect(() => validateS1CanaryPair(pair.slice().reverse(), plan.canaries[0])).toThrow();
        const bad: any = structuredClone(pair);
        bad[1].strategic.ledger = { data: "leak" };
        expect(() => validateS1CanaryPair(bad, plan.canaries[0])).toThrow();
    });
    it("rejects any canary action/state/dual-trace disagreement", () => {
        for (const key of ["publicCall", "publicState", "dualTrace"]) {
            const pair: any = syntheticS1Canaries(plan);
            pair[1][key].sha256 = "d".repeat(64);
            expect(() => validateS1CanaryPair(pair, plan.canaries[0])).toThrow(/noninterference/);
        }
    });
    it("checks smoke proof flags, nested schemas and necessary storage bounds without claiming discarded replay", () => {
        validateS1Smoke(syntheticS1Smoke(plan), plan.smoke);
        for (const mutate of [
            (r: any) => (r.endpointReplayPass = false),
            (r: any) => (r.combinedBytes = 1),
            (r: any) => (r.strategicStorage.data = "secret"),
            (r: any) => (r.updates = 100),
        ]) {
            const r = syntheticS1Smoke(plan);
            mutate(r);
            expect(() => validateS1Smoke(r, plan.smoke)).toThrow();
        }
    });
    it("rejects nonliteral booleans, extra fields, identity, action/quit and hash drift", async () => {
        for (const mutate of [
            (r: any) => (r.complete = 1),
            (r: any) => (r.extra = true),
            (r: any) => (r.caseIndex = 1),
            (r: any) => (r.updates = Infinity),
            (r: any) => (r.policy.arbiterEnabled = true),
            (r: any) => r.publicState.snapshots++,
            (r: any) => r.actionAudit.callCount++,
            (r: any) => r.quitSuppression.attempts.candidate++,
            (r: any) => (r.ledger.gzipSha256 = "0".repeat(64)),
        ]) {
            const r = structuredClone(syntheticS1Record(plan.cases[0]));
            mutate(r.episode);
            await expect(validateS1Diagnostic(r.episode, r.assignment)).rejects.toThrow();
        }
    });
    it("rejects a scalar or inconsistent structured zero-health diagnostic", async () => {
        for (const value of [0, { count: 1, first: null, last: null, bySideAndRulesName: { "candidate.GACNST": 1 } }]) {
            const r: any = syntheticS1Record(plan.cases[0]);
            r.episode.actionAudit.zeroHealthBuildingTargetRequests = value;
            await expect(validateS1Diagnostic(r.episode, r.assignment)).rejects.toThrow();
        }
    });
    it("detects rehashed strategic country/building/event tampering across independently retained channels", async () => {
        for (const mutate of [
            (s: any[]) => (s[0].players.candidate.country = "Africans"),
            (s: any[]) => (s[0].units[0].health = 99),
            (s: any[]) => (s[1].window.events = []),
        ]) {
            const r = structuredClone(syntheticS1Record(plan.cases[0])),
                samples = replayS1Ledger(r.episode.strategicLedger).samples;
            mutate(samples);
            const encoded = encodeS1Ledger(
                samples,
                { caseIndex: 0, requestedEngineSeed: r.assignment.requestedEngineSeed, maxUpdates: 24000 },
                2,
                r.episode.publicCall,
            );
            r.episode.strategicLedger = encoded.ledger;
            r.episode.strategicAnalysisSha256 = s1Hash(encoded.analysis);
            await expect(validateS1Diagnostic(r.episode, r.assignment)).rejects.toThrow(/country|cross-ledger/);
        }
    });
    it("rejects a rehashed endpoint ledger with a wrong frozen horizon", async () => {
        const r = syntheticS1Record(plan.cases[0]),
            rows = unpackS1Endpoint(r.episode.ledger);
        rows[0].frozenLimit = 90000;
        r.episode.ledger = packS1Endpoint(rows);
        await expect(validateS1Diagnostic(r.episode, r.assignment)).rejects.toThrow(/header identity/);
    });
    it("rejects a preloaded header result even when the low-level record replay is internally consistent", async () => {
        const r = structuredClone(syntheticS1Record(plan.cases[0]));
        const rows = unpackS1Endpoint(r.episode.ledger),
            header = rows[0],
            final = rows[rows.length - 1];
        header.initialState = structuredClone(r.episode.dualState);
        r.episode.ledger = packS1Endpoint([
            header,
            {
                kind: "stable",
                fromTick: 1,
                toTick: 2,
                snapshotsSha256: s1Hash(header.initial),
                engine: header.initialEngine,
                dualState: header.initialState,
            },
            final,
        ]);
        const samples = replayS1Ledger(r.episode.strategicLedger).samples;
        samples[1].units = structuredClone(samples[0].units);
        samples[1].unitCoverage = structuredClone(samples[0].unitCoverage);
        samples[1].window.events = [];
        const encoded = encodeS1Ledger(
            samples,
            { caseIndex: 0, requestedEngineSeed: r.assignment.requestedEngineSeed, maxUpdates: 24000 },
            2,
            r.episode.publicCall,
        );
        r.episode.strategicLedger = encoded.ledger;
        r.episode.strategicAnalysisSha256 = s1Hash(encoded.analysis);
        expect(verifyFreshDualLedgerRecords(unpackS1Endpoint(r.episode.ledger)).complete).toBe(true);
        await expect(verifyEmbeddedFreshDualLedger(r.episode.ledger as any)).rejects.toThrow(/clean tick-zero header/);
        await expect(validateS1Diagnostic(r.episode, r.assignment)).rejects.toThrow(
            /clean tick-zero header|empty initial observer state/,
        );
    });
});
describe("S1 full 200-case population (synthetic ledger records only)", () => {
    const plan = syntheticS1Plan();
    let input: ReturnType<typeof syntheticS1Record>[], result: Awaited<ReturnType<typeof analyzeStrategicS1Population>>;
    beforeAll(async () => {
        input = plan.cases.map((c) => syntheticS1Record(c));
        result = await analyzeStrategicS1Population(plan, input);
    }, 120000);
    it("replays exactly 200+200 ledgers and reports every frozen grouping and endpoint status", () => {
        expect(result.counts).toMatchObject({
            cases: 200,
            endpointReplays: 200,
            strategicReplays: 200,
            samples: 3560,
            periodicSamples: 3200,
            strata: 25,
            topologies: 5,
            groups: 72,
        });
        const all = result.groups[0];
        expect(all.endpoints.v6).toMatchObject({ W: 40, D: 120, L: 40 });
        expect(Object.values(all.endpoints.v6.statuses)).toEqual([40, 40, 40, 40, 40]);
        expect(result.groups.filter((g) => g.family === "stratum").map((g) => g.cases)).toEqual(Array(25).fill(8));
        expect(result.policyComparison || result.policySelectionAuthorized || result.independentAudit).toBe(false);
    });
    it("uses real observed-update denominators and retains negative/null screen coverage", () => {
        const g = result.groups[0];
        expect(g.actions.candidate.methods.orderUnits).toEqual({
            count: 200,
            updates: 960320,
            perObservedUpdateIncludingStartup: 200 / 960320,
        });
        expect(g.screens.idleForce).toMatchObject({
            positiveCases: 40,
            cases: 200,
            incidence: 0.2,
            casesWithFourPeriodicSamples: 40,
            periodicSamples: 3200,
        });
        expect(result.cases[0].screens.idleForce.eligibleFraction).toBe(null);
        expect(g.metrics.find((m) => m.key === "candidate.unit.purchaseValue")?.coverage.unavailable).toBe(3560);
    });
    it("is deterministic under input reordering without mutating input", async () => {
        const before = s1Hash(input),
            reversed = await analyzeStrategicS1Population(plan, input.slice().reverse());
        expect(s1Hash(reversed)).toBe(s1Hash(result));
        expect(s1Hash(input)).toBe(before);
    }, 120000);
    it("fails closed on incomplete/duplicated population or any altered assignment", async () => {
        await expect(analyzeStrategicS1Population(plan, input.slice(1))).rejects.toThrow(/200-case/);
        const duplicated = input.slice();
        duplicated[199] = input[0];
        await expect(analyzeStrategicS1Population(plan, duplicated)).rejects.toThrow(/duplicate/);
        const altered = input.slice();
        altered[0] = structuredClone(input[0]);
        altered[0].assignment.candidateSlot = 1;
        await expect(analyzeStrategicS1Population(plan, altered)).rejects.toThrow(/assignment/);
        const extra: any = input.slice();
        extra[0] = structuredClone(input[0]);
        extra[0].assignment.hidden = undefined;
        await expect(analyzeStrategicS1Population(plan, extra)).rejects.toThrow();
    });
    it("fails the entire result on one corrupted member rather than selecting a clean subset", async () => {
        const corrupted = input.slice();
        corrupted[0] = structuredClone(input[0]);
        corrupted[0].episode.strategicLedger.gzipSha256 = "0".repeat(64);
        await expect(analyzeStrategicS1Population(plan, corrupted)).rejects.toThrow();
    });
    it("retains empty outcome/status groups and their empty rather than measured-zero domains", async () => {
        const allWins = await analyzeStrategicS1Population(
            plan,
            plan.cases.map((c) => syntheticS1Record(c, 0)),
        );
        const empty = allWins.groups.find((g) => g.family === "v6_outcome" && g.value === "L")!;
        expect(empty.cases).toBe(0);
        expect(empty.metrics[0].distribution).toBe(null);
        expect(empty.screens.idleForce.incidence).toBe(null);
        expect(empty.actions.candidate.methods.orderUnits.perObservedUpdateIncludingStartup).toBe(null);
    }, 120000);
});
