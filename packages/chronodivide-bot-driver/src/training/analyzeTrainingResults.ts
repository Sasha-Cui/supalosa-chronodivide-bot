import fs from "node:fs";
import path from "node:path";

type PolicyConfig = Record<string, boolean | number | string>;

type EvaluationRow = {
    generation: number;
    candidateId: string;
    config: PolicyConfig;
    summary: {
        matches: number;
        wins: number;
        losses: number;
        draws: number;
        score: number;
        winRate: number;
        lossRate: number;
        meanReward: number;
        minReward: number;
        avgTicks: number;
    };
    run?: string;
};

type AggregatedPolicy = {
    key: string;
    config: PolicyConfig;
    runs: string[];
    evaluations: number;
    matches: number;
    wins: number;
    losses: number;
    draws: number;
    score: number;
    winRate: number;
    lossRate: number;
    meanReward: number;
};

const rootDir = process.env.TRAINING_RESULTS_ROOT || path.join("benchmark-results", "training");
const topN = Number.parseInt(process.env.TOP_N || "12", 10);
const outPath = process.env.OUT_PATH || path.join(rootDir, "best-policies.json");
const includeSmoke = ["1", "true", "yes", "on"].includes((process.env.INCLUDE_SMOKE || "").toLowerCase());
const minEvalMatches = Number.parseInt(process.env.MIN_EVAL_MATCHES || "1", 10);
const runPrefixes = (process.env.RUN_PREFIXES || "")
    .split(",")
    .map((prefix) => prefix.trim())
    .filter((prefix) => prefix.length > 0);

const stableConfigKey = (config: PolicyConfig): string => {
    const sortedEntries = Object.entries(config).sort(([left], [right]) => left.localeCompare(right));
    return JSON.stringify(Object.fromEntries(sortedEntries));
};

const readRows = (): EvaluationRow[] => {
    const rows: EvaluationRow[] = [];
    if (!fs.existsSync(rootDir)) {
        return rows;
    }
    for (const runDirName of fs.readdirSync(rootDir)) {
        if (!includeSmoke && runDirName.startsWith("smoke")) {
            continue;
        }
        if (runPrefixes.length > 0 && !runPrefixes.some((prefix) => runDirName.startsWith(prefix))) {
            continue;
        }
        const runDir = path.join(rootDir, runDirName);
        const stat = fs.statSync(runDir);
        if (!stat.isDirectory()) {
            continue;
        }
        const filePath = path.join(runDir, "evaluations.jsonl");
        if (!fs.existsSync(filePath)) {
            continue;
        }
        for (const line of fs.readFileSync(filePath, "utf8").split("\n")) {
            if (!line.trim()) {
                continue;
            }
            const row = JSON.parse(line) as EvaluationRow;
            if (row.summary.matches < minEvalMatches) {
                continue;
            }
            rows.push({ ...row, run: runDirName });
        }
    }
    return rows;
};

const compareAggregates = (left: AggregatedPolicy, right: AggregatedPolicy): number => {
    if (left.lossRate !== right.lossRate) {
        return left.lossRate - right.lossRate;
    }
    if (left.winRate !== right.winRate) {
        return right.winRate - left.winRate;
    }
    if (left.matches !== right.matches) {
        return right.matches - left.matches;
    }
    return right.score - left.score;
};

const compareRows = (left: EvaluationRow, right: EvaluationRow): number => {
    if (left.summary.losses !== right.summary.losses) {
        return left.summary.losses - right.summary.losses;
    }
    if (left.summary.wins !== right.summary.wins) {
        return right.summary.wins - left.summary.wins;
    }
    return right.summary.score - left.summary.score;
};

const boolEnv = (value: unknown): string => value ? "1" : "0";

