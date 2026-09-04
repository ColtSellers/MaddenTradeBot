import {
  AGE_CURVES,
  CONTRACT_MULT,
  DEFAULT_AGE,
  DEV_FADED_AGE,
  DEV_FULL_AGE,
  DEV_MIN_SHARE,
  DEV_MULT,
  OVR_CURVE_K,
  OVR_CURVE_MAX,
  POSITION_AGE_GROUP,
  POSITION_ALIASES,
  POSITION_MULT,
  type DevTrait,
} from "./constants.js";
import { nearestPickDescription } from "./pickValue.js";
import type { PlayerAsset, Valuation } from "./types.js";

/** Resolve a user-typed position (rb, edge, s, ...) to a canonical Madden position, or null. */
export function canonicalPosition(input: string): string | null {
  const p = input.trim().toUpperCase();
  if (p in POSITION_MULT) return p;
  if (p in POSITION_ALIASES) return POSITION_ALIASES[p];
  return null;
}

export function baseValue(ovr: number): number {
  return OVR_CURVE_MAX * Math.exp(OVR_CURVE_K * (ovr - 99));
}

/** Linear interpolation over [age, mult] anchor points, clamped at the ends. */
export function ageMultiplier(age: number, position: string): number {
  const group = POSITION_AGE_GROUP[position] ?? "skill";
  const curve = AGE_CURVES[group];
  if (age <= curve[0][0]) return curve[0][1];
  const last = curve[curve.length - 1];
  if (age >= last[0]) return last[1];
  for (let i = 1; i < curve.length; i++) {
    const [a1, m1] = curve[i - 1];
    const [a2, m2] = curve[i];
    if (age <= a2) {
      return m1 + ((age - a1) / (a2 - a1)) * (m2 - m1);
    }
  }
  return last[1];
}

/**
 * Dev bonus tapers with age: full through DEV_FULL_AGE, down to
 * DEV_MIN_SHARE of the bonus by DEV_FADED_AGE.
 */
export function devMultiplier(dev: DevTrait, age: number): number {
  const full = DEV_MULT[dev];
  const span = DEV_FADED_AGE - DEV_FULL_AGE;
  const share = Math.min(
    1,
    Math.max(DEV_MIN_SHARE, DEV_MIN_SHARE + ((DEV_FADED_AGE - age) / span) * (1 - DEV_MIN_SHARE))
  );
  return 1 + (full - 1) * share;
}

export function contractMultiplier(years: number): number {
  for (const [maxYears, mult] of CONTRACT_MULT) {
    if (years <= maxYears) return mult;
  }
  return CONTRACT_MULT[CONTRACT_MULT.length - 1][1];
}

export function valuePlayer(player: PlayerAsset): Valuation {
  const warnings: string[] = [];
  const breakdown: string[] = [];

  const age = player.age ?? DEFAULT_AGE;
  if (player.age === undefined) {
    warnings.push(`Age not given — assumed **${DEFAULT_AGE}**. Add the real age for an accurate number.`);
  }
  const dev: DevTrait = player.dev ?? "normal";
  if (player.dev === undefined) {
    warnings.push("Dev trait not given — assumed **Normal**.");
  }

  const base = baseValue(player.ovr);
  breakdown.push(`Base from ${player.ovr} OVR: **${Math.round(base).toLocaleString("en-US")}** pts`);

  const posMult = POSITION_MULT[player.position] ?? 1.0;
  breakdown.push(`Position (${player.position}) ×${posMult.toFixed(2)}`);

  const ageMult = ageMultiplier(age, player.position);
  breakdown.push(`Age (${age}) ×${ageMult.toFixed(2)}`);

  const devMult = devMultiplier(dev, age);
  if (dev !== "normal") {
    breakdown.push(`Dev trait (${devLabel(dev)}) ×${devMult.toFixed(2)}`);
  }

  let contractMult = 1.0;
  if (player.contractYears !== undefined) {
    contractMult = contractMultiplier(player.contractYears);
    breakdown.push(`Contract (${player.contractYears} yr${player.contractYears === 1 ? "" : "s"} left) ×${contractMult.toFixed(2)}`);
    if (player.contractYears <= 1) {
      warnings.push("📄 **Expiring contract** — this is a rental; value docked accordingly.");
    }
  }

  const points = Math.round(base * posMult * ageMult * devMult * contractMult);
  breakdown.push(`Pick equivalent: ${nearestPickDescription(points)}`);

  const devSuffix = dev !== "normal" ? `, ${devLabel(dev)}` : "";
  const label = `${player.name} (${player.position}, ${age}yo, ${player.ovr} OVR${devSuffix})`;
  return { asset: player, points, label, breakdown, warnings };
}

export function devLabel(dev: DevTrait): string {
  switch (dev) {
    case "normal":
      return "Normal";
    case "star":
      return "Star";
    case "superstar":
      return "Superstar";
    case "xfactor":
      return "X-Factor";
  }
}
