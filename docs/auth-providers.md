# Google OAuth Setup Guide

This guide explains how to enable Google OAuth authentication in the CrunchyCone starter template using Auth.js v4.

## Overview

The authentication system currently supports:

- **Email/Password**: Traditional credentials-based authentication
- **Magic Link**: Email-based passwordless authentication (optional)
- **Google OAuth**: Social login with Google (requires setup)

The application uses Auth.js v4 with dynamic provider configuration - OAuth providers are automatically enabled based on environment variables.

## Auth.js Architecture

```
User → Auth.js Provider → OAuth Service → Callback → Auth.js Session → Redirect
```

Auth.js handles all the OAuth complexity including:
- Token exchange and validation
- User session creation
- Security (CSRF, state validation)
- Database integration via Prisma adapter

## Implementing OAuth Providers with Auth.js

### Prerequisites

Auth.js is already installed and configured. To add OAuth providers, you simply need to:
1. Install the provider package
2. Add environment variables  
3. Update the Auth.js configuration
4. Add provider buttons to the UI

> **🚀 Recommended First Provider**: Google OAuth is the easiest to set up and most widely used. Start with Google before adding other providers.

## Google OAuth Setup

Google OAuth is already integrated into the application via Auth.js v4. You just need to configure the credentials and enable it.

### Step 1: Create Google OAuth Application

