import { NextResponse } from 'next/server'

export async function POST() {
  const res = new NextResponse('OK')
  const cookieDomain = process.env.SPOTIFY_COOKIE_DOMAIN
  res.cookies.set('spotify_access_token', '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
    ...(cookieDomain ? { domain: cookieDomain } : {}),
  })
  res.cookies.set('spotify_refresh_token', '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
    ...(cookieDomain ? { domain: cookieDomain } : {}),
  })
  return res
}
