import { EmbedBuilder } from "discord.js";
import { ENGINE_VERSION } from "./engine/constants.js";
import { nearestPickDescription } from "./engine/pickValue.js";
import type { TradeResult, Valuation, VerdictLevel } from "./engine/types.js";

const COLORS: Record<VerdictLevel, number> = {
  fair: 0x2ecc71, // green
  slight: 0xf1c40f, // yellow
  strong: 0xe67e22, // orange
  lopsided: 0xe74c3c, // red
};

const NEUTRAL = 0x3498db;

export function footerText(): string {
  return `MaddenTradeBot • deterministic engine v${ENGINE_VERSION} • same inputs = same verdict`;
}

function fmt(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

export function valuationEmbed(v: Valuation): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(NEUTRAL)
    .setTitle(v.asset.kind === "player" ? `📊 Player value — ${v.label}` : `🎯 Pick value — ${v.label}`)
    .setDescription(`## ${fmt(v.points)} points\n${nearestPickDescription(v.points)}`)
    .addFields({ name: "How it's computed", value: v.breakdown.join("\n") })
    .setFooter({ text: footerText() })
    .setTimestamp();
  if (v.warnings.length > 0) {
    embed.addFields({ name: "Notes", value: v.warnings.join("\n") });
  }
  return embed;
}

function sideField(valuations: Valuation[], total: number): string {
  const lines = valuations.map((v) => `• ${v.label} — **${fmt(v.points)}**`);
  lines.push(`**Total: ${fmt(total)} pts** (${nearestPickDescription(total)})`);
  return lines.join("\n");
}

export function verdictText(result: TradeResult): string {
  const winner = result.favors === "A" ? result.sideA.label : result.sideB.label;
  const pct = Math.round((result.ratio - 1) * 100);
  switch (result.verdict) {
    case "fair":
      return "✅ **Fair trade** — both sides within a reasonable NFL range.";
    case "slight":
      return `🟡 **Slightly favors ${winner}** (+${pct}% value). Defensible, but worth a look.`;
    case "strong":
      return `🟠 **Clearly favors ${winner}** (+${pct}% value). Needs a real justification before it goes into Madden.`;
    case "lopsided":
      return `🔴 **Lopsided toward ${winner}** (+${pct}% value). Veto candidate — no NFL front office makes this trade.`;
  }
}

export function tradeEmbed(result: TradeResult): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(COLORS[result.verdict])
    .setTitle("🔁 Trade evaluation")
    .setDescription(verdictText(result))
    .addFields(
      {
        name: `${result.sideA.label} sends`,
        value: sideField(result.sideA.valuations, result.sideA.total),
        inline: true,
      },
      {
        name: `${result.sideB.label} sends`,
        value: sideField(result.sideB.valuations, result.sideB.total),
        inline: true,
      },
      {
        name: "Margin",
        value: `${fmt(result.diff)} points (${nearestPickDescription(result.diff)})`,
      }
    )
    .setFooter({ text: footerText() })
    .setTimestamp();

  const notes = [
    ...result.warnings,
    ...result.sideA.valuations.flatMap((v) => v.warnings),
    ...result.sideB.valuations.flatMap((v) => v.warnings),
  ];
  if (notes.length > 0) {
    embed.addFields({ name: "Notes", value: notes.join("\n").slice(0, 1024) });
  }
  return embed;
}
