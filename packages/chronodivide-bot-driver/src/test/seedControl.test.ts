import { beforeAll, describe, expect, it, vi } from "vitest";
import { Bot, CreateOfflineOpts, GameApi, GameInstanceApi, PublicApi, cdapi } from "@chronodivide/game-api";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import {
    MAX_ENGINE_SEED,
    createReciprocalSeedBlock,
    createSeededOfflineGame,
    deriveBotRandomSeed,
    deriveEngineSeed,
    derivePairedEngineSeed,
    deriveParticipantBotRandomSeed,
    engineSeedToEpochMs,
    validateOfflineSeedCompatibility,
    withSeededOfflineGame,
} from "../benchmark/seededOfflineGame.js";

class SeedProbeBot extends Bot {
    randomTrace: number[] = [];

    override onGameInit(gameApi: GameApi): void {
        this.randomTrace = Array.from({ length: 16 }, () => gameApi.generateRandomInt(0, MAX_ENGINE_SEED));
    }
}

const buildProbeSettings = (first: SeedProbeBot, second: SeedProbeBot): CreateOfflineOpts => {
    const mapName = "simple-1v1-no-preview.map";
    return {
        buildOffAlly: false,
        cratesAppear: false,
        credits: 10000,
        gameMode: cdapi.getAvailableGameModes(mapName)[0],
        gameSpeed: 6,
        mapName,
        mcvRepacks: true,
        shortGame: true,
        superWeapons: false,
        unitCount: 0,
        online: false,
        agents: [first, second],
    };
};

const captureEngineTrace = async (seed: number) => {
    const first = new SeedProbeBot("SeedProbeA", Countries.IRAQ);
    const second = new SeedProbeBot("SeedProbeB", Countries.FRANCE);
    return withSeededOfflineGame(
        cdapi,
        buildProbeSettings(first, second),
        seed,
        [
            { agent: first, identity: "candidate" },
            { agent: second, identity: "baseline" },
        ],
        async (game) => {
            return {
                first: first.randomTrace,
                second: second.randomTrace,
                starts: game.getPlayerStats().map(({ name, startLocation }) => ({ name, startLocation })),
            };
        },
    );
};

class MockRandomDrawBot extends Bot {
    readonly sequence: number[] = [];

    constructor(
        name: string,
        private readonly drawCount: number,
    ) {
        super(name, Countries.IRAQ);
    }

    override onGameInit(): void {
        for (let draw = 0; draw < this.drawCount; draw++) {
            this.sequence.push(Math.random());
        }
    }
}

const captureParticipantStreams = async (candidateDraws: number, candidateSlot: 0 | 1) => {
    const candidate = new MockRandomDrawBot("MockCandidate", candidateDraws);
    const baseline = new MockRandomDrawBot("MockBaseline", 6);
    const originalCandidateInit = candidate.onGameInit;
    const originalBaselineInit = baseline.onGameInit;
    const agents = candidateSlot === 0 ? [candidate, baseline] : [baseline, candidate];
    const settings = { agents } as unknown as CreateOfflineOpts;
    const creator = {
        createGame: vi.fn(async (opts: CreateOfflineOpts) => {
            for (const agent of opts.agents) {
                agent.onGameInit({} as GameApi);
            }
            return { dispose: vi.fn() } as unknown as GameInstanceApi;
        }),
    } as unknown as PublicApi;

    await withSeededOfflineGame(
        creator,
        settings,
        515151,
        [
            { agent: candidate, identity: "candidate" },
            { agent: baseline, identity: "baseline" },
        ],
        async () => undefined,
    );
    return {
        candidate: candidate.sequence,
        baseline: baseline.sequence,
        callbacksRestored:
            candidate.onGameInit === originalCandidateInit && baseline.onGameInit === originalBaselineInit,
    };
};

