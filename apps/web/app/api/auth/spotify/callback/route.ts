import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const clientId = process.env.SPOTIFY_CLIENT_ID
  if (!clientId) {
    return new NextResponse('Missing SPOTIFY_CLIENT_ID', { status: 500 })
  }

  const url = req.nextUrl
  const code = url.searchParams.get('code')
  if (!code) return new NextResponse('Missing authorization code', { status: 400 })

  const defaultRedirect = `${url.origin}/api/auth/spotify/callback`
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI || defaultRedirect

  const verifier = req.cookies.get('spotify_pkce_verifier')?.value
  if (!verifier) return new NextResponse('Missing PKCE verifier', { status: 400 })

  const body = new URLSearchParams({
    client_id: clientId,
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    code_verifier: verifier,
  })

  const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })
  if (!tokenRes.ok) {
    const text = await tokenRes.text()
    return new NextResponse(`Token exchange failed: ${tokenRes.status} ${text}`, { status: 400 })
  }
  const json = await tokenRes.json() as any
  const accessToken = json?.access_token as string | undefined
  const refreshToken = json?.refresh_token as string | undefined
  const expiresIn = Number(json?.expires_in || 3600)
  if (!accessToken) return new NextResponse('No access_token in response', { status: 400 })

  const res = NextResponse.redirect(`${url.origin}/app`)
  const cookieDomain = process.env.SPOTIFY_COOKIE_DOMAIN
  res.cookies.set('spotify_access_token', accessToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: Math.max(60, expiresIn - 60),
    ...(cookieDomain ? { domain: cookieDomain } : {}),
  })
  if (refreshToken) {
    // Refresh tokens can be long-lived; rotate if Spotify returns a new one later
    res.cookies.set('spotify_refresh_token', refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      ...(cookieDomain ? { domain: cookieDomain } : {}),
    })
  }
  // Clear PKCE verifier
  res.cookies.set('spotify_pkce_verifier', '', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 0, ...(cookieDomain ? { domain: cookieDomain } : {}) })
  return res
}
