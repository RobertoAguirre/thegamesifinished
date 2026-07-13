# The Games I Finished

Minimalist hobby site where gamers log completed games, upload proof, and share wins.

## Stack

- **SvelteKit 2** + **Svelte 5** + **Tailwind CSS 4**
- **Clerk** (`svelte-clerk`) — auth
- **MongoDB Atlas** — users & completions
- **Disk storage** — images/videos (`UPLOAD_DIR`)
- **RAWG API** — game title search (cached, rate-safe)
- **Render** — `@sveltejs/adapter-node` + Persistent Disk

## Monorepo

```
apps/web/       → SvelteKit app (adapter-node → apps/web/build)
packages/db/    → MongoDB client & types
```

## Local development

```bash
cp .env.example apps/web/.env
# Edit apps/web/.env with your keys
npm install
npm run dev
```

SvelteKit reads **`apps/web/.env`**, not the root `.env`.

### Required env vars (`apps/web/.env`)

| Variable | Purpose |
|---|---|
| `PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `CLERK_SECRET_KEY` | Clerk secret key |
| `MONGODB_URI` | MongoDB Atlas connection string |
| `RAWG_API_KEY` | Game search (https://rawg.io/apidocs) |
| `UPLOAD_DIR` | Local: `./uploads` · Render: `/var/data/uploads` |
| `ORIGIN` | Production: `https://gamesifinished.com` · Staging: `https://thegamesifinished.onrender.com` |
| `BODY_SIZE_LIMIT` | `26M` (for video uploads) |
| `HOST` | Render: `0.0.0.0` |
| `NODE_VERSION` | `22` |

### Clerk dashboard

- Paths: `/sign-in`, `/sign-up`, redirect `/dashboard`
- Enable **Username**
- Domains: `http://localhost:5173` + production URL

### Health checks

```bash
curl http://localhost:5173/api/health
curl http://localhost:5173/api/health/rawg
```

RAWG health only checks that the key exists — it does **not** call RAWG (so Render probes don't burn quota).

## RAWG usage (Free: 20,000 requests / period)

Configured for low quota impact:

- Backend cache **15 minutes** per search query
- Max **2 concurrent** outbound RAWG calls
- Dedupes identical in-flight searches
- Frontend debounce **450ms** + abort stale requests
- Min query length: **2** characters
- Cover images come from RAWG CDN URLs (not counted as API calls)
- Attribution link to [RAWG.io](https://rawg.io/) in the footer (required by free plan)

## Deploy on Render (manual Web Service)

1. Push this repo to GitHub
2. [Render](https://render.com) → **New → Web Service** → connect the repo
3. Configure:

| Setting | Value |
|---|---|
| Root Directory | *(empty — repo root)* |
| Runtime | Node |
| Build Command | `npm ci && npm run build` |
| Start Command | `npm run start` |
| Health Check Path | `/api/health` |
| Instance | **Starter** (Persistent Disk needs paid plan) |
| Disk | name `uploads`, mount `/var/data`, size `1` GB |

4. Environment variables:

```
NODE_VERSION=22
NODE_ENV=production
HOST=0.0.0.0
BODY_SIZE_LIMIT=26M
UPLOAD_DIR=/var/data/uploads
PUBLIC_CLERK_SIGN_IN_URL=/sign-in
PUBLIC_CLERK_SIGN_UP_URL=/sign-up
PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard
PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/dashboard
PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
MONGODB_URI=mongodb+srv://...
RAWG_API_KEY=...
ORIGIN=https://gamesifinished.com
```

`npm run start` → `node apps/web/build/index.js`

5. Domains:
   - **Production:** `https://gamesifinished.com` (www → apex redirect in Render)
   - **Staging:** `https://thegamesifinished.onrender.com`
   - Add **both** hosts in **Clerk → Domains**, and set `ORIGIN` to `https://gamesifinished.com` in Render env when the custom domain is live.
## License

MIT — hobby project.
