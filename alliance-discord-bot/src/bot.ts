import { Client, GatewayIntentBits } from "discord.js";
import "dotenv/config";

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

client.once("ready", () => {
  console.log(`🤖 Bot online as ${client.user?.tag}`);
});

if (!process.env.DISCORD_TOKEN) {
  throw new Error("DISCORD_TOKEN missing");
}
// ENV_GUARD_V1
client.login(process.env.DISCORD_TOKEN);
  
// ================================
// HQ_COMMAND_HANDLER_V1
// Public read-only HQ map command
// ================================
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "hq") {
    await interaction.reply({
      content: "🗺️ **Alliance HQ Map**\nhttps://state789.site/hq",
      ephemeral: true
    });
  }
});

