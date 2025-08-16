import { createExecutionContext, waitOnExecutionContext } from 'cloudflare:test'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import worker from '../src/index'

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>

describe('POST /api/spotify/playlist', () => {
  let fetchSpy: any

  beforeEach(() => {
    fetchSpy = (vi.spyOn(globalThis as any, 'fetch') as any).mockImplementation(async (...args: any[]) => {
      const [input, init] = args as [any, RequestInit | undefined]
      const url = typeof input === 'string' ? input : input.url
      // Auth check
      if (url.endsWith('/v1/me')) {
        const auth = (init?.headers as any)?.Authorization || (init?.headers as any)?.authorization
        if (!auth || typeof auth !== 'string' || !auth.startsWith('Bearer ')) {
          return new Response('Unauthorized', { status: 401 })
        }
        return new Response(JSON.stringify({ id: 'user123' }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      // Search requests
      if (url.startsWith('https://api.spotify.com/v1/search?')) {
        const u = new URL(url)
        const q = u.searchParams.get('q') || ''
        if (q.includes('Song 1')) {
          return new Response(
            JSON.stringify({ tracks: { items: [{ id: 't1' }] } }),
            { status: 200, headers: { 'content-type': 'application/json' } },
          )
        }
        if (q.includes('Song 2')) {
          return new Response(
            JSON.stringify({ tracks: { items: [{ id: 't2' }] } }),
            { status: 200, headers: { 'content-type': 'application/json' } },
          )
        }
        // Simulate not found
        return new Response(JSON.stringify({ tracks: { items: [] } }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      // Create playlist
      if (url.endsWith('/v1/users/user123/playlists') && (init?.method === 'POST')) {
        return new Response(
          JSON.stringify({ id: 'pl123', external_urls: { spotify: 'https://open.spotify.com/playlist/pl123' } }),
          { status: 201, headers: { 'content-type': 'application/json' } },
        )
      }
      // Add tracks
      if (url.endsWith('/v1/playlists/pl123/tracks') && (init?.method === 'POST')) {
        return new Response(JSON.stringify({ snapshot_id: 'snap' }), { status: 201, headers: { 'content-type': 'application/json' } })
      }
      return new Response('not matched', { status: 404 })
    })
  })

  afterEach(() => {
    fetchSpy.mockRestore()
  })

  it('rejects missing Authorization', async () => {
    const ctx = createExecutionContext()
    const req = new IncomingRequest('http://example.com/api/spotify/playlist', { method: 'POST', body: JSON.stringify({ title: 'T', artist: 'A', songs: ['Song 1'] }), headers: { 'content-type': 'application/json' } })
    const res = await worker.fetch(req, {} as any, ctx)
    await waitOnExecutionContext(ctx)
    expect(res.status).toBe(401)
  })

  it('returns 401 when token invalid', async () => {
    // Make /me fail
    fetchSpy.mockImplementationOnce(async () => new Response('Unauthorized', { status: 401 }))

    const ctx = createExecutionContext()
    const req = new IncomingRequest('http://example.com/api/spotify/playlist', {
      method: 'POST',
      headers: { 'content-type': 'application/json', Authorization: 'Bearer bad' },
      body: JSON.stringify({ title: 'My Playlist', artist: 'Some Artist', songs: ['Song 1'] }),
    })
    const res = await worker.fetch(req, {} as any, ctx)
    await waitOnExecutionContext(ctx)
    expect(res.status).toBe(401)
  })

  it('creates a playlist and adds tracks', async () => {
    const ctx = createExecutionContext()
    const req = new IncomingRequest('http://example.com/api/spotify/playlist', {
      method: 'POST',
      headers: { 'content-type': 'application/json', Authorization: 'Bearer testtoken' },
      body: JSON.stringify({ title: 'My Playlist', artist: 'The Band', songs: ['Song 1', 'Song 2', 'Unknown Song'] }),
    })
    const res = await worker.fetch(req, {} as any, ctx)
    await waitOnExecutionContext(ctx)
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json).toMatchObject({
      playlistId: 'pl123',
      playlistUrl: 'https://open.spotify.com/playlist/pl123',
      addedCount: 2,
    })
    expect(Array.isArray(json.notFound)).toBe(true)
    expect(json.notFound).toContain('Unknown Song')
  })
})
