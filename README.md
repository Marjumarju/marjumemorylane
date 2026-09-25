# Memory Lane

Implement exactly the screenshot and nothing else

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://marjumemorylane.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/483463b0-7407-4280-8def-31a977d34930).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Deploying to Railway

The repo ships a [`railway.json`](railway.json). Railway picks it up automatically, so a
service pointed at this repo needs no build/start configuration in the dashboard.

What it does:

- **Build**: `NITRO_PRESET=node-server npm run build`. Without that variable the Vite/Nitro
  build defaults to `cloudflare-module` (what Lovable publishes to), which produces a Worker
  bundle Railway cannot run. `NITRO_PRESET` only overrides the default preset — it changes
  nothing about the Lovable build, which ignores the variable and always targets Cloudflare.
- **Start**: `node .output/server/index.mjs` — the Nitro Node server. It listens on `PORT`
  (Railway injects it) and serves the static client from `.output/public`.
- **Node version**: pinned to 22 via [`.node-version`](.node-version); Vite 8 requires
  `^20.19 || >=22.12`.

### Environment variables

Set these as service variables in Railway. `.env` in the repo is only read at build time by
Vite, so the `VITE_*` values are already baked into the client bundle — the server-side ones
are not.

| Variable                    | Needed for                                       |
| --------------------------- | ------------------------------------------------ |
| `SUPABASE_URL`              | SSR and the auth middleware                      |
| `SUPABASE_PUBLISHABLE_KEY`  | SSR and the auth middleware                      |
| `SUPABASE_SERVICE_ROLE_KEY` | server-side Supabase client (privileged queries) |
| `LOVABLE_API_KEY`           | audio transcription via the Lovable AI gateway   |
| `LOVABLE_CRON_SECRET`       | cron endpoint auth, if cron jobs are used        |

Database migrations still run from a workstation (`drizzle-kit`, using
`LOVABLE_DB_MIGRATION_URL`); nothing in the Railway deploy touches them.

### Family photos are real files, not Lovable asset pointers

The seven photos in [`src/assets`](src/assets) used to be `*.asset.json` pointers whose `url`
field aimed at `/__l5e/assets-v1/<uuid>/<name>` — a route served by Lovable's hosting layer, not
by the app. Nothing emits those paths into `.output/public`, so on Railway every photo 404'd.
They are now committed image files imported directly in [`src/lib/family.ts`](src/lib/family.ts),
which Vite hashes into `.output/public/assets`.

If you re-upload a photo through the Lovable editor it may reintroduce an `*.asset.json` pointer
and rewrite the import — that photo will then break on Railway again. Commit the real file and
import it directly instead.
