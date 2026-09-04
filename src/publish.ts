import { randomUUID } from "node:crypto";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
  type APIEmbed,
} from "discord.js";
import { getGuildConfig } from "./store.js";

interface PendingEvaluation {
  embed: APIEmbed;
  guildId: string;
  userId: string;
  createdAt: number;
}

const TTL_MS = 24 * 60 * 60 * 1000;
const pending = new Map<string, PendingEvaluation>();

setInterval(() => {
  const cutoff = Date.now() - TTL_MS;
  for (const [id, entry] of pending) {
    if (entry.createdAt < cutoff) pending.delete(id);
  }
}, 60 * 60 * 1000).unref();

/**
 * Register an evaluation so it can later be published to the evidence
 * channel, and return the button row for the ephemeral reply.
 */
export function publishButtonRow(
  embed: EmbedBuilder,
  guildId: string,
  userId: string
): ActionRowBuilder<ButtonBuilder> {
  const id = randomUUID();
  pending.set(id, { embed: embed.toJSON(), guildId, userId, createdAt: Date.now() });
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`publish:${id}`)
      .setLabel("📣 Publish to league")
      .setStyle(ButtonStyle.Primary)
  );
}

export async function handlePublishButton(interaction: ButtonInteraction): Promise<void> {
  const id = interaction.customId.slice("publish:".length);
  const entry = pending.get(id);

  if (!entry) {
    await interaction.reply({
      content:
        "⌛ This evaluation expired (or the bot restarted). Re-run the command and publish again.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  if (interaction.user.id !== entry.userId) {
    await interaction.reply({
      content: "Only the person who ran the evaluation can publish it.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const config = getGuildConfig(entry.guildId);
  if (!config.publishChannelId) {
    await interaction.reply({
      content:
        "No evidence channel is configured. Ask an admin to run `/setup channel` first.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const channel = await interaction.client.channels
    .fetch(config.publishChannelId)
    .catch(() => null);
  if (!channel || !channel.isSendable()) {
    await interaction.reply({
      content:
        "The configured evidence channel no longer exists or I can't post there. Ask an admin to re-run `/setup channel`.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const posted = await channel.send({
    content: `📌 Trade evidence published by <@${entry.userId}>`,
    embeds: [entry.embed],
  });
  pending.delete(id);

  // Disable the button on the original ephemeral reply so it can't double-post.
  const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`published:${id}`)
      .setLabel("✅ Published")
      .setStyle(ButtonStyle.Success)
      .setDisabled(true)
  );
  await interaction.update({ components: [disabledRow] });
  await interaction.followUp({
    content: `Published to <#${config.publishChannelId}>: ${posted.url}`,
    flags: MessageFlags.Ephemeral,
  });
}
