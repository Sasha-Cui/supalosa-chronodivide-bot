import { ResearchPlanPolicy } from "./researchPlanRunner.js";

export const RESEARCH_SELECTOR_SCHEMA_VERSION = 1 as const;
export const RESEARCH_SELECTOR_RIDGE_LAMBDA = 1 as const;
export const RESEARCH_SELECTOR_SWITCH_MARGIN = 0.02 as const;
export const RESEARCH_SELECTOR_FEATURES = ["logArea", "absLogAspect", "logStartCount"] as const;

export type ResearchStructuralDescriptors = {
    area: number;
    width: number;
    height: number;
    startCount: number;
};

export type ResearchSelectorTrainingRow = {
    familyId: string;
    descriptors: ResearchStructuralDescriptors;
    policyUtilities: Record<string, number>;
};

export type ResearchSelectorModel = {
    schemaVersion: typeof RESEARCH_SELECTOR_SCHEMA_VERSION;
    featureNames: typeof RESEARCH_SELECTOR_FEATURES;
    ridgeLambda: typeof RESEARCH_SELECTOR_RIDGE_LAMBDA;
    switchMargin: typeof RESEARCH_SELECTOR_SWITCH_MARGIN;
    featureMeans: [number, number, number];
    featureScales: [number, number, number];
    globalPolicyId: string;
    globalPolicyUtilities: Array<{ policyId: string; macroUtility: number; worstFamilyUtility: number }>;
    policyModels: Array<{
        policyId: string;
        coefficients: [number, number, number, number];
    }>;
};

const mean = (values: number[]): number => values.reduce((total, value) => total + value, 0) / values.length;

const expectPositive = (label: string, value: number): number => {
    if (!Number.isFinite(value) || value <= 0) {
        throw new Error(`${label} must be a positive finite number`);
    }
    return value;
};

export const structuralFeatureVector = (descriptors: ResearchStructuralDescriptors): [number, number, number] => {
    const area = expectPositive("area", descriptors.area);
    const width = expectPositive("width", descriptors.width);
    const height = expectPositive("height", descriptors.height);
    const startCount = expectPositive("startCount", descriptors.startCount);
    if (!Number.isSafeInteger(startCount)) {
        throw new Error("startCount must be a positive integer");
    }
    return [Math.log(area), Math.abs(Math.log(width / height)), Math.log(startCount)];
};

const solveLinearSystem = (matrix: number[][], vector: number[]): number[] => {
    const size = vector.length;
    if (matrix.length !== size || matrix.some((row) => row.length !== size)) {
        throw new Error("Ridge normal equation has inconsistent dimensions");
    }
    const augmented = matrix.map((row, index) => [...row, vector[index]]);
    for (let column = 0; column < size; column++) {
        let pivot = column;
        for (let row = column + 1; row < size; row++) {
            if (Math.abs(augmented[row][column]) > Math.abs(augmented[pivot][column])) {
                pivot = row;
            }
        }
        if (Math.abs(augmented[pivot][column]) < 1e-12) {
            throw new Error("Ridge normal equation is singular");
        }
        [augmented[column], augmented[pivot]] = [augmented[pivot], augmented[column]];
        const pivotValue = augmented[column][column];
        for (let valueIndex = column; valueIndex <= size; valueIndex++) {
            augmented[column][valueIndex] /= pivotValue;
        }
        for (let row = 0; row < size; row++) {
            if (row === column) {
                continue;
            }
            const factor = augmented[row][column];
            for (let valueIndex = column; valueIndex <= size; valueIndex++) {
                augmented[row][valueIndex] -= factor * augmented[column][valueIndex];
            }
        }
    }
    return augmented.map((row) => row[size]);
};

const fitRidge = (features: number[][], targets: number[]): [number, number, number, number] => {
    const columns = 4;
    const normal = Array.from({ length: columns }, () => Array.from({ length: columns }, () => 0));
    const projected = Array.from({ length: columns }, () => 0);
    for (let row = 0; row < features.length; row++) {
        const x = [1, ...features[row]];
        for (let left = 0; left < columns; left++) {
            projected[left] += x[left] * targets[row];
            for (let right = 0; right < columns; right++) {
                normal[left][right] += x[left] * x[right];
            }
        }
    }
    for (let column = 1; column < columns; column++) {
        normal[column][column] += RESEARCH_SELECTOR_RIDGE_LAMBDA;
    }
    return solveLinearSystem(normal, projected) as [number, number, number, number];
};

/**
 * Fit one fixed-lambda ridge response surface per finalist. The global baseline
 * and every response surface use the same family-level utilities.
 */
