import type { UnitData, VeteranAbility, WeaponData } from "@chronodivide/game-api";

export const LEPTONS_PER_TILE = 256 as const;

export type CalibratedWeaponDamage = {
    weaponName: string;
    damagePerShot: number;
    burstCount: number;
    conservativeFriendlyDamagePerVolley: number;
    conservativeEnemyDamagePerVolley: number;
    conservativeFriendlyRateOfFireTicks: number;
    conservativeEnemyRateOfFireTicks: number;
    conservativeFriendlyProjectileTravelTicks: number;
    damagePerTick: number;
    maximumRangeTiles: number;
    cooldownTicks: number;
};

export type ObjectiveUnitMechanics = {
    unitId: number;
    speedTilesPerTick: number;
    maximumGroundRangeTiles: number;
    calibratedDamagePerVolley: number;
    calibratedRateOfFireTicks: number;
    calibratedProjectileTravelTicks: number;
    calibratedDamagePerTick: number;
    calibratedWeapon: string | null;
    initialCooldownTicks: number;
    hasFiniteAmmoForInitialShot: boolean;
    targetCalibrationStatus: "ordinary_direct_weapon" | "calibrated_no_ordinary_damage" | "uncalibrated_special";
};

export type ObjectiveAttackerEnvelope = {
    envelopeRole: "friendly_attacker_lower_bound";
    unitId: number;
    speedTilesPerTick: number;
    minimumSelectedRangeTiles: number;
    minimumSelectedDamagePerVolley: number;
    maximumSelectedRateOfFireTicks: number;
    maximumSelectedProjectileTravelTicks: number;
    minimumSelectedDamagePerTick: number;
    maximumInitialCooldownTicks: number;
    targetIds: number[];
    uncalibratedTargetIds: number[];
    hasUncalibratedAntiGroundWeapon: boolean;
    hasFiniteAmmoForInitialShot: boolean;
};

export type ObjectiveThreatEnvelope = {
    envelopeRole: "enemy_threat_upper_bound";
    unitId: number;
    speedTilesPerTick: number;
    maximumObservedAntiGroundRangeTiles: number;
    maximumApplicableRangeTiles: number;
    maximumApplicableDamagePerVolley: number;
    minimumApplicableRateOfFireTicks: number;
    maximumApplicableDamagePerTick: number;
    minimumInitialCooldownTicks: number;
    targetIds: number[];
    uncalibratedTargetIds: number[];
    hasUncalibratedAntiGroundWeapon: boolean;
    ordinaryDirectUpperBoundComplete: boolean;
    hasFiniteAmmoForInitialShot: boolean;
};

export type ObjectiveVeterancyMultipliers = {
    damageMultiplier: number;
    rateOfFireMultiplier: number;
    speedMultiplier: number;
};

const finiteNonnegative = (value: number): boolean => Number.isFinite(value) && value >= 0;
const positive = (value: number): boolean => Number.isFinite(value) && value > 0;

export const objectiveVeterancyMultipliers = (
    unit: UnitData,
    veteranCombat: number,
    veteranRateOfFire: number,
    veteranSpeed: number,
): ObjectiveVeterancyMultipliers => {
    if (!positive(veteranCombat) || !positive(veteranRateOfFire) || !positive(veteranSpeed)) {
        throw new Error("veterancy multipliers must be finite and positive");
    }
    // Exact runtime enums: VeteranLevel Veteran=1, Elite=2;
    // VeteranAbility FIREPOWER=2, ROF=4. The engine applies one configured
    // multiplier when the ability is present at the current level; it does not
    // exponentiate the multiplier by level.
    const firepower = 2 as VeteranAbility;
    const rateOfFire = 4 as VeteranAbility;
    const faster = 0 as VeteranAbility;
    const veteran = unit.veteranLevel === 1;
    const elite = unit.veteranLevel >= 2;
    return {
        damageMultiplier: veteran && unit.rules.veteranAbilities.has(firepower) ||
            elite && unit.rules.eliteAbilities.has(firepower)
            ? veteranCombat
            : 1,
        rateOfFireMultiplier: veteran && unit.rules.veteranAbilities.has(rateOfFire) ||
            elite && unit.rules.eliteAbilities.has(rateOfFire)
            ? veteranRateOfFire
            : 1,
        speedMultiplier: veteran && unit.rules.veteranAbilities.has(faster) ||
            elite && unit.rules.eliteAbilities.has(faster)
            ? veteranSpeed
            : 1,
    };
};

