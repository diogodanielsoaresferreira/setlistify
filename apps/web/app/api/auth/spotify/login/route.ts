import { NextRequest, NextResponse } from 'next/server'

function base64url(input: ArrayBuffer): string {
  const bytes = Buffer.from(input)
  return bytes.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

async function sha256(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return base64url(digest)
}

function randomVerifier(length = 64): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
  let result = ''
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  for (let i = 0; i < array.length; i++) {
    result += charset[array[i] % charset.length]
  }
  return result
}

export async function GET(req: NextRequest) {
  const clientId = process.env.SPOTIFY_CLIENT_ID
  if (!clientId) {
    return new NextResponse('Missing SPOTIFY_CLIENT_ID', { status: 500 })
  }

  const url = new URL(req.url)
  const defaultRedirect = `${url.origin}/api/auth/spotify/callback`
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI || defaultRedirect

  const verifier = randomVerifier()
  const challenge = await sha256(verifier)

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    code_challenge_method: 'S256',
    code_challenge: challenge,
    scope: 'playlist-modify-private',
    state: Math.random().toString(36).slice(2),
    // Force consent so Spotify issues/rotates refresh_token if missing
    show_dialog: 'true',
  })

  const res = NextResponse.redirect(`https://accounts.spotify.com/authorize?${params.toString()}`)
  res.cookies.set('spotify_pkce_verifier', verifier, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 600, // 10 minutes
  })
  return res
}
