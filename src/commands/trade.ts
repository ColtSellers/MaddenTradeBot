import {
  ActionRowBuilder,
  ChatInputCommandInteraction,
  MessageFlags,
  ModalBuilder,
  ModalSubmitInteraction,
  SlashCommandBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { evaluateTrade } from "../engine/trade.js";
import { parseAssets, SYNTAX_HELP } from "../parse/assetParser.js";
import { tradeEmbed } from "../embeds.js";
import { publishButtonRow } from "../publish.js";
import { nextDraftYear } from "../store.js";

export const TRADE_MODAL_ID = "trade-modal";

export const data = new SlashCommandBuilder()
  .setName("trade")
  .setDescription("Evaluate a proposed trade before it goes into Madden (private)")
  .setDMPermission(false);

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const modal = new ModalBuilder()
    .setCustomId(TRADE_MODAL_ID)
    .setTitle("Propose a trade")
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("teamA")
          .setLabel("Your team name")
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
          .setPlaceholder("Bears")
          .setMaxLength(40)
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("sideA")
          .setLabel("You send (one asset per line)")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setPlaceholder("Justin Jefferson WR 26 94 xfactor\n2027 3rd")
          .setMaxLength(800)
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("teamB")
          .setLabel("Their team name")
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
          .setPlaceholder("Packers")
          .setMaxLength(40)
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("sideB")
          .setLabel("They send (one asset per line)")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setPlaceholder("2027 1st early\nRomeo Doubs WR 27 81")
          .setMaxLength(800)
      )
    );
  await interaction.showModal(modal);
}

export async function handleTradeModal(interaction: ModalSubmitInteraction): Promise<void> {
  if (!interaction.guildId) {
    await interaction.reply({ content: "Use this in your league server.", flags: MessageFlags.Ephemeral });
    return;
  }

  const draftYear = nextDraftYear(interaction.guildId);
  const ctx = { nextDraftYear: draftYear };
  const labelA = interaction.fields.getTextInputValue("teamA").trim() || "Side A";
  const labelB = interaction.fields.getTextInputValue("teamB").trim() || "Side B";
  const parsedA = parseAssets(interaction.fields.getTextInputValue("sideA"), ctx);
  const parsedB = parseAssets(interaction.fields.getTextInputValue("sideB"), ctx);

  const errors = [
    ...parsedA.errors.map((e) => `**${labelA} side:** ${e}`),
    ...parsedB.errors.map((e) => `**${labelB} side:** ${e}`),
  ];
  if (errors.length > 0) {
    await interaction.reply({
      content: `I couldn't read some lines:\n${errors.join("\n")}\n\n${SYNTAX_HELP}`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const result = evaluateTrade(labelA, parsedA.assets, labelB, parsedB.assets, ctx);
  const embed = tradeEmbed(result);
  await interaction.reply({
    embeds: [embed],
    components: [publishButtonRow(embed, interaction.guildId, interaction.user.id)],
    flags: MessageFlags.Ephemeral,
  });
}
