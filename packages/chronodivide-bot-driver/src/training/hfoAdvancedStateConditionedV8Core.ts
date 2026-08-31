import { ActionsApi, GameApi, ObjectType, OrderType, ProductionApi, QueueStatus, QueueType, TechnoRules,
    UnitData } from "@chronodivide/game-api";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import crypto from "node:crypto";
import { InspectableBaselineBot } from "../benchmark/baselineLoader.js";

export const V8_DETECTOR_UPDATE = 1_200 as const;
export const V8_DETECTOR_CREDIT_THRESHOLD = 7_798 as const;
export const V8_SEARCH_SEEDS = [8_801, 8_802, 8_803] as const;
export const V8_MAX_RULES = 12 as const;
export const V8_MAX_PREDICATES = 3 as const;

export const V8_FEATURE_THRESHOLDS = Object.freeze({
    update: [1_200, 1_800, 2_400, 3_600, 4_800, 6_000, 7_200, 8_400, 9_600, 12_000, 15_000],
    ownCredits: [0, 500, 1_000, 2_000, 4_000, 8_000],
    creditGap: [-4_000, -2_000, -1_000, -500, 0, 500, 1_000, 2_000, 4_000],
    ownCombatants: [0, 4, 8, 12, 16, 24, 32],
    visibleEnemyCombatants: [0, 2, 4, 8, 12, 16],
    threat8: [0, 1, 2, 4, 8], threat16: [0, 1, 2, 4, 8], threat24: [0, 1, 2, 4, 8],
    ownHarvesters: [0, 1, 2, 3], ownBarracks: [0, 1, 2], ownWarFactories: [0, 1, 2],
    ownBuildings: [1, 2, 3, 4, 5, 6], homeForce: [0, 4, 8, 12, 16, 24],
    midfieldForce: [0, 4, 8, 12, 16, 24], opponentBaseForce: [0, 4, 8, 12, 16, 24],
    forceDelta: [-8, -4, 0, 4, 8], noProgressUpdates: [600, 1_200, 2_400],
    visibleEnemyBuildings: [0, 1, 2, 3, 4, 6],
} as const);

export type V8NumericFeature = keyof typeof V8_FEATURE_THRESHOLDS;
export type V8CategoricalFeature = "factionSide" | "physicalStart";
export type V8Feature = V8NumericFeature | V8CategoricalFeature;
export type V8Comparator = "<=" | ">=" | "=" | "!=";
export type V8Predicate = { feature: V8NumericFeature; comparator: V8Comparator; value: number } |
    { feature: "factionSide"; comparator: "=" | "!="; value: "Allied" | "Soviet" } |
    { feature: "physicalStart"; comparator: "=" | "!="; value: "West" | "East" | "Top" | "Bottom" };
export type V8ProductionAction = "baseline" | "infantry" | "tank" | "mixed" | "screen" | "rebuild";
export type V8ForceAction = "hold" | "defend_home" | "regroup_home" | "probe" | "assault_force" |
    "assault_production" | "raid_economy" | "recover" | "literal_closeout";
export type V8TargetPriority = "force" | "production" | "economy" | "nearest" | "final_building";
export type V8Rule = { predicates: V8Predicate[]; production: V8ProductionAction; force: V8ForceAction;
    target: V8TargetPriority; forceFraction: 0.25 | 0.5 | 0.75 | 1; homeReserve: 0 | 4 | 8 | 12;
    persistence: 120 | 300 | 600 };
export type V8Policy = { schemaVersion: 8; rules: V8Rule[]; fallback: { production: "baseline";
    threatened: "defend_home"; weak: "recover"; strong: "probe"; weakCombatants: 8 } };
export type CanonicalV8Policy = { policy: V8Policy; canonicalJson: string; sha256: string;
    complexity: { rules: number; predicates: number; nonBaselineActions: number } };

export const V8_PRODUCTION_ACTIONS: readonly V8ProductionAction[] =
    ["baseline", "infantry", "tank", "mixed", "screen", "rebuild"];
export const V8_FORCE_ACTIONS: readonly V8ForceAction[] = ["hold", "defend_home", "regroup_home", "probe",
    "assault_force", "assault_production", "raid_economy", "recover", "literal_closeout"];
