import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const access = req.cookies.get('spotify_access_token')?.value ? true : false
  const verifier = req.cookies.get('spotify_pkce_verifier')?.value ? true : false
  return NextResponse.json({ hasAccessCookie: access, hasVerifierCookie: verifier })
}

