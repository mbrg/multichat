import './globals.css'
import { metadata } from './metadata'

export { metadata }

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark h-full">
      <body className="bg-[#0a0a0a] text-[#e0e0e0] h-full">{children}</body>
    </html>
  )
}
