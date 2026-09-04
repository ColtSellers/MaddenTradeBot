import "dotenv/config";
import { Client, Events, GatewayIntentBits, MessageFlags } from "discord.js";
import { commands } from "./commands/index.js";
import { handleTradeModal, TRADE_MODAL_ID } from "./commands/trade.js";
import { handlePublishButton } from "./publish.js";
import { loadConfigs } from "./store.js";
import { startHealthServer } from "./health.js";

const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error("DISCORD_TOKEN is not set. Copy .env.example to .env and fill it in.");
  process.exit(1);
}

loadConfigs();
startHealthServer();

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const commandMap = new Map(commands.map((c) => [c.data.name, c]));

client.once(Events.ClientReady, (c) => {
  console.log(`Logged in as ${c.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      const command = commandMap.get(interaction.commandName);
      if (command) await command.execute(interaction);
      return;
    }
    if (interaction.isModalSubmit() && interaction.customId === TRADE_MODAL_ID) {
      await handleTradeModal(interaction);
      return;
    }
    if (interaction.isButton() && interaction.customId.startsWith("publish:")) {
      await handlePublishButton(interaction);
      return;
    }
  } catch (err) {
    console.error("Interaction failed:", err);
    const message = {
      content: "Something went wrong handling that — try again.",
      flags: MessageFlags.Ephemeral,
    } as const;
    if (interaction.isRepliable()) {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(message).catch(() => {});
      } else {
        await interaction.reply(message).catch(() => {});
      }
    }
  }
});

client.login(token);
