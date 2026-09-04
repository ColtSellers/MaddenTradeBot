import {
  DRAFT_CHART,
  FUTURE_PICK_DISCOUNT_PER_YEAR,
  PICKS_PER_ROUND,
  ROUNDS,
} from "./constants.js";
import type { PickAsset, Valuation } from "./types.js";

export interface PickContext {
  /** The draft class year of the NEXT upcoming draft (e.g. 2027). */
  nextDraftYear: number;
}

/** Overall pick number (1-224) for a round + pick-in-round. */
export function overallPick(round: number, pickInRound: number): number {
  return (round - 1) * PICKS_PER_ROUND + pickInRound;
}

/** Chart value for an overall pick number. */
export function chartValue(overall: number): number {
  const idx = Math.min(Math.max(overall, 1), DRAFT_CHART.length) - 1;
  return DRAFT_CHART[idx];
}

const ORDINALS = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th"];

export function roundOrdinal(round: number): string {
  return ORDINALS[round - 1] ?? `round ${round}`;
}

/** "early 2nd (pick #36)" style description for an overall pick number. */
export function describeOverall(overall: number): string {
  const clamped = Math.min(Math.max(overall, 1), ROUNDS * PICKS_PER_ROUND);
  const round = Math.floor((clamped - 1) / PICKS_PER_ROUND) + 1;
  const inRound = ((clamped - 1) % PICKS_PER_ROUND) + 1;
  const slot = inRound <= 11 ? "early" : inRound <= 22 ? "mid" : "late";
  return `${slot} ${roundOrdinal(round)} (pick #${clamped})`;
}

/** Nearest pick on the chart worth approximately `points`, as a description. */
export function nearestPickDescription(points: number): string {
  if (points > DRAFT_CHART[0]) {
    return "more than the #1 overall pick";
  }
  if (points < DRAFT_CHART[DRAFT_CHART.length - 1]) {
    return "less than a late 7th";
  }
  let best = 0;
  let bestDiff = Infinity;
  for (let i = 0; i < DRAFT_CHART.length; i++) {
    const d = Math.abs(DRAFT_CHART[i] - points);
    if (d < bestDiff) {
      bestDiff = d;
      best = i;
    }
  }
  return `≈ ${describeOverall(best + 1)}`;
}

export function valuePick(pick: PickAsset, ctx: PickContext): Valuation {
  const warnings: string[] = [];
  const breakdown: string[] = [];

  const overall = overallPick(pick.round, pick.pickInRound);
  const raw = chartValue(overall);
  breakdown.push(
    `Chart value of ${describeOverall(overall)}: **${fmt(raw)}** pts`
  );
  if (!pick.exact) {
    warnings.push(
      `Pick slot assumed **${pick.slotLabel}** (#${pick.pickInRound} in round) — pass early/mid/late or the exact pick for precision.`
    );
  }

  let yearsOut = pick.year - ctx.nextDraftYear;
  if (yearsOut < 0) {
    warnings.push(
      `${pick.year} is in the past relative to the configured next draft (${ctx.nextDraftYear}) — treated as a ${ctx.nextDraftYear} pick.`
    );
    yearsOut = 0;
  }

  let points = raw;
  if (yearsOut > 0) {
    const discount = Math.pow(FUTURE_PICK_DISCOUNT_PER_YEAR, yearsOut);
    points = raw * discount;
    breakdown.push(
      `Future-year discount ×${discount.toFixed(2)} (${yearsOut} draft${yearsOut > 1 ? "s" : ""} away)`
    );
    warnings.push(
      `⏳ **Future pick discounted ${Math.round((1 - discount) * 100)}%**: a ${pick.year} ${roundOrdinal(pick.round)} is worth ${nearestPickDescription(points)} in the ${ctx.nextDraftYear} draft. Madden's CPU ignores this — your league shouldn't.`
    );
  }

  points = round1(points);
  const label = `${pick.year} ${roundOrdinal(pick.round)} (${pick.slotLabel})`;
  return { asset: pick, points, label, breakdown, warnings };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function fmt(n: number): string {
  return n.toLocaleString("en-US");
}
