import type { Metadata } from 'next'
import { ColorSchemeScript, MantineProvider } from '@mantine/core'
import '@mantine/core/styles.css'
import AppShell from '@/components/AppShell'

export const metadata: Metadata = {
  title: '1LIVE playlist creator',
  description:
    'Spotify playlists generated based on the daily playlists of the radio station 1LIVE',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <ColorSchemeScript defaultColorScheme="dark" />
      </head>
      <body>
        <MantineProvider defaultColorScheme="dark">
          <AppShell>{children}</AppShell>
        </MantineProvider>
      </body>
    </html>
  )
}
