# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

chatsbox.ai is a production-ready Next.js application that provides a Chat Sandbox with an "infinite possibilities" panel showing multiple AI responses simultaneously. The project emphasizes security, maintainability, and extensibility.

## Essential Commands

### Development
```bash
npm run dev          # Start Next.js development server (http://localhost:3000)
npm run vercel:dev   # Start Vercel development server with local environment
```

### Testing
```bash
npm test             # Run all unit tests once
npm run test:watch   # Run unit tests in watch mode
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

1. **Template Method Pattern**: AI providers extend `AbstractAIProvider` abstract class
   - Common functionality in base class (chat, probabilities, validation, streaming)
   - Provider-specific implementation in subclasses
   - Location: `app/services/ai/providers/AbstractAIProvider.ts` and provider implementations

2. **Service Layer Pattern**: Business logic separated from UI components
   - AI services in `app/services/ai/`
   - KV storage abstraction in `app/services/kv/`
   - Clean separation between presentation and business logic

3. **Repository Pattern**: KV store interface abstracts storage implementation
   - Interface: `app/services/kv/IKVStore.ts`
   - Implementations: `app/services/kv/CloudKVStore.ts` (production), `app/services/kv/LocalKVStore.ts` (testing)

4. **Circuit Breaker Pattern**: Fault tolerance for AI provider operations
   - Implemented in `app/services/reliability/CircuitBreaker.ts`
   - Automatic recovery and cascade failure prevention
   - Integrated with `AbstractAIProvider` for all AI operations

5. **Queue Pattern**: Priority-based loading queue with concurrent execution limits
   - Implemented in `app/hooks/useSimplePossibilities.ts`
   - Connection pooling via `app/services/ConnectionPoolService.ts`
   - Manages up to 6 concurrent streaming connections

### Key Architectural Decisions

1. **Security-First Approach**:
   - API keys encrypted client-side using Web Crypto API (AES-GCM)
   - No plaintext secrets in localStorage
   - Cloud storage for encrypted keys via Upstash Redis (KV abstraction)

2. **Multi-Model Support**:
   - Unified interface for OpenAI, Anthropic, Google, Mistral, Together AI
   - Real logprob-based probability calculations where supported
   - Fallback estimation for providers without logprob support

3. **Component Structure**:
   - Feature-based organization in `app/components/`
   - Reusable form components with validation
   - Provider-specific components for API key management
   - Virtual scrolling components for performance optimization

4. **Independent Streaming Architecture**:
   - Server-Sent Events (SSE) for real-time token streaming
   - Individual API endpoints per possibility (`/api/possibility/[id]`)
   - Priority-based queue management (popular models + standard settings = high priority)
   - Virtual scrolling with react-window reduces memory usage by 70%
   - Connection pooling prevents resource overload

5. **Testing Strategy**:
   - Comprehensive test suite using Vitest and React Testing Library
   - Mock implementations for external services
   - Integration tests for critical paths
   - Test files organized alongside source code

### Important Files & Locations

- **AI Provider Implementations**: `app/services/ai/providers/[provider].ts`
- **Abstract Provider Base**: `app/services/ai/providers/AbstractAIProvider.ts`
- **Chat Interface**: `app/components/ChatContainer.tsx` and `app/components/ChatDemo.tsx`
- **Streaming Possibilities**: `app/components/VirtualizedPossibilitiesPanel.tsx`
- **Possibility Management**: `app/hooks/useSimplePossibilities.ts`
- **Connection Pooling**: `app/services/ConnectionPoolService.ts`
- **Circuit Breaker**: `app/services/reliability/CircuitBreaker.ts`
- **Possibility Metadata**: `app/services/ai/PossibilityMetadataService.ts`
- **Individual Possibility API**: `app/api/possibility/[id]/route.ts`
- **API Key Management**: `app/components/providers/`
- **Type Definitions**: `app/types/`
- **Constants**: `app/constants/`
- **KV Storage Interface**: `app/services/kv/IKVStore.ts` 
- **Event Bus**: `app/services/events/EventBus.ts`
- **State Machine**: `app/services/state/PossibilityGenerationStateMachine.ts`
- **Logging Service**: `app/services/LoggingService.ts`
- **System Monitor**: `app/services/monitoring/SystemMonitor.ts`

### Recent Architecture Changes

The project underwent a comprehensive architectural audit and independent streaming implementation (2025-06-26) that:
- Eliminated 95% code duplication in AI providers through `AbstractAIProvider` base class
- Implemented independent streaming possibilities with Server-Sent Events (SSE)
- Added virtual scrolling reducing memory usage by 70% and initial load time by 60%
- Introduced priority-based queue management with connection pooling (max 6 concurrent)
- Added lazy loading with Intersection Observer API for viewport tracking
- Enabled TypeScript strict mode for better type safety
- Maintained backward compatibility with existing bulk generation system

## Development Notes

- Always check existing patterns before implementing new features
- Maintain TypeScript strict mode compliance
- Follow the established service layer pattern for business logic
- Use the KV store interface for any storage needs
- Ensure new AI providers extend `AbstractAIProvider` and implement required methods
- For new streaming features, follow the SSE pattern in `app/api/possibility/[id]/route.ts`
- Virtual scrolling components should use fixed item heights (180px) for predictable performance
- Implement proper connection pooling for concurrent operations (max 6 connections)
- Use priority-based queuing for user-facing features (popular models + standard settings = high priority)
- Follow the Circuit Breaker pattern for external service calls to prevent cascade failures
- Use the Event Bus for loose coupling between components (`app/services/events/EventBus.ts`)
- Implement proper error handling with the error types in `app/types/errors.ts`
- Run `npm run ci` before committing to ensure all checks pass

## Task Completion Checklist

Before completing any task, ALWAYS execute these steps in order:

1. **Format Code**: Execute `npm run format` to ensure consistent code formatting
2. **Run Full CI Pipeline**: Execute `npm run ci` and ensure it passes completely
   - Do NOT ignore warnings - fix root causes of all issues
   - All lint, format, typecheck, test, and build steps must pass
3. **Quality Gate**: Ask yourself "Would Dave Farley be proud of this work?"
   - Is the code clean, testable, and maintainable?
   - Are architectural patterns followed consistently?
   - Is technical debt minimized?
4. **Commit Guidelines**: If committing changes:
   - Do NOT add Claude as co-author
   - Use clear, descriptive commit messages
   - Include `🤖 Generated with [Claude Code](https://claude.ai/code)` footer only