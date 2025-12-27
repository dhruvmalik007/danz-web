import type { Metadata } from 'next'
import { Inter, Space_Grotesk } from 'next/font/google'
import './globals.css'
import './styles.css'
import { Providers } from './providers'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-space-grotesk',
})

export const metadata: Metadata = {
  title: 'DANZ NOW - Move. Connect. Earn.',
  description:
    'The app that rewards you for dancing, hosting events, and finding your vibe. Transform your passion for movement into meaningful connections and real rewards.',
  keywords: 'dance, rewards, move to earn, dance app, social dance, dance community',
  openGraph: {
    title: 'DANZ NOW - Move. Connect. Earn.',
    description: 'The movement tech platform for dancers worldwide',
    url: 'https://danz.now',
    siteName: 'DANZ NOW',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DANZ NOW - Move. Connect. Earn.',
    description: 'The movement tech platform for dancers worldwide',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
