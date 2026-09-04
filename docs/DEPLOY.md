# Deploying MaddenTradeBot for free

The bot is a single small Node process. It needs to run 24/7 (it holds a
websocket connection to Discord), uses almost no CPU/RAM, and stores one tiny
JSON file (`data/guild-config.json`).

"Free" hosting honesty up front: truly-free-forever options for an
always-on process are limited. Here are the realistic paths, best first.

## Option 1 — Oracle Cloud Always Free (truly free, 24/7)

Oracle's Always Free tier includes small ARM/AMD VMs that never expire.
Most involved setup, but genuinely $0 and always-on.

1. Sign up at oracle.com/cloud/free and create an **Always Free** VM
   (Ubuntu, the smallest shape is plenty).
2. SSH in and install Node 22:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
   sudo apt-get install -y nodejs git
   ```
3. Clone, configure, build:
   ```bash
   git clone https://github.com/ColtSellers/MaddenTradeBot.git
   cd MaddenTradeBot
   cp .env.example .env   # fill in DISCORD_TOKEN, DISCORD_CLIENT_ID, GUILD_ID
   npm ci && npm run build && npm run register
   ```
4. Keep it running with systemd:
   ```bash
   sudo tee /etc/systemd/system/maddentradebot.service > /dev/null <<'EOF'
   [Unit]
   Description=MaddenTradeBot
   After=network-online.target

   [Service]
   WorkingDirectory=/home/ubuntu/MaddenTradeBot
   ExecStart=/usr/bin/node dist/index.js
   Restart=always
   User=ubuntu

   [Install]
   WantedBy=multi-user.target
   EOF
   sudo systemctl enable --now maddentradebot
   ```

## Option 2 — a spare PC / Raspberry Pi you already own

Same steps as the VM above (or use [pm2](https://pm2.keymetrics.io/):
`npm i -g pm2 && pm2 start dist/index.js --name maddentradebot && pm2 save`).
Free because you already pay the power bill. Downside: bot is down when the
machine is off.

## Option 3 — Render free tier (free, with a keep-awake trick)

Render's free **web service** tier sleeps after ~15 minutes without HTTP
traffic. The bot ships a health endpoint for exactly this:

1. Push this repo to your GitHub, create a Web Service on render.com from it.
2. Build command: `npm ci && npm run build` — start command: `npm start`.
3. Environment variables: `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `GUILD_ID`.
   Render sets `PORT` automatically, which turns on the health server.
4. Create a free monitor at [cron-job.org](https://cron-job.org) or
   [UptimeRobot](https://uptimerobot.com) that hits your Render URL every
   10 minutes so the service never sleeps.

Caveats: free instances restart on deploys and occasionally otherwise. The
`data/` config file doesn't persist on the free tier — after a restart an
admin just re-runs `/setup channel` (10 seconds). Pending unpublished
evaluations are lost on restart; users re-run the command.

## Option 4 — any $3–5/mo VPS (not free, zero hassle)

Hetzner/DigitalOcean/etc. Same systemd setup as Option 1. Listed for
completeness — split 12 ways in a league it's basically free.

## Docker (works anywhere)

```bash
docker build -t maddentradebot .
docker run -d --restart unless-stopped --env-file .env \
  -v maddentradebot-data:/app/data maddentradebot
```

Register slash commands once from any machine: `npm run register`
(uses `GUILD_ID` from `.env` for instant registration to your server).
