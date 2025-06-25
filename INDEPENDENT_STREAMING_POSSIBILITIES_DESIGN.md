# Independent Streaming Possibilities Design

## Overview

This document outlines the architectural design for converting the current bulk possibilities generation to independent streaming possibilities with lazy loading. The goal is to enable each possibility to stream independently, display results as they become available, and only load possibilities that users actually view.

## Current Architecture Analysis

### Existing Implementation

The current system (`/api/chat/completions`) generates all possibilities upfront using:
- **Bulk Generation**: All permutations created simultaneously
- **Simulated Streaming**: Token streaming simulated by word splitting
- **Memory Intensive**: All possibilities kept in memory
- **Fixed Concurrency**: Hardcoded 10 parallel executions

### Key Files
- API Route: `app/api/chat/completions/route.ts`
- UI Component: `app/components/PossibilitiesPanel.tsx`
- State Management: `app/hooks/usePossibilities.ts`
- Chat Integration: `app/hooks/useAIChat.ts`

### Current Limitations
1. **False Streaming**: Splits completed responses into tokens rather than true streaming
2. **Bulk Generation**: Creates unnecessary load and delays
3. **Memory Inefficiency**: All possibilities loaded regardless of visibility
4. **No Real Lazy Loading**: Only display pagination, not generation

## New Architecture Design

### Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  Possibilities  │    │ Possibility Pool │    │ Individual API  │
│     Panel       │◄──►│    Manager       │◄──►│   Endpoints     │
│   (React UI)    │    │ (State + Queue)  │    │ /possibility/:id│
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌────────▼────────┐             │
         │              │ Viewport        │             │
         └─────────────►│ Observer        │             │
                        │ (Intersection)  │             │
                        └─────────────────┘             │
                                  │                     │
                        ┌─────────▼────────┐           │
                        │ Loading Queue    │           │
                        │ (Priority-based) │◄──────────┘
                        └──────────────────┘
```

### Core Components

#### 1. Individual Possibility API

**New Endpoint**: `/api/possibility/[id]`

```typescript
POST /api/possibility/[id]
{
  message: string,
  settings: UserSettings,
  permutation: {
    provider: string,
    model: string,
    temperature: number,
    systemInstruction?: string
  }
}

// Returns: SSE stream with true token-level streaming
```

**Features:**
- True token-level streaming from AI providers
- Individual possibility generation
- Proper error handling and cancellation
- Connection management and cleanup

#### 2. Possibility Pool Manager

```typescript
interface PossibilityPool {
  // Lazy generation of possibility IDs
  generatePossibilityIds(message: string, settings: UserSettings): string[]
  
  // Queue management
  queuePossibility(id: string, priority: 'high' | 'medium' | 'low'): void
  cancelPossibility(id: string): void
  
  // State tracking
  getPossibilityStatus(id: string): 'pending' | 'loading' | 'streaming' | 'complete' | 'error'
  getPossibilityResult(id: string): Possibility | null
}
```

**Responsibilities:**
- Generate possibility metadata without running inference
- Manage loading queue with priority-based execution
- Track possibility states and results
- Handle connection pooling and cleanup

#### 3. Viewport Observer

```typescript
interface ViewportObserver {
  // Track visible possibilities
  observePossibility(id: string, element: HTMLElement): void
  unobservePossibility(id: string): void
  
  // Callbacks for visibility changes
  onEnterViewport(callback: (id: string) => void): void
  onExitViewport(callback: (id: string) => void): void
  
  // Preloading zone (load before fully visible)
  setPreloadMargin(pixels: number): void
}
```

**Configuration:**
```typescript
const observerConfig = {
  rootMargin: '200px', // Load 200px before entering viewport
  threshold: [0, 0.1, 0.5, 1.0] // Multiple thresholds for fine-grained control
}
```

### Lazy Loading & Virtualization

#### Virtual Scrolling Implementation

```typescript
interface VirtualizedPossibilities {
  // Viewport calculations
  viewportHeight: number
  itemHeight: number
  visibleRange: { start: number; end: number }
  bufferSize: number // Items to render outside viewport
  
  // Data management
  totalItems: number
  loadedItems: Map<number, Possibility>
  
