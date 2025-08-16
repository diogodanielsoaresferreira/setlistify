import { NextRequest, NextResponse } from 'next/server'

const API_BASE = process.env.WORKER_API_BASE || process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8787'

export async function POST(req: NextRequest) {
  const token = req.cookies.get('spotify_access_token')?.value
  if (!token) return new NextResponse('Unauthorized', { status: 401 })

  const body = await req.text()
  const resp = await fetch(`${API_BASE}/api/spotify/playlist`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
    body,
  })
  const text = await resp.text()
  return new NextResponse(text, { status: resp.status, headers: { 'content-type': resp.headers.get('content-type') || 'application/json' } })
}

