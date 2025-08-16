export const metadata = {
  title: 'Setlistify',
  description: 'Create a Spotify playlist of the live songs of your favorite artist',
};

import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif', margin: 0 }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>
          <header style={{ marginBottom: 24 }}>
            <h1 style={{ margin: 0 }}>Setlistify</h1>
            <p style={{ margin: '8px 0 0 0', color: '#555' }}>
              Create a Spotify playlist of the live songs of your favorite artist
            </p>
          </header>
          {children}
        </div>
				<Analytics />
				<SpeedInsights />
      </body>
    </html>
  );
}
