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

// Spotify API helpers
const SPOTIFY_API = 'https://api.spotify.com/v1';

type CreatePlaylistBody = {
  title: string;
  artist: string;
  songs: string[];
};

function parseBearer(authHeader: string | null | undefined): string | null {
  if (!authHeader) return null;
  const m = authHeader.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}

app.post('/api/spotify/playlist', async (c) => {
  const token = parseBearer(c.req.header('authorization'));
  if (!token) {
    return c.json({ error: 'Missing or invalid Authorization header' }, 401);
  }

  let body: Partial<CreatePlaylistBody>;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const artist = typeof body.artist === 'string' ? body.artist.trim() : '';
  const songs = Array.isArray(body.songs) ? body.songs.filter((s): s is string => typeof s === 'string' && s.trim().length > 0) : [];

  if (!title || !artist || songs.length === 0) {
    return c.json({ error: 'Body must include title, artist, and non-empty songs[]' }, 400);
  }

  const authHeaders = { Authorization: `Bearer ${token}` };

  // Verify token with /me (propagate meaningful errors)
  const meRes = await fetch(`${SPOTIFY_API}/me`, { headers: authHeaders });
  if (meRes.status === 401) {
    return c.json({ error: 'Invalid or expired Spotify token' }, 401);
  }
  if (meRes.status === 403) {
    return c.json({ error: 'Spotify account not authorized for this app' }, 403);
  }
  if (!meRes.ok) {
    return c.json({ error: `Spotify /me failed (${meRes.status})` }, 502);
  }
  const me = await meRes.json() as { id: string };
  const userId = (me as any)?.id;
  if (!userId) return c.json({ error: 'Could not resolve Spotify user id' }, 502);

  // Resolve track IDs for each song
  const trackIds: string[] = [];
  const notFound: string[] = [];
  for (const song of songs) {
    const q = new URLSearchParams({
      q: `track:${song} artist:${artist}`,
      type: 'track',
      limit: '1',
    });
    const searchRes = await fetch(`${SPOTIFY_API}/search?${q.toString()}`, { headers: authHeaders });
    if (!searchRes.ok) {
      return c.json({ error: `Spotify search failed (${searchRes.status})` }, 502);
    }
    const data = await searchRes.json() as any;
    const first = data?.tracks?.items?.[0];
    if (first?.id) trackIds.push(String(first.id));
    else notFound.push(song);
  }

  // Create playlist
  const createPayload = {
    name: title,
    public: false,
    description: `Generated by Setlistify for ${artist}`,
  };
  const createRes = await fetch(`${SPOTIFY_API}/users/${encodeURIComponent(userId)}/playlists`, {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify(createPayload),
  });
  if (!createRes.ok) {
    return c.json({ error: `Failed to create playlist (${createRes.status})` }, 502);
  }
  const playlist = await createRes.json() as any;
  const playlistId: string | undefined = playlist?.id;
  const playlistUrl: string | undefined = playlist?.external_urls?.spotify ?? playlist?.uri;
  if (!playlistId) return c.json({ error: 'Playlist created but no id returned' }, 502);

  // Add tracks if any
  let added = 0;
  if (trackIds.length > 0) {
    const uris = trackIds.map((id) => `spotify:track:${id}`);
    const addRes = await fetch(`${SPOTIFY_API}/playlists/${encodeURIComponent(playlistId)}/tracks`, {
      method: 'POST',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ uris }),
    });
    if (!addRes.ok) {
      return c.json({ error: `Failed to add tracks (${addRes.status})`, playlistId, playlistUrl }, 502);
    }
    added = uris.length;
  }

  return c.json({
    playlistId,
    playlistUrl,
    addedCount: added,
    notFound,
  }, 201);
});