1. **Go to [Google Cloud Console](https://console.cloud.google.com/)**
2. **Create or select a project**
3. **Configure OAuth consent screen**:
   - Go to "APIs & Services" → "OAuth consent screen"
   - Choose "External" user type (unless you have Google Workspace)
   - Fill in required fields: App name, User support email, Developer contact
   - Add your domain to authorized domains if deploying to production
4. **Create OAuth 2.0 Credentials**:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth 2.0 Client IDs"
   - Choose "Web application"
   - Add authorized redirect URIs:
     - **Development**: `http://localhost:3000/api/auth/callback/google`
     - **Production**: `https://yourdomain.com/api/auth/callback/google`
5. **Copy Client ID and Secret** from the credentials page

### Step 2: Environment Variables

Add to your `.env` file:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id-here.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret-here

# Enable Google OAuth in the application
NEXT_PUBLIC_ENABLE_GOOGLE_AUTH=true
```

> **🔐 Security**: Keep credentials secure and never commit them to version control.

### Step 3: Restart Development Server

That's it! The application will automatically:
- Detect the Google OAuth credentials in environment variables
- Enable the Google OAuth provider in Auth.js configuration  
- Show the "Continue with Google" button on the sign-in page

Restart your development server to apply the changes:

```bash
npm run dev
```

### Step 4: Test Google OAuth

1. **Go to the sign-in page**: `http://localhost:3000/auth/signin`
2. **Click "Continue with Google"** button
3. **Complete OAuth flow**:
   - You'll be redirected to Google's login page
   - Sign in with your Google account
   - Grant permissions to your app
   - You'll be redirected back and automatically signed in
4. **Verify user creation**: Check your profile at `/profile` or admin dashboard

> **🎉 Success**: If you can sign in with Google and see your user information, Google OAuth is working correctly!

## Current Implementation Details

The Google OAuth integration includes several advanced features:

### Dynamic Provider Configuration

The application uses environment-based provider detection. Google OAuth is enabled when:
- `NEXT_PUBLIC_ENABLE_GOOGLE_AUTH=true` 
- `GOOGLE_CLIENT_ID` is set
- `GOOGLE_CLIENT_SECRET` is set

If any of these are missing, the Google button won't appear on the sign-in form.

### Automatic Features

The Google OAuth integration includes several automatic features:

**1. Dynamic Provider Loading**
```typescript
// lib/auth/providers.ts automatically detects Google auth availability
export function isGoogleAuthEnabled(): boolean {
  return (
    process.env.NEXT_PUBLIC_ENABLE_GOOGLE_AUTH === "true" &&
    !!process.env.GOOGLE_CLIENT_ID &&
    !!process.env.GOOGLE_CLIENT_SECRET
  )
}
```

**2. Automatic Role Assignment**
- New Google OAuth users automatically get the "user" role
- Existing users logging in via Google maintain their existing roles
- Admin users signing in with Google keep admin privileges

**3. Profile Data Sync**
- Name and avatar automatically populated from Google profile
- Missing profile data fetched when linking Google to existing accounts
- Avatar URLs stay synchronized with Google profile changes

**4. Account Linking**
- Users can link Google OAuth to existing email/password accounts
- Automatic profile enrichment when linking accounts
- Users can disconnect Google OAuth if they have email/password backup

## Profile Management Features

Once Google OAuth is set up, users get access to comprehensive profile management:

### User Profile Page (`/profile`)

**Features available:**
- View user information (email, name, member since, last sign-in)
- Display user avatar with fallback to initials
- Show role badges (admin role highlighted)
- Manage OAuth account connections

### Account Linking & Disconnection

**Linking Google to Existing Accounts:**
1. Sign in with email/password
2. Go to `/profile`
3. Click "Link Google Account" in the Account Linking section
4. Complete Google OAuth flow
5. Profile automatically enriched with Google data (name, avatar)

**Disconnecting Google OAuth:**
1. Go to `/profile` 
2. Find connected Google account
3. Click the disconnect icon (⚡) next to "Connected" badge
4. Confirm disconnection

**Safety Features:**
- Can only disconnect if user has email/password authentication
- Server-side validation prevents account lockout
- Clear error messages if disconnection not allowed

## Environment Configuration

### Complete Environment Setup

Here's a complete `.env` example with Google OAuth enabled:

```env
# Database
DATABASE_URL="file:./prisma/db/prod.db"

# Auth.js
AUTH_SECRET="your-secret-key-at-least-32-characters-long"

# Google OAuth
GOOGLE_CLIENT_ID="123456789-abcdef.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-your-google-client-secret"

# Provider Controls (all optional, defaults shown)
NEXT_PUBLIC_ENABLE_EMAIL_PASSWORD=true    # Email/password auth
NEXT_PUBLIC_ENABLE_GOOGLE_AUTH=true       # Google OAuth  
NEXT_PUBLIC_ENABLE_MAGIC_LINK=false       # Magic link auth

# Application
NEXT_PUBLIC_APP_URL="http://localhost:3000"
EMAIL_FROM="noreply@example.com"
```

### Disable/Enable Providers

**To disable Google OAuth:**
```env
NEXT_PUBLIC_ENABLE_GOOGLE_AUTH=false
# or remove the variable entirely
```

**To disable email/password:**
```env
NEXT_PUBLIC_ENABLE_EMAIL_PASSWORD=false
```

**To enable magic link:**
```env
NEXT_PUBLIC_ENABLE_MAGIC_LINK=true
```

## Troubleshooting Google OAuth

### Common Issues

**1. "Continue with Google" button not appearing**
- Check `NEXT_PUBLIC_ENABLE_GOOGLE_AUTH=true` in `.env`
- Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set
- Restart development server after changing environment variables

**2. "Redirect URI mismatch" error**
- Ensure Google Cloud Console redirect URI exactly matches:
  - Dev: `http://localhost:3000/api/auth/callback/google`
  - Prod: `https://yourdomain.com/api/auth/callback/google`
- Check for trailing slashes (should not have them)
- Verify protocol (http vs https)

**3. "Error 400: invalid_request"**
- Client ID format should be: `123456789-abcdef.apps.googleusercontent.com`
- Secret format should be: `GOCSPX-your-secret-here`
- Check for extra spaces or quotes in environment variables

**4. "Sign in failed" after Google redirect**
- Check browser console for detailed error messages
- Verify your Google account email is accessible
- Some users hide email on Google - they must enable email sharing

**5. Profile data not syncing**
- Ensure Google account has public name and picture
- Check that OAuth consent screen requests profile and email scopes
- Name and avatar sync happens on next sign-in

### Debug Mode

Enable detailed Auth.js logging:

```env
NEXTAUTH_DEBUG=true
```

### Testing Checklist

✅ Google Cloud Console OAuth app configured  
✅ Redirect URIs match exactly  
✅ Environment variables set correctly  
✅ Development server restarted  
✅ OAuth consent screen configured  
✅ Test Google account ready  

## Adding Additional Providers

The architecture supports adding more OAuth providers in the future. The pattern would be:

1. **Environment Variables**: Add provider credentials to `.env`
2. **Dynamic Detection**: Update `lib/auth/providers.ts` to detect new provider
3. **Auth Configuration**: Add provider to `lib/auth/auth-config.ts` build function
4. **UI Components**: Update sign-in form to show new provider button

Popular providers that could be added:
- **GitHub**: Developer-focused applications
- **Facebook**: Consumer applications  
- **Discord**: Gaming/community applications
- **Microsoft**: Enterprise applications
- **Apple**: iOS app integration

## Summary

Google OAuth is now fully integrated with:

✅ **Easy Setup**: Just add credentials to environment variables  
✅ **Dynamic Configuration**: Automatically enables when credentials present  
✅ **Profile Management**: Full account linking and disconnection features  
✅ **Data Sync**: Automatic profile enrichment and avatar updates  
✅ **Security**: Safe disconnection with account lockout prevention  
✅ **User Experience**: Seamless sign-in and profile management  

**Next Steps:**
1. Follow the setup guide to configure Google Cloud Console
2. Add credentials to your `.env` file  
3. Test the complete OAuth flow
4. Explore profile management features at `/profile`
5. Consider adding additional providers as needed

The Google OAuth integration provides a solid foundation for social authentication while maintaining security and user control.
