import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";
import { footerText } from "../embeds.js";
import { SYNTAX_HELP } from "../parse/assetParser.js";

export const data = new SlashCommandBuilder()
  .setName("help")
  .setDescription("How MaddenTradeBot works")
  .setDMPermission(false);

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const embed = new EmbedBuilder()
    .setColor(0x3498db)
    .setTitle("🏈 MaddenTradeBot — how it works")
    .setDescription(
      [
        "Every evaluation is **private** (only you see it). Hit **📣 Publish to league** to post it in the evidence channel before you make the trade in Madden.",
        "",
        "**Commands**",
        "• `/value player` — what a player is worth in trade",
        "• `/value pick` — what a draft pick is worth (future picks get discounted!)",
        "• `/trade` — full trade check: opens a form, one asset per line on each side",
        "• `/setup` — admins: set the evidence channel and next draft year",
        "",
        "**Trade form syntax**",
        SYNTAX_HELP,
      ].join("\n")
    )
    .addFields({
      name: "The model, in one paragraph",
      value:
        "Everything is converted to **draft chart points** (Jimmy Johnson chart, #1 overall = 3000). " +
        "Players: an exponential curve on OVR, adjusted for position value, age curve (RBs fall fast, QBs age well), " +
        "dev trait (worth more when young), and contract. Picks: chart value, with **future picks discounted 40% per year out** — " +
        "the exact exploit the Madden CPU falls for. Verdicts compare the two totals: within 10% is fair, past 65% is a veto candidate.",
    })
    .setFooter({ text: footerText() });
  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}