export const V8_TARGET_PRIORITIES: readonly V8TargetPriority[] =
    ["force", "production", "economy", "nearest", "final_building"];
const FRACTIONS = [0.25, 0.5, 0.75, 1] as const, RESERVES = [0, 4, 8, 12] as const,
    PERSISTENCE = [120, 300, 600] as const, COMPARATORS: readonly V8Comparator[] = ["<=", ">=", "=", "!="];
const ALLIED = new Set<Countries>([Countries.USA, Countries.KOREA, Countries.FRANCE, Countries.GERMANY,
    Countries.GREAT_BRITAIN]);

const stable = (value: unknown): unknown => Array.isArray(value) ? value.map(stable) : value && typeof value === "object"
    ? Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b))
        .map(([key, child]) => [key, stable(child)])) : value;
const sha256 = (value: string) => crypto.createHash("sha256").update(value).digest("hex");
const predicateKey = (predicate: V8Predicate) => JSON.stringify(stable(predicate));
const ruleKey = (rule: V8Rule) => JSON.stringify(stable(rule));

export const canonicalizeV8Policy = (input: V8Policy): CanonicalV8Policy => {
    const policy: V8Policy = { schemaVersion: 8, rules: input.rules.map((rule) => ({ ...rule,
        predicates: [...rule.predicates].sort((left, right) => predicateKey(left).localeCompare(predicateKey(right))) })),
        fallback: { production: "baseline", threatened: "defend_home", weak: "recover", strong: "probe",
            weakCombatants: 8 } };
    validateV8Policy(policy);
    const canonicalJson = JSON.stringify(stable(policy)), predicates = policy.rules.reduce((sum, rule) =>
        sum + rule.predicates.length, 0), nonBaselineActions = policy.rules.filter((rule) =>
        rule.production !== "baseline" || rule.force !== "hold").length;
    return { policy, canonicalJson, sha256: sha256(canonicalJson),
        complexity: { rules: policy.rules.length, predicates, nonBaselineActions } };
};

const validPredicate = (predicate: V8Predicate) => {
    if (predicate.feature === "factionSide") return ["Allied", "Soviet"].includes(predicate.value) &&
        ["=", "!="].includes(predicate.comparator);
    if (predicate.feature === "physicalStart") return ["West", "East", "Top", "Bottom"].includes(predicate.value) &&
        ["=", "!="].includes(predicate.comparator);
    return (V8_FEATURE_THRESHOLDS[predicate.feature] as readonly number[]).includes(predicate.value) &&
        COMPARATORS.includes(predicate.comparator);
};

export const validateV8Policy = (policy: V8Policy): void => {
    if (policy.schemaVersion !== 8 || policy.rules.length < 1 || policy.rules.length > V8_MAX_RULES ||
        JSON.stringify(policy.fallback) !== JSON.stringify({ production: "baseline", threatened: "defend_home",
            weak: "recover", strong: "probe", weakCombatants: 8 })) throw new Error("V8 policy envelope invalid");
    const seen = new Set<string>();
    for (const rule of policy.rules) {
        if (rule.predicates.length < 1 || rule.predicates.length > V8_MAX_PREDICATES ||
            !rule.predicates.every(validPredicate) || !V8_PRODUCTION_ACTIONS.includes(rule.production) ||
            !V8_FORCE_ACTIONS.includes(rule.force) || !V8_TARGET_PRIORITIES.includes(rule.target) ||
            !FRACTIONS.includes(rule.forceFraction) || !RESERVES.includes(rule.homeReserve) ||
            !PERSISTENCE.includes(rule.persistence)) throw new Error("V8 rule invalid");
        const predicateFeatures = rule.predicates.map((predicate) => predicate.feature);
        if (new Set(predicateFeatures).size !== predicateFeatures.length) throw new Error("V8 duplicate predicate feature");
        const key = ruleKey(rule); if (seen.has(key)) throw new Error("V8 duplicate rule"); seen.add(key);
    }
};

class XorShift32 {
    private state: number;
    constructor(seed: number) { this.state = seed >>> 0 || 0x9e3779b9; }
    next() { let x = this.state; x ^= x << 13; x ^= x >>> 17; x ^= x << 5; this.state = x >>> 0;
        return this.state / 0x1_0000_0000; }
    int(max: number) { if (!Number.isInteger(max) || max <= 0) throw new Error("V8 PRNG bound invalid");
        return Math.floor(this.next() * max); }
    pick<T>(values: readonly T[]): T { return values[this.int(values.length)]; }
}

