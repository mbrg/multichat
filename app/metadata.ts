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
    'Open Source web application that shows multiple response possibilities from various AI models simultaneously.',
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
    url: process.env.NEXTAUTH_URL || 'https://chatsbox.ai',
    title: `${prefix}${baseTitle}`,
    description:
      'Open Source AI assistant that shows multiple response possibilities from various AI models simultaneously.',
    siteName: 'chatsbox.ai',
    images: [
      {
        url: `${process.env.NEXTAUTH_URL}/og-image-1200x630-facebook-meta-whatsapp-linkedin.png`,
        width: 1200,
        height: 630,
        alt: 'AI Chat Sandbox - Multiple AI Models',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@chatsboxai',
    creator: '@chatsboxai',
    title: `${prefix}${baseTitle}`,
    description:
      'Open Source AI assistant that shows multiple response possibilities from various AI models simultaneously.',
    images: [
      `${process.env.NEXTAUTH_URL}/twitter-card-1200x675-summary-large-image.png`,
    ],
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: 'no',
}
