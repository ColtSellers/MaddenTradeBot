import {
  ChannelType,
  ChatInputCommandInteraction,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { getGuildConfig, nextDraftYear, updateGuildConfig } from "../store.js";

export const data = new SlashCommandBuilder()
  .setName("setup")
  .setDescription("Configure MaddenTradeBot for this server (admins)")
  .setDMPermission(false)
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand((sub) =>
    sub
      .setName("channel")
      .setDescription("Set the channel where trade evidence gets published")
      .addChannelOption((o) =>
        o
          .setName("channel")
          .setDescription("Evidence channel (e.g. #trade-desk)")
          .setRequired(true)
          .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("draft-year")
      .setDescription("Set the year of the next upcoming draft (drives future-pick discounts)")
      .addIntegerOption((o) =>
        o.setName("year").setDescription("e.g. 2027").setRequired(true).setMinValue(2026).setMaxValue(2099)
      )
  )
  .addSubcommand((sub) => sub.setName("show").setDescription("Show current configuration"));

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guildId) {
    await interaction.reply({ content: "Use this in your league server.", flags: MessageFlags.Ephemeral });
    return;
  }

  const sub = interaction.options.getSubcommand();
  if (sub === "channel") {
    const channel = interaction.options.getChannel("channel", true);
    updateGuildConfig(interaction.guildId, { publishChannelId: channel.id });
    await interaction.reply({
      content: `✅ Trade evidence will be published to <#${channel.id}>. Make sure I can send messages there.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  if (sub === "draft-year") {
    const year = interaction.options.getInteger("year", true);
    updateGuildConfig(interaction.guildId, { draftYear: year });
    await interaction.reply({
      content: `✅ Next draft set to the **${year}** class. Picks from later years get discounted relative to it.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const config = getGuildConfig(interaction.guildId);
  await interaction.reply({
    content: [
      `**Evidence channel:** ${config.publishChannelId ? `<#${config.publishChannelId}>` : "not set — run `/setup channel`"}`,
      `**Next draft year:** ${nextDraftYear(interaction.guildId)}${config.draftYear ? "" : " (auto — set with `/setup draft-year`)"}`,
    ].join("\n"),
    flags: MessageFlags.Ephemeral,
  });
}
