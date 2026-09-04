import "dotenv/config";
import { REST, Routes } from "discord.js";
import { commands } from "./commands/index.js";

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.GUILD_ID;

if (!token || !clientId) {
  console.error("DISCORD_TOKEN and DISCORD_CLIENT_ID must be set (see .env.example).");
  process.exit(1);
}

const body = commands.map((c) => c.data.toJSON());
const rest = new REST().setToken(token);

const route = guildId
  ? Routes.applicationGuildCommands(clientId, guildId)
  : Routes.applicationCommands(clientId);

console.log(
  guildId
    ? `Registering ${body.length} commands to guild ${guildId} (instant)...`
    : `Registering ${body.length} commands globally (can take up to an hour to appear)...`
);

await rest.put(route, { body });
console.log("Done.");