const randomPredicate = (rng: XorShift32, used: Set<V8Feature>): V8Predicate => {
    const allFeatures: V8Feature[] = [...(Object.keys(V8_FEATURE_THRESHOLDS) as V8NumericFeature[]),
        "factionSide", "physicalStart"];
    const features = allFeatures.filter((feature) => !used.has(feature));
    const feature = rng.pick(features); used.add(feature);
    if (feature === "factionSide") return { feature, comparator: rng.pick(["=", "!="] as const),
        value: rng.pick(["Allied", "Soviet"] as const) };
    if (feature === "physicalStart") return { feature, comparator: rng.pick(["=", "!="] as const),
        value: rng.pick(["West", "East", "Top", "Bottom"] as const) };
    const numericFeature = feature as V8NumericFeature;
    return { feature: numericFeature, comparator: rng.pick(COMPARATORS), value: rng.pick(V8_FEATURE_THRESHOLDS[numericFeature]) };
};
const randomRule = (rng: XorShift32): V8Rule => { const used = new Set<V8Feature>(), count = 1 + rng.int(3);
    return { predicates: Array.from({ length: count }, () => randomPredicate(rng, used)),
        production: rng.pick(V8_PRODUCTION_ACTIONS), force: rng.pick(V8_FORCE_ACTIONS),
        target: rng.pick(V8_TARGET_PRIORITIES), forceFraction: rng.pick(FRACTIONS), homeReserve: rng.pick(RESERVES),
        persistence: rng.pick(PERSISTENCE) }; };
const basePolicy = (rules: V8Rule[]): V8Policy => ({ schemaVersion: 8, rules,
    fallback: { production: "baseline", threatened: "defend_home", weak: "recover", strong: "probe",
        weakCombatants: 8 } });

export const generateV8InitialPolicies = (seed: number, count = 32): CanonicalV8Policy[] => {
    const rng = new XorShift32(seed), policies: CanonicalV8Policy[] = [], seen = new Set<string>();
    for (let attempt = 0; policies.length < count && attempt < count * 100; attempt += 1) {
        const candidate = canonicalizeV8Policy(basePolicy(Array.from({ length: 4 + rng.int(5) }, () => randomRule(rng))));
        if (!seen.has(candidate.sha256)) { seen.add(candidate.sha256); policies.push(candidate); }
    }
    if (policies.length !== count) throw new Error("V8 initial policy generation incomplete");
    return policies;
};

const clonePolicy = (policy: V8Policy): V8Policy => structuredClone(policy);
export const mutateV8Policy = (parent: CanonicalV8Policy, seed: number): CanonicalV8Policy => {
    const rng = new XorShift32(seed), policy = clonePolicy(parent.policy), edit = rng.int(7), ruleIndex = rng.int(policy.rules.length),
        rule = policy.rules[ruleIndex];
    if (edit === 0 && policy.rules.length < V8_MAX_RULES) policy.rules.splice(ruleIndex, 0, randomRule(rng));
    else if (edit === 1 && policy.rules.length > 1) policy.rules.splice(ruleIndex, 1);
    else if (edit === 2) rule.production = rng.pick(V8_PRODUCTION_ACTIONS.filter((value) => value !== rule.production));
    else if (edit === 3) rule.force = rng.pick(V8_FORCE_ACTIONS.filter((value) => value !== rule.force));
    else if (edit === 4) rule.target = rng.pick(V8_TARGET_PRIORITIES.filter((value) => value !== rule.target));
    else if (edit === 5) { rule.forceFraction = rng.pick(FRACTIONS); rule.homeReserve = rng.pick(RESERVES);
        rule.persistence = rng.pick(PERSISTENCE); }
    else { const used = new Set(rule.predicates.map((predicate) => predicate.feature));
        const index = rng.int(rule.predicates.length); used.delete(rule.predicates[index].feature);
        rule.predicates[index] = randomPredicate(rng, used); }
    return canonicalizeV8Policy(policy);
};

