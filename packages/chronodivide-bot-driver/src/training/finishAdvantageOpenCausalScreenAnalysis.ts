import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { FinishAdvantageMargin } from "./finishAdvantageControl.js";
import { TerminalBaseRaceMode } from "./terminalBaseRaceGuard.js";

export const FINISH_ADVANTAGE_OPEN_CAUSAL_SCREEN_PROTOCOL_SHA256 =
    "0a73121af4a38cd8d315669463c0c3fc70a72c1a8deb4f2c01052d82c47deb3e" as const;
export const FINISH_ADVANTAGE_OPEN_CAUSAL_SCREEN_AMENDMENT_SHA256 =
    "18ac1f807bd3e11bf8f6adcd220d203e543772f09002d6ff3c6c5bb8cfa16cbe" as const;
export const FINISH_ADVANTAGE_OPEN_CAUSAL_SCREEN_AMENDMENT_2_SHA256 =
    "dff708b297d2a3e226abc3bc28a8e5076abd1743698798dd71e1308269fd4d7c" as const;
export const FINISH_ADVANTAGE_OPEN_CAUSAL_SCREEN_AMENDMENT_3_SHA256 =
    "f007363f7357f00fd0d07fdbc1832a5349febdcc6fd76b4dbb9d3e50253a51ba" as const;
export const FINISH_ADVANTAGE_OPEN_CAUSAL_SCREEN_AMENDMENT_4_SHA256 =
    "d66ef1e3753a31b87fd028e4f215ad40003651933ae93f83637aa91936bf4da6" as const;
export const FINISH_ADVANTAGE_OPEN_CAUSAL_SCREEN_T80_DF9 = 0.8834038596855205 as const;
export const FINISH_ADVANTAGE_OPEN_CAUSAL_SCREEN_SEED_BASE = 4_227_000_000 as const;
export const FINISH_ADVANTAGE_OPEN_CAUSAL_SCREEN_MAX_TICKS = 24_000 as const;
export const FINISH_ADVANTAGE_OPEN_CAUSAL_SCREEN_COUNTRIES = [
    Countries.USA,
    Countries.KOREA,
    Countries.FRANCE,
    Countries.GERMANY,
    Countries.GREAT_BRITAIN,
    Countries.LIBYA,
    Countries.IRAQ,
    Countries.CUBA,
    Countries.RUSSIA,
] as const;

export type FinishAdvantageOpenOutcome = "win" | "draw" | "loss";
export type FinishAdvantageOpenArmId =
    "external_supalosa_control" |
    "visibility_aware_final_building_v5" |
    "v5_plus_terminal_base_race_guard" |
    "termination_aware_plus_irreversible_finish" |
    `termination_aware_plus_surplus_m${FinishAdvantageMargin}`;
export type FinishAdvantageOpenArm = {
    armId: FinishAdvantageOpenArmId;
    kind: "control" | "v5" | "base_race" | "irreversible" | "surplus";
    margin: FinishAdvantageMargin | null;
    terminalBaseRaceMode: TerminalBaseRaceMode | "none";
};
export type FinishAdvantageOpenOutcomeRow = {
    armId: FinishAdvantageOpenArmId;
    familyId: string;
    country: Countries;
    candidateSlot: 0 | 1;
    outcome: FinishAdvantageOpenOutcome;
    nonterminalDraw: boolean;
};

export const deriveFinishAdvantageOpenSeed = (
    familyOrdinal: number,
    countryOrdinal: number,
): number => {
    if (!Number.isInteger(familyOrdinal) || familyOrdinal < 0 || familyOrdinal >= 10) {
        throw new Error("Open causal-screen family ordinal must be an integer in [0, 9]");
    }
    if (!Number.isInteger(countryOrdinal) || countryOrdinal < 0 || countryOrdinal >= 9) {
        throw new Error("Open causal-screen country ordinal must be an integer in [0, 8]");
    }
    return FINISH_ADVANTAGE_OPEN_CAUSAL_SCREEN_SEED_BASE + 9 * familyOrdinal + countryOrdinal;
};

