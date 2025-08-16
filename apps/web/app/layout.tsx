export const metadata = {
  title: 'Setlistify Demo',
  description: 'Create Spotify playlists from setlists',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif', margin: 0 }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>
          <header style={{ marginBottom: 24 }}>
            <h1 style={{ margin: 0 }}>Setlistify Demo</h1>
            <p style={{ margin: '8px 0 0 0', color: '#555' }}>Cloudflare Worker + Next.js UI</p>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
