# Infinite Chat - Multi-Model AI Chat Interface

A production-ready web application that creates an "infinite chat" experience, showing multiple AI response possibilities from various models simultaneously.

## Features

- **Multi-Model Support**: Integrates with OpenAI, Anthropic, Google, Mistral, and HuggingFace
- **Infinite Possibilities Panel**: Multiple AI responses with probability scores
- **Secure API Key Storage**: Client-side encryption using Web Crypto API
- **File Upload Support**: Images, audio, and document attachments
- **Responsive Design**: Mobile-optimized interface with dark theme
- **Real-time Streaming**: Live response generation

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **AI Integration**: Vercel AI SDK
- **Deployment**: Vercel
- **Security**: Web Crypto API with AES-GCM encryption
- **Testing**: Vitest + React Testing Library (230+ tests)

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Type checking
npm run typecheck

# Linting
npm run lint
```

## Deployment

This project is deployed on Vercel. Pushes to the main branch automatically trigger new deployments.

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config({
  extends: [
    // Remove ...tseslint.configs.recommended and replace with this
    ...tseslint.configs.recommendedTypeChecked,
    // Alternatively, use this for stricter rules
    ...tseslint.configs.strictTypeChecked,
    // Optionally, add this for stylistic rules
    ...tseslint.configs.stylisticTypeChecked,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config({
  plugins: {
    // Add the react-x and react-dom plugins
    'react-x': reactX,
    'react-dom': reactDom,
  },
  rules: {
    // other rules...
    // Enable its recommended typescript rules
    ...reactX.configs['recommended-typescript'].rules,
    ...reactDom.configs.recommended.rules,
  },
})
```
