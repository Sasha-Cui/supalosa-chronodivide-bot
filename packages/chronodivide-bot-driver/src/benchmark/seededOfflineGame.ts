import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { Bot, CreateOfflineOpts, GameInstanceApi, PublicApi } from "@chronodivide/game-api";

export const PINNED_GAME_API_VERSION = "0.75.0";
export const MAX_ENGINE_SEED = 0xffff_ffff;
export const BOT_SEED_XOR = 0x9e37_79b9;
export const OFFLINE_SEED_CONTROL_METHOD = "validated-date-now-seconds-shim" as const;

export type OfflineSeedCompatibility = {
    gameApiVersion: string;
    method: typeof OFFLINE_SEED_CONTROL_METHOD;
    offlineGameId: "0";
    enginePrng: "Mersenne Twister";
    externalBotRandomSource: "Math.random";
    externalBotPrng: "Mulberry32";
    externalBotSeedDerivation: "(engineSeed xor 0x9e3779b9) xor fnv1a32(participantIdentity)";
    runtimePath: string;
};

export type BotRandomBinding = {
    agent: Bot;
    identity: string;
};

type OfflineGameCreator = Pick<PublicApi, "createGame">;

let validatedCompatibility: OfflineSeedCompatibility | null = null;
let activeCreationSeed: number | null = null;
let activeSessionSeed: number | null = null;

const resolveGameApiFiles = (): { runtimePath: string; packagePath: string } => {
    const require = createRequire(import.meta.url);
    const runtimePath = require.resolve("@chronodivide/game-api");
    return {
        runtimePath,
        packagePath: path.resolve(path.dirname(runtimePath), "..", "package.json"),
    };
};

/**
 * Verifies the implementation detail on which explicit offline seeding relies.
 *
 * game-api 0.75.0 does not expose an offline seed in CreateOfflineOpts. Its
 * bundled offline path fixes gameId to "0", obtains gameTimestamp from
 * floor(Date.now()/1000), and constructs the engine Mersenne Twister from
 * Number(gameId + gameTimestamp). The wrapper below supplies the requested
 * uint32 seed through that timestamp only after these invariants are checked.
 * External Bot GameApi instances use Math.random instead of the engine PRNG;
 * the scoped session wrapper therefore supplies a separate deterministic
 * Mulberry32 stream for bot-side random choices.
 */
export const validateOfflineSeedCompatibility = (): OfflineSeedCompatibility => {
    if (validatedCompatibility) {
        return validatedCompatibility;
    }

    const { runtimePath, packagePath } = resolveGameApiFiles();
    const packageMetadata = JSON.parse(fs.readFileSync(packagePath, "utf8")) as { version?: unknown };
    if (packageMetadata.version !== PINNED_GAME_API_VERSION) {
        throw new Error(
            `Explicit offline seed control is validated only for @chronodivide/game-api ` +
                `${PINNED_GAME_API_VERSION}; found ${String(packageMetadata.version)}`,
        );
    }

    const runtime = fs.readFileSync(runtimePath, "utf8");
    const requiredMarkers = [
        "s=Math.floor(Date.now()/1e3)",
        'call(this,"0",s,t,r,void 0)',
        'Number(e+""+t)',
        "this.prng=Prng.factory(a,n)",
        "new GameApi(t,!1)",
        ":Math.random()",
    ];
    const missingMarkers = requiredMarkers.filter((marker) => !runtime.includes(marker));
    if (missingMarkers.length > 0) {
        throw new Error(
            `@chronodivide/game-api ${PINNED_GAME_API_VERSION} no longer matches the validated offline seed path; ` +
                `missing runtime marker(s): ${missingMarkers.join(", ")}`,
        );
    }

    validatedCompatibility = {
        gameApiVersion: PINNED_GAME_API_VERSION,
        method: OFFLINE_SEED_CONTROL_METHOD,
        offlineGameId: "0",
        enginePrng: "Mersenne Twister",
        externalBotRandomSource: "Math.random",
        externalBotPrng: "Mulberry32",
        externalBotSeedDerivation: "(engineSeed xor 0x9e3779b9) xor fnv1a32(participantIdentity)",
        runtimePath,
    };
    return validatedCompatibility;
};