const toEnv = (config: PolicyConfig): Record<string, string> => ({
    CANDIDATE_COUNTRIES: String(config.candidateCountry),
    ATTACK_COMPOSITION_POLICY: String(config.attackCompositionPolicy ?? "random"),
    STRATEGIC_PLAN: String(config.strategicPlan ?? "off"),
    RUSH_SELL_TICK: String(config.rushSellTick ?? 7200),
    RUSH_SELL_MIN_COMBATANTS: String(config.rushSellMinCombatants ?? 12),
    STRATEGIC_DOG_TARGET_COUNT: String(config.strategicDogTargetCount ?? 2),
    HFO_BOTTOM_DOG_TARGET_COUNT: String(config.hfoBottomDogTargetCount ?? 3),
    ANTI_INFANTRY_DOG_TARGET_COUNT: String(config.antiInfantryDogTargetCount ?? 5),
    ATTACK_GATE_ENABLED: boolEnv(config.attackGateEnabled),
    ATTACK_GATE_MIN_TICK: String(config.attackGateMinTick ?? 0),
    ATTACK_GATE_MIN_COMBATANTS: String(config.attackGateMinCombatants ?? 0),
    ATTACK_GATE_HFO_BOTTOM_MIN_COMBATANTS: String(config.attackGateHfoBottomMinCombatants ?? 45),
    ATTACK_GATE_COMBATANT_ADVANTAGE: String(config.attackGateCombatantAdvantage ?? 0),
    ATTACK_GATE_MAX_ENEMY_COMBATANTS: String(config.attackGateMaxEnemyCombatants ?? 999),
    ATTACK_ALLOW_DEFENCE_STEAL: boolEnv(config.attackAllowDefenceSteal),
    DEFENCE_CHECK_TICKS: String(config.defenceCheckTicks ?? 30),
    DEFENCE_STARTING_RADIUS: String(config.defenceStartingRadius ?? 24),
    DEFENCE_RADIUS_INCREASE_PER_TICK: String(config.defenceRadiusIncreasePerTick ?? 0.0003),
    DEFENCE_DEFEND_PRODUCTION: boolEnv(config.defenceDefendProduction ?? true),
    DEFENCE_MISSION_PRIORITY: String(config.defenceMissionPriority ?? 60),
    DEFENCE_ACTIVE_PRIORITY: String(config.defenceActivePriority ?? 120),
    SCOUT_COOLDOWN_TICKS: String(config.scoutCooldownTicks ?? 180),
    SCOUT_MAX_CONCURRENT: String(config.scoutMaxConcurrentMissions ?? 3),
    SCOUT_MISSION_PRIORITY: String(config.scoutMissionPriority ?? 10),
    ENGINEER_KNOWN_TECH_ENABLED: boolEnv(config.engineerKnownTechEnabled ?? true),
    ENGINEER_TECH_MAX_TARGETS: String(config.engineerTechMaxTargets ?? 1),
    ENGINEER_TECH_MAX_DISTANCE: String(config.engineerTechMaxDistanceFromStart ?? 38),
    ENGINEER_TECH_PRIORITY: String(config.engineerTechPriority ?? 96),
    ENGINEER_TECH_ESCORT_LEVEL: String(config.engineerTechEscortLevel ?? 2),
    MACRO_BOOST_ENABLED: boolEnv(config.macroBoostEnabled),
    STATIC_DEFENSE_ENABLED: boolEnv(config.staticDefenseEnabled),
    STATIC_DEFENSE_START_TICK: String(config.staticDefenseStartTick ?? 3600),
    STATIC_DEFENSE_TARGET_COUNT: String(config.staticDefenseTargetCount ?? 4),
    STATIC_DEFENSE_PRIORITY: String(config.staticDefensePriority ?? 28),
    HARASS_ENABLED: boolEnv(config.harassEnabled),
    HARASS_MIN_TICK: String(config.harassMinTick ?? 5400),
    HARASS_MIN_COMBATANTS: String(config.harassMinCombatants ?? 4),
    HARASS_MAX_UNITS: String(config.harassMaxUnits ?? 4),
    HARASS_COMBATANT_ADVANTAGE: String(config.harassCombatantAdvantage ?? -4),
    HARASS_MAX_ENEMY_COMBATANTS: String(config.harassMaxEnemyCombatants ?? 8),
    HARASS_ORDER_INTERVAL: String(config.harassOrderIntervalTicks ?? 120),
    HARASS_DIRECT: boolEnv(config.harassDirectAttackKnownTargets ?? true),
    ALL_IN_ENABLED: boolEnv(config.allInEnabled),
    ALL_IN_MIN_TICK: String(config.allInMinTick),
    ALL_IN_MIN_COMBATANTS: String(config.allInMinCombatants),
    ALL_IN_COMBATANT_ADVANTAGE: String(config.allInCombatantAdvantage),
    ALL_IN_DISBAND: boolEnv(config.allInDisbandExistingAttacks),
    ALL_IN_DIRECT: boolEnv(config.allInDirectVisibleAttack),
    FORCE_ATTACK_ENABLED: boolEnv(config.forceAttackEnabled),
    FORCE_ATTACK_MIN_TICK: String(config.forceAttackMinTick),
    FORCE_ATTACK_MIN_COMBATANTS: String(config.forceAttackMinCombatants),
    FORCE_ATTACK_COMBATANT_ADVANTAGE: String(config.forceAttackCombatantAdvantage),
    FORCE_ATTACK_MAX_ENEMY_COMBATANTS: String(config.forceAttackMaxEnemyCombatants),
    FORCE_ATTACK_ORDER_INTERVAL: String(config.forceAttackOrderIntervalTicks),
    FORCE_ATTACK_DIRECT: boolEnv(config.forceAttackDirectAttackKnownTargets),
    FORCE_ATTACK_MAX_TARGETS: String(config.forceAttackMaxTargets ?? 1),
    FORCE_ATTACK_HFO_WEST_ONLY: boolEnv(config.forceAttackHfoWestVsEastOnly),
    ROUTE_ATTACK_ENABLED: boolEnv(config.routeAttackEnabled),
    ROUTE_ATTACK_MIN_TICK: String(config.routeAttackMinTick ?? 9000),
    ROUTE_ATTACK_MIN_COMBATANTS: String(config.routeAttackMinCombatants ?? 10),
    ROUTE_ATTACK_ORDER_INTERVAL: String(config.routeAttackOrderIntervalTicks ?? 60),
    ROUTE_ATTACK_ADVANCE_INTERVAL: String(config.routeAttackAdvanceIntervalTicks ?? 1200),
    ROUTE_ATTACK_WAYPOINTS: String(config.routeAttackWaypoints ?? "74,95;103,116;128,122;151,119"),
    ROUTE_ATTACK_DIRECT: boolEnv(config.routeAttackDirectAttackKnownTargets ?? true),
    HFO_CLOSEOUT_ENABLED: boolEnv(config.hfoCloseoutEnabled),
    HFO_CLOSEOUT_MIN_TICK: String(config.hfoCloseoutMinTick ?? 9000),
    HFO_CLOSEOUT_MIN_UNITS: String(config.hfoCloseoutMinUnits ?? 6),
    HFO_CLOSEOUT_MAX_ENEMY_BUILDINGS: String(config.hfoCloseoutMaxEnemyBuildings ?? 3),
    HFO_CLOSEOUT_MAX_ENEMY_COMBATANTS: String(config.hfoCloseoutMaxEnemyCombatants ?? 2),
    HFO_CLOSEOUT_ORDER_INTERVAL: String(config.hfoCloseoutOrderIntervalTicks ?? 15),
    HFO_CLOSEOUT_INCLUDE_HARVESTERS: boolEnv(config.hfoCloseoutIncludeHarvesters),
    HFO_WEST_SWEEP_ENABLED: boolEnv(config.hfoWestSweepEnabled),
    HFO_WEST_SWEEP_MIN_TICK: String(config.hfoWestSweepMinTick ?? 16200),
    HFO_WEST_SWEEP_MIN_COMBATANTS: String(config.hfoWestSweepMinCombatants ?? 12),
    HFO_WEST_SWEEP_COMBATANT_ADVANTAGE: String(config.hfoWestSweepCombatantAdvantage ?? 6),
    HFO_WEST_SWEEP_MAX_ENEMY_COMBATANTS: String(config.hfoWestSweepMaxEnemyCombatants ?? 4),
    HFO_WEST_SWEEP_ORDER_INTERVAL: String(config.hfoWestSweepOrderIntervalTicks ?? 45),
    HFO_WEST_SWEEP_ADVANCE_INTERVAL: String(config.hfoWestSweepAdvanceIntervalTicks ?? 900),
    HFO_WEST_SWEEP_WAYPOINTS: String(
        config.hfoWestSweepWaypoints ?? "76,95;103,116;127,122;147,121;151,119;151,129;140,134",
    ),
    HFO_WEST_SWEEP_DIRECT: boolEnv(config.hfoWestSweepDirectAttackKnownTargets),
    HFO_WEST_SWEEP_MAX_TARGETS: String(config.hfoWestSweepMaxTargets ?? 1),
    EMERGENCY_DEFENSE_ENABLED: boolEnv(config.emergencyDefenseEnabled),
    EMERGENCY_DEFENSE_RADIUS: String(config.emergencyDefenseRadius ?? 24),
    EMERGENCY_DEFENSE_MIN_COMBATANTS: String(config.emergencyDefenseMinCombatants ?? 1),
    EMERGENCY_DEFENSE_MAX_DEFENDERS: String(config.emergencyDefenseMaxDefenders ?? 999),
    EMERGENCY_DEFENSE_ORDER_INTERVAL: String(config.emergencyDefenseOrderIntervalTicks ?? 30),
    EMERGENCY_DEFENSE_DIRECT: boolEnv(config.emergencyDefenseDirectAttackKnownTargets ?? true),
    EMERGENCY_DEFENSE_HFO_WEST_ONLY: boolEnv(config.emergencyDefenseHfoWestVsEastOnly),
});

