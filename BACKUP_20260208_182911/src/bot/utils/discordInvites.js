export async function createDiscordInvite(client, guildId, channelId) {
  try {
    const guild = await client.guilds.fetch(guildId);
    if (!guild) return null;

    const channel = await guild.channels.fetch(channelId);
    if (!channel || !channel.isTextBased()) return null;

    const invite = await channel.createInvite({
      maxUses: 1,
      maxAge: 86400, // 24 hours
      unique: true,
      reason: "Alliance invite"
    });

    return invite.url;
  } catch (err) {
    console.error("[Alliance Invite] Discord invite failed:", err);
    return null;
  }
}
