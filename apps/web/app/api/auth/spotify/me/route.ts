import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const token = req.cookies.get('spotify_access_token')?.value
  if (!token) return new NextResponse('Unauthorized', { status: 401 })
  // Consider session valid if cookie is present; avoid external call in dev
  return NextResponse.json({ ok: true })
}
