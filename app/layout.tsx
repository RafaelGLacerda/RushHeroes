import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Rush Heroes',
  description: 'Jogo Gacha',
  generator: 'Rafael Lacerda',
  icons: 'logo.png',
} 

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