const ALLIED = new Set<Countries>([
    Countries.USA,
    Countries.KOREA,
    Countries.FRANCE,
    Countries.GERMANY,
    Countries.GREAT_BRITAIN,
]);
const score = (outcome: FinishAdvantageOpenOutcome): number =>
    outcome === "win" ? 1 : outcome === "draw" ? 0.5 : 0;
const mean = (values: readonly number[]): number => {
    if (values.length === 0 || values.some((value) => !Number.isFinite(value))) {
        throw new Error("Open causal-screen mean received invalid values");
    }
    return values.reduce((sum, value) => sum + value, 0) / values.length;
};
const sampleSd = (values: readonly number[]): number => {
    if (values.length < 2) throw new Error("Open causal-screen variance needs at least two clusters");
    const center = mean(values);
    const variance = values.reduce((sum, value) => sum + (value - center) ** 2, 0) / (values.length - 1);
    if (!Number.isFinite(variance) || variance < 0) throw new Error("Open causal-screen variance is invalid");
    return Math.sqrt(variance);
};

export const buildFinishAdvantageOpenArms = (
    selectedMargins: readonly FinishAdvantageMargin[],
): FinishAdvantageOpenArm[] => {
    if (
        selectedMargins.length > 2 || new Set(selectedMargins).size !== selectedMargins.length ||
        selectedMargins.some((margin) => !([0, 2, 4, 8] as const).includes(margin))
    ) throw new Error("Open causal-screen margins are invalid");
    const margins = selectedMargins.slice().sort((left, right) => left - right);
    return [
        {
            armId: "external_supalosa_control",
            kind: "control",
            margin: null,
            terminalBaseRaceMode: "none",
        },
        {
            armId: "visibility_aware_final_building_v5",
            kind: "v5",
            margin: null,
            terminalBaseRaceMode: "legacy_v5_ignore_own_base_loss",
        },
        {
            armId: "v5_plus_terminal_base_race_guard",
            kind: "base_race",
            margin: null,
            terminalBaseRaceMode: "strict_literal_endpoint_base_race",
        },
        {
            armId: "termination_aware_plus_irreversible_finish",
            kind: "irreversible",
            margin: null,
            terminalBaseRaceMode: "strict_literal_endpoint_base_race",
        },
        ...margins.map((margin): FinishAdvantageOpenArm => ({
            armId: `termination_aware_plus_surplus_m${margin}`,
            kind: "surplus",
            margin,
            terminalBaseRaceMode: "strict_literal_endpoint_base_race",
        })),
    ];
};

const outcomeCounts = (rows: readonly FinishAdvantageOpenOutcomeRow[]) => ({
    wins: rows.filter(({ outcome }) => outcome === "win").length,
    draws: rows.filter(({ outcome }) => outcome === "draw").length,
    losses: rows.filter(({ outcome }) => outcome === "loss").length,
});

export type FinishAdvantageOpenAbsoluteRates = {
    literalWinRate: number;
    drawRate: number;
    nonterminalDrawRate: number;
    familyRates: Record<string, {
        literalWinRate: number;
        drawRate: number;
        nonterminalDrawRate: number;
    }>;
    countryRates: Record<string, {
        literalWinRate: number;
        drawRate: number;
        nonterminalDrawRate: number;
    }>;
    factionRates: Record<"allied" | "soviet", {
        literalWinRate: number;
        drawRate: number;
        nonterminalDrawRate: number;
    }>;
    slotRates: Record<"0" | "1", {
        literalWinRate: number;
        drawRate: number;
        nonterminalDrawRate: number;
    }>;
    literalWinFamilyClusterSd: number;
    literalWinFamilyClusterSe: number;
    oneSided80LiteralWinLower: number;
    drawFamilyClusterSd: number;
    drawFamilyClusterSe: number;
    oneSided80DrawUpper: number;
};

