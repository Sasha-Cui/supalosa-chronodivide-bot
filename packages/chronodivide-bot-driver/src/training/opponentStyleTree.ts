export type OpponentStyleLabel = "supalosa" | "advanced";

export type OpponentStyleExample = {
    features: Record<string, number>;
    label: OpponentStyleLabel;
    country: string;
    start: string;
    slot: 0 | 1;
};

export type OpponentStyleTree =
    | { kind: "leaf"; label: OpponentStyleLabel; sampleCount: number }
    | { kind: "split"; feature: string; threshold: number; sampleCount: number;
        left: OpponentStyleTree; right: OpponentStyleTree };

export type OpponentStyleMetrics = {
    games: number;
    correct: number;
    accuracy: number;
    balancedAccuracy: number;
    oneSided95WilsonLower: number;
    recall: Record<OpponentStyleLabel, number>;
    confusion: Record<OpponentStyleLabel, Record<OpponentStyleLabel, number>>;
};

const LABELS: readonly OpponentStyleLabel[] = ["supalosa", "advanced"];
const PROHIBITED_FEATURE =
    /(^|[.:_])(country|start|slot|seed|scheduler|bundle|build_id|source|class|identity|action|queue|winner|score|outcome|terminal)([.:_]|$)/i;

export const validateOpponentStyleFeatures = (features: Record<string, number>): void => {
    const keys = Object.keys(features);
    if (keys.length === 0 || keys.some((key) => PROHIBITED_FEATURE.test(key))) {
        throw new Error("Opponent-style feature schema is empty or contains prohibited metadata");
    }
    for (const [key, value] of Object.entries(features)) {
        if (!key || typeof value !== "number" || !Number.isFinite(value)) {
            throw new Error("Opponent-style features must be finite numeric values");
        }
    }
};

const featureValue = (example: OpponentStyleExample, feature: string): number => example.features[feature] ?? 0;

const leafFor = (examples: readonly OpponentStyleExample[]): OpponentStyleTree => {
    const counts = Object.fromEntries(LABELS.map((label) =>
        [label, examples.filter((example) => example.label === label).length])) as Record<OpponentStyleLabel, number>;
    const label = counts.supalosa >= counts.advanced ? "supalosa" : "advanced";
    return { kind: "leaf", label, sampleCount: examples.length };
};

export const predictOpponentStyle = (tree: OpponentStyleTree,
    features: Record<string, number>): OpponentStyleLabel => {
    validateOpponentStyleFeatures(features);
    let node = tree;
    while (node.kind === "split") {
        node = (features[node.feature] ?? 0) <= node.threshold ? node.left : node.right;
    }
    return node.label;
};

const wilsonLower = (successes: number, games: number): number => {
    if (games === 0) return 0;
    const z = 1.6448536269514722, p = successes / games, z2 = z * z;
    return (p + z2 / (2 * games) - z * Math.sqrt(p * (1 - p) / games + z2 / (4 * games * games))) /
        (1 + z2 / games);
};

export const evaluateOpponentStylePredictions = (labels: readonly OpponentStyleLabel[],
    predictions: readonly OpponentStyleLabel[]): OpponentStyleMetrics => {
    if (labels.length === 0 || labels.length !== predictions.length) {
        throw new Error("Opponent-style evaluation coverage is invalid");
    }
    const confusion = {
        supalosa: { supalosa: 0, advanced: 0 },
        advanced: { supalosa: 0, advanced: 0 },
    };
    labels.forEach((label, index) => { confusion[label][predictions[index]] += 1; });
    const correct = confusion.supalosa.supalosa + confusion.advanced.advanced;
    const recall = Object.fromEntries(LABELS.map((label) => {
        const total = confusion[label].supalosa + confusion[label].advanced;
        return [label, total === 0 ? 0 : confusion[label][label] / total];
    })) as Record<OpponentStyleLabel, number>;
    return { games: labels.length, correct, accuracy: correct / labels.length,
        balancedAccuracy: (recall.supalosa + recall.advanced) / 2,
        oneSided95WilsonLower: wilsonLower(correct, labels.length), recall, confusion };
};

const treeDepth = (tree: OpponentStyleTree): number => tree.kind === "leaf" ? 0 :
    1 + Math.max(treeDepth(tree.left), treeDepth(tree.right));
const leafCount = (tree: OpponentStyleTree): number => tree.kind === "leaf" ? 1 :
    leafCount(tree.left) + leafCount(tree.right);
export const serializeOpponentStyleTree = (tree: OpponentStyleTree): string => JSON.stringify(tree);

type Candidate = { tree: OpponentStyleTree; metrics: OpponentStyleMetrics; feature: string; threshold: number };
const candidateBetter = (left: Candidate, right: Candidate): boolean => {
    const epsilon = 1e-12;
    if (Math.abs(left.metrics.balancedAccuracy - right.metrics.balancedAccuracy) > epsilon) {
        return left.metrics.balancedAccuracy > right.metrics.balancedAccuracy;
    }
    if (Math.abs(left.metrics.accuracy - right.metrics.accuracy) > epsilon) {
        return left.metrics.accuracy > right.metrics.accuracy;
    }
    if (leafCount(left.tree) !== leafCount(right.tree)) return leafCount(left.tree) < leafCount(right.tree);
    if (treeDepth(left.tree) !== treeDepth(right.tree)) return treeDepth(left.tree) < treeDepth(right.tree);
    if (left.feature !== right.feature) return left.feature < right.feature;
    if (left.threshold !== right.threshold) return left.threshold < right.threshold;
    return serializeOpponentStyleTree(left.tree) < serializeOpponentStyleTree(right.tree);
};

