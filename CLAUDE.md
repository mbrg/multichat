# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Infinite Chat is a production-ready Next.js application that provides a multi-model AI chat interface with an "infinite possibilities" panel showing multiple AI responses simultaneously. The project emphasizes security, maintainability, and extensibility.

## Essential Commands

### Development
```bash
npm run dev          # Start Next.js development server (http://localhost:3000)
npm run vercel:dev   # Start Vercel development server with local environment
```

### Testing
```bash
npm test             # Run all tests once
npm run test:watch   # Run tests in watch mode
npm run test:ui      # Open Vitest UI for interactive testing
npm test -- path/to/test.ts  # Run a specific test file
```

### Code Quality
```bash
npm run lint         # Run ESLint
npm run typecheck    # Run TypeScript type checking
npm run format       # Format code with Prettier
npm run format:check # Check formatting without making changes
npm run ci           # Run all checks (lint, format, typecheck, test, build)
```

### Build & Deploy
```bash
npm run build        # Build for production
npm run vercel:build # Build using Vercel CLI
npm run vercel:deploy # Deploy to Vercel production
```

## Architecture Overview

### Core Design Patterns

1. **Template Method Pattern**: AI providers extend `AIProviderBase` abstract class
   - Common functionality in base class (chat, probabilities, validation)
   - Provider-specific implementation in subclasses
   - Location: `app/services/ai/base.ts` and provider implementations

2. **Service Layer Pattern**: Business logic separated from UI components
   - AI services in `app/services/ai/`
   - KV storage abstraction in `app/services/kv/`
   - Clean separation between presentation and business logic

3. **Repository Pattern**: KV store interface abstracts storage implementation
   - Interface: `app/types/kv.ts`
   - Implementations: `app/services/kv/vercel.ts` (production), `app/services/kv/memory.ts` (testing)

### Key Architectural Decisions

1. **Security-First Approach**:
   - API keys encrypted client-side using Web Crypto API (AES-GCM)
   - No plaintext secrets in localStorage
   - Cloud storage for encrypted keys via Vercel KV

2. **Multi-Model Support**:
   - Unified interface for OpenAI, Anthropic, Google, Mistral, Together AI
   - Real logprob-based probability calculations where supported
   - Fallback estimation for providers without logprob support

3. **Component Structure**:
   - Feature-based organization in `app/components/`
   - Reusable form components with validation
   - Provider-specific components for API key management

4. **Testing Strategy**:
   - 320+ tests with comprehensive coverage
   - Mock implementations for external services
   - Integration tests for critical paths

### Important Files & Locations

- **AI Provider Implementations**: `app/services/ai/[provider].ts`
- **Chat Interface**: `app/components/Chat.tsx`
- **Possibilities Panel**: `app/components/Possibilities.tsx`
- **API Key Management**: `app/components/providers/`
- **Type Definitions**: `app/types/`
- **Constants**: `app/constants/`
- **API Routes**: `app/api/`

### Recent Architecture Changes

The project underwent a comprehensive architectural audit (2025-06-25) that:
- Eliminated 95% code duplication in AI providers through base class extraction
- Reduced component complexity by 50%+ through proper separation of concerns
- Enabled TypeScript strict mode for better type safety
- Implemented proper error boundaries and validation

## Development Notes

- Always check existing patterns before implementing new features
- Maintain TypeScript strict mode compliance
- Follow the established service layer pattern for business logic
- Use the KV store interface for any storage needs
- Ensure new AI providers extend `AIProviderBase` and implement required methods
- Run `npm run ci` before committing to ensure all checks pass