const absoluteRates = (rows: readonly FinishAdvantageOpenOutcomeRow[]) => {
    if (rows.length === 0) throw new Error("Open causal-screen absolute rates require rows");
    return {
        literalWinRate: mean(rows.map(({ outcome }) => Number(outcome === "win"))),
        drawRate: mean(rows.map(({ outcome }) => Number(outcome === "draw"))),
        nonterminalDrawRate: mean(rows.map(({ nonterminalDraw }) => Number(nonterminalDraw))),
    };
};

export const summarizeFinishAdvantageOpenAbsoluteRates = (
    rows: readonly FinishAdvantageOpenOutcomeRow[],
): FinishAdvantageOpenAbsoluteRates => {
    validateArmRows(rows);
    const families = [...new Set(rows.map(({ familyId }) => familyId))].sort();
    const familyRates = Object.fromEntries(families.map((familyId) => [
        familyId,
        absoluteRates(rows.filter((row) => row.familyId === familyId)),
    ]));
    const countryRates = Object.fromEntries(FINISH_ADVANTAGE_OPEN_CAUSAL_SCREEN_COUNTRIES.map((country) => [
        country,
        absoluteRates(rows.filter((row) => row.country === country)),
    ]));
    const factionRates = Object.fromEntries(([true, false] as const).map((allied) => [
        allied ? "allied" : "soviet",
        absoluteRates(rows.filter((row) => ALLIED.has(row.country) === allied)),
    ])) as FinishAdvantageOpenAbsoluteRates["factionRates"];
    const slotRates = Object.fromEntries(([0, 1] as const).map((candidateSlot) => [
        String(candidateSlot),
        absoluteRates(rows.filter((row) => row.candidateSlot === candidateSlot)),
    ])) as FinishAdvantageOpenAbsoluteRates["slotRates"];
    const overall = absoluteRates(rows);
    const literalWinFamilyValues = families.map((familyId) => familyRates[familyId].literalWinRate);
    const drawFamilyValues = families.map((familyId) => familyRates[familyId].drawRate);
    const literalWinFamilyClusterSd = sampleSd(literalWinFamilyValues);
    const literalWinFamilyClusterSe = literalWinFamilyClusterSd / Math.sqrt(families.length);
    const drawFamilyClusterSd = sampleSd(drawFamilyValues);
    const drawFamilyClusterSe = drawFamilyClusterSd / Math.sqrt(families.length);
    return {
        ...overall,
        familyRates,
        countryRates,
        factionRates,
        slotRates,
        literalWinFamilyClusterSd,
        literalWinFamilyClusterSe,
        oneSided80LiteralWinLower: overall.literalWinRate -
            FINISH_ADVANTAGE_OPEN_CAUSAL_SCREEN_T80_DF9 * literalWinFamilyClusterSe,
        drawFamilyClusterSd,
        drawFamilyClusterSe,
        oneSided80DrawUpper: overall.drawRate +
            FINISH_ADVANTAGE_OPEN_CAUSAL_SCREEN_T80_DF9 * drawFamilyClusterSe,
    };
};

export type FinishAdvantagePairedComparison = {
    comparatorArmId: FinishAdvantageOpenArmId;
    effect: number;
    familyEffects: Record<string, number>;
    familyClusterSd: number;
    familyClusterSe: number;
    oneSided80Lower: number;
    leaveOneFamilyOutEffects: Record<string, number>;
    minimumLeaveOneFamilyOutEffect: number;
    countryEffects: Record<string, number>;
    slotEffects: Record<"0" | "1", number>;
    positiveCountryCount: number;
    positiveFamilyCount: number;
    alliedEffect: number;
    sovietEffect: number;
    transitions: {
        drawToWin: number;
        lossToDraw: number;
        lossToWin: number;
        winToDraw: number;
        winToLoss: number;
    };
    armCounts: ReturnType<typeof outcomeCounts>;
    comparatorCounts: ReturnType<typeof outcomeCounts>;
};

const cellKey = (row: Pick<FinishAdvantageOpenOutcomeRow, "familyId" | "country" | "candidateSlot">) =>
    `${row.familyId}|${row.country}|${row.candidateSlot}`;

