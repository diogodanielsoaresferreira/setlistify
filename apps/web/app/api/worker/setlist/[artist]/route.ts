import { NextRequest, NextResponse } from 'next/server'

const API_BASE = process.env.WORKER_API_BASE || process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8787'

export async function GET(_req: NextRequest, { params }: { params: { artist: string } }) {
  const artist = params.artist
  const resp = await fetch(`${API_BASE}/api/setlist/${encodeURIComponent(artist)}`)
  const text = await resp.text()
  return new NextResponse(text, { status: resp.status, headers: { 'content-type': resp.headers.get('content-type') || 'text/plain; charset=utf-8' } })
}
