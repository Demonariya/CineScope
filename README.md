# CineScope

A button-driven Telegram assistant for movie and TV metadata. It runs on Cloudflare Workers with a Telegram webhook and does not require a VPS.

## Features

- Search movies and TV series by title using OMDb.
- Display IMDb ID, original/known title, year, plot, genre, runtime, cast, director/writer, language, country, awards, IMDb rating, Metascore, and box office when supplied by OMDb.
- List seasons and episodes for series when OMDb exposes them.
- Show current entertainment headlines through Google News RSS.
- Generate similar-title suggestions with the user's AI key, then verify each suggestion against OMDb before displaying it.
- Save titles to a per-user watchlist.
- Add and manage up to five AI-provider API keys per Telegram user.
- Encrypt user records using AES-256-GCM before saving them in Cloudflare KV.
- Read public structured page metadata from user-supplied detail-page URLs on `dornatv.com`, `movieplus.top`, and `animex.pro`.
- Use Telegram reply and inline keyboards; slash commands are optional.

## Data source design

### OMDb

OMDb is the primary catalog. The bot uses the OMDb search endpoint (`s=`), title endpoint (`i=`), and series season endpoint (`i=` + `Season=`). Search results and watchlist entries use IMDb IDs such as `tt3896198`, not numeric TMDb IDs.

Configure the API key as a Cloudflare Worker secret. Never put it in source code, `wrangler.toml`, `.env.example`, or GitHub commits:

```bash
npx wrangler secret put OMDB_API_KEY
```

When prompted, enter the key from your OMDb account. The example key sent in chat is intentionally not embedded in this repository. If it is a real credential and you do not want it exposed in chat history, rotate it and use the new value as the Worker secret.

OMDb does not provide trending lists, similar-title recommendations, or streaming-provider availability. CineScope handles these honestly: trending is a news-headline feed, similar titles are AI-suggested and OMDb-verified, and it does not claim to know where a title is streaming.

### User-supplied source pages

The **Site metadata** button accepts a detail-page URL from exactly these domains:

- `dornatv.com`
- `movieplus.top`
- `animex.pro`

CineScope only reads public structured metadata such as page title, synopsis, year/date, genre, cast, director, and rating from JSON-LD/OpenGraph fields when available. It does not extract, resolve, proxy, download, or display player/video/download URLs. Sites may block automated requests or omit structured metadata, so this feature is best-effort.

### News

News headlines come from Google News RSS. The bot displays the publisher and date and links out to the publisher; it does not republish full articles.

## AI provider configuration

Users may add up to five API keys in a private chat. The bot owner selects the provider mode in `wrangler.toml`:

- `AI_API_MODE = "google"` for the direct Google Gemini API.
- `AI_API_MODE = "responses"` for an OpenAI-compatible Responses API gateway.

For a gateway, set `AI_API_BASE_URL` to the provider's documented API base ending in `/v1`, and set `GEMINI_MODEL` to the exact model ID shown in that provider's authenticated model catalogue. A display name like “Hydrogen 4” is not enough to infer an API model ID. Users must provide a key issued by the configured provider.

A 429 response is reported and the affected key is marked rate-limited. CineScope does not automatically cycle API keys to bypass provider quotas.

## Requirements

- Telegram bot token from BotFather.
- Cloudflare account with Workers and KV enabled.
- OMDb API key.
- AI API key from each user who wants AI chat/recommendations.
- Node.js 22+ and npm.

## Deploy to Cloudflare Workers

### 1. Install dependencies

```bash
npm install
```

### 2. Create KV namespace

```bash
npx wrangler kv namespace create CINE_KV
```

Paste the returned namespace ID into `wrangler.toml`, replacing `REPLACE_WITH_YOUR_KV_NAMESPACE_ID`.

### 3. Create encryption key

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

Keep this value backed up securely. Changing or losing it makes previously encrypted user records unreadable.

### 4. Configure Worker secrets

```bash
npx wrangler secret put BOT_TOKEN
npx wrangler secret put TELEGRAM_WEBHOOK_SECRET
npx wrangler secret put ENCRYPTION_KEY
npx wrangler secret put OMDB_API_KEY
```

`TELEGRAM_WEBHOOK_SECRET` must contain 1–256 characters from `A-Z`, `a-z`, `0-9`, `_`, or `-`.

### 5. Deploy

```bash
npm run deploy
```

The command prints the Worker URL, for example `https://cinescope-bot.YOUR-SUBDOMAIN.workers.dev`.

### 6. Register Telegram webhook

PowerShell:

```powershell
$env:BOT_TOKEN = "YOUR_TELEGRAM_BOT_TOKEN"
$env:WORKER_URL = "https://YOUR-WORKER-URL"
$env:TELEGRAM_WEBHOOK_SECRET = "THE_SAME_WEBHOOK_SECRET"
npm run webhook:set
```

CMD:

```bat
set BOT_TOKEN=YOUR_TELEGRAM_BOT_TOKEN
set WORKER_URL=https://YOUR-WORKER-URL
set TELEGRAM_WEBHOOK_SECRET=THE_SAME_WEBHOOK_SECRET
npm run webhook:set
```

Check health at `https://YOUR-WORKER-URL/health`.

## Local development

Copy `.env.example` to `.dev.vars` and fill local-only values. `.dev.vars` is ignored by Git.

```bash
npm run dev
```

## GitHub Actions deployment (optional)

Add these GitHub repository secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

The workflow runs syntax checks and tests before deploying. Configure Worker secrets directly through Wrangler or the Cloudflare dashboard; they are not copied into GitHub Actions.

## Telegram user flow

1. Tap **Search movie** or **Search series**, or send a title directly.
2. Select a result from the inline keyboard.
3. View the metadata card and select News, IMDb page, Save to watchlist, Similar titles, a season, or Site metadata.
4. For source metadata, send a detail-page URL from one of the supported domains.
5. Add an AI API key in **My API keys** to use AI Q&A and similar-title suggestions.

## Security and limitations

- AI keys are accepted only in private chats and encrypted before storage. The bot attempts to delete the message containing a key, but Telegram bot chats are not end-to-end encrypted; deletion is best-effort. Revoke a key if you believe it may have been exposed.
- OMDb's API key is a bot-owner secret and is not collected from each user.
- Never log Telegram update bodies, API keys, or secrets.
- Source-page URL fetching uses a strict hostname allowlist, HTTPS only, and rejects redirects to other hosts. It reads metadata only.
- Cloudflare KV is eventually consistent; for heavier concurrent usage, move per-user data to D1 or Durable Objects.
- OMDb data can be incomplete or outdated. Treat missing values as unavailable rather than inferred.

## License

MIT. See [LICENSE](./LICENSE).