const validateArmRows = (
    rows: readonly FinishAdvantageOpenOutcomeRow[],
    expectedArmId?: FinishAdvantageOpenArmId,
): FinishAdvantageOpenArmId => {
    if (rows.length !== 180) throw new Error("Open causal-screen arm requires exactly 180 rows");
    const armIds = new Set(rows.map(({ armId }) => armId));
    if (armIds.size !== 1) throw new Error("Open causal-screen rows mix arm identities");
    const armId = [...armIds][0];
    if (expectedArmId !== undefined && armId !== expectedArmId) {
        throw new Error(`Open causal-screen arm identity mismatch: expected ${expectedArmId}, received ${armId}`);
    }
    const countrySet = new Set(FINISH_ADVANTAGE_OPEN_CAUSAL_SCREEN_COUNTRIES);
    if (rows.some((row) =>
        !row.familyId || !countrySet.has(row.country) ||
        (row.candidateSlot !== 0 && row.candidateSlot !== 1) ||
        !["win", "draw", "loss"].includes(row.outcome) ||
        typeof row.nonterminalDraw !== "boolean" ||
        row.nonterminalDraw && row.outcome !== "draw"
    )) throw new Error("Open causal-screen row has an invalid family, country, slot, or outcome");
    const keys = new Set(rows.map(cellKey));
    if (keys.size !== 180) throw new Error("Open causal-screen arm has duplicate cells");
    const families = [...new Set(rows.map(({ familyId }) => familyId))];
    if (families.length !== 10) throw new Error("Open causal-screen arm requires ten families");
    for (const familyId of families) {
        const familyRows = rows.filter((row) => row.familyId === familyId);
        if (
            familyRows.length !== 18 ||
            new Set(familyRows.map(({ country }) => country)).size !== 9 ||
            new Set(familyRows.map(({ candidateSlot }) => candidateSlot)).size !== 2
        ) throw new Error(`Open causal-screen family ${familyId} lacks the exact country-slot grid`);
    }
    return armId;
};

