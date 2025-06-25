# AI SDK Integration Design

## Overview

This document outlines the comprehensive design for integrating the existing AI SDK with the UI, removing all mocks and implementing real AI-powered possibility generation with streaming support.

## Architecture Overview

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│   Frontend  │────▶│  API Routes  │────▶│   AI Service    │
│     (UI)    │◀────│  (Backend)   │◀────│ (SDK & Providers)│
└─────────────┘     └──────────────┘     └─────────────────┘
      SSE               Unified              Multiple
   Streaming           Endpoint             Providers
```

## Core Components

### 1. Backend API Design

#### Main Chat API Endpoint: `/api/chat`

**POST /api/chat/completions**
```typescript
// Request
interface ChatCompletionRequest {
  messages: ChatMessage[]
  settings: {
    systemPrompt?: string
    enabledProviders: string[]
    systemInstructions: SystemInstruction[]
    temperatures: number[]
  }
  options: {
    maxTokens?: number      // Default: 100 for possibilities, full for continuation
    stream?: boolean        // Default: true
    mode: 'possibilities' | 'continuation'
    continuationId?: string // For continuing a specific possibility
  }
}

// Response (for non-streaming)
interface ChatCompletionResponse {
  possibilities: PossibilityResponse[]
}

// Individual possibility response
interface PossibilityResponse {
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
}
```

**Streaming Response Format (Server-Sent Events)**
```
data: {"type": "possibility_start", "data": {"id": "...", "provider": "...", "model": "..."}}
data: {"type": "token", "data": {"id": "...", "token": "Hello"}}
data: {"type": "probability", "data": {"id": "...", "probability": 0.85}}
data: {"type": "possibility_complete", "data": {"id": "..."}}
data: {"type": "done"}
```

### 2. Possibility Generation System

#### Permutation Generator
```typescript
class PermutationGenerator {
  generatePermutations(settings: ChatSettings): Permutation[] {
    const permutations: Permutation[] = []
    
    // For each enabled provider and its models
    for (const provider of settings.enabledProviders) {
      for (const model of getModelsForProvider(provider)) {
        // For each temperature
        for (const temperature of settings.temperatures) {
          // For each system instruction (including none)
          const instructions = [null, ...settings.systemInstructions]
          for (const instruction of instructions) {
            permutations.push({
              id: generatePermutationId(provider, model, temperature, instruction),
              provider,
              model,
              temperature,
              systemInstruction: instruction,
              systemPrompt: settings.systemPrompt
            })
          }
        }
      }
    }
    
    return permutations
  }
}
```

#### Parallel Execution Manager
```typescript
class PossibilityExecutor {
  async executePossibilities(
    messages: ChatMessage[],
    permutations: Permutation[],
    options: ExecutionOptions
  ): AsyncGenerator<PossibilityEvent> {
    // Create promise pool for parallel execution
    const pool = new PromisePool(permutations, {
      concurrency: 10, // Limit concurrent API calls
      onProgress: (result) => this.handleResult(result)
    })
    
    // Execute all permutations
    for await (const event of pool.execute()) {
      yield event
    }
  }
}
```

### 3. Streaming Architecture

#### Server-Side Streaming Handler
```typescript
// app/api/chat/completions/route.ts
export async function POST(request: Request) {
  const body = await request.json()
  
  // Create SSE stream
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      
      // Generate permutations
      const permutations = permutationGenerator.generatePermutations(body.settings)
      
      // Execute possibilities with streaming
      for await (const event of possibilityExecutor.executePossibilities(
        body.messages,
        permutations,
        body.options
      )) {
        const data = `data: ${JSON.stringify(event)}\n\n`
        controller.enqueue(encoder.encode(data))
      }
      
      controller.enqueue(encoder.encode('data: {"type": "done"}\n\n'))
      controller.close()
    }
  })
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  })
}
```

#### Client-Side Streaming Consumer
```typescript
// app/hooks/useAIChat.ts
export function useAIChat() {
  const generatePossibilities = async (
    messages: ChatMessage[],
    settings: ChatSettings,
    onUpdate: (possibility: PossibilityResponse) => void
  ) => {
    const response = await fetch('/api/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        settings,
        options: { maxTokens: 100, stream: true, mode: 'possibilities' }
      })
    })
    
    const reader = response.body?.getReader()
    const decoder = new TextDecoder()
    
    while (true) {
      const { done, value } = await reader!.read()
      if (done) break
      
      const chunk = decoder.decode(value)
      const lines = chunk.split('\n')
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const event = JSON.parse(line.slice(6))
          handleStreamEvent(event, onUpdate)
        }
      }
    }
  }
}
```

### 4. Probability Calculation

```typescript
class ProbabilityCalculator {
  calculateProbability(
    provider: string,
    response: AIResponse
  ): number | null {
    // If provider supports logprobs
    if (hasLogprobSupport(provider) && response.logprobs) {
      return this.calculateFromLogprobs(response.logprobs)
    }
    
    // Fallback: return null for providers without logprob support
    return null
  }
  
