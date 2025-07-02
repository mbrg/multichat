import type { Metadata } from 'next'

const baseTitle = 'multichat - Multi-Model AI Chat Interface'

const env = process.env.VERCEL_ENV
let prefix = ''
if (!env) {
  prefix = '[local] '
} else if (env === 'development') {
  prefix = '[dev] '
} else if (env === 'preview') {
  prefix = '[preview] '
}

export const metadata: Metadata = {
  title: `${prefix}${baseTitle}`,
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
    title: `${prefix}${baseTitle}`,
    description:
      'A production-ready web application that shows multiple response possibilities from various AI models simultaneously.',
    siteName: 'multichat',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${prefix}${baseTitle}`,
    description:
      'A production-ready web application that shows multiple response possibilities from various AI models simultaneously.',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
}