export const compareFinishAdvantageOpenArms = (
    candidateRows: readonly FinishAdvantageOpenOutcomeRow[],
    comparatorRows: readonly FinishAdvantageOpenOutcomeRow[],
    comparatorArmId: FinishAdvantageOpenArmId,
): FinishAdvantagePairedComparison => {
    validateArmRows(candidateRows);
    validateArmRows(comparatorRows, comparatorArmId);
    const comparator = new Map(comparatorRows.map((row) => [cellKey(row), row]));
    if (comparator.size !== 180) throw new Error("Comparator has duplicate cells");
    const pairs = candidateRows.map((candidate) => {
        const control = comparator.get(cellKey(candidate));
        if (!control) throw new Error(`Comparator lacks cell ${cellKey(candidate)}`);
        return { candidate, comparator: control, difference: score(candidate.outcome) - score(control.outcome) };
    });
    const families = [...new Set(candidateRows.map(({ familyId }) => familyId))].sort();
    if (families.length !== 10) throw new Error("Open causal-screen comparison requires ten families");
    const familyEffects = Object.fromEntries(families.map((familyId) => [
        familyId,
        mean(pairs.filter(({ candidate }) => candidate.familyId === familyId).map(({ difference }) => difference)),
    ]));
    const familyValues = families.map((familyId) => familyEffects[familyId]);
    const effect = mean(familyValues);
    const familyClusterSd = sampleSd(familyValues);
    const familyClusterSe = familyClusterSd / Math.sqrt(familyValues.length);
    const oneSided80Lower = effect - FINISH_ADVANTAGE_OPEN_CAUSAL_SCREEN_T80_DF9 * familyClusterSe;
    const leaveOneFamilyOutEffects = Object.fromEntries(families.map((leftOut) => [
        leftOut,
        mean(families.filter((familyId) => familyId !== leftOut).map((familyId) => familyEffects[familyId])),
    ]));
    const countries = FINISH_ADVANTAGE_OPEN_CAUSAL_SCREEN_COUNTRIES;
    const countryEffects = Object.fromEntries(countries.map((country) => [
        country,
        mean(pairs.filter(({ candidate }) => candidate.country === country).map(({ difference }) => difference)),
    ]));
    const slotEffects = Object.fromEntries(([0, 1] as const).map((candidateSlot) => [
        String(candidateSlot),
        mean(pairs.filter(({ candidate }) => candidate.candidateSlot === candidateSlot)
            .map(({ difference }) => difference)),
    ])) as Record<"0" | "1", number>;
    const factionEffect = (allied: boolean): number => mean(pairs.filter(({ candidate }) =>
        ALLIED.has(candidate.country) === allied,
    ).map(({ difference }) => difference));
    const transitions = {
        drawToWin: pairs.filter(({ candidate, comparator: control }) =>
            control.outcome === "draw" && candidate.outcome === "win").length,
        lossToDraw: pairs.filter(({ candidate, comparator: control }) =>
            control.outcome === "loss" && candidate.outcome === "draw").length,
        lossToWin: pairs.filter(({ candidate, comparator: control }) =>
            control.outcome === "loss" && candidate.outcome === "win").length,
        winToDraw: pairs.filter(({ candidate, comparator: control }) =>
            control.outcome === "win" && candidate.outcome === "draw").length,
        winToLoss: pairs.filter(({ candidate, comparator: control }) =>
            control.outcome === "win" && candidate.outcome === "loss").length,
    };
    return {
        comparatorArmId,
        effect,
        familyEffects,
        familyClusterSd,
        familyClusterSe,
        oneSided80Lower,
        leaveOneFamilyOutEffects,
        minimumLeaveOneFamilyOutEffect: Math.min(...Object.values(leaveOneFamilyOutEffects)),
        countryEffects,
        slotEffects,
        positiveCountryCount: Object.values(countryEffects).filter((value) => value > 0).length,
        positiveFamilyCount: familyValues.filter((value) => value > 0).length,
        alliedEffect: factionEffect(true),
        sovietEffect: factionEffect(false),
        transitions,
        armCounts: outcomeCounts(candidateRows),
        comparatorCounts: outcomeCounts(comparatorRows),
    };
};

export type FinishAdvantageOpenCandidateEvaluation = {
    arm: FinishAdvantageOpenArm;
    absolute: FinishAdvantageOpenAbsoluteRates;
    versusSupalosa: FinishAdvantagePairedComparison;
    versusV5: FinishAdvantagePairedComparison;
    mechanismValidationErrors: string[];
    eligibilityFailures: string[];
    eligible: boolean;
};

const comparisonFailures = (
    comparison: FinishAdvantagePairedComparison,
    label: "Supalosa" | "V5",
): string[] => {
    const failures: string[] = [];
    if (!(comparison.oneSided80Lower > 0)) failures.push(`${label} family-clustered lower bound is not positive`);
    if (!(comparison.armCounts.wins > comparison.comparatorCounts.wins)) {
        failures.push(`${label} literal wins did not strictly increase`);
    }
    if (!(comparison.armCounts.draws < comparison.comparatorCounts.draws)) {
        failures.push(`${label} draws did not strictly decrease`);
    }
    if (!(comparison.alliedEffect > 0) || !(comparison.sovietEffect > 0)) {
        failures.push(`${label} does not improve both factions`);
    }
    if (comparison.positiveCountryCount < 6) failures.push(`${label} improves fewer than six countries`);
    if (comparison.positiveFamilyCount < 6) failures.push(`${label} improves fewer than six families`);
    if (!(comparison.minimumLeaveOneFamilyOutEffect > 0)) {
        failures.push(`${label} minimum leave-one-family-out effect is not positive`);
    }
    return failures;
};