  // Loading strategies
  loadStrategy: 'viewport' | 'progressive' | 'on-demand'
  preloadDistance: number // Load N items ahead
}
```

#### Loading Strategies

1. **Viewport-Only**: Load only visible + buffer items
2. **Progressive**: Load visible first, then continue loading background items
3. **On-Demand**: Load only when user scrolls to specific items

## Implementation Plan

### Step 1: API Architecture Refactoring (2-3 days)

#### 1.1 Create Individual Possibility Endpoint
- **File**: `app/api/possibility/[id]/route.ts`
- **Purpose**: Single possibility generation with true streaming
- **Changes**: Extract possibility execution logic from bulk endpoint

#### 1.2 Metadata Generation Service
- **File**: `app/services/PossibilityMetadataService.ts`
- **Purpose**: Generate possibility IDs and metadata without running inference
- **Features**: Permutation calculation, ID generation, priority assignment

#### 1.3 True Streaming Implementation
- **Modify**: AI provider implementations to support real token streaming
- **Add**: Token-level streaming from AI SDK (not simulated word splitting)

### Step 2: Client-Side State Management (3-4 days)

#### 2.1 Possibility Pool Manager
- **File**: `app/hooks/usePossibilityPool.ts`
- **Features**: 
  - Queue management with priorities
  - Connection pooling for SSE streams
  - Cancellation and cleanup

#### 2.2 Viewport Observer Hook
- **File**: `app/hooks/useViewportObserver.ts`
- **Features**:
  - Intersection Observer integration
  - Preload margin configuration
  - Visibility tracking

#### 2.3 Virtualized Possibilities Hook
- **File**: `app/hooks/useVirtualizedPossibilities.ts`
- **Features**:
  - Virtual scrolling calculations
  - Dynamic item rendering
  - Scroll position management

### Step 3: UI Component Updates (2-3 days)

#### 3.1 Refactor PossibilitiesPanel
- **Add**: Virtual scrolling support
- **Add**: Loading placeholders for pending possibilities
- **Add**: Error states for failed possibilities

#### 3.2 Individual Possibility Component
- **File**: `app/components/PossibilityItem.tsx`
- **Features**:
  - Streaming state display
  - Error handling
  - Retry functionality

#### 3.3 Loading Skeleton Components
- **Purpose**: Smooth loading experience
- **Features**: Animated placeholders matching possibility layout

### Step 4: Performance Optimization (1-2 days)

#### 4.1 Connection Management
- **Implement**: Max concurrent connections limit
- **Add**: Connection reuse and pooling
- **Add**: Automatic cleanup of completed streams

#### 4.2 Memory Management
- **Add**: LRU cache for completed possibilities
- **Implement**: Garbage collection for off-screen items
- **Add**: Memory usage monitoring

#### 4.3 Caching Strategy
- **Add**: Request deduplication
- **Implement**: Response caching with TTL
- **Add**: Offline capability for cached items

### Step 5: Testing & Integration (2-3 days)

#### 5.1 Unit Tests
- Possibility Pool Manager tests
- Viewport Observer tests
- Virtual scrolling logic tests

#### 5.2 Integration Tests
- End-to-end lazy loading scenarios
- Stream cancellation and cleanup
- Error handling and recovery

#### 5.3 Performance Tests
- Memory usage under load
- Scroll performance with large datasets
- Connection handling stress tests

## Technical Specifications

### Possibility Object Structure

```typescript
interface Possibility {
  id: string
  provider: string
  model: string
  content: string
  temperature: number
  systemInstruction?: string
  probability: number | null
  logprobs?: LogProbData
  timestamp: Date
  metadata: {
    permutationId: string
    hasLogprobs: boolean
  }
  status: 'pending' | 'loading' | 'streaming' | 'complete' | 'error'
}
```

### SSE Event Types

```typescript
// Server-Sent Events for individual possibilities
interface PossibilityEvents {
  'possibility_start': { id: string, metadata: PossibilityMetadata }
  'token': { id: string, token: string, isComplete: boolean }
  'probability': { id: string, probability: number, logprobs?: LogProbData }
  'possibility_complete': { id: string, finalContent: string }
  'possibility_error': { id: string, error: string, retryable: boolean }
}
```

### Configuration Options

```typescript
interface LazyLoadingConfig {
  // Viewport settings
  preloadMargin: number // Pixels to preload before viewport
  bufferSize: number // Items to render outside viewport
  
  // Loading settings
  maxConcurrentConnections: number
  connectionTimeout: number
  retryAttempts: number
  
  // Caching settings
  cacheSize: number // Max cached possibilities
  cacheTTL: number // Cache time-to-live in ms
  
  // Performance settings
  virtualScrolling: boolean
  itemHeight: number // Fixed height for virtual scrolling
  loadingStrategy: 'viewport' | 'progressive' | 'on-demand'
}
```

## Timeline & Milestones

### Implementation Timeline: 10-15 days total

**Week 1**: API refactoring and core state management
- Days 1-3: Individual possibility API and metadata service
- Days 4-7: Client-side state management hooks

**Week 2**: UI updates and performance optimization
- Days 8-10: Component updates and virtual scrolling
- Days 11-12: Performance optimization and connection management

**Week 3**: Testing, refinement, and integration
- Days 13-15: Comprehensive testing and integration

### Risk Mitigation

1. **Backward Compatibility**: Maintain existing bulk API as fallback
2. **Gradual Rollout**: Feature flag for new lazy loading system
3. **Performance Monitoring**: Real-time metrics for loading performance
4. **Error Recovery**: Graceful degradation to bulk loading on failures

## Benefits

### Architecture Benefits
- **True Streaming**: Real token-level streaming from AI providers
- **Independent Generation**: Each possibility loads independently
- **Efficient Resource Usage**: Only load what users view
- **Scalable**: Handles large numbers of possibilities efficiently

### User Experience Benefits
- **Immediate Results**: Display possibilities as they become available
- **Smooth Scrolling**: Virtual scrolling with loading placeholders
- **Progressive Loading**: No waiting for all possibilities to complete
- **Better Performance**: Reduced memory usage and faster initial load

### Technical Benefits
- **Memory Efficiency**: Virtualized rendering and garbage collection
- **Connection Management**: Proper pooling and cleanup
- **Error Resilience**: Individual failures don't affect other possibilities
- **Testability**: Modular architecture with clear separation of concerns

## Conclusion

This design provides a robust foundation for independent streaming possibilities with lazy loading, following Dave Farley's principles of incremental development and continuous delivery. The architecture ensures optimal performance, excellent user experience, and maintainable code structure.