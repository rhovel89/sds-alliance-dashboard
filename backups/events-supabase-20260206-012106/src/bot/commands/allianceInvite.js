import { createDiscordInvite } from "../utils/discordInvites.js";
import { supabase } from "../supabaseClient.js";

export default {
  name: "alliance-invite",
  description: "Create an alliance invite link",

  async execute(interaction, client) {
    try {
      const allianceId = interaction.options.getString("alliance");
      const role = interaction.options.getString("role") || "Member";

      const discordInviteUrl = await createDiscordInvite(
        client,
        process.env.DISCORD_GUILD_ID,
        process.env.DISCORD_INVITE_CHANNEL_ID
      );

      const { error } = await supabase
        .from("alliance_invites")
        .insert({
          alliance_id: allianceId,
          role,
          invited_by: interaction.user.id,
          discord_invite_url: discordInviteUrl
        });

      if (error) throw error;

      await interaction.reply({
        content: discordInviteUrl
          ? `✅ Alliance invite created:\n${discordInviteUrl}`
          : "⚠️ Invite created, but Discord link unavailable.",
        ephemeral: true
      });

    } catch (err) {
      console.error("[Alliance Invite Command]", err);
      await interaction.reply({
        content: "❌ Failed to create alliance invite.",
        ephemeral: true
      });
    }
  }
};