export const crossoverV8Policy = (left: CanonicalV8Policy, right: CanonicalV8Policy, seed: number): CanonicalV8Policy => {
    const rng = new XorShift32(seed), policy = clonePolicy(left.policy), donor = clonePolicy(right.policy).rules[rng.int(right.policy.rules.length)],
        index = rng.int(policy.rules.length);
    if (policy.rules.length < V8_MAX_RULES && rng.int(2) === 0) policy.rules.splice(index, 0, donor);
    else policy.rules[index] = donor;
    const deduped: V8Rule[] = [], seen = new Set<string>(); for (const rule of policy.rules) {
        const key = ruleKey({ ...rule, predicates: [...rule.predicates].sort((a, b) => predicateKey(a).localeCompare(predicateKey(b))) });
        if (!seen.has(key)) { seen.add(key); deduped.push(rule); }
    }
    policy.rules = deduped; return canonicalizeV8Policy(policy);
};

export const V8_TECHNICAL_FIXTURES: Readonly<Record<string, CanonicalV8Policy>> = Object.freeze({
    fallback_only: canonicalizeV8Policy(basePolicy([{ predicates: [{ feature: "update", comparator: ">=", value: 15_000 }],
        production: "baseline", force: "hold", target: "nearest", forceFraction: 0.25, homeReserve: 12, persistence: 600 }])),
    defense: canonicalizeV8Policy(basePolicy([{ predicates: [{ feature: "update", comparator: ">=", value: 1_200 }],
        production: "infantry", force: "defend_home", target: "force", forceFraction: 1, homeReserve: 0, persistence: 120 }])),
    recover: canonicalizeV8Policy(basePolicy([{ predicates: [{ feature: "update", comparator: ">=", value: 1_200 }],
        production: "rebuild", force: "recover", target: "nearest", forceFraction: 1, homeReserve: 8, persistence: 300 }])),
    mixed: canonicalizeV8Policy(basePolicy([{ predicates: [{ feature: "update", comparator: ">=", value: 1_200 }],
        production: "mixed", force: "probe", target: "nearest", forceFraction: 0.75, homeReserve: 4, persistence: 300 }])),
    raid: canonicalizeV8Policy(basePolicy([{ predicates: [{ feature: "update", comparator: ">=", value: 1_200 }],
        production: "tank", force: "raid_economy", target: "economy", forceFraction: 0.5, homeReserve: 4, persistence: 300 }])),
    closeout: canonicalizeV8Policy(basePolicy([{ predicates: [{ feature: "update", comparator: ">=", value: 1_200 }],
        production: "screen", force: "literal_closeout", target: "final_building", forceFraction: 1, homeReserve: 0, persistence: 120 }])),
});

export type V8RuntimeFeatures = Record<V8NumericFeature, number> & {
    factionSide: "Allied" | "Soviet"; physicalStart: "West" | "East" | "Top" | "Bottom" };
const compare = (actual: number | string, comparator: V8Comparator, expected: number | string) => comparator === "<="
    ? actual <= expected : comparator === ">=" ? actual >= expected : comparator === "=" ? actual === expected : actual !== expected;
export const matchV8Rule = (rule: V8Rule, features: V8RuntimeFeatures) => rule.predicates.every((predicate) =>
    compare(features[predicate.feature], predicate.comparator, predicate.value));
export const selectV8Rule = (policy: V8Policy, features: V8RuntimeFeatures): { index: number; rule: V8Rule | null } => {
    const index = policy.rules.findIndex((rule) => matchV8Rule(rule, features)); return { index, rule: index >= 0 ? policy.rules[index] : null };
};

export type V8InspectableBot = InspectableBaselineBot & { lastPlayerActions: ActionsApi | null;
    lastPlayerProduction: ProductionApi | null; lastGameApi: GameApi | null };
export type V8OwnershipEvent = { update: number; phase: "baseline" | "controller"; method: string;
    disposition: "forwarded" | "suppressed"; ownedQueue: boolean; ownedCombatantCount: number;
    argumentSha256: string };
export type V8ControllerEvent = { update: number; event: string; [key: string]: unknown };

const visible = (game: GameApi, name: string, relation: "self" | "enemy", predicate: (unit: UnitData) => boolean) =>
    game.getVisibleUnits(name, relation).map((id) => game.getUnitData(id))
        .filter((unit): unit is UnitData => !!unit && predicate(unit)).sort((a, b) => a.id - b.id);
