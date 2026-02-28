# Discord Worker Setup

Create a file named .env inside discord-worker/ (this file is ignored by git).

Required variables:
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- BOT_TOKEN   (your Discord bot token)
- POLL_MS (optional)
- BATCH_SIZE (optional)
- DRY_RUN (optional)

Example .env:

SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
BOT_TOKEN=
POLL_MS=15000
BATCH_SIZE=5
DRY_RUN=true
