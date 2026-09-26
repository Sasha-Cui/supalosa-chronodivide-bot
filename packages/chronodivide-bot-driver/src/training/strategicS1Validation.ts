import { S1Sample, S1_ENUMS, S1_SIDES, finite, natural } from "./strategicS1Observation.js";
import { FRESH_DUAL_ACTION_METHODS } from "./freshDualStudyInstrumentation.js";
const require = (condition: unknown, message: string) => {
    if (!condition) throw new Error("S1 schema: " + message);
};
export const exactFields = (x: any, fields: string) =>
    require(x &&
        typeof x === "object" &&
        !Array.isArray(x) &&
        JSON.stringify(Object.keys(x).sort()) === JSON.stringify(fields.split(" ").sort()), fields);
const bool = (x: unknown) => require(typeof x === "boolean", "boolean");
const str = (x: unknown, empty = false) => require(typeof x === "string" && (empty || x.length > 0), "string");
const nullable = (x: any, fn: (v: any) => unknown) => {
    if (x !== null) fn(x);
};
const enumeration = (x: any, kind: keyof typeof S1_ENUMS) =>
    require(Number.isSafeInteger(x) && x >= 0 && x < S1_ENUMS[kind].length, kind);
const weapon = (x: any) => {
    exactFields(x, "type rulesName minRange maxRange speed cooldownTicks");
    require([0, 1, 2].includes(x.type), "weapon type");
    str(x.rulesName);
    for (const k of ["minRange", "maxRange", "speed", "cooldownTicks"]) finite(x[k]);
};
export function validateS1Sample(x: unknown): asserts x is S1Sample {
    const s = x as any;
    exactFields(s, "kind tick periodic players units unitCoverage missions window");
    require(s.kind === "strategic-s1-sample-v1", "kind");
    natural(s.tick);
    require(s.tick <= 24000, "tick cap");
    require(s.periodic === (s.tick > 0 && s.tick % 300 === 0), "periodic marker");
    exactFields(s.players, "candidate baseline");
    for (const side of S1_SIDES) {
        const p = s.players[side];
        exactFields(p, "name country credits power defeated queues");
        require(p.name === (side === "candidate" ? "OD1Candidate" : "OD1Opponent"), "participant name");
        require(["Americans", "Africans"].includes(p.country), "country");
        finite(p.credits);
        bool(p.defeated);
        exactFields(p.power, "total drain isLowPower");
        finite(p.power.total);
        finite(p.power.drain);
        bool(p.power.isLowPower);
        require(Array.isArray(p.queues) && p.queues.length === 6, "all six queues");
        p.queues.forEach((q: any, i: number) => {
            exactFields(q, "type status size maxSize items");
            require(q.type === i, "queue order");
            enumeration(q.status, "queueStatus");
            natural(q.size);
            natural(q.maxSize);
            require(Array.isArray(q.items), "queue items");
            for (const item of q.items) {
                exactFields(item, "rulesName rulesType quantity");
                str(item.rulesName);
                enumeration(item.rulesType, "object");
                natural(item.quantity);
            }
        });
    }
    exactFields(s.unitCoverage, "allIds otherOwner nonLive");
    Object.values(s.unitCoverage).forEach(natural);
    require(Array.isArray(s.units) && s.units.length <= 4096, "unit bound");
    let last = -1;
    for (const u of s.units) {
        exactFields(
            u,
            "id side owner rulesName type x y health maxHealth purchaseValue canMove isIdle buildStatus isPoweredOn primaryWeapon secondaryWeapon weaponRulesObserved primaryRule secondaryRule",
        );
        natural(u.id);
        require(u.id > last, "sorted unique units");
        last = u.id;
        require(S1_SIDES.includes(u.side), "side");
        require(u.owner === s.players[u.side].name, "checked owner");
        str(u.rulesName);
        enumeration(u.type, "object");
        [u.x, u.y, u.health].forEach(finite);
        require(u.health > 0, "live health");
        nullable(u.maxHealth, finite);
        nullable(u.purchaseValue, finite);
        for (const k of ["canMove", "isIdle", "isPoweredOn"]) nullable(u[k], bool);
        nullable(u.buildStatus, (v) => enumeration(v, "build"));
        nullable(u.primaryWeapon, weapon);
        nullable(u.secondaryWeapon, weapon);
        bool(u.weaponRulesObserved);
        nullable(u.primaryRule, (v) => str(v, true));
        nullable(u.secondaryRule, (v) => str(v, true));
    }
    require(s.unitCoverage.allIds ===
        s.units.length + s.unitCoverage.otherOwner + s.unitCoverage.nonLive, "unit census");
    require(Array.isArray(s.missions), "missions");
    last = -1;
    const names = new Set();
    for (const m of s.missions) {
        exactFields(m, "id name type priority active unitIds firstObservedTick sampledAgeLowerBound");
        natural(m.id);
        require(m.id > last, "mission identity order");
        last = m.id;
        str(m.name);
        str(m.type);
        require(!names.has(m.name), "duplicate mission name");
        names.add(m.name);
        finite(m.priority);
        bool(m.active);
        require(Array.isArray(m.unitIds), "membership");
        let before = -1;
        for (const id of m.unitIds) {
            natural(id);
            require(id >= before, "sorted memberships");
            before = id;
        }
        natural(m.firstObservedTick);
        require(m.firstObservedTick <= s.tick, "mission age");
        require(m.sampledAgeLowerBound === s.tick - m.firstObservedTick, "sampled age lower bound");
    }
    const w = s.window;
    exactFields(
        w,
        "afterTick throughTick calls bySideAndMethod bySideAndOrder bySideAndTarget requestedUnitIdOccurrences events",
    );
    require(Number.isSafeInteger(w.afterTick) && w.afterTick >= -1 && w.afterTick < s.tick, "window start");
    require(w.throughTick === s.tick, "window end");
    natural(w.calls);
    exactFields(w.requestedUnitIdOccurrences, "candidate baseline");
    Object.values(w.requestedUnitIdOccurrences).forEach(natural);
    for (const key of ["bySideAndMethod", "bySideAndOrder", "bySideAndTarget"]) {
        const map = w[key];
        require(map && typeof map === "object" && !Array.isArray(map), "counter map");
        for (const [k, v] of Object.entries(map)) {
            natural(v);
            require(Number(v) > 0, "positive stored count");
            const dot = k.indexOf("."),
                side = k.slice(0, dot),
                name = k.slice(dot + 1);
            require(S1_SIDES.includes(side as any), "counter side");
            if (key === "bySideAndMethod") require(FRESH_DUAL_ACTION_METHODS.includes(name as any), "public method");
            else if (key === "bySideAndOrder") require(S1_ENUMS.order.includes(name as any), "order enum");
            else
                require(["none", "position", "missing-object"].includes(name) ||
                    /^(candidate|baseline|other|unowned)\/(building|nonbuilding)\/(unknown-health|live|nonlive)$/.test(
                        name,
                    ), "target category");
        }
    }
    require(Object.values(w.bySideAndMethod).reduce((a: any, b: any) => a + b, 0) === w.calls, "method conservation");
    for (const side of S1_SIDES) {
        const orders = w.bySideAndMethod[side + ".orderUnits"] ?? 0;
        for (const key of ["bySideAndOrder", "bySideAndTarget"])
            require(Object.entries(w[key])
                .filter(([k]) => k.startsWith(side + "."))
                .reduce((n, [, v]) => n + Number(v), 0) === orders, "order conservation");
    }
    require(Array.isArray(w.events), "events");
    const seen = new Set();
    let previous = w.afterTick;
    for (const row of w.events) {
        exactFields(row, "tick event");
        natural(row.tick);
        require(row.tick > w.afterTick && row.tick <= s.tick && row.tick >= previous, "event window");
        previous = row.tick;
        const e = row.event;
        natural(e.target);
        if (e.type === 3) {
            exactFields(e, "type target attackerPlayerName attackerObjectId weaponName");
            nullable(e.attackerPlayerName, str);
            nullable(e.attackerObjectId, natural);
            nullable(e.weaponName, str);
        } else if (e.type === 2) exactFields(e, "type target");
        else {
            require(e.type === 0, "event enum");
            exactFields(e, "type target previousOwnerName newOwnerName");
            str(e.previousOwnerName);
            str(e.newOwnerName);
        }
        const key = JSON.stringify(row);
        require(!seen.has(key), "duplicate event");
        seen.add(key);
    }
}
export function validateS1Sequence(samples: S1Sample[], updates: number): void {
    natural(updates);
    require(updates >= 1 && updates <= 24000, "sequence horizon");
    const ticks = [0];
    for (let i = 300; i <= updates; i += 300) ticks.push(i);
    if (ticks[ticks.length - 1] !== updates) ticks.push(updates);
    require(samples.length === ticks.length, "complete sample count");
    const known = new Map<number, { name: string; type: string; firstObservedTick: number }>();
    let largest = -1;
    samples.forEach((s, i) => {
        validateS1Sample(s);
        require(s.tick === ticks[i], "exact sampling grid");
        require(s.window.afterTick === (i ? ticks[i - 1] : -1), "nonoverlapping windows");
        for (const m of s.missions) {
            const previous = known.get(m.id);
            if (previous)
                require(previous.name === m.name &&
                    previous.type === m.type &&
                    previous.firstObservedTick === m.firstObservedTick, "mission identity continuity");
            else {
                require(m.id === largest + 1 && m.firstObservedTick === s.tick, "first mission observation");
                largest = m.id;
                known.set(m.id, { name: m.name, type: m.type, firstObservedTick: m.firstObservedTick });
            }
        }
    });
}
