# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an "Infinite Chat" project - a production-ready multi-model AI chat interface that shows multiple response possibilities from various AI models simultaneously. Successfully migrated from Vite/React SPA to Next.js server-side application.

## Architecture

### Current State
- **Status**: Next.js 15 application with App Router successfully implemented
- **Migration**: Completed migration from client-side React SPA to server-side Next.js
- **Tech Stack**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Authentication**: NextAuth.js with GitHub OAuth
- **AI Integration**: Vercel AI SDK with 5 providers (OpenAI, Anthropic, Google, Mistral, Together)
- **Testing**: 39 test files with comprehensive coverage

### Architecture Implementation
- **Frontend**: ✅ Next.js 15 with App Router
- **Authentication**: ✅ NextAuth.js with GitHub OAuth provider
- **AI Integration**: ✅ Vercel AI SDK with multiple providers
- **Build Tool**: ✅ Next.js with TypeScript configuration
- **Deployment**: ✅ Vercel deployment with environment variables
- **Security**: ✅ Server-side API key management and user authentication
- **Styling**: ✅ Tailwind CSS with dark theme

## Key Features

1. **Multi-Model Support**: Integrates with OpenAI, Anthropic, Google, Mistral, and Together AI models
2. **Infinite Possibilities Panel**: Shows multiple AI responses with probability scores
3. **User Authentication**: GitHub OAuth integration with NextAuth.js
4. **Server-Side Security**: API keys managed server-side with user-specific encryption
5. **Multimodal Support**: File attachments (images, audio, documents)
6. **Responsive Design**: Mobile-optimized interface with dark theme

## Development Commands

### Development Workflow:
```bash
# Install dependencies
npm install

# Development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Run tests
npm test

# Watch mode tests
npm run test:watch

# Test with UI
npm run test:ui

# Type checking
npm run typecheck

# Linting
npm run lint

# Format code
npm run format

# Check formatting
npm run format:check

# Full CI pipeline
npm run ci
```

## File Structure

### App Directory (Next.js 15 App Router)
```
app/
├── layout.tsx                 # Root layout with AuthProvider
├── page.tsx                   # Home page
├── globals.css               # Global styles
├── metadata.ts               # SEO metadata
├── api/                      # API routes
│   └── auth/
│       └── [...nextauth]/
│           └── route.ts      # NextAuth.js configuration
├── auth/                     # Authentication pages
│   ├── signin/page.tsx
│   └── error/page.tsx
├── components/               # React components
│   ├── AttachmentPreview.tsx
│   ├── AuthPopup.tsx
│   ├── AuthProvider.tsx
│   ├── ChatContainer.tsx
│   ├── ChatDemo.tsx
│   ├── LoginButton.tsx
│   ├── Menu.tsx
│   ├── Message.tsx
│   ├── MessageInput.tsx
│   ├── OptionCard.tsx
│   ├── PossibilitiesPanel.tsx
│   ├── Settings.tsx
│   ├── SystemInstructions.tsx
│   └── __tests__/           # Component tests
├── hooks/                    # Custom React hooks
│   ├── useApiKeys.ts
│   ├── useAuthPopup.ts
│   ├── usePossibilities.ts
│   └── __tests__/
├── lib/                      # Utility libraries
│   └── auth.ts              # NextAuth configuration
├── services/                 # Business logic services
│   └── ai/                  # AI service implementations
├── types/                    # TypeScript type definitions
│   ├── ai.ts
│   ├── chat.ts
│   └── next-auth.d.ts       # NextAuth type extensions
└── utils/                    # Utility functions
    ├── crypto.ts
    ├── logprobs.ts
    └── __tests__/
```

## Authentication & Security

### NextAuth.js Configuration
- **Provider**: GitHub OAuth
- **Session Strategy**: JWT tokens
- **Custom Pages**: Sign-in and error pages
- **Session Callbacks**: User ID mapping

### Environment Variables Required
```bash
# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key

# GitHub OAuth
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# Secrets Encryption (dedicated key for user secret encryption)
KV_ENCRYPTION_KEY=your-secrets-encryption-key

# Vercel KV (for cloud storage of encrypted secrets)
KV_URL=your-kv-url
KV_REST_API_URL=your-kv-rest-api-url
KV_REST_API_TOKEN=your-kv-rest-api-token
```

