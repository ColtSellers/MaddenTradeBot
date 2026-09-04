import { VERDICT } from "./constants.js";
import { valuePick, type PickContext } from "./pickValue.js";
import { valuePlayer } from "./playerValue.js";
import type { Asset, SideResult, TradeResult, Valuation, VerdictLevel } from "./types.js";

export function valueAsset(asset: Asset, ctx: PickContext): Valuation {
  return asset.kind === "player" ? valuePlayer(asset) : valuePick(asset, ctx);
}

function valueSide(label: string, assets: Asset[], ctx: PickContext): SideResult {
  const valuations = assets.map((a) => valueAsset(a, ctx));
  const total = Math.round(valuations.reduce((sum, v) => sum + v.points, 0));
  return { label, valuations, total };
}

/**
 * Evaluate a trade. `sideA`/`sideB` are the assets each side SENDS.
 * The verdict favors the side that receives more value.
 */
export function evaluateTrade(
  labelA: string,
  sideA: Asset[],
  labelB: string,
  sideB: Asset[],
  ctx: PickContext
): TradeResult {
  const a = valueSide(labelA, sideA, ctx);
  const b = valueSide(labelB, sideB, ctx);

  const diff = Math.abs(a.total - b.total);
  const hi = Math.max(a.total, b.total);
  const lo = Math.min(a.total, b.total);
  const ratio = lo <= 0 ? Infinity : hi / lo;

  let verdict: VerdictLevel;
  if (diff < VERDICT.fairAbsoluteDiff || ratio <= VERDICT.fairRatio) {
    verdict = "fair";
  } else if (ratio <= VERDICT.slightRatio) {
    verdict = "slight";
  } else if (ratio <= VERDICT.strongRatio) {
    verdict = "strong";
  } else {
    verdict = "lopsided";
  }

  // The side that SENDS less value RECEIVES more — the trade favors them.
  const favors: "A" | "B" | null =
    verdict === "fair" ? null : a.total > b.total ? "B" : "A";

  const warnings: string[] = [];
  // The classic exploit: an early-round pick going out for a bag of low-value players.
  for (const [giver, receiverTotal] of [
    [a, b.total],
    [b, a.total],
  ] as const) {
    const earlyPickPoints = giver.valuations
      .filter((v) => v.asset.kind === "pick" && v.asset.round <= 2)
      .reduce((s, v) => s + v.points, 0);
    if (earlyPickPoints > 0 && receiverTotal < earlyPickPoints * 0.6) {
      warnings.push(
        `🚨 **Pick-fleece pattern**: ${giver.label} sends early-round pick value (${fmt(earlyPickPoints)} pts) for a return worth well under it (${fmt(receiverTotal)} pts). This is the exact trade the CPU rubber-stamps and a real front office laughs at.`
      );
    }
  }

  return { sideA: a, sideB: b, verdict, favors, ratio, diff, warnings };
}

function fmt(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}
