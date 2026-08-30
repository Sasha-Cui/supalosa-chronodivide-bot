import { createHash } from "node:crypto";

import { CanvasRenderingContext2D, createCanvas } from "canvas";
import { GameApi, LandType, Tile, UnitData } from "@chronodivide/game-api";

export const GAME_STATE_FRAME_PALETTE = Object.freeze({
    land: "#eef5e9",
    road: "#9aa0a6",
    cliff: "#686d73",
    water: "#3978c6",
    ore: "#ffd400",
    gems: "#00dbe8",
    candidate: "#65e65f",
    opponent: "#f05252",
    neutral: "#8a9098",
    outline: "#111418",
    panelBackground: "#101419",
    panelText: "#f7f9fb",
    panelMuted: "#c5ccd4",
    route: "#00e5ff",
    candidateForce: "#ffe04a",
    opponentBuilding: "#ff4fd8",
    opponentCombatant: "#ff922b",
});

export type GameFrameMetadata = {
    category: string;
    map: string;
    mapSha256: string;
    policy: string;
    country: string;
    candidateStart: string;
    candidateSlot: number;
    opponent: string;
    opponentSha256: string;
    requestedEngineSeed: number;
    originalJobId: string;
    sourceCommit: string;
    trajectorySha256: string;
    replaySha256: string;
    status?: string;
};

export type GameFrameAnnotationKind =
    "candidate_force" | "opponent_building" | "opponent_combatant" | "route" | "region";

export type GameFrameAnnotation = {
    kind: GameFrameAnnotationKind;
    label: string;
    unitId?: number | string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    points?: readonly { x: number; y: number }[];
};

export type PublicFrameState = {
    update: number;
    players: readonly {
        name: string;
        credits: number;
        powerDrain: number;
        powerTotal: number;
        startX: number;
        startY: number;
    }[];
    resources: readonly { x: number; y: number; ore: number; gems: number }[];
    objects: readonly {
        id: number | string;
        owner: string;
        name: string;
        rule: string;
        type: string;
        hitPoints: number;
        maxHitPoints: number;
        x: number;
        y: number;
        width: number;
        height: number;
    }[];
};

export type GameStateFrameRenderResult = {
    png: Buffer;
    pngSha256: string;
    state: PublicFrameState;
    stateSha256: string;
    width: number;
    height: number;
};

export type GameStateFrameRendererOptions = {
    tileScale?: number;
    panelWidth?: number;
    minimumHeight?: number;
};

const canonicalJson = (value: unknown): string => JSON.stringify(value);

const abbreviated = (value: string): string => value.length > 12 ? value.slice(0, 12) : value;

const tileColor = (tile: Tile): string => {
    if (tile.landType === LandType.Water) return GAME_STATE_FRAME_PALETTE.water;
    if (tile.landType === LandType.Road) return GAME_STATE_FRAME_PALETTE.road;
    if (tile.landType === LandType.Cliff || tile.landType === LandType.Rock) {
        return GAME_STATE_FRAME_PALETTE.cliff;
    }
    return GAME_STATE_FRAME_PALETTE.land;
};

const annotationColor = (kind: GameFrameAnnotationKind): string => {
    if (kind === "candidate_force") return GAME_STATE_FRAME_PALETTE.candidateForce;
    if (kind === "opponent_building") return GAME_STATE_FRAME_PALETTE.opponentBuilding;
    if (kind === "opponent_combatant") return GAME_STATE_FRAME_PALETTE.opponentCombatant;
    return GAME_STATE_FRAME_PALETTE.route;
};

const capturePublicFrameState = (game: GameApi): PublicFrameState => {
    const players = game.getPlayers().slice().sort().map((name) => {
        const data = game.getPlayerData(name);
        return {
            name,
            credits: data.credits,
            powerDrain: data.power.drain,
            powerTotal: data.power.total,
            startX: data.startLocation.x,
            startY: data.startLocation.y,
        };
    });
    const resources = game.mapApi.getAllTilesResourceData().map((resource) => ({
        x: resource.tile.rx,
        y: resource.tile.ry,
        ore: resource.ore,
        gems: resource.gems,
    })).sort((left, right) => left.y - right.y || left.x - right.x);
    const objects = game.getAllUnits().map((id) => game.getGameObjectData(id))
        .filter((unit): unit is UnitData => !!unit)
        .map((unit) => ({
            id: unit.id,
            owner: unit.owner,
            name: unit.name,
            rule: unit.rules.name,
            type: String(unit.rules.type),
            hitPoints: unit.hitPoints,
            maxHitPoints: unit.maxHitPoints,
            x: unit.tile.rx,
            y: unit.tile.ry,
            width: unit.foundation.width,
            height: unit.foundation.height,
        }))
        .sort((left, right) => String(left.id).localeCompare(String(right.id)));
    return { update: game.getCurrentTick(), players, resources, objects };
};

