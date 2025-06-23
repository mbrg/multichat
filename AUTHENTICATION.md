# Authentication Setup

This document explains how to set up Vercel native user authentication with GitHub and Google OAuth providers for the Infinite Chat application.

## Overview

The application uses NextAuth.js for authentication, which provides secure, production-ready OAuth integration with GitHub and Google. Users must sign in to access the AI chat functionality.

## Features

- **GitHub OAuth**: Sign in with GitHub account
- **Google OAuth**: Sign in with Google account  
- **Secure Sessions**: JWT-based session management
- **Protected Routes**: Chat interface requires authentication
- **Custom UI**: Branded sign-in pages matching the app's dark theme
- **Error Handling**: Custom error pages for authentication failures

## Setup Instructions

### 1. Environment Variables

Copy the `.env.example` file to `.env.local` and configure the authentication variables:

```bash
cp .env.example .env.local
```

Add the following variables to your `.env.local` file:

```bash
# NextAuth.js Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here

# GitHub OAuth Configuration
GITHUB_CLIENT_ID=your-github-oauth-app-client-id
GITHUB_CLIENT_SECRET=your-github-oauth-app-client-secret

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
```

### 2. GitHub OAuth App Setup

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in the application details:
   - **Application name**: Infinite Chat
   - **Homepage URL**: `http://localhost:3000` (for development)
   - **Authorization callback URL**: `http://localhost:3000/api/auth/callback/github`
4. Click "Register application"
5. Copy the **Client ID** and **Client Secret** to your `.env.local` file

### 3. Google OAuth App Setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google+ API" and enable it
4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - Choose "Web application"
   - Add authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback/google` (for development)
     - `https://yourdomain.com/api/auth/callback/google` (for production)
5. Copy the **Client ID** and **Client Secret** to your `.env.local` file

### 4. Production Configuration

For production deployment on Vercel:

1. Set the `NEXTAUTH_URL` to your production domain:
   ```bash
   NEXTAUTH_URL=https://yourdomain.com
   ```

2. Generate a secure `NEXTAUTH_SECRET`:
   ```bash
   openssl rand -base64 32
   ```

3. Update your OAuth app redirect URIs to include your production domain

4. Add all environment variables to your Vercel project settings

## File Structure

```
app/
├── api/auth/[...nextauth]/route.ts    # NextAuth.js API route
├── auth/
│   ├── signin/page.tsx                # Custom sign-in page
│   └── error/page.tsx                 # Authentication error page
├── components/
│   ├── AuthProvider.tsx               # Session provider wrapper
│   └── LoginButton.tsx                # Login/logout UI component
├── lib/auth.ts                        # Authentication configuration
└── types/next-auth.d.ts               # TypeScript type extensions
```

## Usage

### Authentication State

The application checks authentication state on the main page:

- **Unauthenticated**: Shows welcome screen with sign-in options
- **Loading**: Displays loading spinner
- **Authenticated**: Shows full chat interface with user info and sign-out option

### Components

#### AuthProvider
Wraps the entire application to provide session context:

```tsx
import AuthProvider from './components/AuthProvider'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
```

#### LoginButton
Displays appropriate UI based on authentication state:

```tsx
import LoginButton from './components/LoginButton'

export default function Header() {
  return (
    <header>
      <h1>Infinite Chat</h1>
      <LoginButton />
    </header>
  )
}
```

### Session Hook

Use the `useSession` hook to access authentication state in components:

```tsx
import { useSession } from 'next-auth/react'

export default function MyComponent() {
  const { data: session, status } = useSession()

  if (status === 'loading') return <p>Loading...</p>
  if (status === 'unauthenticated') return <p>Not signed in</p>

  return <p>Signed in as {session.user.email}</p>
}
```

## Security Features

- **Secure Session Storage**: JWT tokens with secure secrets
- **CSRF Protection**: Built-in CSRF protection for all auth requests
- **Callback URL Validation**: Only allows configured redirect URIs
- **Session Expiration**: Automatic session management and renewal
- **Provider Validation**: OAuth flows validated by GitHub and Google

## Troubleshooting

### Common Issues

1. **Invalid Callback URL**: Ensure your OAuth app redirect URIs exactly match your configured URLs
2. **Missing Environment Variables**: Check that all required variables are set in `.env.local`
3. **NEXTAUTH_SECRET**: Generate a secure secret for production environments
4. **CORS Issues**: Verify your OAuth app domains are correctly configured

### Development Tips

- Use `http://localhost:3000` for local development URLs
- Test both GitHub and Google OAuth flows
- Check browser network tab for authentication errors
- Verify environment variables are loaded correctly

## Testing

The authentication components include comprehensive tests:

```bash
# Run authentication tests
npm test -- LoginButton.test.tsx AuthProvider.test.tsx

# Run all tests
npm test
```

Tests cover:
- Loading states
- Sign-in/sign-out functionality  
- Provider selection (GitHub/Google)
- Session state management
- Component rendering

## Next Steps

After setting up authentication:

1. Customize the sign-in page branding
2. Add additional OAuth providers if needed
3. Implement role-based access control
4. Add user profile management features
5. Configure analytics and monitoring