const metricsForTree = (tree: OpponentStyleTree, examples: readonly OpponentStyleExample[]) =>
    evaluateOpponentStylePredictions(examples.map((example) => example.label),
        examples.map((example) => predictOpponentStyle(tree, example.features)));

const fitNode = (examples: readonly OpponentStyleExample[], depthRemaining: number,
    minLeaf: number): OpponentStyleTree => {
    const leaf = leafFor(examples);
    let best: Candidate = { tree: leaf, metrics: metricsForTree(leaf, examples), feature: "", threshold: 0 };
    if (depthRemaining === 0 || examples.length < minLeaf * 2 || best.metrics.balancedAccuracy === 1) return leaf;
    const features = [...new Set(examples.flatMap((example) => Object.keys(example.features)))].sort();
    for (const feature of features) {
        const values = [...new Set(examples.map((example) => featureValue(example, feature)))].sort((a, b) => a - b);
        for (let index = 0; index + 1 < values.length; index += 1) {
            const threshold = values[index] + (values[index + 1] - values[index]) / 2;
            const leftExamples = examples.filter((example) => featureValue(example, feature) <= threshold);
            const rightExamples = examples.filter((example) => featureValue(example, feature) > threshold);
            if (leftExamples.length < minLeaf || rightExamples.length < minLeaf) continue;
            const tree: OpponentStyleTree = { kind: "split", feature, threshold, sampleCount: examples.length,
                left: leafFor(leftExamples), right: leafFor(rightExamples) };
            const candidate: Candidate = { tree, metrics: metricsForTree(tree, examples), feature, threshold };
            if (candidateBetter(candidate, best)) best = candidate;
        }
    }
    if (best.tree.kind === "leaf") return leaf;
    const leftExamples = examples.filter((example) => featureValue(example, best.feature) <= best.threshold);
    const rightExamples = examples.filter((example) => featureValue(example, best.feature) > best.threshold);
    const refined: OpponentStyleTree = { ...best.tree,
        left: fitNode(leftExamples, depthRemaining - 1, minLeaf),
        right: fitNode(rightExamples, depthRemaining - 1, minLeaf) };
    const refinedCandidate: Candidate = { tree: refined, metrics: metricsForTree(refined, examples),
        feature: best.feature, threshold: best.threshold };
    return candidateBetter(refinedCandidate, best) ? refined : best.tree;
};

export const fitOpponentStyleTree = (examples: readonly OpponentStyleExample[],
    maxDepth = 3, minLeaf = 5): OpponentStyleTree => {
    if (examples.length < minLeaf * 2 || maxDepth < 1 || maxDepth > 3) {
        throw new Error("Opponent-style training configuration is invalid");
    }
    examples.forEach((example) => validateOpponentStyleFeatures(example.features));
    if (new Set(examples.map((example) => example.label)).size !== 2) {
        throw new Error("Opponent-style training requires both labels");
    }
    return fitNode(examples, maxDepth, minLeaf);
};

export type GroupedCrossValidation = {
    groupKind: "country" | "start" | "slot";
    groupCount: number;
    metrics: OpponentStyleMetrics;
    foldTrees: Array<{ heldOutGroup: string; tree: OpponentStyleTree }>;
};

export const groupedOpponentStyleCrossValidation = (examples: readonly OpponentStyleExample[],
    groupKind: GroupedCrossValidation["groupKind"]): GroupedCrossValidation => {
    const groupOf = (example: OpponentStyleExample): string => groupKind === "country" ? example.country :
        groupKind === "start" ? example.start : String(example.slot);
    const groups = [...new Set(examples.map(groupOf))].sort();
    const labels: OpponentStyleLabel[] = [], predictions: OpponentStyleLabel[] = [];
    const foldTrees: GroupedCrossValidation["foldTrees"] = [];
    for (const heldOutGroup of groups) {
        const training = examples.filter((example) => groupOf(example) !== heldOutGroup);
        const testing = examples.filter((example) => groupOf(example) === heldOutGroup);
        const tree = fitOpponentStyleTree(training);
        foldTrees.push({ heldOutGroup, tree });
        for (const example of testing) {
            labels.push(example.label); predictions.push(predictOpponentStyle(tree, example.features));
        }
    }
    return { groupKind, groupCount: groups.length,
        metrics: evaluateOpponentStylePredictions(labels, predictions), foldTrees };
};

export const opponentStyleTreeStats = (tree: OpponentStyleTree) => ({
    depth: treeDepth(tree),
    leaves: leafCount(tree),
    serialization: serializeOpponentStyleTree(tree),
});
