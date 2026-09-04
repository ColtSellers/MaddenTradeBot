# MaddenTradeBot 🏈

A Discord bot that gives your Madden 27 franchise league **NFL-realistic trade
valuations** — before the trade ever goes into the game. Built to kill the
classic exploit where someone fleeces the CPU (or a league-mate) out of early
draft picks for replacement-level players.

## How it works for league members

Everything starts **private** — only you see the result:

- **`/value player`** — what's this player actually worth? Fill in name,
  position, age, OVR, dev trait (and optionally contract years).
- **`/value pick`** — what's this draft pick worth? Round, year, and where in
  the round it projects to land. **Future picks get discounted ~40% per year
  out** — the thing Madden's CPU gets wrong.
- **`/trade`** — the full pre-trade check. A form pops up: list what each side
  sends, one asset per line. You get totals for both sides, a verdict, and
  callouts for shady patterns.

Every private result has a **📣 Publish to league** button. Click it and the
full evaluation posts to your league's evidence channel (e.g. `#trade-desk`),
stamped with who published it and when. House rule: **no trade goes into
Madden until its evaluation is published.** Now there's a paper trail.

Verdicts:

| Verdict | Meaning |
|---|---|
| ✅ Fair | Both sides within ~10% (or trivial value involved) |
| 🟡 Slightly favors X | Up to +30% — defensible |
| 🟠 Clearly favors X | Up to +65% — needs a real justification |
| 🔴 Lopsided | More than +65% — veto candidate |

## The valuation model

Everything converts to **draft-chart points** — the same Jimmy Johnson chart
(No. 1 overall = 3000) real front offices have used for decades — so players
and picks compare directly.

**Picks:** chart value for the slot (use early/mid/late or the exact pick),
then a **0.6× multiplier per season into the future**. A 2028 1st during the
2027 league year is worth roughly a late 2027 1st / high 2nd — not a 1st.

**Players:** `base(OVR) × position × age × dev × contract`

- **OVR curve** is exponential: 99 → 3000, 90 → ~1100, 80 → ~370, 70 → ~125.
  Elite players are disproportionately valuable, just like the real league.
- **Position**: QBs are king (×1.75); LT/EDGE/CB/WR are premium; RBs (×0.8)
  and especially kickers/punters are not.
- **Age** follows position-specific curves: youth carries a premium, RBs
  crater after 27, QBs age gracefully, linemen hold value into their late 20s.
- **Dev trait** (Star/Superstar/X-Factor) is worth up to +50% — but the bonus
  tapers with age, because dev is mostly *growth potential*.
- **Contract** (optional): expiring deals are rentals (×0.85).

The engine is fully deterministic — **same inputs, same verdict, every
time** — which is what makes a published evaluation usable as evidence. Every
number lives in [`src/engine/constants.ts`](src/engine/constants.ts); if your
league thinks RBs deserve more respect, change one line and rebuild.

## Setup (commissioner)

### 1. Create the Discord app

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications) → **New Application**.
2. **Bot** tab → **Reset Token** → copy it (this is `DISCORD_TOKEN`).
   No privileged intents needed.
3. **General Information** → copy the **Application ID** (`DISCORD_CLIENT_ID`).
4. Invite it: **OAuth2 → URL Generator** → scopes `bot` +
   `applications.commands`; bot permissions **Send Messages** and
   **Embed Links**. Open the generated URL and add it to your server.

### 2. Run the bot

```bash
git clone https://github.com/ColtSellers/MaddenTradeBot.git
cd MaddenTradeBot
cp .env.example .env      # paste DISCORD_TOKEN, DISCORD_CLIENT_ID, GUILD_ID
npm ci
npm run register          # registers the slash commands (instant with GUILD_ID)
npm run build && npm start
```

For always-on free hosting, see **[docs/DEPLOY.md](docs/DEPLOY.md)**.

### 3. Configure in Discord (admin)

- `/setup channel` — pick the evidence channel (e.g. `#trade-desk`).
- `/setup draft-year` — set the next draft class year (e.g. 2027). This is
  what future-pick discounts are measured against; bump it each league year.
- `/setup show` — check current config.

## Trade form syntax

One asset per line (or separated by `;`):

```
Player:  Name POS AGE OVR [dev] [Nyr]     →  Justin Jefferson WR 26 94 xfactor
Pick:    [year] ROUND [early|mid|late|pick #]  →  2027 1st early
```

- Positions: standard Madden positions; aliases like `RB`, `EDGE`, `S`, `G`
  work. (`SS` means strong safety — write `superstar` or `xf` for dev traits.)
- Dev traits: `normal`, `star`, `superstar`, `xfactor`/`xf`.
- Contract: `2yr` = two years left.
- Picks: `2026 3rd`, `2028 2nd pick 45`, `1st late` all work; year defaults
  to the next draft, slot defaults to mid-round.

## Development

```bash
npm run dev        # run with live reload
npm test           # engine + parser tests
npm run typecheck
```

Stack: TypeScript, [discord.js](https://discord.js.org) v14, vitest. No
database — guild config is a JSON file in `data/`.
