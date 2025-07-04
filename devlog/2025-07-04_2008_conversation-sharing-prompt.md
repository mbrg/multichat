# 2025-07-04 - Conversation Sharing Prompt

## Issue Details
**Issue Title**: Conversation Sharing Implementation Review
**Issue Description**: Summarize the full context and requirements for enabling conversation sharing with Vercel Blob storage. Provide a clear prompt for future contributors to understand the goal and incorporate previous feedback.
**Dependencies**: Many files across `app/components`, `app/api`, and `app/services`.
**Started**: 2025-07-04
**Completed**: 2025-07-04

## Summary
Document the complete objective for conversation sharing and highlight key requirements so future contributors can continue confidently.

## Changes Made

### Files Created
- `devlog/2025-07-04_2008_conversation-sharing-prompt.md` - outlines the overall project goals and recent feedback.

### Prompt for Future Codex
You are continuing a Next.js project that implements a chat sandbox with "infinite possibilities". The latest milestone added conversation sharing via Vercel Blob storage. Review the following requirements and ensure all future changes respect them:

1. **Conversation Persistence**
   - Store each conversation including any visible possibilities in Vercel Blob storage under a unique, cryptographically-secure UUID. Use `randomUUID()` and check with `head()` to avoid collisions.
   - Record the creator's `userId` along with the messages and timestamp. Future features may rely on this metadata.
2. **API Endpoints**
   - `POST /api/conversations` saves a conversation. Log detailed errors if saving fails.
   - `GET /api/conversations/[id]` retrieves a conversation. Return `null` and log when not found.
3. **Conversation Page**
   - Anyone with the conversation URL can view it without authentication. If a session exists, allow them to continue the chat using existing components.
4. **Publish Button**
   - Located on the right side of the chat header as an icon. Disabled when the conversation is empty or when possibilities are still being generated.
   - Upon successful save, copy the share URL to the clipboard, show a brief clipboard indicator near the icon (using the `animate-fadeInOut` class), and navigate to `/conversation/[id]`.
   - Styled with the same gradient and hover effects as the send button so its availability is clear.
   - Possibility interactions (select/continue) remain gated by authentication.
5. **Navigation**
   - Clicking the header title returns to the home page.
6. **Testing & Quality**
   - Maintain the existing Vitest and ESLint setup. Add tests for any new logic or components.
   - Always run `npm run format` and `npm run ci` before committing. Address all errors and warnings.

This prompt should help future contributors understand the current state and expectations for conversation sharing. Continue to apply clean architecture principles and Dave Farley's quality standards.