const combatant = (unit: UnitData) => !!unit.rules.isSelectableCombatant && !unit.rules.harvester &&
    unit.rules.type !== ObjectType.Building;
const building = (unit: UnitData) => unit.rules.type === ObjectType.Building;
const dist = (unit: UnitData, point: { x: number; y: number }) => Math.hypot(unit.tile.rx - point.x, unit.tile.ry - point.y);
const startName = (point: { x: number; y: number }) => point.x === 39 && point.y === 82 ? "West" :
    point.x === 151 && point.y === 119 ? "East" : point.x === 88 && point.y === 34 ? "Top" :
        point.x === 88 && point.y === 157 ? "Bottom" : null;
const countryNames = (country: Countries) => ALLIED.has(country) ? { infantry: "E1", tank: "MTNK", dog: "DOG" } :
    { infantry: "E2", tank: "HTNK", dog: "ADOG" };

const ruleByName = (production: ProductionApi, queue: QueueType, name: string): TechnoRules | null =>
    production.getAvailableObjects(queue).find((rule: TechnoRules) => rule.name === name) ?? null;

export const decorateWithV8Controller = (bot: V8InspectableBot, opponentName: string, country: Countries,
    policyInput: CanonicalV8Policy) => {
    const policy = canonicalizeV8Policy(policyInput.policy), ownershipEvents: V8OwnershipEvent[] = [],
        controllerEvents: V8ControllerEvent[] = [];
    let phase: "baseline" | "controller" = "baseline", update = 0, active = false, detected: "Advanced" | "Supalosa" | null = null,
        lastProduction = -Infinity, lastAction = -Infinity, mixedToggle = false, previousCombatants = 0,
        lastSnapshotUpdate = 0, lastProgressUpdate = 0, lastEnemyBuildingHp = Infinity;
    const originalStart = bot.onGameStart.bind(bot), originalTick = bot.onGameTick.bind(bot), originalEvent = bot.onGameEvent.bind(bot);

    const isOwnedQueue = (args: unknown[]) => args[0] === QueueType.Infantry || args[0] === QueueType.Vehicles;
    const ownedIds = (game: GameApi, args: unknown[]) => { const ids = Array.isArray(args[0]) ? args[0] as number[] : [];
        return ids.filter((id) => { const unit = game.getUnitData(id); return !!unit && unit.owner === bot.name && combatant(unit); }); };
    const installOwnership = (game: GameApi) => { const actions = bot.lastPlayerActions as any;
        if (!actions) throw new Error("V8 actions unavailable");
        for (const method of ["queueForProduction", "unqueueFromProduction", "pauseProduction", "resumeProduction", "orderUnits"])
            if (typeof actions[method] === "function") { const original = actions[method].bind(actions);
                actions[method] = (...args: unknown[]) => { const queueOwned = method !== "orderUnits" && isOwnedQueue(args),
                    combatIds = method === "orderUnits" ? ownedIds(game, args) : [],
                    suppress = active && phase === "baseline" && (queueOwned || combatIds.length > 0),
                    event: V8OwnershipEvent = { update, phase, method, disposition: suppress ? "suppressed" : "forwarded",
                        ownedQueue: queueOwned, ownedCombatantCount: combatIds.length,
                        argumentSha256: sha256(JSON.stringify(args)) }; ownershipEvents.push(event);
                    if (suppress) {
                        if (method === "orderUnits") { const ids = (args[0] as number[]).filter((id) => !combatIds.includes(id));
                            return ids.length ? original(ids, ...args.slice(1)) : undefined; }
                        return undefined;
                    }
                    return original(...args);
                };
            }
        const originalQuit = actions.quitGame?.bind(actions); actions.quitGame = (...args: unknown[]) => {
            ownershipEvents.push({ update, phase, method: "quitGame", disposition: "suppressed", ownedQueue: false,
                ownedCombatantCount: 0, argumentSha256: sha256(JSON.stringify(args)) }); return undefined; };
        void originalQuit;
    };

    const features = (game: GameApi): V8RuntimeFeatures => {
        const own = visible(game, bot.name, "self", () => true), enemies = visible(game, bot.name, "enemy", () => true),
            ownCombat = own.filter(combatant), enemyCombat = enemies.filter(combatant), enemyBuildings = enemies.filter(building),
            production = own.filter((unit) => building(unit) && (unit.rules.weaponsFactory || unit.rules.gdiBarracks || unit.rules.nodBarracks)),
            ownStart = game.getPlayerData(bot.name).startLocation, opponentStart = game.getPlayerData(opponentName).startLocation,
            threat = (radius: number) => enemyCombat.filter((unit) => production.some((factory) =>
                dist(unit, { x: factory.tile.rx, y: factory.tile.ry }) <= radius)).length,
            enemyHp = enemyBuildings.reduce((sum, unit) => sum + unit.hitPoints, 0);
        if (enemyHp < lastEnemyBuildingHp) { lastProgressUpdate = update; lastEnemyBuildingHp = enemyHp; }
        const delta = update - lastSnapshotUpdate >= 300 ? ownCombat.length - previousCombatants : 0;
        if (update - lastSnapshotUpdate >= 300) { previousCombatants = ownCombat.length; lastSnapshotUpdate = update; }
        const physicalStart = startName(ownStart); if (!physicalStart) throw new Error("V8 unsupported HFO start");
        return { update, ownCredits: game.getPlayerData(bot.name).credits,
            creditGap: game.getPlayerData(bot.name).credits - game.getPlayerData(opponentName).credits,
            ownCombatants: ownCombat.length, visibleEnemyCombatants: enemyCombat.length,
            threat8: threat(8), threat16: threat(16), threat24: threat(24),
            ownHarvesters: own.filter((unit) => !!unit.rules.harvester).length,
            ownBarracks: own.filter((unit) => building(unit) && (unit.rules.gdiBarracks || unit.rules.nodBarracks)).length,
            ownWarFactories: own.filter((unit) => building(unit) && !!unit.rules.weaponsFactory).length,
            ownBuildings: own.filter(building).length, homeForce: ownCombat.filter((unit) => dist(unit, ownStart) <= 24).length,
            midfieldForce: ownCombat.filter((unit) => dist(unit, ownStart) > 24 && dist(unit, opponentStart) > 24).length,
            opponentBaseForce: ownCombat.filter((unit) => dist(unit, opponentStart) <= 24).length,
            forceDelta: delta, noProgressUpdates: update - lastProgressUpdate,
            visibleEnemyBuildings: enemyBuildings.length, factionSide: ALLIED.has(country) ? "Allied" : "Soviet", physicalStart };
    };

    const productionAction = (game: GameApi, action: V8ProductionAction, state: V8RuntimeFeatures) => {
        if (action === "baseline" || update - lastProduction < 300 || !bot.lastPlayerProduction || !bot.lastPlayerActions) return;
        const names = countryNames(country); let queue: QueueType, desired: string;
        if (action === "infantry") { queue = QueueType.Infantry; desired = names.infantry; }
        else if (action === "screen") { queue = QueueType.Infantry; desired =
            state.visibleEnemyCombatants > 0 ? names.dog : names.infantry; }
        else if (action === "mixed") { mixedToggle = !mixedToggle; queue = mixedToggle ? QueueType.Infantry : QueueType.Vehicles;
            desired = mixedToggle ? names.infantry : names.tank; }
        else { queue = QueueType.Vehicles; desired = names.tank; }
        const production = bot.lastPlayerProduction, rule = ruleByName(production, queue, desired), data = production.getQueueData(queue);
        if (!rule) { controllerEvents.push({ update, event: "production_unavailable", action, desired }); return; }
        phase = "controller";
        try {
            if (data.status === QueueStatus.Idle) (bot.lastPlayerActions as any).queueForProduction(queue, rule.name, rule.type, 1);
            else { const current = data.items?.[0]?.rules as TechnoRules | undefined;
                if (!current || current.name === desired) return;
                (bot.lastPlayerActions as any).unqueueFromProduction(queue, current.name, current.type, 1);
                (bot.lastPlayerActions as any).queueForProduction(queue, rule.name, rule.type, 1); }
            lastProduction = update; controllerEvents.push({ update, event: "production_issued", action, desired, queue });
        } finally { phase = "baseline"; }
    };

    const forceAction = (game: GameApi, rule: V8Rule, state: V8RuntimeFeatures) => {
        if (rule.force === "hold" || update - lastAction < rule.persistence || !bot.lastPlayerActions) return;
        const own = visible(game, bot.name, "self", combatant), enemies = visible(game, bot.name, "enemy", combatant),
            buildings = visible(game, bot.name, "enemy", building), ownStart = game.getPlayerData(bot.name).startLocation,
            opponentStart = game.getPlayerData(opponentName).startLocation,
            reserved = [...own].sort((a, b) => dist(a, ownStart) - dist(b, ownStart) || a.id - b.id).slice(0, rule.homeReserve),
            available = own.filter((unit) => !reserved.some((hold) => hold.id === unit.id)),
            count = Math.max(0, Math.ceil(available.length * rule.forceFraction)), selected = available.slice(0, count);
        if (!selected.length) return;
        const production = buildings.filter((unit) => unit.rules.weaponsFactory || unit.rules.gdiBarracks || unit.rules.nodBarracks),
            harvesters = visible(game, bot.name, "enemy", (unit) => !!unit.rules.harvester),
            threats = enemies.filter((unit) => dist(unit, ownStart) <= 24),
            nearest = (units: UnitData[]) => [...units].sort((a, b) => dist(a, ownStart) - dist(b, ownStart) || a.id - b.id)[0],
            target = rule.force === "defend_home" ? nearest(threats) : rule.force === "assault_force" ? nearest(enemies) :
                rule.force === "assault_production" ? nearest(production) : rule.force === "raid_economy" ?
                    nearest(harvesters) ?? nearest(buildings.filter((unit) => !!unit.rules.refinery)) ?? nearest(production) :
                    rule.force === "literal_closeout" && buildings.length === 1 ? buildings[0] : undefined;
        phase = "controller";
        try {
            if (target) (bot.lastPlayerActions as any).orderUnits(selected.map((unit) => unit.id), OrderType.Attack, target.id);
            else if (rule.force === "regroup_home" || rule.force === "recover" ||
                (rule.force === "defend_home" && !target)) (bot.lastPlayerActions as any).orderUnits(
                    selected.map((unit) => unit.id), OrderType.Move, ownStart.x, ownStart.y);
            else (bot.lastPlayerActions as any).orderUnits(selected.map((unit) => unit.id), OrderType.AttackMove,
                opponentStart.x, opponentStart.y);
            lastAction = update; controllerEvents.push({ update, event: "force_order_issued", force: rule.force,
                target: target?.rules.name ?? null, selected: selected.length, reserve: reserved.length });
        } finally { phase = "baseline"; }
        void state;
    };

    bot.onGameStart = (game: GameApi) => { originalStart(game); installOwnership(game); previousCombatants = 0;
        lastSnapshotUpdate = 0; lastProgressUpdate = 0; lastEnemyBuildingHp = Infinity; };
    bot.onGameTick = (game: GameApi) => {
        update = game.getCurrentTick(); phase = "baseline"; originalTick(game);
        if (detected === null && update >= V8_DETECTOR_UPDATE) {
            const opponentCredits = game.getPlayerData(opponentName).credits;
            detected = opponentCredits < V8_DETECTOR_CREDIT_THRESHOLD ? "Advanced" : "Supalosa";
            active = detected === "Advanced";
            controllerEvents.push({ update, event: "opponent_detected", detected, opponentCredits, active });
        }
        if (!active) return;
        const state = features(game), selected = selectV8Rule(policy.policy, state), rule = selected.rule ?? {
            predicates: [{ feature: "update", comparator: ">=", value: 1_200 }], production: "baseline" as const,
            force: state.threat16 > 0 ? "defend_home" as const : state.ownCombatants < 8 ? "recover" as const : "probe" as const,
            target: "nearest" as const, forceFraction: 1 as const, homeReserve: 4 as const, persistence: 300 as const };
        controllerEvents.push({ update, event: "rule_selected", index: selected.index, policySha256: policy.sha256 });
        productionAction(game, rule.production, state); forceAction(game, rule, state);
    };
    bot.onGameEvent = (event) => originalEvent(event);
    return { bot, policy, ownershipEvents, controllerEvents,
        state: () => ({ update, active, detected, lastProduction, lastAction }) };
};
