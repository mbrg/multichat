import openaiLogoBlack from '../assets/OpenAI-black-monoblossom.svg'
import openaiLogoWhite from '../assets/OpenAI-white-monoblossom.svg'
import anthropicLogo from '../assets/anthropic.png'
import geminiLogo from '../assets/gemini.svg'
import mistralLogo from '../assets/mistral.png'
import huggingfaceLogo from '../assets/huggingface.svg'

export const providerLogos = {
  openai: {
    light: openaiLogoBlack,
    dark: openaiLogoWhite,
  },
  anthropic: {
    light: anthropicLogo,
    dark: anthropicLogo,
  },
  google: {
    light: geminiLogo,
    dark: geminiLogo,
  },
  mistral: {
    light: mistralLogo,
    dark: mistralLogo,
  },
  together: {
    light: huggingfaceLogo,
    dark: huggingfaceLogo,
  },
} as const

export function getProviderLogo(
  provider: string,
  theme: 'light' | 'dark' = 'dark'
) {
  const logos = providerLogos[provider as keyof typeof providerLogos]
  if (!logos) {
    // Default to OpenAI if provider not found
    return providerLogos.openai[theme]
  }
  return logos[theme]
}

export function getProviderFromModel(model: string): string {
  // Extract provider from model ID
  if (model.includes('gpt') || model.includes('openai')) {
    return 'openai'
  } else if (model.includes('claude') || model.includes('anthropic')) {
    return 'anthropic'
  } else if (model.includes('gemini') || model.includes('google')) {
    return 'google'
  } else if (model.includes('mistral')) {
    return 'mistral'
  } else if (
    model.includes('meta') ||
    model.includes('llama') ||
    model.includes('together')
  ) {
    return 'together'
  }
  return 'openai' // default
}