export const fitResearchSelector = (
    policies: ResearchPlanPolicy[],
    rows: ResearchSelectorTrainingRow[],
): ResearchSelectorModel => {
    if (policies.length < 2) {
        throw new Error("Research selector requires at least two finalist policies");
    }
    if (rows.length < 8) {
        throw new Error("Research selector requires at least eight training families");
    }
    const policyIds = policies.map(({ policyId }) => policyId);
    if (new Set(policyIds).size !== policyIds.length || new Set(rows.map(({ familyId }) => familyId)).size !== rows.length) {
        throw new Error("Research selector policies and training families must be unique");
    }
    for (const row of rows) {
        const utilityKeys = Object.keys(row.policyUtilities).sort();
        if (
            utilityKeys.length !== policyIds.length ||
            utilityKeys.some((policyId, index) => policyId !== [...policyIds].sort()[index]) ||
            Object.values(row.policyUtilities).some((value) => !Number.isFinite(value))
        ) {
            throw new Error(`Training family ${row.familyId} lacks one finite utility for every finalist`);
        }
    }
    const rawFeatures = rows.map(({ descriptors }) => structuralFeatureVector(descriptors));
    const featureMeans = RESEARCH_SELECTOR_FEATURES.map((_, feature) => mean(rawFeatures.map((row) => row[feature]))) as [
        number,
        number,
        number,
    ];
    const featureScales = RESEARCH_SELECTOR_FEATURES.map((_, feature) => {
        const variance = mean(rawFeatures.map((row) => (row[feature] - featureMeans[feature]) ** 2));
        if (variance <= 0) {
            throw new Error(`Research selector feature ${RESEARCH_SELECTOR_FEATURES[feature]} has zero variance`);
        }
        return Math.sqrt(variance);
    }) as [number, number, number];
    const features = rawFeatures.map((row) => row.map(
        (value, feature) => (value - featureMeans[feature]) / featureScales[feature],
    ));
    const globalPolicyUtilities = policyIds.map((policyId) => {
        const values = rows.map(({ policyUtilities }) => policyUtilities[policyId]);
        return {
            policyId,
            macroUtility: mean(values),
            worstFamilyUtility: Math.min(...values),
        };
    }).sort((left, right) =>
        right.macroUtility - left.macroUtility ||
        right.worstFamilyUtility - left.worstFamilyUtility ||
        left.policyId.localeCompare(right.policyId),
    );
    const policyModels = policyIds.map((policyId) => ({
        policyId,
        coefficients: fitRidge(features, rows.map(({ policyUtilities }) => policyUtilities[policyId])),
    }));
    return {
        schemaVersion: RESEARCH_SELECTOR_SCHEMA_VERSION,
        featureNames: RESEARCH_SELECTOR_FEATURES,
        ridgeLambda: RESEARCH_SELECTOR_RIDGE_LAMBDA,
        switchMargin: RESEARCH_SELECTOR_SWITCH_MARGIN,
        featureMeans,
        featureScales,
        globalPolicyId: globalPolicyUtilities[0].policyId,
        globalPolicyUtilities,
        policyModels,
    };
};

export const predictResearchPolicyUtilities = (
    model: ResearchSelectorModel,
    descriptors: ResearchStructuralDescriptors,
): Array<{ policyId: string; predictedUtility: number }> => {
    if (
        model.schemaVersion !== RESEARCH_SELECTOR_SCHEMA_VERSION ||
        model.ridgeLambda !== RESEARCH_SELECTOR_RIDGE_LAMBDA ||
        model.switchMargin !== RESEARCH_SELECTOR_SWITCH_MARGIN ||
        model.featureNames.join("|") !== RESEARCH_SELECTOR_FEATURES.join("|")
    ) {
        throw new Error("Research selector model does not match the frozen v1 interface");
    }
    const raw = structuralFeatureVector(descriptors);
    const features = raw.map((value, index) => (value - model.featureMeans[index]) / model.featureScales[index]);
    return model.policyModels.map(({ policyId, coefficients }) => ({
        policyId,
        predictedUtility: coefficients[0] + features.reduce(
            (total, value, index) => total + value * coefficients[index + 1],
            0,
        ),
    })).sort((left, right) =>
        right.predictedUtility - left.predictedUtility || left.policyId.localeCompare(right.policyId),
    );
};

export const selectConditionedPolicy = (
    model: ResearchSelectorModel,
    descriptors: ResearchStructuralDescriptors,
): { policyId: string; switchedFromGlobal: boolean; predictedMargin: number } => {
    const predictions = predictResearchPolicyUtilities(model, descriptors);
    const global = predictions.find(({ policyId }) => policyId === model.globalPolicyId);
    if (!global) {
        throw new Error("Research selector global policy has no fitted response surface");
    }
    const best = predictions[0];
    const predictedMargin = best.predictedUtility - global.predictedUtility;
    if (best.policyId !== model.globalPolicyId && predictedMargin > RESEARCH_SELECTOR_SWITCH_MARGIN) {
        return { policyId: best.policyId, switchedFromGlobal: true, predictedMargin };
    }
    return { policyId: model.globalPolicyId, switchedFromGlobal: false, predictedMargin };
};
