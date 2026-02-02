import 'dotenv/config';
import { discord } from './discordClient.js';
import { startEventWorker } from './eventWorker.js';

if (process.env.FEATURE_DISCORD === 'true') {
  discord.once('ready', () => {
    console.log('[discord] Logged in as ' + discord.user.tag);
    startEventWorker();
  });

  discord.login(process.env.DISCORD_BOT_TOKEN);
} else {
  console.log('[discord] FEATURE_DISCORD disabled');
}
