Setlistify Web (Next.js)
========================

Create a Spotify playlist of the live songs of your favorite artist.

What this app does:
- Fetch the latest setlist for an artist from the Cloudflare Worker
- Create a Spotify playlist with those songs (Authorization Code + PKCE)

Local development
-----------------

- Install deps in this app folder: `npm install` (from repo root: `npm --prefix apps/web install`)
- Run dev server: `npm --prefix apps/web run dev`
- Open the exact host that matches your Spotify Redirect URI (e.g. http://127.0.0.1:3000)

The UI calls the Worker through local proxy routes. If your Worker runs elsewhere, set:

```
WORKER_API_BASE=https://your-worker.example.workers.dev
```

Environment Variables
---------------------

Set these in your environment (e.g. apps/web/.env.local or Vercel → Project Settings → Environment Variables):

- `SPOTIFY_CLIENT_ID` (required): Your Spotify application Client ID.
- `SPOTIFY_REDIRECT_URI` (required): Exact redirect URL, recommended:
  - Dev: `http://127.0.0.1:3000/api/auth/spotify/callback`
  - Prod: `https://<your-domain>/api/auth/spotify/callback`
  Add this exact value in Spotify Dashboard → Your App → Edit Settings → Redirect URIs.
- `WORKER_API_BASE` (optional): Your Cloudflare Worker base URL; defaults to `http://localhost:8787` in dev.

Deploy on Vercel
----------------

- Set the project root to `apps/web`
- Build command: `npm run build`
- Output directory: `.next`
- Environment variables:
  - `SPOTIFY_CLIENT_ID`
  - `SPOTIFY_REDIRECT_URI`
  - `WORKER_API_BASE` (if your Worker isn’t local)

Notes
-----
- Use the exact same host in your browser as in `SPOTIFY_REDIRECT_URI` (e.g. 127.0.0.1 vs localhost) so cookies work.
- Recommended to set `SPOTIFY_REDIRECT_URI` to `/api/auth/spotify/callback`. A compatibility shim exists at `/spotify/callback`, but using `/api/auth/spotify/callback` avoids an extra hop.