export const assertValidEngineSeed = (seed: number): void => {
    if (!Number.isSafeInteger(seed) || seed < 0 || seed > MAX_ENGINE_SEED) {
        throw new Error(`Engine seed must be an integer in [0, ${MAX_ENGINE_SEED}], got ${seed}`);
    }
};

export const deriveEngineSeed = (seedBase: number, attemptIndex: number): number => {
    assertValidEngineSeed(seedBase);
    if (!Number.isSafeInteger(attemptIndex) || attemptIndex < 0) {
        throw new Error(`Attempt index must be a non-negative integer, got ${attemptIndex}`);
    }
    return (seedBase + attemptIndex) % (MAX_ENGINE_SEED + 1);
};

/** Candidate slot is deliberately absent: both reciprocal slots share one block seed. */
export const derivePairedEngineSeed = (seedBase: number, seedBlockIndex: number): number =>
    deriveEngineSeed(seedBase, seedBlockIndex);

export const createReciprocalSeedBlock = (seedBase: number, seedBlockIndex: number) => ({
    seedBlockIndex,
    requestedEngineSeed: derivePairedEngineSeed(seedBase, seedBlockIndex),
    candidateSlots: [0, 1] as const,
});

export const deriveBotRandomSeed = (engineSeed: number): number => {
    assertValidEngineSeed(engineSeed);
    return (engineSeed ^ BOT_SEED_XOR) >>> 0;
};

const fnv1a32 = (value: string): number => {
    let hash = 0x811c_9dc5;
    for (const byte of Buffer.from(value, "utf8")) {
        hash ^= byte;
        hash = Math.imul(hash, 0x0100_0193) >>> 0;
    }
    return hash;
};

export const deriveParticipantBotRandomSeed = (engineSeed: number, participantIdentity: string): number => {
    if (participantIdentity.trim().length === 0) {
        throw new Error("Participant RNG identity must not be empty");
    }
    return (deriveBotRandomSeed(engineSeed) ^ fnv1a32(participantIdentity)) >>> 0;
};

export const engineSeedToEpochMs = (engineSeed: number): number => {
    assertValidEngineSeed(engineSeed);
    return engineSeed * 1000;
};

const createBotRandom = (botRandomSeed: number): (() => number) => {
    let state = botRandomSeed;
    return () => {
        state = (state + 0x6d2b_79f5) >>> 0;
        let value = state;
        value = Math.imul(value ^ (value >>> 15), value | 1);
        value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
        return ((value ^ (value >>> 14)) >>> 0) / 0x1_0000_0000;
    };
};

const BOT_RANDOM_CALLBACKS = ["onGameInit", "onGameStart", "onGameTick", "onGameEvent"] as const;

const installParticipantRandomStreams = (engineSeed: number, bindings: BotRandomBinding[]): (() => void) => {
    const seenAgents = new Set<Bot>();
    const seenIdentities = new Set<string>();
    const seenSeeds = new Set<number>();
    const restorers: Array<() => void> = [];

    try {
        for (const binding of bindings) {
            if (seenAgents.has(binding.agent)) {
                throw new Error(`Bot RNG agent is bound more than once for identity ${binding.identity}`);
            }
            if (seenIdentities.has(binding.identity)) {
                throw new Error(`Bot RNG identity is duplicated: ${binding.identity}`);
            }
            const participantSeed = deriveParticipantBotRandomSeed(engineSeed, binding.identity);
            if (seenSeeds.has(participantSeed)) {
                throw new Error(`Bot RNG seed collision for participant identity ${binding.identity}`);
            }
            seenAgents.add(binding.agent);
            seenIdentities.add(binding.identity);
            seenSeeds.add(participantSeed);
            const participantRandom = createBotRandom(participantSeed);
            const agentRecord = binding.agent as unknown as Record<string, (...args: unknown[]) => unknown>;

            for (const callbackName of BOT_RANDOM_CALLBACKS) {
                const original = agentRecord[callbackName];
                if (typeof original !== "function") {
                    throw new Error(`Bot RNG callback ${callbackName} is unavailable for identity ${binding.identity}`);
                }
                const ownDescriptor = Object.getOwnPropertyDescriptor(binding.agent, callbackName);
                if (ownDescriptor && !ownDescriptor.configurable) {
                    throw new Error(
                        `Bot RNG callback ${callbackName} is not configurable for identity ${binding.identity}`,
                    );
                }
                Object.defineProperty(binding.agent, callbackName, {
                    configurable: true,
                    writable: true,
                    value: function (this: Bot, ...args: unknown[]): unknown {
                        const previousMathRandom = Math.random;
                        Math.random = participantRandom;
                        try {
                            const result = original.apply(this, args);
                            if (
                                typeof result === "object" &&
                                result !== null &&
                                "then" in result &&
                                typeof (result as { then?: unknown }).then === "function"
                            ) {
                                throw new Error(
                                    `Asynchronous bot callback ${callbackName} is unsupported for deterministic ` +
                                        `participant RNG identity ${binding.identity}`,
                                );
                            }
                            return result;
                        } finally {
                            Math.random = previousMathRandom;
                        }
                    },
                });
                restorers.push(() => {
                    if (ownDescriptor) {
                        Object.defineProperty(binding.agent, callbackName, ownDescriptor);
                    } else {
                        delete agentRecord[callbackName];
                    }
                });
            }
        }
    } catch (error) {
        for (const restore of restorers.reverse()) {
            restore();
        }
        throw error;
    }

    return () => {
        for (const restore of restorers.reverse()) {
            restore();
        }
    };
};

