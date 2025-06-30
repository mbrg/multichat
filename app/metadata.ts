import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'multichat - Multi-Model AI Chat Interface',
  description:
    'A production-ready web application that shows multiple response possibilities from various AI models simultaneously.',
  keywords: [
    'AI',
    'chat',
    'multi-model',
    'OpenAI',
    'Anthropic',
    'Google',
    'Mistral',
  ],
  authors: [{ name: 'multichat Team' }],
  creator: 'multichat',
  publisher: 'multichat',
  robots: 'index, follow',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://multichat.vercel.app',
    title: 'multichat - Multi-Model AI Chat Interface',
    description:
      'A production-ready web application that shows multiple response possibilities from various AI models simultaneously.',
    siteName: 'multichat',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'multichat - Multi-Model AI Chat Interface',
    description:
      'A production-ready web application that shows multiple response possibilities from various AI models simultaneously.',
  },
  viewport: 'width=device-width, initial-scale=1',
}
