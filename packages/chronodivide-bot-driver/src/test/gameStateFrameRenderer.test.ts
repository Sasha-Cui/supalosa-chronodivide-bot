import { describe, expect, it } from "vitest";
import { GameApi, LandType, Tile, UnitData } from "@chronodivide/game-api";

import {
    GAME_STATE_FRAME_PALETTE,
    GameFrameMetadata,
    GameStateFrameRenderer,
} from "../visualisation/gameStateFrameRenderer.js";

const freezeDeep = <T>(value: T): T => {
    if (value && typeof value === "object" && !Object.isFrozen(value)) {
        Object.freeze(value);
        for (const child of Object.values(value)) freezeDeep(child);
    }
    return value;
};

const luminance = (hex: string): number => {
    const channels = [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255)
        .map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
};

const contrast = (first: string, second: string): number => {
    const high = Math.max(luminance(first), luminance(second));
    const low = Math.min(luminance(first), luminance(second));
    return (high + 0.05) / (low + 0.05);
};

const fixture = () => {
    const calls: string[] = [];
    const tiles = freezeDeep([
        { rx: 0, ry: 0, landType: 0 as LandType },
        { rx: 1, ry: 0, landType: LandType.Water },
        { rx: 0, ry: 1, landType: LandType.Road },
        { rx: 1, ry: 1, landType: LandType.Cliff },
    ] as Tile[]);
    const resources = freezeDeep([
        { tile: { rx: 0, ry: 0 }, ore: 100, gems: 0 },
        { tile: { rx: 1, ry: 1 }, ore: 0, gems: 100 },
    ]);
    const players = freezeDeep({
        Candidate: { credits: 5000, power: { drain: 20, total: 40 }, startLocation: { x: 0, y: 1 } },
        Opponent: { credits: 4200, power: { drain: 15, total: 35 }, startLocation: { x: 1, y: 0 } },
    });
    const objects = freezeDeep([
        {
            id: 11, owner: "Candidate", name: "Grizzly Tank", rules: { name: "MTNK", type: "vehicle" },
            hitPoints: 300, maxHitPoints: 400, tile: { rx: 0, ry: 1 }, foundation: { width: 1, height: 1 },
        },
        {
            id: 22, owner: "Opponent", name: "Construction Yard", rules: { name: "GACNST", type: "building" },
            hitPoints: 800, maxHitPoints: 1000, tile: { rx: 1, ry: 0 }, foundation: { width: 1, height: 1 },
        },
    ] as unknown as UnitData[]);
    const mapApi = {
        getRealMapSize: () => {
            calls.push("map.getRealMapSize");
            return { width: 2, height: 2 };
        },
        getTilesInRect: () => {
            calls.push("map.getTilesInRect");
            return tiles;
        },
        getAllTilesResourceData: () => {
            calls.push("map.getAllTilesResourceData");
            return resources;
        },
    };
    const api = {
        mapApi,
        getCurrentTick: () => {
            calls.push("game.getCurrentTick");
            return 1200;
        },
        getPlayers: () => {
            calls.push("game.getPlayers");
            return ["Opponent", "Candidate"];
        },
        getPlayerData: (name: keyof typeof players) => {
            calls.push(`game.getPlayerData:${name}`);
            return players[name];
        },
        getAllUnits: () => {
            calls.push("game.getAllUnits");
            return [22, 11];
        },
        getGameObjectData: (id: number) => {
            calls.push(`game.getGameObjectData:${id}`);
            return objects.find((object) => object.id === id) ?? null;
        },
    } as unknown as GameApi;
    return { api, calls, original: JSON.stringify({ tiles, resources, players, objects }) };
};

const metadata: GameFrameMetadata = {
    category: "Test deterministic public-state frame",
    map: "test.map",
    mapSha256: "a".repeat(64),
    policy: "confirmed",
    country: "Americans",
    candidateStart: "0,1",
    candidateSlot: 0,
    opponent: "Pinned Supalosa",
    opponentSha256: "b".repeat(64),
    requestedEngineSeed: 42,
    originalJobId: "12345",
    sourceCommit: "c".repeat(40),
    trajectorySha256: "d".repeat(64),
    replaySha256: "e".repeat(64),
};

describe("GameStateFrameRenderer", () => {
    it("renders deterministically through public read-only methods", () => {
        const firstFixture = fixture();
        const renderer = new GameStateFrameRenderer({ tileScale: 4, panelWidth: 320, minimumHeight: 480 });
        const first = renderer.render(firstFixture.api, "Candidate", "Opponent", metadata, [
            { kind: "candidate_force", label: "Candidate force", unitId: 11 },
            { kind: "opponent_building", label: "Final building", unitId: 22 },
            { kind: "route", label: "Observed motion", points: [{ x: 0, y: 1 }, { x: 1, y: 0 }] },
        ]);
        const secondFixture = fixture();
        const second = renderer.render(secondFixture.api, "Candidate", "Opponent", metadata, [
            { kind: "candidate_force", label: "Candidate force", unitId: 11 },
            { kind: "opponent_building", label: "Final building", unitId: 22 },
            { kind: "route", label: "Observed motion", points: [{ x: 0, y: 1 }, { x: 1, y: 0 }] },
        ]);

        expect(first.png.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
        expect(first.png.equals(second.png)).toBe(true);
        expect(first.pngSha256).toBe(second.pngSha256);
        expect(first.stateSha256).toBe(second.stateSha256);
        expect(first.width).toBe(328);
        expect(first.height).toBe(480);
        expect(firstFixture.calls).toEqual(secondFixture.calls);
        expect(firstFixture.calls).toEqual([
            "game.getPlayers", "game.getPlayerData:Candidate", "game.getPlayerData:Opponent",
            "map.getAllTilesResourceData", "game.getAllUnits", "game.getGameObjectData:22",
            "game.getGameObjectData:11", "game.getCurrentTick", "map.getRealMapSize",
            "map.getTilesInRect",
        ]);
        expect(firstFixture.original).toBe(fixture().original);
    });

    it("uses readable explicit metadata colors", () => {
        expect(contrast(GAME_STATE_FRAME_PALETTE.panelText, GAME_STATE_FRAME_PALETTE.panelBackground))
            .toBeGreaterThanOrEqual(7);
        expect(contrast(GAME_STATE_FRAME_PALETTE.panelMuted, GAME_STATE_FRAME_PALETTE.panelBackground))
            .toBeGreaterThanOrEqual(4.5);
        expect(GAME_STATE_FRAME_PALETTE.panelText).not.toBe(GAME_STATE_FRAME_PALETTE.panelBackground);
    });

    it("fails closed on unreadable dimensions", () => {
        expect(() => new GameStateFrameRenderer({ tileScale: 1 })).toThrow("too small");
        expect(() => new GameStateFrameRenderer({ panelWidth: 200 })).toThrow("too small");
        expect(() => new GameStateFrameRenderer({ minimumHeight: 200 })).toThrow("too small");
    });
});