/**
 * Creates one sequential offline game with an explicit engine seed.
 *
 * Date.now is restored even if game creation fails. Concurrent calls are
 * rejected because the pinned upstream API obtains its seed from process-global
 * wall-clock state. The benchmark harness itself creates games sequentially.
 */
const createSeededOfflineGameInternal = async (
    gameApi: OfflineGameCreator,
    opts: CreateOfflineOpts,
    seed: number,
): Promise<GameInstanceApi> => {
    assertValidEngineSeed(seed);
    validateOfflineSeedCompatibility();
    if (activeCreationSeed !== null) {
        throw new Error(
            `Concurrent seeded offline game creation is unsupported; seed ${activeCreationSeed} is still active`,
        );
    }

    const originalDateNow = Date.now;
    activeCreationSeed = seed;
    Date.now = () => engineSeedToEpochMs(seed);
    try {
        return await gameApi.createGame(opts);
    } finally {
        Date.now = originalDateNow;
        activeCreationSeed = null;
    }
};

export const createSeededOfflineGame = async (
    gameApi: OfflineGameCreator,
    opts: CreateOfflineOpts,
    seed: number,
): Promise<GameInstanceApi> => {
    if (activeSessionSeed !== null) {
        throw new Error(
            `Standalone game creation is unsupported while seeded match session ${activeSessionSeed} is active`,
        );
    }
    return createSeededOfflineGameInternal(gameApi, opts, seed);
};

/**
 * Runs a complete offline match with deterministic engine and external-bot
 * random streams, then disposes the game and restores process-global state.
 */
export const withSeededOfflineGame = async <T>(
    gameApi: OfflineGameCreator,
    opts: CreateOfflineOpts,
    seed: number,
    botRandomBindings: BotRandomBinding[],
    run: (game: GameInstanceApi) => Promise<T>,
): Promise<T> => {
    assertValidEngineSeed(seed);
    const configuredAgents = opts.agents ?? [];
    if (
        botRandomBindings.length !== configuredAgents.length ||
        configuredAgents.some((agent) => !botRandomBindings.some((binding) => binding.agent === agent))
    ) {
        throw new Error("Every offline bot must have exactly one stable participant RNG identity");
    }
    if (activeSessionSeed !== null) {
        throw new Error(
            `Concurrent seeded offline match sessions are unsupported; seed ${activeSessionSeed} is still active`,
        );
    }

    const originalMathRandom = Math.random;
    let game: GameInstanceApi | null = null;
    let restoreParticipantRandomStreams = (): void => undefined;
    activeSessionSeed = seed;
    Math.random = createBotRandom(deriveBotRandomSeed(seed));
    try {
        restoreParticipantRandomStreams = installParticipantRandomStreams(seed, botRandomBindings);
        game = await createSeededOfflineGameInternal(gameApi, opts, seed);
        return await run(game);
    } finally {
        try {
            game?.dispose();
        } finally {
            try {
                restoreParticipantRandomStreams();
            } finally {
                Math.random = originalMathRandom;
                activeSessionSeed = null;
            }
        }
    }
};
