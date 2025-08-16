/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { Hono } from 'hono';

// Create Hono app with typed bindings matching your Env
const app = new Hono<{ Bindings: Env }>();


// New API endpoint: GET /api/setlist/:artist
// Fetches the most recent setlist from Setlist.fm and returns song names.
app.get('/api/setlist/:artist', async (c) => {
  const { artist } = c.req.param();
  const lang = c.req.query('lang') || 'en';

  const apiKey = c.env.SETLIST_FM_API_KEY;
  if (!apiKey) {
    return c.json({ error: 'Missing SETLIST_FM_API_KEY' }, 500);
  }

  const headers: Record<string, string> = {
    'x-api-key': apiKey,
    'Accept': 'application/json',
    'Accept-Language': lang,
  };

  const baseUrl = 'https://api.setlist.fm/rest/1.0';

  const searchParams = new URLSearchParams({ artistName: artist, p: '1', sort: 'relevance' });
  const artistResp = await fetch(`${baseUrl}/search/artists?${searchParams}`, { headers });
  if (artistResp.status === 404) {
    return c.json({ artist, setlist: [] }, 200);
  }
  if (!artistResp.ok) {
    return c.json({ error: `Setlist.fm search error ${artistResp.status}` }, 502);
  }
  const artistData = await artistResp.json() as any;
  const first = Array.isArray(artistData?.artist) ? artistData.artist[0] : undefined;
  const mbid: string | undefined = first?.mbid;
  if (!mbid) {
    return c.json({ artist, setlist: [] }, 200);
  }

  const setlistParams = new URLSearchParams({ p: '1' });
  const setlistsResp = await fetch(`${baseUrl}/artist/${encodeURIComponent(mbid)}/setlists?${setlistParams}`, { headers });
  if (setlistsResp.status === 404) {
    return c.json({ artist, setlist: [] }, 200);
  }
  if (!setlistsResp.ok) {
    return c.json({ error: `Setlist.fm setlists error ${setlistsResp.status}` }, 502);
  }
  const setlistsData = await setlistsResp.json() as any;
  const setlists: any[] = Array.isArray(setlistsData?.setlist) ? setlistsData.setlist : [];

  let songs: string[] = [];
  for (const sl of setlists) {
    const sets = sl?.sets?.set;
    if (Array.isArray(sets) && sets.length > 0) {
      for (const s of sets) {
        const songArr = s?.song;
        if (Array.isArray(songArr)) {
          for (const song of songArr) {
            if (song?.name) songs.push(String(song.name));
          }
        }
      }
      if (songs.length > 0) break; // use first setlist with songs
    }
  }

  return c.json({ artist: first?.name ?? artist, setlist: songs });
});

export default app;
