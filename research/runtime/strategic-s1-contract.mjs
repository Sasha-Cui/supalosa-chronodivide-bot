import { exact, fields, requireTrue, assertJsonValue } from "./strategic-s1-io.mjs";
import { validateStrategicS1Plan } from "../../packages/chronodivide-bot-driver/dist/training/strategicS1Plan.js";

export function checkedCell(cell, plan) {
    validateStrategicS1Plan(plan);
    assertJsonValue(cell);
    const all = [...plan.cases, ...plan.canaries, plan.smoke],
        expected = all[cell?.caseIndex];
    requireTrue(expected !== undefined, "case index");
    fields(cell, Object.keys(expected), "case fields");
    exact(cell, expected, "complete frozen case");
    return expected;
}
export const launchSpec = (cell, mode) => ({
    role: cell.role,
    caseIndex: cell.caseIndex,
    mode,
    requestedEngineSeed: cell.requestedEngineSeed,
    policy: "unchanged_strongbot",
});
export function expectedLaunches(stage, plan, index = null) {
    validateStrategicS1Plan(plan);
    if (stage === "prepare")
        return [...plan.cases, ...plan.canaries, plan.smoke].map((c) => launchSpec(c, "zero_update"));
    if (stage === "canary") {
        requireTrue(Number.isInteger(index) && index >= 0 && index < 4, "canary index");
        return ["canary_endpoint_only", "canary_strategic"].map((m) => launchSpec(plan.canaries[index], m));
    }
    if (stage === "case") {
        requireTrue(Number.isInteger(index) && index >= 0 && index < 200, "case index");
        return [launchSpec(plan.cases[index], "diagnostic")];
    }
    if (stage === "smoke") return [launchSpec(plan.smoke, "smoke")];
    requireTrue(["canary-finalize", "finalize"].includes(stage) && index === null, "non-game stage");
    return [];
}
export function validateGameModes(modes, plan) {
    exact(modes, Object.fromEntries(plan.maps.map((map) => [map.id, 1])), "D1-equivalent game modes");
}
/** Injectable only for pure contract tests. The future runner must supply the pinned
 * provenance module's factories, never user-selected policy options or modes. */
export function createS1Bots(cell, plan, dependencies) {
    checkedCell(cell, plan);
    const candidate = dependencies.createCandidate(
        "OD1Candidate",
        cell.country,
        {},
        { intentArbiter: { enabled: false } },
    );
    const opponent = (cell.opponent === "pinned_supalosa" ? dependencies.createBaseline : dependencies.createAdvanced)(
        "OD1Opponent",
        cell.country,
    );
    requireTrue(
        candidate?.name === "OD1Candidate" &&
            opponent?.name === "OD1Opponent" &&
            typeof candidate.getResearchMissionSnapshot === "function",
        "factory identity/mission channel",
    );
    candidate.chronoResearchStartPos = cell.candidateStartOrdinal;
    opponent.chronoResearchStartPos = cell.opponentStartOrdinal;
    dependencies.installFirewall([candidate, opponent], "api_full_state");
    return { candidate, opponent };
}
export function settingsFor(cell, plan, bots, gameModes) {
    checkedCell(cell, plan);
    validateGameModes(gameModes, plan);
    requireTrue(
        bots.candidate?.name === "OD1Candidate" && bots.opponent?.name === "OD1Opponent",
        "settings participants",
    );
    const map = plan.maps.find((m) => m.id === cell.mapId);
    return {
        online: false,
        agents: cell.candidateSlot === 0 ? [bots.candidate, bots.opponent] : [bots.opponent, bots.candidate],
        mapName: map.fileName,
        gameMode: 1,
        shortGame: false,
        mcvRepacks: true,
        cratesAppear: false,
        superWeapons: false,
        gameSpeed: 6,
        credits: 10000,
        unitCount: 0,
        buildOffAlly: false,
        multiEngineer: false,
    };
}
export const rngBindings = (bots) => [
    { agent: bots.candidate, identity: "candidate" },
    { agent: bots.opponent, identity: "opponent" },
];
export function episodeSpec(cell, plan) {
    checkedCell(cell, plan);
    return {
        caseIndex: cell.caseIndex,
        country: cell.country,
        mapName: plan.maps.find((m) => m.id === cell.mapId).fileName,
        gameMode: 1,
        candidateSlot: cell.candidateSlot,
        candidateStart: cell.candidateStart,
        opponentStart: cell.opponentStart,
        candidateStartOrdinal: cell.candidateStartOrdinal,
        opponentStartOrdinal: cell.opponentStartOrdinal,
        requestedEngineSeed: cell.requestedEngineSeed,
        maxUpdates: cell.maxUpdates,
    };
}
export function zeroObservation(cell, plan, bots, instance, options) {
    checkedCell(cell, plan);
    const game = bots.candidate.lastGameApi;
    requireTrue(
        game &&
            bots.opponent.lastGameApi &&
            game.getCurrentTick() === 0 &&
            instance.isFinished() === false &&
            game.isPlayerDefeated("OD1Candidate") === false &&
            game.isPlayerDefeated("OD1Opponent") === false,
        "zero-update initialization",
    );
    const order = options.agents.map((a) => a.name);
    exact(
        order,
        cell.candidateSlot === 0 ? ["OD1Candidate", "OD1Opponent"] : ["OD1Opponent", "OD1Candidate"],
        "source-bound agent slot order",
    );
    const location = (name) => {
        const p = game.getPlayerData(name);
        requireTrue(p.country?.name === cell.country, "effective country");
        return p.startLocation.x + "," + p.startLocation.y;
    };
    exact(
        [location("OD1Candidate"), location("OD1Opponent")],
        [cell.candidateStart, cell.opponentStart],
        "effective starts",
    );
    exact(
        game
            .getPlayers()
            .filter((n) => ["OD1Candidate", "OD1Opponent"].includes(n))
            .sort(),
        ["OD1Candidate", "OD1Opponent"],
        "public participant census",
    );
    requireTrue((bots.candidate.lastUnifiedIntentTelemetry ?? null) === null, "disabled startup telemetry");
    return {
        caseIndex: cell.caseIndex,
        requestedEngineSeed: cell.requestedEngineSeed,
        updates: 0,
        candidateStart: cell.candidateStart,
        opponentStart: cell.opponentStart,
        candidateCountry: cell.country,
        opponentCountry: cell.country,
        candidateStartOrdinal: cell.candidateStartOrdinal,
        opponentStartOrdinal: cell.opponentStartOrdinal,
        candidateSlot: cell.candidateSlot,
        agentOrder: order,
        slotVerification: "source-bound-agent-order-and-pinned-creator",
        seedVerification: "pinned-date-now-seconds-shim-and-participant-stream-derivation",
    };
}
