# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an "Infinite Chat" project that transforms a proof-of-concept chat interface into a production-ready web application. The project aims to create a multi-model AI chat interface that shows multiple response possibilities from various AI models simultaneously.

## Architecture

### Current State
- **POC**: Single HTML file (`infinite-chat-ui-poc.html`) with inline CSS and JavaScript
- **Tech Stack**: Vanilla JavaScript, HTML5, CSS3

### Target Architecture (from project plan)
- **Frontend**: React with TypeScript
- **AI Integration**: Vercel AI SDK
- **Build Tool**: Vite
- **Deployment**: GitHub Pages with GitHub Actions
- **Security**: Web Crypto API for client-side encryption
- **Styling**: Tailwind CSS

## Key Features

1. **Multi-Model Support**: Integrates with OpenAI, Anthropic, Google, Mistral, and HuggingFace models
2. **Infinite Possibilities Panel**: Shows multiple AI responses with probability scores
3. **Live Streaming Mode**: Real-time response generation as user types
4. **Secure API Key Storage**: Client-side encryption using Web Crypto API
5. **Multimodal Support**: File attachments (images, audio, documents)
6. **User Response Suggestions**: AI-powered suggestions for user replies

## Development Commands

Since this is currently a static HTML project transitioning to React/TypeScript:

### For the current POC:
- Open `infinite-chat-ui-poc.html` directly in a browser
- No build process required

### For the future React project (once initialized):
```bash
# Install dependencies
npm install

# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Deploy to GitHub Pages
npm run deploy

# Run tests
npm test

# Type checking
npm run typecheck

# Linting
npm run lint
```

## Important Implementation Notes

1. **API Key Management**: The app stores API keys in localStorage with plans for encryption via Web Crypto API
2. **Response Generation**: Each model generates 3-5 variations with different temperature settings
3. **Probability Calculation**: Uses logprobs from AI responses when available
4. **Mobile Optimization**: Responsive design with touch-friendly interactions
5. **Performance**: Virtual scrolling for handling 100+ response options

## Security Considerations

- API keys are never sent to any backend
- All API calls are made directly from the browser
- Planned implementation of AES-GCM encryption for stored keys
- Auto-lock feature after 15 minutes of inactivity

## Testing

### Test Structure
The project has comprehensive tests for the SecureStorage crypto functionality:

- **Location**: `src/utils/__tests__/`
- **Test Files**: 
  - `crypto.simple.test.ts` - Basic setup tests
  - `crypto.basic.test.ts` - Environment availability tests  
  - `crypto.test.ts` - Core functionality tests
  - `crypto.integration.test.ts` - End-to-end integration tests
  - `crypto.security.test.ts` - Security-focused tests

### Test Environment Setup
- **Framework**: Vitest with jsdom environment
- **Setup File**: `src/setupTests.ts` contains comprehensive mocks for:
  - Web Crypto API (`crypto.subtle.*`)
  - IndexedDB (with proper async request/response handling)
  - Key generation tracking and state management

### Mock Implementation Details
The test mocks are designed to simulate real crypto operations:

- **Key Generation**: Tracked with generation IDs to distinguish between lock vs clearAll scenarios
- **Encryption/Decryption**: Uses base64 encoding with Unicode support via URL-safe encoding
- **State Management**: `encryptedDataStore` and `keyStore` maps track crypto operations
- **Fallback Logic**: Allows decryption when `encryptedDataStore.size > 0` (lock scenario) but blocks after `clearAll()`

### Important Testing Notes
1. **Run Tests**: Use `npm test` - all 45 tests should pass
2. **Mock Behavior**: Tests distinguish between manual lock (preserves keys) vs clearAll (clears everything)
3. **No Skipped Tests**: All tests are functional - previous timing-dependent tests were removed
4. **Unicode Support**: Tests handle special characters and emojis correctly
5. **Security Validation**: Tests verify that decryption fails with wrong keys after clearAll

### Test Coverage Areas
- ✅ Key generation and storage
- ✅ Encryption and decryption operations
- ✅ Auto-lock functionality
- ✅ Manual lock/unlock operations
- ✅ Data integrity and corruption handling
- ✅ Unicode and special character support
- ✅ Security key validation
- ✅ Error recovery scenarios
- ✅ Concurrent operations
- ✅ Large data handling