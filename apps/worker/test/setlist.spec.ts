import { createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import worker from '../src/index';

// Typed Request helper for Workers types
const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe('GET /api/setlist/:artist', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Default mock: happy path with one artist and a setlist of two songs
    fetchSpy = vi.spyOn(globalThis as any, 'fetch').mockImplementation(async (input: any) => {
      const url = typeof input === 'string' ? input : input.url;
      if (url.includes('/search/artists?')) {
        return new Response(
          JSON.stringify({ artist: [{ mbid: 'abc', name: 'Mock Artist' }], total: 1 }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }
      if (url.includes('/artist/abc/setlists?')) {
        return new Response(
          JSON.stringify({
            setlist: [
              {
                sets: {
                  set: [
                    { song: [{ name: 'Song A' }, { name: 'Song B' }] },
                  ],
                },
              },
            ],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }
      return new Response('Not Found', { status: 404 });
    });
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('returns songs from the most recent setlist', async () => {
    const req = new IncomingRequest('http://example.com/api/setlist/Red%20Hot%20Chili%20Peppers');
    const ctx = createExecutionContext();
    const res = await worker.fetch(req, { SETLIST_FM_API_KEY: 'test-key' } as any, ctx);
    await waitOnExecutionContext(ctx);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ artist: 'Mock Artist', setlist: ['Song A', 'Song B'] });

    // Ensure search encoded the artist name into the query string
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/search/artists?'),
      expect.objectContaining({ headers: expect.any(Object) }),
    );
  });

  it('returns empty setlist when artist not found', async () => {
    // First call (artist search) returns no results
    fetchSpy.mockImplementationOnce(async () =>
      new Response(JSON.stringify({ artist: [], total: 0 }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    const req = new IncomingRequest('http://example.com/api/setlist/Unknown%20Artist');
    const ctx = createExecutionContext();
    const res = await worker.fetch(req, { SETLIST_FM_API_KEY: 'test-key' } as any, ctx);
    await waitOnExecutionContext(ctx);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ artist: 'Unknown Artist', setlist: [] });
  });

  it('fails with 500 if API key is missing', async () => {
    const req = new IncomingRequest('http://example.com/api/setlist/Any');
    const ctx = createExecutionContext();
    const res = await worker.fetch(req, {} as any, ctx);
    await waitOnExecutionContext(ctx);

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json).toHaveProperty('error');
  });
});

