import { NextRequest, NextResponse } from 'next/server'

// Bridge route so you can use /spotify/callback as your Redirect URI
// It forwards to the PKCE handler at /api/auth/spotify/callback preserving query params
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const target = `${url.origin}/api/auth/spotify/callback${url.search}`
  return NextResponse.redirect(target)
}