## AI Integration

### Supported Providers
- **OpenAI**: GPT models with streaming support
- **Anthropic**: Claude models
- **Google**: Gemini models
- **Mistral**: Mistral AI models
- **Together AI**: Open-source models

### AI Service Architecture
- **Client-Side**: Direct API calls from browser (current implementation)
- **Streaming**: Real-time response generation
- **Multi-Model**: Parallel generation across providers
- **Error Handling**: Robust error recovery and fallbacks

## Testing

### Test Structure
The project has comprehensive test coverage with 39 test files:

**Component Tests** (`app/components/__tests__/`):
- Authentication components (AuthPopup, AuthProvider, LoginButton)
- Chat interface (ChatContainer, Message, MessageInput)
- UI components (Menu, Settings, AttachmentPreview)

**Service Tests** (`app/services/ai/__tests__/`):
- AI service implementations
- Provider configurations
- Error handling and variations

**Utility Tests** (`app/utils/__tests__/`):
- Crypto utilities
- Logprobs calculations
- Integration tests

### Test Environment
- **Framework**: Vitest with jsdom environment
- **Setup**: `app/setupTests.ts` with comprehensive mocks
- **Coverage**: Components, hooks, services, and utilities
- **Commands**: `npm test` for single run, `npm run test:watch` for development

### Mock Configuration
The test setup includes mocks for:
- NextAuth.js authentication
- Next.js navigation
- Web Crypto API
- IndexedDB
- Fetch API for external requests

## Development Guidelines

### Component Development
1. **Server vs Client Components**: Use Server Components for data fetching, Client Components for interactivity
2. **Authentication**: Wrap authenticated pages with proper auth checks
3. **Type Safety**: Leverage TypeScript for all components and APIs
4. **Testing**: Write comprehensive tests for all new components

### API Development
1. **Route Handlers**: Use Next.js App Router API routes
2. **Authentication**: Verify user sessions in API routes
3. **Error Handling**: Return appropriate HTTP status codes
4. **Validation**: Validate input data and API responses

### Security Best Practices
1. **Environment Variables**: Never commit secrets to the repository
2. **Authentication**: Always verify user sessions for protected routes
3. **Input Validation**: Sanitize and validate all user inputs
4. **HTTPS**: Ensure all external API calls use HTTPS

## Deployment

### Vercel Configuration
- **Framework**: Next.js automatically detected
- **Environment Variables**: Configure in Vercel dashboard
- **Build Command**: `npm run build`
- **Output Directory**: `.next` (automatic)
- **Node Version**: 18.x or later

### CORS Configuration
The `next.config.mjs` includes CORS headers for API routes to support client-side AI provider calls.

## Migration Notes

### From Vite/React to Next.js
The project successfully migrated from a client-side React SPA to Next.js:

1. **Build System**: Vite → Next.js with TypeScript
2. **Routing**: React Router → App Router
3. **Authentication**: Client-side storage → NextAuth.js
4. **Components**: Preserved all existing React components
5. **Testing**: Maintained all test coverage with updated mocks

### Key Changes
- Updated `package.json` scripts for Next.js
- Migrated components from `src/` to `app/` directory
- Added NextAuth.js configuration
- Updated TypeScript configuration for Next.js
- Preserved all existing functionality and UI

## TypeScript Configuration

### Key Settings
- **Target**: ES2017 for broad compatibility
- **Strict Mode**: Disabled for flexibility during migration
- **JSX**: Preserve mode for Next.js processing
- **Module Resolution**: Node.js style
- **Types**: Includes Vitest globals for testing

### Import Patterns
- Use `import type` for type-only imports
- Leverage Next.js automatic path resolution
- Maintain proper type safety across components

## Performance Considerations

### Next.js Optimizations
- **Server-Side Rendering**: Automatic for Server Components
- **Image Optimization**: Next.js Image component for assets
- **Bundle Splitting**: Automatic code splitting
- **Caching**: Vercel Edge Cache for static assets

### Best Practices
- Use Server Components for data-heavy operations
- Implement proper loading states
- Optimize bundle size with dynamic imports
- Leverage Vercel's deployment optimizations