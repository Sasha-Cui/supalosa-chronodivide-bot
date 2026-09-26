import { S1Sample, S1Unit, S1Side, S1_SIDES } from "./strategicS1Observation.js";
import { validateS1Sequence } from "./strategicS1Validation.js";
type Tri = boolean | null;
const every = (...x: Tri[]): Tri => (x.includes(false) ? false : x.includes(null) ? null : true);
const some = (x: Tri[]): Tri => (x.includes(true) ? true : x.includes(null) ? null : false);
export const armedS1 = (u: S1Unit): Tri =>
    u.primaryWeapon || u.secondaryWeapon
        ? true
        : u.weaponRulesObserved && !u.primaryRule && !u.secondaryRule
        ? false
        : null;
export const mobileS1 = (u: S1Unit): Tri =>
    ["HARV", "CMIN"].includes(u.rulesName) ? false : every(u.canMove, armedS1(u));
const atLeast = (known: number, unknown: number, n: number): Tri =>
    known >= n ? true : known + unknown < n ? false : null;
const summary = (values: number[]) => {
    if (!values.length) return null;
    const v = values.slice().sort((a, b) => a - b);
    return {
        n: v.length,
        min: v[0],
        median: v[Math.floor(v.length / 2)],
        p90: v[Math.min(v.length - 1, Math.floor(0.9 * v.length))],
        max: v[v.length - 1],
        mean: v.reduce((a, b) => a + b, 0) / v.length,
    };
};
export function deriveS1Sample(s: S1Sample) {
    const sides = Object.fromEntries(
        S1_SIDES.map((side) => {
            const units = s.units.filter((u) => u.side === side),
                mobile = units.filter((u) => mobileS1(u) === true),
                unknown = units.filter((u) => mobileS1(u) === null);
            const composition = new Map<
                string,
                {
                    rulesName: string;
                    type: number;
                    count: number;
                    knownPurchaseValue: number;
                    missingPurchaseValue: number;
                }
            >();
            for (const u of units) {
                const key = u.type + "/" + u.rulesName;
                if (!composition.has(key))
                    composition.set(key, {
                        rulesName: u.rulesName,
                        type: u.type,
                        count: 0,
                        knownPurchaseValue: 0,
                        missingPurchaseValue: 0,
                    });
                const row = composition.get(key)!;
                row.count++;
                if (u.purchaseValue === null) row.missingPurchaseValue++;
                else row.knownPurchaseValue += u.purchaseValue;
            }
            return [
                side,
                {
                    liveUnits: units.length,
                    buildings: units.filter((u) => u.type === 2).length,
                    armed: units.filter((u) => armedS1(u) === true).length,
                    unknownArmed: units.filter((u) => armedS1(u) === null).length,
                    mobile: mobile.length,
                    unknownMobile: unknown.length,
                    idleMobile: mobile.filter((u) => u.isIdle === true).length,
                    unknownIdleMobile: mobile.filter((u) => u.isIdle === null).length,
                    excludedHarvesters: units.filter((u) => ["HARV", "CMIN"].includes(u.rulesName)).length,
                    composition: [...composition.values()].sort(
                        (a, b) =>
                            a.type - b.type || (a.rulesName < b.rulesName ? -1 : a.rulesName > b.rulesName ? 1 : 0),
                    ),
                },
            ];
        }),
    ) as Record<
        S1Side,
        {
            liveUnits: number;
            buildings: number;
            armed: number;
            unknownArmed: number;
            mobile: number;
            unknownMobile: number;
            idleMobile: number;
            unknownIdleMobile: number;
            excludedHarvesters: number;
            composition: any[];
        }
    >;
    const c = sides.candidate,
        b = sides.baseline,
        factories = s.units.filter(
            (u) => u.side === "candidate" && u.type === 2 && ["GAWEAP", "NAWEAP"].includes(u.rulesName),
        );
    const factoryReady = some(
        factories.map((u) => every(u.buildStatus === null ? null : u.buildStatus === 1, u.isPoweredOn)),
    );
    const funded = every(
        s.players.candidate.credits >= 2000,
        factoryReady,
        s.players.candidate.queues[3].size === 0 && s.players.candidate.queues[3].items.length === 0,
    );
    const idle = every(
        atLeast(c.mobile, c.unknownMobile, 8),
        c.unknownMobile || c.unknownIdleMobile ? null : c.idleMobile >= c.mobile / 2,
        b.buildings > 0,
    );
    const closeout = every(
        b.buildings >= 1 && b.buildings <= 3,
        b.armed > 0 ? false : b.unknownArmed ? null : true,
        atLeast(c.mobile, c.unknownMobile, 3),
    );
    const byId = new Map(s.units.filter((u) => u.side === "candidate").map((u) => [u.id, u]));
    const missions = s.missions.map((m) => {
        const ids = [...new Set(m.unitIds)],
            members = ids.map((id) => byId.get(id)).filter((x): x is S1Unit => !!x),
            mobile = members.filter((u) => mobileS1(u) === true),
            unknown = members.filter((u) => mobileS1(u) === null).length;
        const centroid = mobile.length
            ? {
                  x: mobile.reduce((n, u) => n + u.x, 0) / mobile.length,
                  y: mobile.reduce((n, u) => n + u.y, 0) / mobile.length,
              }
            : null;
        const distances = centroid ? summary(mobile.map((u) => Math.hypot(u.x - centroid.x, u.y - centroid.y))) : null;
        return {
            id: m.id,
            name: m.name,
            type: m.type,
            priority: m.priority,
            active: m.active,
            sampledAgeLowerBound: m.sampledAgeLowerBound,
            liveOwnedMembers: members.length,
            staleOrOtherOwnerIds: ids.length - members.length,
            duplicateMembershipOccurrences: m.unitIds.length - ids.length,
            mobileMembers: mobile.length,
            unknownMobileMembers: unknown,
            centroid,
            distances,
            dispersed: every(
                atLeast(mobile.length, unknown, 8),
                unknown ? null : distances ? distances.p90 > 12 : false,
            ),
        };
    });
    return {
        tick: s.tick,
        periodic: s.periodic,
        sides,
        missions,
        flags: {
            fundedEmptyVehicleQueue: funded,
            idleForce: idle,
            dispersedMission: some(missions.map((m) => m.dispersed)),
            unopposedCloseout: closeout,
        },
    };
}
/** Descriptive reconstruction only: no selection of policies, significance test, or winning claim. */
export function analyzeS1Episode(samples: S1Sample[], updates: number) {
    validateS1Sequence(samples, updates);
    const rows = samples.map(deriveS1Sample),
        names = ["fundedEmptyVehicleQueue", "idleForce", "dispersedMission", "unopposedCloseout"] as const;
    const result = Object.fromEntries(
        names.map((name) => [
            name,
            {
                eligibleSamples: 0,
                unavailableSamples: 0,
                trueSamples: 0,
                maxConsecutivePeriodicSamples: 0,
                anyFourSampleScreen: false,
                eligibleFraction: null as number | null,
            },
        ]),
    ) as Record<
        (typeof names)[number],
        {
            eligibleSamples: number;
            unavailableSamples: number;
            trueSamples: number;
            maxConsecutivePeriodicSamples: number;
            anyFourSampleScreen: boolean;
            eligibleFraction: number | null;
        }
    >;
    const runs = { fundedEmptyVehicleQueue: 0, idleForce: 0, unopposedCloseout: 0 };
    let missionRuns = new Map<number, number>();
    for (const row of rows) {
        if (!row.periodic) continue;
        for (const name of names) {
            const value = row.flags[name],
                r = result[name];
            if (value === null) r.unavailableSamples++;
            else {
                r.eligibleSamples++;
                if (value) r.trueSamples++;
            }
            if (name !== "dispersedMission") {
                runs[name] = value === true ? runs[name] + 1 : 0;
                r.maxConsecutivePeriodicSamples = Math.max(r.maxConsecutivePeriodicSamples, runs[name]);
            }
        }
        const next = new Map<number, number>();
        for (const m of row.missions) next.set(m.id, m.dispersed === true ? (missionRuns.get(m.id) ?? 0) + 1 : 0);
        missionRuns = next;
        result.dispersedMission.maxConsecutivePeriodicSamples = Math.max(
            result.dispersedMission.maxConsecutivePeriodicSamples,
            0,
            ...next.values(),
        );
    }
    for (const r of Object.values(result)) {
        r.anyFourSampleScreen = r.maxConsecutivePeriodicSamples >= 4;
        r.eligibleFraction = r.eligibleSamples ? r.trueSamples / r.eligibleSamples : null;
    }
    const membership = [] as Array<{
        tick: number;
        missionId: number;
        previouslyObservedAtPrecedingSample: boolean;
        added: number | null;
        removed: number | null;
    }>;
    let previous = new Map<number, Set<number>>();
    for (const s of samples) {
        const next = new Map<number, Set<number>>();
        for (const m of s.missions) {
            const ids = new Set(m.unitIds),
                before = previous.get(m.id);
            membership.push({
                tick: s.tick,
                missionId: m.id,
                previouslyObservedAtPrecedingSample: !!before,
                added: before ? [...ids].filter((id) => !before.has(id)).length : null,
                removed: before ? [...before].filter((id) => !ids.has(id)).length : null,
            });
            next.set(m.id, ids);
        }
        previous = next;
    }
    const distributions = Object.fromEntries(
        S1_SIDES.map((side) => [
            side,
            {
                credits: summary(samples.map((s) => s.players[side].credits)),
                powerTotal: summary(samples.map((s) => s.players[side].power.total)),
                powerDrain: summary(samples.map((s) => s.players[side].power.drain)),
                liveUnits: summary(rows.map((r) => r.sides[side].liveUnits)),
                liveBuildings: summary(rows.map((r) => r.sides[side].buildings)),
                knownMobile: summary(rows.map((r) => r.sides[side].mobile)),
                unknownMobile: summary(rows.map((r) => r.sides[side].unknownMobile)),
                idleMobile: summary(rows.map((r) => r.sides[side].idleMobile)),
            },
        ]),
    );
    return {
        kind: "strategic-s1-episode-analysis-v1" as const,
        complete: true as const,
        updates,
        samples: samples.length,
        periodicSamples: Math.floor(updates / 300),
        screens: result,
        distributions,
        rows,
        membership,
        scope: "Single unchanged-policy descriptive observations. Sampled states are not continuous durations; flags are not proven errors or causal effects. No superiority or deployment inference.",
    };
}