describe("explicit offline engine seed", () => {
    it("validates the pinned game-api implementation before applying the seed shim", () => {
        expect(validateOfflineSeedCompatibility()).toMatchObject({
            gameApiVersion: "0.75.0",
            method: "validated-date-now-seconds-shim",
            offlineGameId: "0",
            enginePrng: "Mersenne Twister",
        });
    });

    it("propagates the requested seed as the pinned offline timestamp and restores Date.now", async () => {
        const originalDateNow = Date.now;
        const observedTimes: number[] = [];
        const fakeGame = {} as GameInstanceApi;
        const creator = {
            createGame: vi.fn(async () => {
                observedTimes.push(Date.now());
                return fakeGame;
            }),
        } as unknown as PublicApi;

        await expect(createSeededOfflineGame(creator, {} as CreateOfflineOpts, 123456)).resolves.toBe(fakeGame);

        expect(observedTimes).toEqual([123456000]);
        expect(Date.now).toBe(originalDateNow);
    });

    it("restores Date.now when game creation fails", async () => {
        const originalDateNow = Date.now;
        const creator = {
            createGame: vi.fn(async () => {
                throw new Error("synthetic creation failure");
            }),
        } as unknown as PublicApi;

        await expect(createSeededOfflineGame(creator, {} as CreateOfflineOpts, 9)).rejects.toThrow(
            "synthetic creation failure",
        );
        expect(Date.now).toBe(originalDateNow);
    });

    it("restores both global sources when seeded-session game creation fails", async () => {
        const originalDateNow = Date.now;
        const originalMathRandom = Math.random;
        const creator = {
            createGame: vi.fn(async () => {
                throw new Error("synthetic session creation failure");
            }),
        } as unknown as PublicApi;

        await expect(
            withSeededOfflineGame(creator, {} as CreateOfflineOpts, 11, [], async () => "unreachable"),
        ).rejects.toThrow("synthetic session creation failure");
        expect(Date.now).toBe(originalDateNow);
        expect(Math.random).toBe(originalMathRandom);
    });

    it("derives reproducible uint32 seeds and wraps without precision loss", () => {
        expect(deriveEngineSeed(7331, 0)).toBe(7331);
        expect(deriveEngineSeed(MAX_ENGINE_SEED, 1)).toBe(0);
        expect(derivePairedEngineSeed(7331, 5)).toBe(7336);
        expect([0, 1].map(() => derivePairedEngineSeed(7331, 5))).toEqual([7336, 7336]);
        expect(createReciprocalSeedBlock(7331, 5)).toEqual({
            seedBlockIndex: 5,
            requestedEngineSeed: 7336,
            candidateSlots: [0, 1],
        });
        expect(deriveBotRandomSeed(424242)).toBe((424242 ^ 0x9e37_79b9) >>> 0);
        expect(deriveParticipantBotRandomSeed(424242, "candidate")).not.toBe(
            deriveParticipantBotRandomSeed(424242, "baseline"),
        );
        expect(engineSeedToEpochMs(424242)).toBe(424242000);
        expect(() => deriveEngineSeed(-1, 0)).toThrow("Engine seed must be an integer");
    });

    it("keeps baseline randomness unchanged when the candidate consumes extra draws", async () => {
        const fewCandidateDraws = await captureParticipantStreams(2, 0);
        const manyCandidateDraws = await captureParticipantStreams(200, 0);

        expect(manyCandidateDraws.baseline).toEqual(fewCandidateDraws.baseline);
        expect(manyCandidateDraws.candidate.slice(0, 2)).toEqual(fewCandidateDraws.candidate);
        expect(fewCandidateDraws.callbacksRestored).toBe(true);
        expect(manyCandidateDraws.callbacksRestored).toBe(true);
    });

    it("preserves participant streams when reciprocal physical slots swap callback order", async () => {
        const candidateFirst = await captureParticipantStreams(8, 0);
        const baselineFirst = await captureParticipantStreams(8, 1);

        expect(baselineFirst.candidate).toEqual(candidateFirst.candidate);
        expect(baselineFirst.baseline).toEqual(candidateFirst.baseline);
        expect(candidateFirst.callbacksRestored).toBe(true);
        expect(baselineFirst.callbacksRestored).toBe(true);
    });

    it("restores bot randomness and disposes the game when the match callback throws", async () => {
        const originalMathRandom = Math.random;
        const originalDateNow = Date.now;
        const dispose = vi.fn();
        const creator = {
            createGame: vi.fn(async () => ({ dispose }) as unknown as GameInstanceApi),
        } as unknown as PublicApi;

        await expect(
            withSeededOfflineGame(creator, {} as CreateOfflineOpts, 17, [], async () => {
                expect(Math.random).not.toBe(originalMathRandom);
                throw new Error("synthetic match failure");
            }),
        ).rejects.toThrow("synthetic match failure");

        expect(dispose).toHaveBeenCalledOnce();
        expect(Math.random).toBe(originalMathRandom);
        expect(Date.now).toBe(originalDateNow);
    });

    it("fails closed when two seeded match sessions overlap in one process", async () => {
        let releaseFirst: (() => void) | undefined;
        const firstCanFinish = new Promise<void>((resolve) => {
            releaseFirst = resolve;
        });
        const creator = {
            createGame: vi.fn(async () => ({ dispose: vi.fn() }) as unknown as GameInstanceApi),
        } as unknown as PublicApi;

        const first = withSeededOfflineGame(creator, {} as CreateOfflineOpts, 100, [], async () => {
            await firstCanFinish;
            return "complete";
        });
        await vi.waitFor(() => expect(creator.createGame).toHaveBeenCalledOnce());

        await expect(
            withSeededOfflineGame(creator, {} as CreateOfflineOpts, 101, [], async () => "overlap"),
        ).rejects.toThrow("Concurrent seeded offline match sessions are unsupported");
        await expect(createSeededOfflineGame(creator, {} as CreateOfflineOpts, 102)).rejects.toThrow(
            "Standalone game creation is unsupported while seeded match session 100 is active",
        );

        releaseFirst?.();
        await expect(first).resolves.toBe("complete");
    });
});

describe("offline engine PRNG trace", () => {
    beforeAll(async () => {
        await cdapi.init("./data");
    }, 60_000);

    it("repeats an identical trace for the same seed and changes it for a different seed", async () => {
        const first = await captureEngineTrace(424242);
        const repeated = await captureEngineTrace(424242);
        const different = await captureEngineTrace(424243);

        expect(repeated).toEqual(first);
        expect(different).not.toEqual(first);
    }, 30_000);
});
