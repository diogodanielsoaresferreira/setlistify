import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const clientId = process.env.SPOTIFY_CLIENT_ID
  if (!clientId) return new NextResponse('Missing SPOTIFY_CLIENT_ID', { status: 500 })

  const refreshToken = req.cookies.get('spotify_refresh_token')?.value
  if (!refreshToken) return new NextResponse('No refresh token', { status: 401 })

  const body = new URLSearchParams({
    client_id: clientId,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  })

  const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })
  const text = await tokenRes.text()
  if (!tokenRes.ok) {
    return new NextResponse(`Refresh failed: ${tokenRes.status} ${text}`, { status: 401 })
  }

  const json = JSON.parse(text) as any
  const accessToken = json?.access_token as string | undefined
  const newRefreshToken = json?.refresh_token as string | undefined
  const expiresIn = Number(json?.expires_in || 3600)
  if (!accessToken) return new NextResponse('No access_token in refresh', { status: 401 })

  const res = NextResponse.json({ ok: true })
  res.cookies.set('spotify_access_token', accessToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: Math.max(60, expiresIn - 60),
  })
  if (newRefreshToken) {
    res.cookies.set('spotify_refresh_token', newRefreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    })
  }
  return res
}

