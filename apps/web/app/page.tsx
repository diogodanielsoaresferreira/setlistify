'use client'

import { useEffect, useState } from 'react'

export default function LoginPage() {
  const [checking, setChecking] = useState(true)
  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch('/api/auth/spotify/me', { cache: 'no-store' })
        if (res.ok) {
          window.location.replace('/app')
          return
        }
      } catch {}
      setChecking(false)
    })()
  }, [])

  const beginSpotifyLogin = () => {
    window.location.href = '/api/auth/spotify/login'
  }

  if (checking) return <main><p>Checking session…</p></main>
  return (
    <main>
      <section style={{ display: 'grid', gap: 12 }}>
        <h2 style={{ margin: 0 }}>Login to Spotify</h2>
        <p style={{ color: '#666' }}>You will be redirected back here after authorizing.</p>
        <div>
          <button type="button" onClick={beginSpotifyLogin} style={{ padding: '10px 14px', borderRadius: 8 }}>
            Log in with Spotify
          </button>
        </div>
      </section>
    </main>
  )
}
