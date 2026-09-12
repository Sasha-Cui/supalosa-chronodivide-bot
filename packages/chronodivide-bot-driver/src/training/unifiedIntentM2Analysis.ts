import crypto from "node:crypto";

export const UNIFIED_INTENT_M2_BOOTSTRAP_REPLICATES = 200_000;
export const UNIFIED_INTENT_M2_BOOTSTRAP_DOMAIN =
    "unified-intent-m2-family-bootstrap-v1";
export const UNIFIED_INTENT_M2_ONE_SIDED_Z90 = 1.2815515655446004;

export type UnifiedIntentM2AnalysisRow = {
    familyId: string;
    opponent: "pinned_supalosa" | "ra2web_advanced";
    country: string;
    faction: "Allied" | "Soviet";
    candidateSlot: number;
    disabledWinner: "candidate" | "baseline" | "draw";
    enabledWinner: "candidate" | "baseline" | "draw";
    disabledScore: 0 | 0.5 | 1;
    enabledScore: 0 | 0.5 | 1;
};

export type UnifiedIntentM2Bootstrap = {
    complete: true;
    domain: typeof UNIFIED_INTENT_M2_BOOTSTRAP_DOMAIN;
    subset: string;
    replicates: number;
    families: number;
    cases: number;
    familyIds: string[];
    pairedScore: { estimate: number; lower90: number };
    pairedLiteralWin: { estimate: number; lower90: number };
    drawsSha256: string;
};

const mean = (values: number[]): number =>
    values.reduce((total, value) => total + value, 0) / values.length;

const lowerQuantile = (values: number[], probability: number): number => {
    const sorted = values.slice().sort((left, right) => left - right);
    return sorted[Math.floor(probability * sorted.length)];
};

class CounterModeRandom {
    private readonly seed: Buffer;
    private readonly digest = crypto.createHash("sha256");
    private block = Buffer.alloc(0);
    private offset = 0;
    private counter = 0;

    constructor(subset: string) {
        this.seed = crypto.createHash("sha256")
            .update(UNIFIED_INTENT_M2_BOOTSTRAP_DOMAIN + "\0" + subset)
            .digest();
    }

    index(length: number): number {
        if (!Number.isSafeInteger(length) || length < 1) {
            throw new Error("Unified intent M2 bootstrap index length drifted");
        }
        if (this.offset + 4 > this.block.length) {
            const counter = Buffer.alloc(8);
            counter.writeBigUInt64BE(BigInt(this.counter));
            this.block = crypto.createHash("sha256").update(this.seed).update(counter).digest();
            this.digest.update(this.block);
            this.offset = 0;
            this.counter += 1;
        }
        const value = this.block.readUInt32BE(this.offset);
        this.offset += 4;
        return value % length;
    }

    finish(): string {
        return this.digest.digest("hex");
    }
}

export const unifiedIntentM2ClusterBootstrap = (
    rows: UnifiedIntentM2AnalysisRow[],
    subset: string,
    replicates = UNIFIED_INTENT_M2_BOOTSTRAP_REPLICATES,
): UnifiedIntentM2Bootstrap => {
    if (!/^[A-Za-z0-9._-]+$/.test(subset) ||
        !Number.isSafeInteger(replicates) || replicates < 1) {
        throw new Error("Unified intent M2 bootstrap configuration drifted");
    }
    const familyIds = [...new Set(rows.map((row) => row.familyId))].sort();
    if (familyIds.length < 1 || rows.length < familyIds.length) {
        throw new Error("Unified intent M2 bootstrap population drifted");
    }
    const effects = familyIds.map((familyId) => {
        const family = rows.filter((row) => row.familyId === familyId);
        if (family.length === 0) throw new Error("Unified intent M2 family is empty");
        return {
            score: mean(family.map((row) => row.enabledScore - row.disabledScore)),
            win: mean(family.map((row) =>
                Number(row.enabledWinner === "candidate") -
                Number(row.disabledWinner === "candidate"))),
        };
    });
    const random = new CounterModeRandom(subset);
    const scoreDraws = new Array<number>(replicates);
    const winDraws = new Array<number>(replicates);
    for (let replicate = 0; replicate < replicates; replicate += 1) {
        let scoreTotal = 0;
        let winTotal = 0;
        for (let draw = 0; draw < effects.length; draw += 1) {
            const selected = effects[random.index(effects.length)];
            scoreTotal += selected.score;
            winTotal += selected.win;
        }
        scoreDraws[replicate] = scoreTotal / effects.length;
        winDraws[replicate] = winTotal / effects.length;
    }
    return {
        complete: true,
        domain: UNIFIED_INTENT_M2_BOOTSTRAP_DOMAIN,
        subset,
        replicates,
        families: familyIds.length,
        cases: rows.length,
        familyIds,
        pairedScore: {
            estimate: mean(effects.map((value) => value.score)),
            lower90: lowerQuantile(scoreDraws, 0.10),
        },
        pairedLiteralWin: {
            estimate: mean(effects.map((value) => value.win)),
            lower90: lowerQuantile(winDraws, 0.10),
        },
        drawsSha256: random.finish(),
    };
};

export const unifiedIntentM2WilsonLower90 = (successes: number, total: number): number => {
    if (!Number.isSafeInteger(successes) || !Number.isSafeInteger(total) ||
        successes < 0 || total < 1 || successes > total) {
        throw new Error("Unified intent M2 Wilson inputs drifted");
    }
    const z = UNIFIED_INTENT_M2_ONE_SIDED_Z90;
    const proportion = successes / total;
    const denominator = 1 + z * z / total;
    const center = proportion + z * z / (2 * total);
    const radius = z * Math.sqrt(
        proportion * (1 - proportion) / total + z * z / (4 * total * total),
    );
    return (center - radius) / denominator;
};

export const unifiedIntentM2Wdl = (
    winners: Array<"candidate" | "baseline" | "draw">,
): { wins: number; draws: number; losses: number; score: number; winRate: number } => {
    const wins = winners.filter((value) => value === "candidate").length;
    const draws = winners.filter((value) => value === "draw").length;
    const losses = winners.filter((value) => value === "baseline").length;
    if (wins + draws + losses !== winners.length || winners.length === 0) {
        throw new Error("Unified intent M2 WDL population drifted");
    }
    return {
        wins,
        draws,
        losses,
        score: (wins + 0.5 * draws) / winners.length,
        winRate: wins / winners.length,
    };
};
