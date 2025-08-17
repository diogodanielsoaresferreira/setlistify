import { NextRequest, NextResponse } from 'next/server'

const API_BASE = process.env.WORKER_API_BASE || process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8787'

export async function POST(req: NextRequest) {
  const clientId = process.env.SPOTIFY_CLIENT_ID
  const body = await req.text()

  const buildResponse = async (resp: Response, cookies?: { accessToken?: { value: string; maxAge: number }, refreshToken?: { value: string; maxAge: number } }) => {
    const text = await resp.text()
    const out = new NextResponse(text, { status: resp.status, headers: { 'content-type': resp.headers.get('content-type') || 'application/json' } })
    const cookieDomain = process.env.SPOTIFY_COOKIE_DOMAIN
    if (cookies?.accessToken) {
      out.cookies.set('spotify_access_token', cookies.accessToken.value, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: cookies.accessToken.maxAge,
        ...(cookieDomain ? { domain: cookieDomain } : {}),
      })
    }
    if (cookies?.refreshToken) {
      out.cookies.set('spotify_refresh_token', cookies.refreshToken.value, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: cookies.refreshToken.maxAge,
        ...(cookieDomain ? { domain: cookieDomain } : {}),
      })
    }
    return out
  }

  const accessFromCookie = req.cookies.get('spotify_access_token')?.value
  const refreshFromCookie = req.cookies.get('spotify_refresh_token')?.value

  async function refreshToken(): Promise<{ token?: string, cookies?: { accessToken: { value: string; maxAge: number }, refreshToken?: { value: string; maxAge: number } } }> {
    if (!clientId || !refreshFromCookie) return {}
    const form = new URLSearchParams({ client_id: clientId, grant_type: 'refresh_token', refresh_token: String(refreshFromCookie) })
    const tokenRes = await fetch('https://accounts.spotify.com/api/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form.toString() })
    if (!tokenRes.ok) return {}
    const data = await tokenRes.json() as any
    const newAccess = String(data?.access_token || '')
    const expiresIn = Number(data?.expires_in || 3600)
    const maybeNewRefresh = data?.refresh_token as string | undefined
    if (!newAccess) return {}
    const cookies = {
      accessToken: { value: newAccess, maxAge: Math.max(60, expiresIn - 60) },
      refreshToken: maybeNewRefresh ? { value: maybeNewRefresh, maxAge: 60 * 60 * 24 * 30 } : undefined,
    }
    return { token: newAccess, cookies }
  }

  async function forwardWith(t: string) {
    return fetch(`${API_BASE}/api/spotify/playlist`, { method: 'POST', headers: { 'content-type': 'application/json', Authorization: `Bearer ${t}` }, body })
  }

  let token = accessFromCookie
  if (!token) {
    const r = await refreshToken()
    if (r.token) {
      const resp = await forwardWith(r.token)
      return buildResponse(resp, r.cookies)
    }
    return new NextResponse('Unauthorized', { status: 401 })
  }

  let resp = await forwardWith(token)
  if (resp.status === 401) {
    const r = await refreshToken()
    if (r.token) {
      resp = await forwardWith(r.token)
      return buildResponse(resp, r.cookies)
    }
  }
  return buildResponse(resp)
}
