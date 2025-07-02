import openaiLogoBlack from '../assets/OpenAI-black-monoblossom.svg'
import openaiLogoWhite from '../assets/OpenAI-white-monoblossom.svg'
import anthropicLogo from '../assets/anthropic.png'
import geminiLogo from '../assets/gemini.svg'
import mistralLogo from '../assets/mistral.png'
import huggingfaceLogo from '../assets/huggingface.svg'
import { getModelById } from '../services/ai/config'

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

export function getProviderFromModel(modelId: string): string {
  const model = getModelById(modelId)
  if (model) {
    return model.provider
  }
  return 'openai'
}