export const evaluateFinishAdvantageOpenCandidate = (
    arm: FinishAdvantageOpenArm,
    candidateRows: readonly FinishAdvantageOpenOutcomeRow[],
    supalosaRows: readonly FinishAdvantageOpenOutcomeRow[],
    v5Rows: readonly FinishAdvantageOpenOutcomeRow[],
    mechanismValidationErrors: readonly string[],
): FinishAdvantageOpenCandidateEvaluation => {
    if (arm.kind === "control" || arm.kind === "v5") throw new Error("Comparator arm cannot be a candidate");
    validateArmRows(candidateRows, arm.armId);
    validateArmRows(supalosaRows, "external_supalosa_control");
    validateArmRows(v5Rows, "visibility_aware_final_building_v5");
    const versusSupalosa = compareFinishAdvantageOpenArms(
        candidateRows, supalosaRows, "external_supalosa_control",
    );
    const versusV5 = compareFinishAdvantageOpenArms(
        candidateRows, v5Rows, "visibility_aware_final_building_v5",
    );
    const absolute = summarizeFinishAdvantageOpenAbsoluteRates(candidateRows);
    const eligibilityFailures = [
        ...comparisonFailures(versusSupalosa, "Supalosa"),
        ...comparisonFailures(versusV5, "V5"),
    ];
    if (!(absolute.oneSided80LiteralWinLower > 0.50)) {
        eligibilityFailures.push("Absolute family-clustered literal-win lower bound is not above 0.50");
    }
    if (!(absolute.oneSided80DrawUpper < 0.25)) {
        eligibilityFailures.push("Absolute family-clustered draw upper bound is not below 0.25");
    }
    if (!(absolute.nonterminalDrawRate < 0.10)) {
        eligibilityFailures.push("Nonterminal draw rate is not below 0.10");
    }
    if (versusV5.transitions.winToDraw > 0 || versusV5.transitions.winToLoss > 0) {
        eligibilityFailures.push("V5 win-to-nonwin regression occurred");
    }
    if (versusV5.transitions.drawToWin < 1) eligibilityFailures.push("No V5 draw-to-win conversion occurred");
    if (mechanismValidationErrors.length > 0) eligibilityFailures.push("Mechanism validation failed");
    return {
        arm,
        absolute,
        versusSupalosa,
        versusV5,
        mechanismValidationErrors: mechanismValidationErrors.slice(),
        eligibilityFailures,
        eligible: eligibilityFailures.length === 0,
    };
};

const safetyRank = (arm: FinishAdvantageOpenArm): number =>
    arm.kind === "base_race" ? 1_001 :
        arm.kind === "irreversible" ? 1_000 : arm.margin ?? Number.NEGATIVE_INFINITY;

export const selectFinishAdvantageOpenCandidate = (
    evaluations: readonly FinishAdvantageOpenCandidateEvaluation[],
): FinishAdvantageOpenCandidateEvaluation | null => evaluations.filter(({ eligible }) => eligible)
    .slice().sort((left, right) => {
        const leftMinLower = Math.min(left.versusSupalosa.oneSided80Lower, left.versusV5.oneSided80Lower);
        const rightMinLower = Math.min(right.versusSupalosa.oneSided80Lower, right.versusV5.oneSided80Lower);
        const leftMinLofo = Math.min(
            left.versusSupalosa.minimumLeaveOneFamilyOutEffect,
            left.versusV5.minimumLeaveOneFamilyOutEffect,
        );
        const rightMinLofo = Math.min(
            right.versusSupalosa.minimumLeaveOneFamilyOutEffect,
            right.versusV5.minimumLeaveOneFamilyOutEffect,
        );
        const leftWinGain = left.versusV5.armCounts.wins - left.versusV5.comparatorCounts.wins;
        const rightWinGain = right.versusV5.armCounts.wins - right.versusV5.comparatorCounts.wins;
        return rightMinLower - leftMinLower ||
            rightMinLofo - leftMinLofo ||
            rightWinGain - leftWinGain ||
            left.versusV5.armCounts.losses - right.versusV5.armCounts.losses ||
            safetyRank(right.arm) - safetyRank(left.arm) ||
            left.arm.armId.localeCompare(right.arm.armId);
    })[0] ?? null;
