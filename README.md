# The Games I Finished

A minimalist hobby site where gamers log completed games, upload proof (screenshots or short clips), and share their wins on social media.

## Stack

- **SvelteKit 2** + **Svelte 5** — frontend & API
- **Tailwind CSS 4** — styling
- **Clerk** (`svelte-clerk`) — authentication
- **MongoDB Atlas** — users, completions, media (GridFS)
- **RAWG API** — game title search (manual entry fallback)
- **Render** — deployment via `@sveltejs/adapter-node`

## Monorepo structure

```
apps/web/          → SvelteKit application
packages/db/       → Shared MongoDB types & connection
```

## Local development

1. Copy environment variables:

```bash
cp .env.example apps/web/.env
```

2. Fill in your keys:
   - [Clerk](https://dashboard.clerk.com) — create an application
   - [MongoDB Atlas](https://www.mongodb.com/atlas) — free cluster
   - [RAWG](https://rawg.io/apidocs) — optional API key for game search

3. Install and run:

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Deploy on Render

1. Push this repo to GitHub
2. Create a **Web Service** on [Render](https://render.com)
3. Use the included `render.yaml` or configure manually:
   - **Build command:** `npm install && npm run build`
   - **Start command:** `node apps/web/build/index.js`
4. Add environment variables from `.env.example`
5. In Clerk dashboard, add your Render URL to allowed origins

## Features

- Sign up / sign in with Clerk
- Search games via RAWG or enter title manually
- Upload screenshot or short video as proof
- Public profile with total games finished
- Share completions on Facebook, X, Instagram (caption), TikTok (caption)
- Open Graph meta tags for rich link previews

## License

MIT — hobby project, use freely.