export const objectiveTargetArmorDivisor = (
    target: UnitData,
    veteranArmor: number,
): number => {
    if (!positive(veteranArmor)) throw new Error("veteran armor multiplier must be finite and positive");
    const stronger = 1 as VeteranAbility;
    const veteran = target.veteranLevel === 1;
    const elite = target.veteranLevel >= 2;
    return veteran && target.rules.veteranAbilities.has(stronger) ||
        elite && target.rules.eliteAbilities.has(stronger)
        ? veteranArmor
        : 1;
};

export const speedTilesPerTickFromLeptons = (leptonsPerTick: number): number => {
    if (!finiteNonnegative(leptonsPerTick)) throw new Error("unit speed must be finite and nonnegative");
    return leptonsPerTick / LEPTONS_PER_TILE;
};

const isOrdinaryCalibratedWeapon = (weapon: WeaponData): boolean =>
    weapon.projectileRules.isAntiGround &&
    positive(weapon.rules.damage) &&
    positive(weapon.rules.burst) &&
    positive(weapon.rules.rof) &&
    !weapon.rules.areaFire &&
    !positive(weapon.rules.ambientDamage) &&
    !positive(weapon.rules.radLevel) &&
    !weapon.rules.spawner &&
    !weapon.rules.limboLaunch &&
    !weapon.rules.suicide &&
    !weapon.warheadRules.temporal &&
    !weapon.warheadRules.mindControl &&
    !weapon.warheadRules.ivanBomb &&
    !positive(weapon.warheadRules.cellSpread) &&
    !positive(weapon.projectileRules.shrapnelCount) &&
    !weapon.projectileRules.inaccurate &&
    !weapon.projectileRules.flakScatter;

const unitWeapons = (unit: UnitData): readonly (WeaponData | undefined)[] => [
    unit.primaryWeapon,
    unit.secondaryWeapon,
];

const hasUncalibratedAntiGroundWeapon = (unit: UnitData): boolean => unitWeapons(unit).some(
    (weapon) => weapon !== undefined &&
        weapon.projectileRules.isAntiGround &&
        !isOrdinaryCalibratedWeapon(weapon),
);

const hasFiniteAmmoForInitialShot = (unit: UnitData): boolean =>
    unit.rules.ammo <= 0 || (unit.ammo ?? 0) > 0;

export const hasUncalibratedObjectiveMechanic = (unit: UnitData): boolean =>
    hasUncalibratedAntiGroundWeapon(unit) ||
    !!unit.rules.c4 ||
    !!unit.rules.ivan ||
    !!unit.rules.spawns ||
    !!unit.rules.crusher ||
    !!unit.rules.engineer;

export const calibratedWeaponDamageAgainst = (
    weapon: WeaponData | undefined,
    target: UnitData,
    multipliers: ObjectiveVeterancyMultipliers = {
        damageMultiplier: 1,
        rateOfFireMultiplier: 1,
        speedMultiplier: 1,
    },
    targetArmorDivisor = 1,
): CalibratedWeaponDamage | null => {
    if (!weapon || !isOrdinaryCalibratedWeapon(weapon)) return null;
    if (
        !positive(multipliers.damageMultiplier) || !positive(multipliers.rateOfFireMultiplier) ||
        !positive(multipliers.speedMultiplier) || !positive(targetArmorDivisor)
    ) {
        throw new Error("weapon multipliers must be finite and positive");
    }
    const verses = weapon.warheadRules.verses.get(target.rules.armor) ?? 0;
    if (!positive(verses)) return null;
    const rawDamagePerShot = weapon.rules.damage * verses * multipliers.damageMultiplier / targetArmorDivisor;
    // Exact Warhead.computeDamage floors positive damage after verses and
    // armor. One hit point is the minimum positive direct damage.
    const damagePerShot = Math.max(1, Math.floor(rawDamagePerShot));
    const burstCount = Math.max(1, Math.trunc(weapon.rules.burst));
    // The engine spaces burst shots by per-unit burst delays. Without exposing
    // the live burst phase, credit one shot to friendly completion but charge
    // the complete burst to enemy threat at its first possible volley.
    const conservativeFriendlyDamagePerVolley = damagePerShot;
    const conservativeEnemyDamagePerVolley = damagePerShot * burstCount;
    const rawRateOfFireTicks = weapon.rules.rof * multipliers.rateOfFireMultiplier;
    const conservativeFriendlyRateOfFireTicks = Math.max(1, Math.ceil(rawRateOfFireTicks));
    const conservativeEnemyRateOfFireTicks = Math.max(1, Math.floor(rawRateOfFireTicks));
    const conservativeFriendlyProjectileTravelTicks = Number.isFinite(weapon.speed) && weapon.speed > 0
        ? Math.ceil(Math.max(0, weapon.maxRange) * LEPTONS_PER_TILE / weapon.speed)
        : 0;
    return {
        weaponName: weapon.rules.name,
        damagePerShot,
        burstCount,
        conservativeFriendlyDamagePerVolley,
        conservativeEnemyDamagePerVolley,
        conservativeFriendlyRateOfFireTicks,
        conservativeEnemyRateOfFireTicks,
        conservativeFriendlyProjectileTravelTicks,
        damagePerTick: conservativeFriendlyDamagePerVolley / conservativeFriendlyRateOfFireTicks,
        maximumRangeTiles: Math.max(0, weapon.maxRange),
        cooldownTicks: Math.max(0, weapon.cooldownTicks),
    };
};

