import { SlashCommandBuilder } from "discord.js";
import { getHQMap } from "../services/hqMapService";

export const data = new SlashCommandBuilder()
  .setName("hqmap")
  .setDescription("View HQ map summary");

export async function execute(interaction: any) {
  const allianceId = interaction.guildId;

  const slots = await getHQMap(allianceId);

  const lines = slots
    .filter(s => s.player_name || s.coords)
    .slice(0, 20)
    .map(s => \#\: \ (\)\);

  await interaction.reply({
    content: lines.join("\n") || "No HQ data",
    ephemeral: true
  });
}