  private calculateFromLogprobs(logprobs: LogProbData): number {
    // Average the log probabilities and convert to probability
    const avgLogprob = logprobs.tokens.reduce(
      (sum, token) => sum + token.logprob, 
      0
    ) / logprobs.tokens.length
    
    return Math.exp(avgLogprob)
  }
}
```

### 5. UI Integration Points

#### Update ChatDemo Component
```typescript
// Remove all mock generation
// Replace with real API calls
const generateAIResponse = async (userMessage: Message) => {
  const settings = await fetchUserSettings()
  const possibilities: Message[] = []
  
  await generatePossibilities(
    [...messages, userMessage],
    settings,
    (possibility) => {
      // Update or add possibility in real-time
      const existing = possibilities.find(p => p.id === possibility.id)
      if (existing) {
        existing.content = possibility.content
        existing.probability = possibility.probability
      } else {
        possibilities.push(mapPossibilityToMessage(possibility))
      }
      
      // Trigger re-render with updated possibilities
      setAssistantMessage(prev => ({
        ...prev,
        possibilities: [...possibilities]
      }))
    }
  )
}
```

#### Continuation Feature
```typescript
const continuePossibility = async (possibility: Message) => {
  const response = await fetch('/api/chat/completions', {
    method: 'POST',
    body: JSON.stringify({
      messages: [...messages, userMessage, possibility],
      settings,
      options: {
        maxTokens: 1000,
        stream: true,
        mode: 'continuation',
        continuationId: possibility.id
      }
    })
  })
  
  // Stream the continuation
  await streamResponse(response, (content) => {
    updatePossibilityContent(possibility.id, content)
  })
}
```

## Implementation Plan

### Phase 1: Backend Infrastructure (Priority: High)
1. Create `/api/chat/completions` endpoint
2. Implement permutation generator
3. Add streaming support with SSE
4. Integrate with existing AI service

### Phase 2: Probability & Logprobs (Priority: High)
1. Implement probability calculation for each provider
2. Add logprob extraction where supported
3. Create fallback for providers without logprobs

### Phase 3: UI Integration (Priority: High)
1. Remove all mocks from ChatDemo
2. Implement useAIChat hook
3. Add streaming support to Message component
4. Update possibility display with real data

### Phase 4: Continuation Feature (Priority: Medium)
1. Add continuation endpoint support
2. Implement UI for expanding possibilities
3. Add token count tracking

### Phase 5: Performance & Polish (Priority: Medium)
1. Add request queuing and rate limiting
2. Implement caching for repeated requests
3. Add error handling and retry logic
4. Optimize streaming performance

## Security Considerations

1. **API Key Management**: All API keys retrieved server-side only
2. **Rate Limiting**: Implement per-user rate limits
3. **Token Limits**: Enforce max token limits
4. **Request Validation**: Validate all inputs server-side
5. **Error Handling**: Never expose API errors to client

## Testing Strategy

1. **Unit Tests**: Test permutation generation, probability calculation
2. **Integration Tests**: Test API endpoints with mock providers
3. **E2E Tests**: Test full flow from UI to AI responses
4. **Performance Tests**: Test concurrent request handling

## Migration Steps

1. Deploy backend endpoints alongside existing code
2. Add feature flag for new AI integration
3. Gradually migrate users to new system
4. Remove mock code once stable