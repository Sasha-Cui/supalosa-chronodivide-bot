import { S1Sample, S1Unit, S1_ENUMS, S1_SIDES } from "./strategicS1Observation.js";
import { analyzeS1Episode, armedS1, mobileS1 } from "./strategicS1Analysis.js";
import { S1Metrics } from "./strategicS1Distributions.js";
import { FRESH_DUAL_ACTION_METHODS } from "./freshDualStudyInstrumentation.js";

export const S1_SCREENS = ["fundedEmptyVehicleQueue", "idleForce", "dispersedMission", "unopposedCloseout"] as const;
export const S1_TARGET_CATEGORIES = [
    "none",
    "position",
    "missing-object",
    ...["candidate", "baseline", "other", "unowned"].flatMap((side) =>
        ["building", "nonbuilding"].flatMap((type) =>
            ["live", "nonlive", "unknown-health"].map((health) => side + "/" + type + "/" + health),
        ),
    ),
];
const component = (value: unknown) => encodeURIComponent(String(value)).replace(/\./g, "%2E");
const optionalNumber = (value: number | boolean | null) => (value === null ? null : Number(value));
const sum = (values: number[]) => values.reduce((n, v) => n + v, 0);

/** Descriptions of every retained sample, including zero/final snapshots. They are NOT
 * time-weighted averages, causal estimates, income, or calibrated combat strength. */
