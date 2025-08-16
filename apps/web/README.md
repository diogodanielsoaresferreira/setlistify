Setlistify Web (Next.js)
========================

A minimal UI to:
- Fetch latest setlist for an artist from the Cloudflare Worker
- Create a Spotify playlist from that setlist

Local development
-----------------

- Install deps in this app folder: `npm install` (from repo root: `npm --prefix apps/web install`)
- Run dev server: `npm --prefix apps/web run dev`
- Open http://localhost:3000

The UI calls the Worker endpoints at `NEXT_PUBLIC_API_BASE` (defaults to `http://localhost:8787`).
If your Worker runs elsewhere, set in your shell or Vercel project settings, e.g.:

```
NEXT_PUBLIC_API_BASE=https://your-worker.example.workers.dev
```

Deploy on Vercel
----------------

- Set the project root to `apps/web`
- Build command: `npm run build`
- Output directory: `.next`
- Environment variables:
  - `NEXT_PUBLIC_API_BASE` → your Worker base URL (optional; defaults to `http://localhost:8787` in dev)
  - `NEXT_PUBLIC_SPOTIFY_CLIENT_ID` → your Spotify app client id (required for login)
  - `NEXT_PUBLIC_SPOTIFY_REDIRECT_URI` → optional explicit redirect URI; defaults to the current page URL
