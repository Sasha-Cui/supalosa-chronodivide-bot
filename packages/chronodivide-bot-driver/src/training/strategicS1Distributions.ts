import { finite, natural, S1_POSITIVE_INFINITY, S1WeaponSpeed } from "./strategicS1Observation.js";
export type S1ValueDomain = "finite" | "finite_or_positive_infinity";
const speedKeys = ["candidate", "baseline"].flatMap((side) =>
    ["primaryWeapon", "secondaryWeapon"].map((slot) => side + ".unit." + slot + ".speed"),
);
export const s1MetricValueDomain = (key: string): S1ValueDomain =>
    speedKeys.includes(key) ? "finite_or_positive_infinity" : "finite";
export type S1MetricDefinition = {
    key: string;
    unit: string;
    basis: "sample" | "unit" | "mission" | "window" | "episode";
    absent: "zero" | "no_observations";
    valueDomain: S1ValueDomain;
};
export class S1Distribution {
    private values = new Map<S1WeaponSpeed, number>();
    constructor(private readonly valueDomain: S1ValueDomain = "finite") {}
    private missing = new Map<string, number>();
    add(value: S1WeaponSpeed | null, reason = "not_exposed", count = 1): void {
        natural(count);
        if (!count) return;
        if (value === null) {
            if (!reason.length) throw new Error("S1 distribution missing reason");
            this.missing.set(reason, natural((this.missing.get(reason) ?? 0) + count));
        } else {
            if (value === S1_POSITIVE_INFINITY) {
                if (this.valueDomain !== "finite_or_positive_infinity")
                    throw new Error("S1 infinity outside speed domain");
            } else finite(value);
            this.values.set(value, natural((this.values.get(value) ?? 0) + count));
        }
    }
    finish() {
        const frequencies = [...this.values]
            .sort(([a], [b]) =>
                a === b ? 0 : a === S1_POSITIVE_INFINITY ? 1 : b === S1_POSITIVE_INFINITY ? -1 : a - b,
            )
            .map(([value, count]) => ({ value, count }));
        const observed = natural(frequencies.reduce((n, v) => n + v.count, 0));
        const unavailable = natural([...this.missing.values()].reduce((n, v) => n + v, 0));
        const quantile = (q: number): S1WeaponSpeed | null => {
            if (!observed) return null;
            const rank = Math.min(observed - 1, Math.floor(q * observed));
            let seen = 0;
            for (const row of frequencies) {
                seen += row.count;
                if (seen > rank) return row.value;
            }
            throw new Error("S1 quantile population");
        };
        const sum: S1WeaponSpeed = frequencies.some((row) => row.value === S1_POSITIVE_INFINITY)
            ? S1_POSITIVE_INFINITY
            : finite(frequencies.reduce((n, row) => n + Number(row.value) * row.count, 0));
        return {
            coverage: {
                eligible: natural(observed + unavailable),
                observed,
                unavailable,
                missingReasons: Object.fromEntries([...this.missing].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))),
                emptyReason: observed + unavailable === 0 ? "no_observations_in_this_domain" : null,
            },
            distribution: observed
                ? {
                      n: observed,
                      sum,
                      min: frequencies[0].value,
                      p10: quantile(0.1)!,
                      median: quantile(0.5)!,
                      p90: quantile(0.9)!,
                      max: frequencies[frequencies.length - 1].value,
                      mean: sum === S1_POSITIVE_INFINITY ? S1_POSITIVE_INFINITY : finite(sum / observed),
                      frequencies,
                  }
                : null,
        };
    }
}
export type S1MetricRow = { key: string } & ReturnType<S1Distribution["finish"]>;
export class S1Metrics {
    readonly definitions = new Map<string, S1MetricDefinition>();
    private series = new Map<string, S1Distribution>();
    register(
        key: string,
        unit: string,
        basis: S1MetricDefinition["basis"],
        absent: S1MetricDefinition["absent"] = "no_observations",
    ): void {
        const valueDomain = s1MetricValueDomain(key);
        const definition = { key, unit, basis, absent, valueDomain };
        const old = this.definitions.get(key);
        if (old && JSON.stringify(old) !== JSON.stringify(definition))
            throw new Error("S1 metric definition drift " + key);
        if (!old) {
            this.definitions.set(key, definition);
            this.series.set(key, new S1Distribution(valueDomain));
        }
    }
    add(
        key: string,
        value: S1WeaponSpeed | null,
        unit: string,
        basis: S1MetricDefinition["basis"],
        absent: S1MetricDefinition["absent"] = "no_observations",
        reason = "not_exposed",
    ): void {
        this.register(key, unit, basis, absent);
        this.series.get(key)!.add(value, reason);
    }
    finish(samples: number): S1MetricRow[] {
        return [...this.series]
            .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
            .map(([key, values]) => {
                const d = this.definitions.get(key)!;
                if (d.absent === "zero") {
                    const seen = values.finish().coverage.eligible;
                    if (d.basis !== "sample" || seen > samples) throw new Error("S1 zero-fill denominator");
                    values.add(0, "", samples - seen);
                }
                return { key, ...values.finish() };
            });
    }
}
export function mergeS1Distributions(rows: S1MetricRow[], valueDomain: S1ValueDomain = "finite") {
    const pooled = new S1Distribution(valueDomain),
        equalCaseMeans = new S1Distribution(valueDomain);
    for (const row of rows) {
        for (const f of row.distribution?.frequencies ?? []) pooled.add(f.value, "", f.count);
        for (const [reason, count] of Object.entries(row.coverage.missingReasons)) pooled.add(null, reason, count);
        equalCaseMeans.add(row.distribution?.mean ?? null, "case_has_no_observed_values");
    }
    return { ...pooled.finish(), equalCaseMeans: equalCaseMeans.finish() };
}
