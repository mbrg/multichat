# Share Feature Spec and Design

## Overview
This document defines requirements and design for adding a Share button that allows users to share conversations to social media.

## Goals
- Enable users to easily share entire conversations when possibilities are displayed or after selection.
- Generate shareable image/GIF of conversation exactly as it appears on an iPhone-sized screen.
- Provide a URL that encodes the conversation state without storing data server-side.
- Offer quick posting to LinkedIn, X, and BlueSky with engaging text.

## Non-Goals
- Persisting conversation history on the server.
- Creating accounts on social platforms.

## User Flow
1. User taps **Share** in the chat header.
2. A menu appears with options:
   - **Download Image** – captures a screenshot of the entire chat in mobile layout.
   - **Download GIF** – captures a scrolling GIF for long chats.
   - **Copy URL** – places shareable link on clipboard.
   - **LinkedIn**, **X**, **BlueSky** – open the platform's share dialog with image and URL attached plus a short message.

## Functional Requirements
- Share menu opens from header next to existing menu button.
- **Download Image** generates PNG of the chat container using `html2canvas` with mobile viewport width (390px). If chat height exceeds the screen, the image should include the entire conversation vertically.
- **Download GIF** creates a GIF that scrolls the chat from top to bottom. Use `gifshot` to build an animation by capturing frames while scrolling the container.
- **Copy URL** encodes conversation messages in the query string as base64 JSON. The app loads this data and reconstructs messages when such a URL is opened.
- Social buttons pre-fill posts with the generated image and URL. Include ten‑word catchy text: "Check this AI convo – endless possibilities made real!".

## Technical Constraints
- Client-only implementation; no new server endpoints.
- Links must not exceed common URL length limits (~2000 characters). Large conversations will show an error message instructing user to trim the chat.
- All new UI components must use existing Tailwind styles and follow project pattern of small focused components.

## Design
### Components
- **ShareButton** – icon button in `ChatHeader`. Toggles `ShareMenu`.
- **ShareMenu** – floating menu with actions.
- **useShare.ts** – hook exposing functions:
  - `downloadImage(container: HTMLElement)`
  - `downloadGif(container: HTMLElement)`
  - `copyShareUrl(messages: Message[])`
  - `shareTo(platform: 'linkedin' | 'x' | 'bluesky', data: {imageUrl: string, url: string})`

### Image Capture
- Use `html2canvas` to render `#chat-container` at 390px width.
- Temporarily apply CSS scale to mimic iPhone viewport.
- Resulting canvas is converted to blob and downloaded as `chat.png`.

### GIF Capture
- Scroll container from top to bottom capturing frames with `html2canvas` at regular intervals.
- Build GIF using `gifshot.createGIF` with 2 fps.
- Download as `chat.gif`.

### URL Encoding
- Serialize `messages` array (only id, role, content, model). Compress with `LZ-String` and encode with base64url.
- Share URL format: `${window.location.origin}?share=<encoded>`
- When page loads, check for `share` param. If present, decode and populate chat state.

### Social Sharing
- After generating image and URL, open platform share endpoints:
  - **LinkedIn**: `https://www.linkedin.com/sharing/share-offsite/?url=<URL>`
  - **X**: `https://twitter.com/intent/tweet?text=<TEXT>&url=<URL>`
  - **BlueSky**: `https://bsky.app/intent/compose?text=<TEXT> <URL>`
- Use `navigator.share` when available for generic sharing fallback.

## Error Handling
- If image/GIF generation fails, display toast with error message.
- If encoded URL exceeds 2000 chars, show warning and skip copying.

## Testing
- Unit tests for `useShare` functions using mocked DOM.
- Integration test ensuring chat can be reconstructed from encoded URL.