const aggregateRows = (rows: EvaluationRow[]): AggregatedPolicy[] => {
    const byConfig = new Map<string, AggregatedPolicy>();
    for (const row of rows) {
        const key = stableConfigKey(row.config);
        let aggregate = byConfig.get(key);
        if (!aggregate) {
            aggregate = {
                key,
                config: row.config,
                runs: [],
                evaluations: 0,
                matches: 0,
                wins: 0,
                losses: 0,
                draws: 0,
                score: 0,
                winRate: 0,
                lossRate: 0,
                meanReward: 0,
            };
            byConfig.set(key, aggregate);
        }
        if (row.run && !aggregate.runs.includes(row.run)) {
            aggregate.runs.push(row.run);
        }
        aggregate.evaluations += 1;
        aggregate.matches += row.summary.matches;
        aggregate.wins += row.summary.wins;
        aggregate.losses += row.summary.losses;
        aggregate.draws += row.summary.draws;
        aggregate.score += row.summary.score;
    }
    for (const aggregate of byConfig.values()) {
        aggregate.runs.sort();
        aggregate.winRate = aggregate.matches > 0 ? aggregate.wins / aggregate.matches : 0;
        aggregate.lossRate = aggregate.matches > 0 ? aggregate.losses / aggregate.matches : 0;
        aggregate.meanReward = aggregate.matches > 0 ? aggregate.score / aggregate.matches : 0;
    }
    return [...byConfig.values()].sort(compareAggregates);
};

