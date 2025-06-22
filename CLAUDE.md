# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an "Infinite Chat" project that transforms a proof-of-concept chat interface into a production-ready web application. The project aims to create a multi-model AI chat interface that shows multiple response possibilities from various AI models simultaneously.

## Architecture

### Current State
- **Status**: React TypeScript project successfully initialized and partially implemented
- **Completed**: Issues #1 (Foundation), #2 (Security), #3 (Chat Components)
- **Tech Stack**: React with TypeScript, Vite, Tailwind CSS
- **Components**: Complete chat interface with file upload support
- **Security**: Production-ready encrypted storage system
- **Testing**: Comprehensive test coverage (108 tests passing)

### Architecture Implementation
- **Frontend**: ✅ React with TypeScript (Vite)
- **AI Integration**: 🔄 Vercel AI SDK (pending - Issue #5)
- **Build Tool**: ✅ Vite configured and working
- **Deployment**: 🔄 GitHub Pages setup (pending - Issue #16)
- **Security**: ✅ Web Crypto API with AES-GCM encryption
- **Styling**: ✅ Tailwind CSS integrated

## Key Features

1. **Multi-Model Support**: Integrates with OpenAI, Anthropic, Google, Mistral, and HuggingFace models
2. **Infinite Possibilities Panel**: Shows multiple AI responses with probability scores
3. **Live Streaming Mode**: Real-time response generation as user types
4. **Secure API Key Storage**: Client-side encryption using Web Crypto API
5. **Multimodal Support**: File attachments (images, audio, documents)
6. **User Response Suggestions**: AI-powered suggestions for user replies

## Development Commands

Since this is currently a static HTML project transitioning to React/TypeScript:

### Development Workflow:
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

1. **API Key Management**: ✅ Secure encrypted storage using Web Crypto API with AES-GCM
2. **Chat Interface**: ✅ Complete responsive chat components with file upload support
3. **Response Generation**: 🔄 Multi-model variations (pending AI integration)
4. **Probability Calculation**: 🔄 Logprobs display (pending AI integration)
5. **Mobile Optimization**: ✅ Fully responsive design with touch-friendly interactions
6. **Performance**: 🔄 Virtual scrolling (pending - Issue #4)

## Security Considerations

- ✅ API keys are never sent to any backend
- ✅ All API calls made directly from the browser
- ✅ Production-ready AES-GCM encryption for stored keys
- ✅ Auto-lock feature after 15 minutes of inactivity
- ✅ Origin-bound CryptoKey storage in IndexedDB
- ✅ No user passwords required (seamless security)

## Testing

### Test Structure
The project has comprehensive test coverage across all implemented features:

**Security Tests** (`src/utils/__tests__/`) - 45 tests:
- `crypto.simple.test.ts` - Basic setup tests
- `crypto.basic.test.ts` - Environment availability tests  
- `crypto.test.ts` - Core functionality tests
- `crypto.integration.test.ts` - End-to-end integration tests
- `crypto.security.test.ts` - Security-focused tests

**Component Tests** (`src/components/__tests__/`) - 63 tests:
- `ChatContainer.test.tsx` - Main chat interface (10 tests)
- `Message.test.tsx` - Message display component (16 tests)
- `MessageInput.test.tsx` - Input with file upload (23 tests)
- `AttachmentPreview.test.tsx` - File preview component (14 tests)

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
1. **Run Tests**: Use `npm test` - all 108 tests should pass
2. **Mock Behavior**: Tests distinguish between manual lock (preserves keys) vs clearAll (clears everything)
3. **No Skipped Tests**: All tests are functional - previous timing-dependent tests were removed
4. **Unicode Support**: Tests handle special characters and emojis correctly
5. **Security Validation**: Tests verify that decryption fails with wrong keys after clearAll
6. **Component Coverage**: All React components have comprehensive test coverage
7. **User Interactions**: File uploads, form submissions, and accessibility are fully tested

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
- ✅ React component functionality
- ✅ User interactions and event handling
- ✅ File upload and attachment handling
- ✅ Responsive design behavior

## Development Guidelines

### Testing Requirements
**CRITICAL**: Always create comprehensive tests for any code you build. This includes:

1. **Component Tests**: Every React component must have tests covering:
   - Rendering with different props
   - User interactions (clicks, keyboard events, form submissions)
   - State changes and effects
   - Error states and edge cases
   - Accessibility features

2. **Utility Function Tests**: All utility functions must have tests covering:
   - Normal operation with various inputs
   - Edge cases and boundary conditions
   - Error handling
   - Performance characteristics

3. **Integration Tests**: Features that involve multiple components or systems must have integration tests

4. **Test Location**: Place tests in `__tests__` directories adjacent to the code they test:
   - `src/components/__tests__/` for component tests
   - `src/utils/__tests__/` for utility tests
   - `src/hooks/__tests__/` for custom hook tests

5. **Test Naming**: Use descriptive test names that explain the behavior being tested:
   - `renders correctly with required props`
   - `calls onSendMessage when form is submitted`
   - `validates file types before upload`

6. **Test Coverage**: Aim for >80% code coverage, ensuring all critical paths are tested

## Project Status Tracking

### Completed Features ✅
- **Issue #1**: React TypeScript project initialization with Vite
- **Issue #2**: Secure API key storage with Web Crypto API 
- **Issue #3**: Complete chat interface components with file upload support
- **Possibility Selection Flow**: Users can click on alternative responses to fix them in the conversation
- **Dark Theme Styling**: Complete redesign to match infinite-chat-ui-poc.html with dark theme colors, gradients, and modern UI

### Components Implemented ✅
- `ChatContainer` - Main chat interface with auto-scroll, responsive layout, possibility selection handling, and dark theme
- `Message` - Message display with dark theme styling, model info badges, attachments, and interactive possibilities panel
- `MessageInput` - Advanced input with dark theme, file upload, drag-and-drop, gradient send button, and validation
- `AttachmentPreview` - File preview with type-specific icons and remove functionality
- `ChatDemo` - Complete demo showing possibility selection flow with AI response generation
- Type definitions in `src/types/chat.ts` with possibility support

### Test Coverage ✅
- **Total Tests**: 124 passing (79 component tests + 45 security tests)
- **Coverage Areas**: Component rendering, user interactions, file handling, security, accessibility, possibility selection
- **Test Files**: 11 test files across components and utilities

### Next Development Priorities 🔄
Based on the project plan, the next issues to tackle are:
- **Issue #4**: Build Possibilities Panel (infinite response options)
- **Issue #5**: Integrate Vercel AI SDK for multi-model support
- **Issue #6**: Implement multi-response generation with temperature variations

### Development Workflow Requirements
**CRITICAL**: When completing any new feature or component:

1. **Always update this CLAUDE.md file** to reflect:
   - New completed features in the "Completed Features" section
   - New components in the "Components Implemented" section  
   - Updated test counts in the "Test Coverage" section
   - Any architectural changes or important implementation notes

2. **Update status indicators**:
   - Use ✅ for completed items
   - Use 🔄 for in-progress items
   - Use ⏳ for pending/blocked items

3. **Maintain test requirements**:
   - Always create comprehensive tests for new components
   - Update the total test count after adding new tests
   - Document any new testing patterns or requirements