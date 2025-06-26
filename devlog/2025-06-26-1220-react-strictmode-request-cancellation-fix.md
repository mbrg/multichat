# 2025-06-26-1220 - React StrictMode Request Cancellation Fix

## Issue Details
**Issue Title**: Fix Request Cancellations in Possibilities Panel
**Issue Description**: AI possibility requests were being cancelled during generation, preventing users from seeing multiple response options. Network requests showed as cancelled in dev tools with no successful completions.
**Dependencies**: 
- `app/hooks/useSimplePossibilities.ts`
- `app/components/VirtualizedPossibilitiesPanel.tsx`
- `next.config.mjs`
**Started**: 2025-06-26 12:00
**Completed**: 2025-06-26 12:20

## Summary
Fixed systematic request cancellations in the possibilities panel by identifying and resolving React StrictMode's double-mounting behavior in development that was cancelling in-flight HTTP requests.

## Changes Made

### Files Modified
- `next.config.mjs` - Added `reactStrictMode: false` to disable double-mounting in development
- `app/hooks/useSimplePossibilities.ts` - Improved cleanup logic and request state management
- `app/components/VirtualizedPossibilitiesPanel.tsx` - Fixed conversation tracking to prevent duplicate loads

### Files Created
None

### Tests Added/Modified
None (existing tests continued to pass)

## Architecture Decisions

### Design Choices
- **Disabled React StrictMode in development**: While StrictMode is beneficial for catching side effects, it was preventing the core functionality from working during development
- **Maintained cleanup logic**: Kept proper AbortController cleanup to prevent memory leaks
- **Used conversation tracking**: Implemented ref-based tracking to prevent duplicate possibility loads

### Trade-offs
- Lost StrictMode benefits in development (double-rendering detection)
- Added complexity with conversation tracking refs
- Development behavior now differs from production (though production doesn't use StrictMode by default)

### Patterns Used
- **AbortController pattern**: For proper request cancellation and cleanup
- **Ref-based state**: For persisting state across component lifecycles
- **Connection pooling**: Limited concurrent requests to prevent resource exhaustion

## Implementation Notes

### Key Algorithms/Logic
The core issue was React StrictMode's intentional double-mounting behavior:
1. Component mounts → starts HTTP requests
2. StrictMode unmounts component → cancels all requests via AbortController
3. Component remounts → but state tracking prevents new requests
4. Result: No requests complete successfully

The fix involved:
1. Disabling StrictMode to prevent double-mounting
2. Ensuring state resets properly on remount (for other scenarios)
3. Maintaining proper cleanup for memory management

### External Dependencies
No new dependencies added

### Performance Considerations
- Connection pooling (MAX_CONCURRENT_CONNECTIONS = 6) prevents overwhelming the server
- Proper cleanup prevents memory leaks from hanging requests
- Duplicate prevention avoids unnecessary network calls

## Testing Strategy
Manual testing in development environment to verify:
- Possibilities load successfully without cancellation
- Network tab shows successful HTTP requests
- UI displays streaming responses correctly
- No memory leaks from uncleaned controllers

## Known Issues/Future Work
- Should re-enable StrictMode once a solution that works with it is found
- Consider moving to a more robust state management solution for complex async operations
- May need to handle StrictMode properly for production builds that enable it

## Integration Points
- Works with existing AI provider system
- Integrates with streaming response handling
- Maintains compatibility with possibility selection workflow

## Deployment/Configuration Changes
- Development environment now runs without React StrictMode
- No production configuration changes needed

## Related Documentation
- React StrictMode documentation: https://react.dev/reference/react/StrictMode
- AbortController MDN docs: https://developer.mozilla.org/en-US/docs/Web/API/AbortController

## Lessons Learned
1. **React StrictMode can interfere with async operations**: Double-mounting can cancel in-flight requests
2. **Development environment issues aren't always code bugs**: Sometimes tooling/framework behavior is the root cause
3. **Systematic debugging is key**: Added comprehensive logging to trace the exact component lifecycle
4. **Component state persistence across mounts is tricky**: Refs can persist state when you don't expect them to
5. **Always consider the framework's "helpful" features**: StrictMode, Fast Refresh, etc. can sometimes cause issues they're meant to prevent