const rows = readRows();
const aggregate = aggregateRows(rows);
const topAggregate = aggregate.slice(0, topN);
const topIndividual = [...rows].sort(compareRows).slice(0, topN);
const output = {
    generatedAt: new Date().toISOString(),
    rootDir,
    includeSmoke,
    minEvalMatches,
    runPrefixes,
    evaluationRows: rows.length,
    uniquePolicies: aggregate.length,
    topAggregate: topAggregate.map((policy) => ({ ...policy, env: toEnv(policy.config) })),
    topIndividual: topIndividual.map((row) => ({ ...row, env: toEnv(row.config) })),
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`rows=${rows.length} uniquePolicies=${aggregate.length} out=${outPath}`);
for (const policy of topAggregate.slice(0, Math.min(5, topAggregate.length))) {
    console.log(
        `policy matches=${policy.matches} w-l-d=${policy.wins}-${policy.losses}-${policy.draws} ` +
            `winRate=${(policy.winRate * 100).toFixed(1)}% lossRate=${(policy.lossRate * 100).toFixed(1)}% ` +
            `score=${policy.score.toFixed(1)} country=${policy.config.candidateCountry}`,
    );
    console.log(
        Object.entries(toEnv(policy.config))
            .map(([name, value]) => `${name}=${value}`)
            .join(" "),
    );
}