export function describeS1Episode(samples: S1Sample[], updates: number) {
    const core = analyzeS1Episode(samples, updates),
        metrics = new S1Metrics();
    for (const side of S1_SIDES) {
        for (const key of [
            "health",
            "maxHealth",
            "purchaseValue",
            "x",
            "y",
            "canMove",
            "isIdle",
            "buildStatus",
            "isPoweredOn",
        ])
            metrics.register(
                side + ".unit." + key,
                ["x", "y"].includes(key)
                    ? "tiles"
                    : key === "purchaseValue"
                    ? "purchase_value_not_strength"
                    : "public_value",
                "unit",
            );
        metrics.register(side + ".unit.armed", "boolean", "unit");
        metrics.register(side + ".unit.armedMobileNonharvester", "boolean", "unit");
        for (const slot of ["primaryWeapon", "secondaryWeapon"])
            for (const field of ["minRange", "maxRange", "speed", "cooldownTicks"])
                metrics.register(side + ".unit." + slot + "." + field, "public_weapon_value", "unit");
    }
    for (const [field, unit] of [
        ["priority", "priority"],
        ["active", "boolean"],
        ["sampledAgeLowerBound", "sampled_ticks_lower_bound"],
        ["liveOwnedMembers", "units"],
        ["mobileMembers", "units"],
        ["unknownMobileMembers", "units"],
        ["staleOrOtherOwnerIds", "ids"],
        ["duplicateMembershipOccurrences", "id_occurrences"],
        ["membershipIdOccurrences", "id_occurrences"],
        ["uniqueMembershipIds", "ids"],
        ["knownMobile.distanceP90", "tiles"],
        ["knownMobile.distanceMean", "tiles"],
        ["membershipAdded", "sampled_id_difference_not_transfers"],
        ["membershipRemoved", "sampled_id_difference_not_transfers"],
    ]) {
        metrics.register("candidate.mission." + field, unit, "mission");
    }

    const addSample = (
        key: string,
        value: number | null,
        unit = "count",
        absent: "zero" | "no_observations" = "no_observations",
        reason = "not_exposed",
    ) => metrics.add(key, value, unit, "sample", absent, reason);
    const availability = Object.fromEntries(
        S1_SCREENS.map((k) => [
            k,
            {
                periodicSamples: core.periodicSamples,
                eligibleSamples: 0,
                unavailableSamples: 0,
                reasons: {} as Record<string, number>,
            },
        ]),
    ) as Record<
        (typeof S1_SCREENS)[number],
        {
            periodicSamples: number;
            eligibleSamples: number;
            unavailableSamples: number;
            reasons: Record<string, number>;
        }
    >;
    const membership = new Map(core.membership.map((r) => [r.tick + "/" + r.missionId, r]));
    for (const [index, sample] of samples.entries()) {
        const row = core.rows[index];
        for (const side of S1_SIDES) {
            const p = sample.players[side],
                units = sample.units.filter((u) => u.side === side),
                d = row.sides[side];
            addSample(side + ".credits", p.credits, "credits_snapshot_not_income");
            addSample(side + ".power.total", p.power.total, "power");
            addSample(side + ".power.drain", p.power.drain, "power");
            addSample(side + ".power.low", Number(p.power.isLowPower), "boolean");
            addSample(side + ".defeated", Number(p.defeated), "boolean");
            for (const key of [
                "liveUnits",
                "buildings",
                "armed",
                "unknownArmed",
                "mobile",
                "unknownMobile",
                "idleMobile",
                "unknownIdleMobile",
                "excludedHarvesters",
            ] as const)
                addSample(side + "." + key, d[key]);
            addSample(side + ".idleAllUnits", units.filter((u) => u.isIdle === true).length);
            addSample(side + ".unknownIdleAllUnits", units.filter((u) => u.isIdle === null).length);
            const factories = units.filter((u) => u.type === 2 && ["GAWEAP", "NAWEAP"].includes(u.rulesName));
            addSample(side + ".vehicleFactories.live", factories.length);
            addSample(
                side + ".vehicleFactories.readyPowered",
                factories.filter((u) => u.buildStatus === 1 && u.isPoweredOn === true).length,
            );
            addSample(
                side + ".vehicleFactories.unknownBuildStatus",
                factories.filter((u) => u.buildStatus === null).length,
            );
            addSample(side + ".vehicleFactories.unknownPower", factories.filter((u) => u.isPoweredOn === null).length);
            for (const q of p.queues) {
                const key = side + ".queue." + S1_ENUMS.queue[q.type];
                addSample(key + ".size", q.size);
                addSample(key + ".maxSize", q.maxSize);
                addSample(key + ".items", q.items.length);
                addSample(key + ".quantity", sum(q.items.map((i) => i.quantity)));
                for (const [status, name] of S1_ENUMS.queueStatus.entries())
                    addSample(key + ".status." + name, Number(q.status === status), "boolean");
                const items = new Map<string, number>();
                for (const item of q.items) {
                    const id = key + ".item." + item.rulesType + "." + component(item.rulesName);
                    items.set(id, (items.get(id) ?? 0) + item.quantity);
                }
                for (const [id, n] of items) addSample(id + ".quantity", n, "queued_units", "zero");
            }
            const inventory = (prefix: string, selected: S1Unit[], zero = false) => {
                addSample(prefix + ".count", selected.length, "units", zero ? "zero" : "no_observations");
                addSample(
                    prefix + ".knownPurchaseValue",
                    sum(selected.flatMap((u) => (u.purchaseValue === null ? [] : [u.purchaseValue]))),
                    "known_inventory_subtotal_not_combat_strength",
                    zero ? "zero" : "no_observations",
                );
                addSample(
                    prefix + ".missingPurchaseValue",
                    selected.filter((u) => u.purchaseValue === null).length,
                    "units",
                    zero ? "zero" : "no_observations",
                );
            };
            inventory(side + ".inventory.all", units);
            for (const [type, name] of S1_ENUMS.object.entries())
                inventory(
                    side + ".inventory.type." + name,
                    units.filter((u) => u.type === type),
                );
            const rules = new Map<string, S1Unit[]>();
            for (const u of units) {
                const id = side + ".inventory.rule." + u.type + "." + component(u.rulesName);
                if (!rules.has(id)) rules.set(id, []);
                rules.get(id)!.push(u);
            }
            for (const [key, selected] of rules) inventory(key, selected, true);
            for (const u of units) {
                for (const key of [
                    "health",
                    "maxHealth",
                    "purchaseValue",
                    "x",
                    "y",
                    "canMove",
                    "isIdle",
                    "buildStatus",
                    "isPoweredOn",
                ] as const) {
                    metrics.add(
                        side + ".unit." + key,
                        optionalNumber(u[key]),
                        ["x", "y"].includes(key)
                            ? "tiles"
                            : key === "purchaseValue"
                            ? "purchase_value_not_strength"
                            : "public_value",
                        "unit",
                        "no_observations",
                        "optional_" + key + "_not_exposed",
                    );
                }
                metrics.add(
                    side + ".unit.armed",
                    optionalNumber(armedS1(u)),
                    "boolean",
                    "unit",
                    "no_observations",
                    "runtime_weapon_absent_and_declared_slots_not_known_empty",
                );
                metrics.add(
                    side + ".unit.armedMobileNonharvester",
                    optionalNumber(mobileS1(u)),
                    "boolean",
                    "unit",
                    "no_observations",
                    "armed_or_canMove_not_determined",
                );
                for (const slot of ["primaryWeapon", "secondaryWeapon"] as const)
                    for (const field of ["minRange", "maxRange", "speed", "cooldownTicks"] as const) {
                        metrics.add(
                            side + ".unit." + slot + "." + field,
                            u[slot]?.[field] ?? null,
                            "public_weapon_value",
                            "unit",
                            "no_observations",
                            slot + "_not_exposed_not_proof_of_unarmed",
                        );
                    }
            }
            const calls = (domain: string, keys: readonly string[], values: Record<string, number>) => {
                for (const key of keys) {
                    const n = values[side + "." + key] ?? 0,
                        dt = sample.window.throughTick - Math.max(0, sample.window.afterTick);
                    metrics.add(side + "." + domain + "." + key, n, "calls_per_window", "window");
                    metrics.add(
                        side + "." + domain + "." + key + ".perObservedUpdate",
                        dt ? n / dt : null,
                        "calls_per_update",
                        "window",
                        "no_observations",
                        "startup_window_has_zero_advancing_updates",
                    );
                }
            };
            calls("method", FRESH_DUAL_ACTION_METHODS, sample.window.bySideAndMethod);
            calls("order", S1_ENUMS.order, sample.window.bySideAndOrder);
            calls("target", S1_TARGET_CATEGORIES, sample.window.bySideAndTarget);
            metrics.add(
                side + ".requestedUnitIdOccurrences",
                sample.window.requestedUnitIdOccurrences[side],
                "requested_id_occurrences_per_window",
                "window",
            );
        }
        for (const [type, name] of [
            [0, "ownerChange"],
            [2, "unspawn"],
            [3, "physicalDestruction"],
        ] as const)
            metrics.add(
                "events." + name,
                sample.window.events.filter((e) => e.event.type === type).length,
                "deduplicated_public_events_per_window",
                "window",
            );
        addSample("candidate.missions.count", sample.missions.length);
        const types = new Map<string, number>();
        for (const m of row.missions) {
            const type = component(m.type) + ".priority." + component(m.priority);
            types.set(type, (types.get(type) ?? 0) + 1);
            const fields: Array<[string, number | null, string, string]> = [
                ["priority", m.priority, "priority", "not_exposed"],
                ["active", Number(m.active), "boolean", "not_exposed"],
                ["sampledAgeLowerBound", m.sampledAgeLowerBound, "sampled_ticks_lower_bound", "not_exposed"],
                ["liveOwnedMembers", m.liveOwnedMembers, "units", "not_exposed"],
                ["mobileMembers", m.mobileMembers, "units", "not_exposed"],
                ["unknownMobileMembers", m.unknownMobileMembers, "units", "not_exposed"],
                ["staleOrOtherOwnerIds", m.staleOrOtherOwnerIds, "ids", "not_exposed"],
                ["duplicateMembershipOccurrences", m.duplicateMembershipOccurrences, "id_occurrences", "not_exposed"],
                ["knownMobile.distanceP90", m.distances?.p90 ?? null, "tiles", "no_known_mobile_members"],
                ["knownMobile.distanceMean", m.distances?.mean ?? null, "tiles", "no_known_mobile_members"],
            ];
            const delta = membership.get(sample.tick + "/" + m.id)!;
            const raw = sample.missions.find((x) => x.id === m.id)!;
            fields.push(
                ["membershipIdOccurrences", raw.unitIds.length, "id_occurrences", "not_exposed"],
                ["uniqueMembershipIds", new Set(raw.unitIds).size, "ids", "not_exposed"],
            );
            const reason =
                raw.firstObservedTick === sample.tick
                    ? "first_sample_not_observed_transfer"
                    : "gap_since_previous_sample";
            fields.push(
                ["membershipAdded", delta.added, "sampled_id_difference_not_transfers", reason],
                ["membershipRemoved", delta.removed, "sampled_id_difference_not_transfers", reason],
            );
            for (const [field, value, unit, why] of fields)
                for (const prefix of ["candidate.mission", "candidate.missionType." + type])
                    metrics.add(prefix + "." + field, value, unit, "mission", "no_observations", why);
        }
        for (const [type, count] of types)
            addSample("candidate.missionType." + type + ".count", count, "missions", "zero");
        if (sample.periodic)
            for (const name of S1_SCREENS) {
                const a = availability[name];
                if (row.flags[name] !== null) a.eligibleSamples++;
                else {
                    a.unavailableSamples++;
                    const reasons =
                        name === "fundedEmptyVehicleQueue"
                            ? ["candidate_factory_readiness_or_power_unknown"]
                            : name === "idleForce"
                            ? [
                                  ...(row.sides.candidate.unknownMobile ? ["candidate_armed_or_mobility_unknown"] : []),
                                  ...(row.sides.candidate.unknownIdleMobile ? ["candidate_idle_state_unknown"] : []),
                              ]
                            : name === "dispersedMission"
                            ? ["mission_member_armed_or_mobility_unknown"]
                            : [
                                  ...(row.sides.baseline.unknownArmed ? ["enemy_armed_status_unknown"] : []),
                                  ...(row.sides.candidate.mobile < 3 && row.sides.candidate.unknownMobile
                                      ? ["candidate_armed_or_mobility_unknown"]
                                      : []),
                              ];
                    for (const reason of reasons) a.reasons[reason] = (a.reasons[reason] ?? 0) + 1;
                }
            }
    }
    for (const name of S1_SCREENS) {
        if (
            availability[name].eligibleSamples !== core.screens[name].eligibleSamples ||
            availability[name].unavailableSamples !== core.screens[name].unavailableSamples
        )
            throw new Error("S1 screen coverage mismatch");
    }
    const actionTotals = Object.fromEntries(
        S1_SIDES.map((side) => {
            const methods = Object.fromEntries(
                FRESH_DUAL_ACTION_METHODS.map((name) => [
                    name,
                    sum(samples.map((s) => s.window.bySideAndMethod[side + "." + name] ?? 0)),
                ]),
            );
            const orders = Object.fromEntries(
                S1_ENUMS.order.map((name) => [
                    name,
                    sum(samples.map((s) => s.window.bySideAndOrder[side + "." + name] ?? 0)),
                ]),
            );
            const targets = Object.fromEntries(
                S1_TARGET_CATEGORIES.map((name) => [
                    name,
                    sum(samples.map((s) => s.window.bySideAndTarget[side + "." + name] ?? 0)),
                ]),
            );
            const rates = (values: Record<string, number>) =>
                Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value / updates]));
            return [
                side,
                {
                    methods,
                    orders,
                    targets,
                    requestedUnitIdOccurrences: sum(samples.map((s) => s.window.requestedUnitIdOccurrences[side])),
                    perObservedUpdateIncludingStartup: {
                        methods: rates(methods),
                        orders: rates(orders),
                        targets: rates(targets),
                    },
                    updates,
                    startupCalls: sum(
                        Object.entries(samples[0].window.bySideAndMethod)
                            .filter(([key]) => key.startsWith(side + "."))
                            .map(([, n]) => n),
                    ),
                },
            ];
        }),
    );
    return {
        definitions: [...metrics.definitions.values()],
        metrics: metrics.finish(samples.length),
        screens: core.screens,
        screenAvailability: availability,
        actionTotals,
        sampleCount: samples.length,
        periodicSamples: core.periodicSamples,
        buildingTrajectory: samples.map((s, i) => ({
            tick: s.tick,
            candidate: core.rows[i].sides.candidate.buildings,
            baseline: core.rows[i].sides.baseline.buildings,
            candidateKnownArmed: core.rows[i].sides.candidate.armed,
            baselineKnownArmed: core.rows[i].sides.baseline.armed,
            candidateUnknownArmed: core.rows[i].sides.candidate.unknownArmed,
            baselineUnknownArmed: core.rows[i].sides.baseline.unknownArmed,
        })),
    };
}
