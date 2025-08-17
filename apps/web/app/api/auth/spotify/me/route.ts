import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const token = req.cookies.get('spotify_access_token')?.value
  if (token) return NextResponse.json({ ok: true })

  // Try silent refresh using refresh token
  const clientId = process.env.SPOTIFY_CLIENT_ID
  const refreshToken = req.cookies.get('spotify_refresh_token')?.value
  if (!clientId || !refreshToken) return new NextResponse('Unauthorized', { status: 401 })

  const form = new URLSearchParams({
    client_id: clientId,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  })
  const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  })
  if (!tokenRes.ok) return new NextResponse('Unauthorized', { status: 401 })
  const data = await tokenRes.json() as any
  const access = data?.access_token as string | undefined
  const newRefresh = data?.refresh_token as string | undefined
  const expiresIn = Number(data?.expires_in || 3600)
  if (!access) return new NextResponse('Unauthorized', { status: 401 })

  const res = NextResponse.json({ ok: true })
  const cookieDomain = process.env.SPOTIFY_COOKIE_DOMAIN
  res.cookies.set('spotify_access_token', access, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: Math.max(60, expiresIn - 60),
    ...(cookieDomain ? { domain: cookieDomain } : {}),
  })
  if (newRefresh) {
    res.cookies.set('spotify_refresh_token', newRefresh, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
      ...(cookieDomain ? { domain: cookieDomain } : {}),
    })
  }
  return res
}