const wrapText = (
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number,
): number => {
    const words = text.split(/\s+/);
    let line = "";
    let cursor = y;
    for (const word of words) {
        const next = line ? `${line} ${word}` : word;
        if (line && ctx.measureText(next).width > maxWidth) {
            ctx.fillText(line, x, cursor);
            cursor += lineHeight;
            line = word;
        } else {
            line = next;
        }
    }
    if (line) {
        ctx.fillText(line, x, cursor);
        cursor += lineHeight;
    }
    return cursor;
};

export class GameStateFrameRenderer {
    private readonly tileScale: number;
    private readonly panelWidth: number;
    private readonly minimumHeight: number;

    constructor(options: GameStateFrameRendererOptions = {}) {
        this.tileScale = options.tileScale ?? 8;
        this.panelWidth = options.panelWidth ?? 480;
        this.minimumHeight = options.minimumHeight ?? 720;
        if (this.tileScale < 2 || this.panelWidth < 320 || this.minimumHeight < 480) {
            throw new Error("Game-state frame dimensions are too small for readable annotations");
        }
    }

    render(
        game: GameApi,
        candidateName: string,
        opponentName: string,
        metadata: GameFrameMetadata,
        annotations: readonly GameFrameAnnotation[] = [],
    ): GameStateFrameRenderResult {
        const state = capturePublicFrameState(game);
        const stateSha256 = createHash("sha256").update(canonicalJson(state)).digest("hex");
        const { width: mapWidth, height: mapHeight } = game.mapApi.getRealMapSize();
        const mapPixelWidth = mapWidth * this.tileScale;
        const width = mapPixelWidth + this.panelWidth;
        const height = Math.max(mapHeight * this.tileScale, this.minimumHeight);
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext("2d");
        ctx.imageSmoothingEnabled = false;

        ctx.fillStyle = GAME_STATE_FRAME_PALETTE.outline;
        ctx.fillRect(0, 0, width, height);
        for (const tile of game.mapApi.getTilesInRect({ x: 0, y: 0, width: mapWidth, height: mapHeight })) {
            ctx.fillStyle = tileColor(tile);
            ctx.fillRect(
                tile.rx * this.tileScale,
                tile.ry * this.tileScale,
                this.tileScale,
                this.tileScale,
            );
        }

        ctx.save();
        ctx.globalAlpha = 0.5;
        for (const resource of state.resources) {
            if (resource.gems <= 0 && resource.ore <= 0) continue;
            ctx.fillStyle = resource.gems > 0 ? GAME_STATE_FRAME_PALETTE.gems : GAME_STATE_FRAME_PALETTE.ore;
            ctx.fillRect(
                resource.x * this.tileScale,
                resource.y * this.tileScale,
                this.tileScale,
                this.tileScale,
            );
        }
        ctx.restore();

        for (const object of state.objects) {
            const fill = object.owner === candidateName ? GAME_STATE_FRAME_PALETTE.candidate :
                object.owner === opponentName ? GAME_STATE_FRAME_PALETTE.opponent :
                    GAME_STATE_FRAME_PALETTE.neutral;
            const x = object.x * this.tileScale;
            const y = object.y * this.tileScale;
            const objectWidth = Math.max(this.tileScale, object.width * this.tileScale);
            const objectHeight = Math.max(this.tileScale, object.height * this.tileScale);
            ctx.fillStyle = fill;
            ctx.fillRect(x, y, objectWidth, objectHeight);
            ctx.strokeStyle = GAME_STATE_FRAME_PALETTE.outline;
            ctx.lineWidth = 2;
            ctx.strokeRect(x + 1, y + 1, Math.max(1, objectWidth - 2), Math.max(1, objectHeight - 2));
        }

        this.renderAnnotations(ctx, state, annotations, mapPixelWidth);
        this.renderPanel(ctx, mapPixelWidth, height, metadata, state, stateSha256);

        const png = canvas.toBuffer("image/png");
        return {
            png,
            pngSha256: createHash("sha256").update(png).digest("hex"),
            state,
            stateSha256,
            width,
            height,
        };
    }

