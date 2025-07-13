# 2025-01-13-20:15 - Dynamic Social Media Previews Implementation

## Issue Details
**Issue Title**: Implement dynamic social media previews for shared conversations
**Issue Description**: Social media previews are boring and generic. They always present the same tile even if I share a specific conversation. Need dynamic previews that show the first user question as title and AI responses as content, including which AI models answered.
**Dependencies**: app/conversation/[id]/page.tsx, app/types/conversation.ts, Next.js metadata API
**Started**: 2025-01-13 19:45
**Completed**: 2025-01-13 20:15

## Summary
Successfully implemented dynamic social media previews for shared conversations that display conversation-specific content including user questions, AI responses with model names, and multi-AI comparison indicators.

## Changes Made

### Files Modified
- app/conversation/[id]/page.tsx - Converted to server component with generateMetadata function
- app/conversation/[id]/__tests__/page.test.tsx - Updated to test ConversationClient instead of page component

### Files Created
- app/conversation/[id]/ConversationClient.tsx - Extracted client component logic from original page.tsx
- docs/social-media-preview-design.md - Comprehensive design document following software engineering best practices

### Tests Added/Modified
- app/conversation/[id]/__tests__/page.test.tsx - Updated imports and component references to work with new architecture

## Architecture Decisions

### Design Choices
Implemented separation of concerns by splitting the original client component into:
1. Server component (page.tsx) - Handles metadata generation for social media crawlers
2. Client component (ConversationClient.tsx) - Handles interactive UI and state management

This follows Next.js App Router patterns where generateMetadata must be in a server component but the interactive features require client-side rendering.

### Trade-offs
- Added architectural complexity by splitting one component into two
- Gained ability to generate dynamic metadata server-side for social media crawlers
- Maintained all existing functionality without breaking changes

### Patterns Used
- Template Method Pattern: Server component wraps client component
- Separation of Concerns: Metadata generation separate from UI logic
- Graceful Degradation: Comprehensive fallback handling for all edge cases

## Implementation Notes

### Key Algorithms/Logic
1. **Metadata Extraction Logic**:
   - Extract first user message for title (truncated to 60 chars)
   - Extract first AI response for description with model name
   - For multiple AI responses: show two different models with 75 chars each
   - Clean model names by removing provider prefixes (e.g., "openai/gpt-4" becomes "gpt-4")

2. **Multi-AI Response Stitching**:
   - Prioritize responses from different AI models
   - Format as "model1: response1... | model2: response2..."
   - Add "AI Chat Sandbox" branding suffix to all descriptions

### External Dependencies
No new dependencies added. Used existing Next.js metadata API and conversation types.

### Performance Considerations
- Server-side rendering for metadata generation
- 1-hour cache (revalidate: 3600) for conversation data
- Minimal data fetching only for metadata needs
- Proper URL construction for different environments (local, Vercel, production)

## Testing Strategy
- All existing tests continue to pass (614 tests)
- Updated test imports to work with new component structure
- Manual testing recommended with social media debugging tools:
  - Facebook Sharing Debugger
  - Twitter Card Validator
  - LinkedIn Post Inspector
  - Discord/Slack preview testing

## Known Issues/Future Work
- Could add dynamic preview images showing actual conversation bubbles
- Could implement structured data (JSON-LD) for better SEO
- Could add privacy controls for conversation preview visibility
- Could add analytics tracking for social media clicks

## Integration Points
- Integrates with existing conversation API at /api/conversations/[id]
- Uses existing SharedConversation type from app/types/conversation.ts
- Works with existing conversation sharing functionality
- Maintains compatibility with all current features (authentication, possibility selection, etc.)

## Deployment/Configuration Changes
Requires NEXT_PUBLIC_BASE_URL environment variable to be set for proper URL generation in metadata. Supports fallback to Vercel URL or localhost for development.

## Related Documentation
- docs/social-media-preview-design.md - Complete design document with architecture diagrams and implementation strategy
- CLAUDE.md - Updated with task completion checklist requirements

## Lessons Learned
1. Next.js App Router requires server components for generateMetadata - cannot be done in client components
2. Proper separation of concerns enables both dynamic metadata and interactive features
3. Comprehensive error handling and fallbacks are essential for social media crawlers
4. Performance optimization through caching is crucial for server-side metadata generation
5. Following established patterns (like Dave Farley's principles) leads to maintainable, testable code