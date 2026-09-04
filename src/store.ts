import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export interface GuildConfig {
  /** Channel evaluations get published into as trade evidence. */
  publishChannelId?: string;
  /** Year of the next upcoming draft class (drives future-pick discounts). */
  draftYear?: number;
}

const DATA_DIR = process.env.DATA_DIR || "data";
const CONFIG_PATH = join(DATA_DIR, "guild-config.json");

let configs: Record<string, GuildConfig> = {};

export function loadConfigs(): void {
  try {
    if (existsSync(CONFIG_PATH)) {
      configs = JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
    }
  } catch (err) {
    console.error("Failed to load guild config, starting fresh:", err);
    configs = {};
  }
}

function save(): void {
  try {
    mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(CONFIG_PATH, JSON.stringify(configs, null, 2));
  } catch (err) {
    console.error("Failed to persist guild config:", err);
  }
}

export function getGuildConfig(guildId: string): GuildConfig {
  return configs[guildId] ?? {};
}

export function updateGuildConfig(guildId: string, patch: Partial<GuildConfig>): GuildConfig {
  configs[guildId] = { ...configs[guildId], ...patch };
  save();
  return configs[guildId];
}

/**
 * Draft year for a guild: configured value, or a sensible default —
 * Jan–Apr the draft is this calendar year, May onward it's next year's class.
 */
export function nextDraftYear(guildId: string | null): number {
  if (guildId) {
    const configured = getGuildConfig(guildId).draftYear;
    if (configured) return configured;
  }
  const now = new Date();
  return now.getMonth() <= 3 ? now.getFullYear() : now.getFullYear() + 1;
}