const validateObjectiveTarget = (target: UnitData): void => {
    // ObjectType.Building is numeric value 2 in the exact game-api runtime.
    if (target.rules.type !== 2 && !target.rules.isSelectableCombatant) {
        throw new Error("objective target must be a building or selectable combatant");
    }
};

const ordinaryCandidatesAgainst = (
    unit: UnitData,
    target: UnitData,
    multipliers?: ObjectiveVeterancyMultipliers,
    targetArmorDivisor?: number,
): CalibratedWeaponDamage[] => {
    validateObjectiveTarget(target);
    return unitWeapons(unit)
        .map((weapon) => calibratedWeaponDamageAgainst(weapon, target, multipliers, targetArmorDivisor))
        .filter((damage): damage is CalibratedWeaponDamage => damage !== null);
};

export const calibrateObjectiveUnitMechanics = (
    unit: UnitData,
    target: UnitData,
    multipliers?: ObjectiveVeterancyMultipliers,
    targetArmorDivisor?: number,
): ObjectiveUnitMechanics => {
    const candidates = ordinaryCandidatesAgainst(unit, target, multipliers, targetArmorDivisor);
    const calibrated = candidates[0] ?? null;
    const lowerBound = candidates.length === 0 ? null : {
        range: Math.min(...candidates.map(({ maximumRangeTiles }) => maximumRangeTiles)),
        damage: Math.min(...candidates.map(({ conservativeFriendlyDamagePerVolley }) =>
            conservativeFriendlyDamagePerVolley)),
        rof: Math.max(...candidates.map(({ conservativeFriendlyRateOfFireTicks }) =>
            conservativeFriendlyRateOfFireTicks)),
        projectile: Math.max(...candidates.map(({ conservativeFriendlyProjectileTravelTicks }) =>
            conservativeFriendlyProjectileTravelTicks)),
        cooldown: Math.max(...candidates.map(({ cooldownTicks }) => cooldownTicks)),
        name: candidates.map(({ weaponName }) => weaponName).sort().join("|"),
    };
    return {
        unitId: unit.id,
        speedTilesPerTick: speedTilesPerTickFromLeptons(Math.max(0, unit.rules.speed)),
        maximumGroundRangeTiles: lowerBound?.range ?? 0,
        calibratedDamagePerVolley: lowerBound?.damage ?? 0,
        calibratedRateOfFireTicks: lowerBound?.rof ?? 0,
        calibratedProjectileTravelTicks: lowerBound?.projectile ?? 0,
        calibratedDamagePerTick: lowerBound === null ? 0 : lowerBound.damage / lowerBound.rof,
        calibratedWeapon: lowerBound?.name ?? null,
        initialCooldownTicks: lowerBound?.cooldown ?? 0,
        hasFiniteAmmoForInitialShot: hasFiniteAmmoForInitialShot(unit),
        targetCalibrationStatus: calibrated === null
            ? hasUncalibratedObjectiveMechanic(unit)
                ? "uncalibrated_special"
                : "calibrated_no_ordinary_damage"
            : "ordinary_direct_weapon",
    };
};

