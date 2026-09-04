import {
  ChatInputCommandInteraction,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";
import { POSITION_MULT, ROUNDS, SLOT_PICK_IN_ROUND, type DevTrait } from "../engine/constants.js";
import { valuePick } from "../engine/pickValue.js";
import { canonicalPosition, valuePlayer } from "../engine/playerValue.js";
import type { PickAsset, PlayerAsset } from "../engine/types.js";
import { valuationEmbed } from "../embeds.js";
import { publishButtonRow } from "../publish.js";
import { nextDraftYear } from "../store.js";

const DEV_CHOICES = [
  { name: "Normal", value: "normal" },
  { name: "Star", value: "star" },
  { name: "Superstar", value: "superstar" },
  { name: "X-Factor", value: "xfactor" },
];

export const data = new SlashCommandBuilder()
  .setName("value")
  .setDescription("Get the estimated trade value of a player or draft pick (private)")
  .setDMPermission(false)
  .addSubcommand((sub) =>
    sub
      .setName("player")
      .setDescription("Estimate a player's trade value")
      .addStringOption((o) =>
        o.setName("name").setDescription("Player name").setRequired(true).setMaxLength(60)
      )
      .addStringOption((o) =>
        o
          .setName("position")
          .setDescription("Position (QB, RB, WR, TE, LT, EDGE, CB, ...)")
          .setRequired(true)
          .setMaxLength(5)
      )
      .addIntegerOption((o) =>
        o.setName("ovr").setDescription("Overall rating").setRequired(true).setMinValue(40).setMaxValue(99)
      )
      .addIntegerOption((o) =>
        o.setName("age").setDescription("Age").setRequired(true).setMinValue(18).setMaxValue(45)
      )
      .addStringOption((o) =>
        o.setName("dev").setDescription("Dev trait (default Normal)").addChoices(...DEV_CHOICES)
      )
      .addIntegerOption((o) =>
        o
          .setName("contract_years")
          .setDescription("Years left on contract (optional)")
          .setMinValue(0)
          .setMaxValue(8)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("pick")
      .setDescription("Estimate a draft pick's trade value")
      .addIntegerOption((o) =>
        o.setName("round").setDescription("Round (1-7)").setRequired(true).setMinValue(1).setMaxValue(ROUNDS)
      )
      .addIntegerOption((o) =>
        o
          .setName("year")
          .setDescription("Draft class year (default: next upcoming draft)")
          .setMinValue(2026)
          .setMaxValue(2099)
      )
      .addStringOption((o) =>
        o
          .setName("slot")
          .setDescription("Where in the round the pick projects to land (default: mid)")
          .addChoices(
            { name: "Early (top of the round)", value: "early" },
            { name: "Mid", value: "mid" },
            { name: "Late (contender's pick)", value: "late" }
          )
      )
      .addIntegerOption((o) =>
        o
          .setName("pick_number")
          .setDescription("Exact pick within the round (1-32), overrides slot")
          .setMinValue(1)
          .setMaxValue(32)
      )
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guildId) {
    await interaction.reply({ content: "Use this in your league server.", flags: MessageFlags.Ephemeral });
    return;
  }

  const sub = interaction.options.getSubcommand();
  if (sub === "player") {
    const rawPos = interaction.options.getString("position", true);
    const position = canonicalPosition(rawPos);
    if (!position) {
      await interaction.reply({
        content: `Unknown position \`${rawPos}\`. Use one of: ${Object.keys(POSITION_MULT).join(", ")} (aliases like RB, EDGE, S, G work too).`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const player: PlayerAsset = {
      kind: "player",
      name: interaction.options.getString("name", true),
      position,
      ovr: interaction.options.getInteger("ovr", true),
      age: interaction.options.getInteger("age", true),
      dev: (interaction.options.getString("dev") as DevTrait | null) ?? undefined,
      contractYears: interaction.options.getInteger("contract_years") ?? undefined,
    };
    const valuation = valuePlayer(player);
    const embed = valuationEmbed(valuation);
    await interaction.reply({
      embeds: [embed],
      components: [publishButtonRow(embed, interaction.guildId, interaction.user.id)],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // /value pick
  const draftYear = nextDraftYear(interaction.guildId);
  const slotChoice = interaction.options.getString("slot") as keyof typeof SLOT_PICK_IN_ROUND | null;
  const pickNumber = interaction.options.getInteger("pick_number");
  const pick: PickAsset = {
    kind: "pick",
    year: interaction.options.getInteger("year") ?? draftYear,
    round: interaction.options.getInteger("round", true),
    pickInRound: pickNumber ?? SLOT_PICK_IN_ROUND[slotChoice ?? "mid"],
    exact: pickNumber !== null,
    slotLabel: pickNumber !== null ? `pick ${pickNumber} of the round` : slotChoice ?? "mid",
  };
  const valuation = valuePick(pick, { nextDraftYear: draftYear });
  const embed = valuationEmbed(valuation);
  await interaction.reply({
    embeds: [embed],
    components: [publishButtonRow(embed, interaction.guildId, interaction.user.id)],
    flags: MessageFlags.Ephemeral,
  });
}
