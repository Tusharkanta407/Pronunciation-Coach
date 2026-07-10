import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AssessmentProvider } from '@/context/AssessmentContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Livo Assistant - Pronunciation Test',
  description: 'Test your English pronunciation in 3 rounds. Get AI scores, word-level feedback, and personalized practice.',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/icon.svg',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#15c39a' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="bg-background">
      <body className={`${inter.className} antialiased`}>
        <AssessmentProvider>
          {children}
        </AssessmentProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