export const calibrateObjectiveAttackerEnvelope = (
    unit: UnitData,
    targets: readonly UnitData[],
    multipliers?: ObjectiveVeterancyMultipliers,
    targetArmorDivisors: ReadonlyMap<number, number> = new Map(),
): ObjectiveAttackerEnvelope => {
    const calibrations = targets.slice().sort((left, right) => left.id - right.id)
        .map((target) => ({
            targetId: target.id,
            mechanics: calibrateObjectiveUnitMechanics(
                unit,
                target,
                multipliers,
                targetArmorDivisors.get(target.id) ?? 1,
            ),
        }));
    const ordinary = calibrations.filter(
        ({ mechanics }) => mechanics.targetCalibrationStatus === "ordinary_direct_weapon",
    );
    return {
        envelopeRole: "friendly_attacker_lower_bound",
        unitId: unit.id,
        speedTilesPerTick: speedTilesPerTickFromLeptons(Math.max(0, unit.rules.speed)),
        minimumSelectedRangeTiles: ordinary.length === 0 ? 0 : Math.min(
            ...ordinary.map(({ mechanics }) => mechanics.maximumGroundRangeTiles),
        ),
        minimumSelectedDamagePerVolley: ordinary.length === 0 ? 0 : Math.min(
            ...ordinary.map(({ mechanics }) => mechanics.calibratedDamagePerVolley),
        ),
        maximumSelectedRateOfFireTicks: ordinary.length === 0 ? 0 : Math.max(
            ...ordinary.map(({ mechanics }) => mechanics.calibratedRateOfFireTicks),
        ),
        maximumSelectedProjectileTravelTicks: ordinary.length === 0 ? 0 : Math.max(
            ...ordinary.map(({ mechanics }) => mechanics.calibratedProjectileTravelTicks),
        ),
        minimumSelectedDamagePerTick: ordinary.length === 0 ? 0 : Math.min(
            ...ordinary.map(({ mechanics }) => mechanics.calibratedDamagePerTick),
        ),
        maximumInitialCooldownTicks: ordinary.length === 0 ? 0 : Math.max(
            ...ordinary.map(({ mechanics }) => mechanics.initialCooldownTicks),
        ),
        targetIds: calibrations.map(({ targetId }) => targetId),
        uncalibratedTargetIds: calibrations
            .filter(({ mechanics }) => mechanics.targetCalibrationStatus !== "ordinary_direct_weapon")
            .map(({ targetId }) => targetId),
        hasUncalibratedAntiGroundWeapon: hasUncalibratedObjectiveMechanic(unit),
        hasFiniteAmmoForInitialShot: hasFiniteAmmoForInitialShot(unit),
    };
};

export const calibrateObjectiveThreatEnvelope = (
    unit: UnitData,
    targets: readonly UnitData[],
    multipliers?: ObjectiveVeterancyMultipliers,
): ObjectiveThreatEnvelope => {
    const calibrations = targets.slice().sort((left, right) => left.id - right.id)
        .map((target) => ({
            targetId: target.id,
            candidates: ordinaryCandidatesAgainst(unit, target, multipliers),
        }));
    const ordinary = calibrations.flatMap(({ candidates }) => candidates);
    const uncalibratedTargetIds = calibrations
        .filter(({ candidates }) => candidates.length === 0)
        .map(({ targetId }) => targetId);
    const uncalibratedWeapon = hasUncalibratedObjectiveMechanic(unit);
    const observedAntiGroundRanges = unitWeapons(unit)
        .filter((weapon): weapon is WeaponData =>
            weapon !== undefined && weapon.projectileRules.isAntiGround,
        )
        .map((weapon) => Math.max(0, weapon.maxRange));
    const maximumObservedAntiGroundRangeTiles = observedAntiGroundRanges.length === 0
        ? 0
        : Math.max(...observedAntiGroundRanges);
    return {
        envelopeRole: "enemy_threat_upper_bound",
        unitId: unit.id,
        speedTilesPerTick: speedTilesPerTickFromLeptons(Math.max(0, unit.rules.speed)) *
            (multipliers?.speedMultiplier ?? 1),
        maximumObservedAntiGroundRangeTiles,
        maximumApplicableRangeTiles: ordinary.length === 0 ? 0 : Math.max(
            maximumObservedAntiGroundRangeTiles,
            ...ordinary.map((candidate) => candidate.maximumRangeTiles),
        ),
        maximumApplicableDamagePerVolley: ordinary.length === 0 ? 0 : Math.max(
            ...ordinary.map((candidate) => candidate.conservativeEnemyDamagePerVolley),
        ),
        minimumApplicableRateOfFireTicks: ordinary.length === 0 ? 0 : Math.min(
            ...ordinary.map((candidate) => candidate.conservativeEnemyRateOfFireTicks),
        ),
        maximumApplicableDamagePerTick: ordinary.length === 0 ? 0 : Math.max(
            ...ordinary.map((candidate) =>
                candidate.conservativeEnemyDamagePerVolley /
                    candidate.conservativeEnemyRateOfFireTicks,
            ),
        ),
        minimumInitialCooldownTicks: ordinary.length === 0 ? 0 : Math.min(
            ...ordinary.map((candidate) => candidate.cooldownTicks),
        ),
        targetIds: calibrations.map(({ targetId }) => targetId),
        uncalibratedTargetIds: uncalibratedWeapon
            ? calibrations.map(({ targetId }) => targetId)
            : [],
        hasUncalibratedAntiGroundWeapon: uncalibratedWeapon,
        ordinaryDirectUpperBoundComplete: !uncalibratedWeapon,
        hasFiniteAmmoForInitialShot: hasFiniteAmmoForInitialShot(unit),
    };
};

/** @deprecated Use the role-specific attacker or threat envelope. */
export const calibrateObjectiveMultiTargetEnvelope = calibrateObjectiveAttackerEnvelope;