    private renderAnnotations(
        ctx: CanvasRenderingContext2D,
        state: PublicFrameState,
        annotations: readonly GameFrameAnnotation[],
        mapPixelWidth: number,
    ): void {
        ctx.font = "bold 13px sans-serif";
        ctx.textBaseline = "top";
        for (const annotation of annotations) {
            const color = annotationColor(annotation.kind);
            if (annotation.points && annotation.points.length > 1) {
                ctx.beginPath();
                annotation.points.forEach((point, index) => {
                    const x = (point.x + 0.5) * this.tileScale;
                    const y = (point.y + 0.5) * this.tileScale;
                    if (index === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                });
                ctx.strokeStyle = color;
                ctx.lineWidth = 3;
                ctx.stroke();
            }
            const object = annotation.unitId === undefined ? undefined :
                state.objects.find((row) => String(row.id) === String(annotation.unitId));
            const x = (object?.x ?? annotation.x ?? 0) * this.tileScale;
            const y = (object?.y ?? annotation.y ?? 0) * this.tileScale;
            const width = (object?.width ?? annotation.width ?? 1) * this.tileScale;
            const height = (object?.height ?? annotation.height ?? 1) * this.tileScale;
            ctx.strokeStyle = color;
            ctx.lineWidth = 4;
            ctx.strokeRect(x - 2, y - 2, width + 4, height + 4);

            const labelWidth = Math.min(mapPixelWidth, Math.max(80, ctx.measureText(annotation.label).width + 12));
            const labelX = Math.max(0, Math.min(x, mapPixelWidth - labelWidth));
            const labelY = Math.max(0, y - 22);
            ctx.fillStyle = GAME_STATE_FRAME_PALETTE.panelBackground;
            ctx.fillRect(labelX, labelY, labelWidth, 20);
            ctx.fillStyle = GAME_STATE_FRAME_PALETTE.panelText;
            ctx.fillText(annotation.label, labelX + 6, labelY + 3);
        }
    }

    private renderPanel(
        ctx: CanvasRenderingContext2D,
        x: number,
        height: number,
        metadata: GameFrameMetadata,
        state: PublicFrameState,
        stateSha256: string,
    ): void {
        ctx.fillStyle = GAME_STATE_FRAME_PALETTE.panelBackground;
        ctx.fillRect(x, 0, this.panelWidth, height);
        ctx.fillStyle = GAME_STATE_FRAME_PALETTE.panelText;
        ctx.font = "bold 18px sans-serif";
        ctx.textBaseline = "top";
        let y = 18;
        y = wrapText(ctx, metadata.category, x + 18, y, this.panelWidth - 36, 24) + 8;

        ctx.font = "14px monospace";
        const lines = [
            `Update: ${state.update} (${(state.update / 15).toFixed(1)} s)`,
            `Map: ${metadata.map}`,
            `Policy: ${metadata.policy}`,
            `Country: ${metadata.country}`,
            `Start/slot: ${metadata.candidateStart} / ${metadata.candidateSlot}`,
            `Opponent: ${metadata.opponent}`,
            `Seed/job: ${metadata.requestedEngineSeed} / ${metadata.originalJobId}`,
            `Status: ${metadata.status ?? "in progress"}`,
            `Source: ${abbreviated(metadata.sourceCommit)}`,
            `Map SHA: ${abbreviated(metadata.mapSha256)}`,
            `Opponent SHA: ${abbreviated(metadata.opponentSha256)}`,
            `Trajectory: ${abbreviated(metadata.trajectorySha256)}`,
            `Replay: ${abbreviated(metadata.replaySha256)}`,
            `Frame state: ${abbreviated(stateSha256)}`,
        ];
        for (const line of lines) {
            ctx.fillStyle = line.startsWith("Status:") ?
                GAME_STATE_FRAME_PALETTE.panelMuted : GAME_STATE_FRAME_PALETTE.panelText;
            y = wrapText(ctx, line, x + 18, y, this.panelWidth - 36, 20);
        }

        y += 12;
        ctx.fillStyle = GAME_STATE_FRAME_PALETTE.panelMuted;
        ctx.font = "12px sans-serif";
        wrapText(
            ctx,
            "Passive public-state rendering; no actions, production calls, or policy substitution.",
            x + 18,
            y,
            this.panelWidth - 36,
            18,
        );
    }
}
