import type { Metadata } from 'next'

const baseTitle = 'chatsbox.ai - Chat Sandbox'

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
  authors: [{ name: 'mbrg' }],
  creator: 'chatsbox.ai',
  publisher: 'chatsbox.ai',
  robots: 'index, follow',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://multichat.vercel.app',
    title: `${prefix}${baseTitle}`,
    description:
      'An AI assistant that shows multiple response possibilities from various AI models simultaneously.',
    siteName: 'chatsbox.ai',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${prefix}${baseTitle}`,
    description:
      'An AI assistant that shows multiple response possibilities from various AI models simultaneously.',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: 'no',
}
