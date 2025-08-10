# Authentication Provider Implementation Guide

This guide explains how to add different authentication providers (OAuth, social logins) to the CrunchyCone starter template.

## Overview

The current authentication system supports:

- Email/Password authentication
- Magic link authentication

This guide shows how to extend it with OAuth providers like Google, GitHub, Facebook, etc.

## Authentication Flow Architecture

```
User → Auth Provider → Callback → Create/Update User → Create Session → Redirect
```

## Implementing OAuth Providers

### 1. Google OAuth

#### Install Dependencies

```bash
npm install google-auth-library
```

#### Environment Variables

```env
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback/google
```

#### Create Google OAuth Routes

Create `app/api/auth/google/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";

export async function GET(request: NextRequest) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "consent",
  });

  return NextResponse.redirect(`${GOOGLE_AUTH_URL}?${params}`);
}
```

Create `app/api/auth/callback/google/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";
import { PrismaClient } from "@prisma/client";
import { createSession } from "@/lib/auth/auth";

const prisma = new PrismaClient();
const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");

    if (!code) {
      return NextResponse.redirect(new URL("/auth/signin?error=no_code", request.url));
    }

    // Exchange code for tokens
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    // Get user info
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token!,
      audience: process.env.GOOGLE_CLIENT_ID!,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return NextResponse.redirect(new URL("/auth/signin?error=no_email", request.url));
    }

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { email: payload.email },
    });

    if (!user) {
      // Create new user
      user = await prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            email: payload.email,
            last_signed_in: new Date(),
          },
        });

        // Create profile
        await tx.userProfile.create({
          data: {
            user_id: newUser.id,
            first_name: payload.given_name || null,
            last_name: payload.family_name || null,
          },
        });

        // Assign default user role
        const userRole = await tx.role.findUnique({
          where: { name: "user" },
        });

        if (userRole) {
          await tx.userRole.create({
            data: {
              user_id: newUser.id,
              role_id: userRole.id,
            },
          });
        }

        return newUser;
      });
    } else {
      // Update last sign in
      await prisma.user.update({
        where: { id: user.id },
        data: { last_signed_in: new Date() },
      });
    }

    // Create session
    await createSession(user.id);

    return NextResponse.redirect(new URL("/", request.url));
  } catch (error) {
    console.error("Google OAuth error:", error);
    return NextResponse.redirect(new URL("/auth/signin?error=oauth_error", request.url));
  }
}
```

### 2. GitHub OAuth

#### Environment Variables

```env
GITHUB_CLIENT_ID=your-client-id
GITHUB_CLIENT_SECRET=your-client-secret
GITHUB_REDIRECT_URI=http://localhost:3000/api/auth/callback/github
```

#### Create GitHub OAuth Routes

Create `app/api/auth/github/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";

const GITHUB_AUTH_URL = "https://github.com/login/oauth/authorize";

export async function GET(request: NextRequest) {
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID!,
    redirect_uri: process.env.GITHUB_REDIRECT_URI!,
    scope: "read:user user:email",
  });

  return NextResponse.redirect(`${GITHUB_AUTH_URL}?${params}`);
}
```

Create `app/api/auth/callback/github/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { createSession } from "@/lib/auth/auth";

const prisma = new PrismaClient();

interface GitHubUser {
  id: number;
  email: string | null;
  name: string | null;
  login: string;
}

interface GitHubEmail {
  email: string;
  primary: boolean;
  verified: boolean;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");

    if (!code) {
      return NextResponse.redirect(new URL("/auth/signin?error=no_code", request.url));
    }

    // Exchange code for access token
    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      return NextResponse.redirect(new URL("/auth/signin?error=no_token", request.url));
    }

    // Get user info
    const userResponse = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    const githubUser: GitHubUser = await userResponse.json();

    // Get primary email if not public
    let email = githubUser.email;
    if (!email) {
      const emailResponse = await fetch("https://api.github.com/user/emails", {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      });

      const emails: GitHubEmail[] = await emailResponse.json();
      const primaryEmail = emails.find((e) => e.primary && e.verified);
      email = primaryEmail?.email || null;
    }

    if (!email) {
      return NextResponse.redirect(new URL("/auth/signin?error=no_email", request.url));
    }

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Create new user
      user = await prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            email,
            last_signed_in: new Date(),
          },
        });

        // Parse name
        const nameParts = githubUser.name?.split(" ") || [];
        const firstName = nameParts[0] || null;
        const lastName = nameParts.slice(1).join(" ") || null;

        // Create profile
        await tx.userProfile.create({
          data: {
            user_id: newUser.id,
            first_name: firstName,
            last_name: lastName,
          },
        });

        // Assign default user role
        const userRole = await tx.role.findUnique({
          where: { name: "user" },
        });

        if (userRole) {
          await tx.userRole.create({
            data: {
              user_id: newUser.id,
              role_id: userRole.id,
            },
          });
        }

        return newUser;
      });
    } else {
      // Update last sign in
      await prisma.user.update({
        where: { id: user.id },
        data: { last_signed_in: new Date() },
      });
    }

    // Create session
    await createSession(user.id);

    return NextResponse.redirect(new URL("/", request.url));
  } catch (error) {
    console.error("GitHub OAuth error:", error);
    return NextResponse.redirect(new URL("/auth/signin?error=oauth_error", request.url));
  }
}
```

### 3. Generic OAuth2 Provider

Create a reusable OAuth2 handler in `lib/auth/oauth.ts`:

```typescript
import { PrismaClient } from "@prisma/client";
import { createSession } from "./auth";

const prisma = new PrismaClient();

export interface OAuthUserInfo {
  email: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
}

export async function handleOAuthCallback(userInfo: OAuthUserInfo) {
  // Find or create user
  let user = await prisma.user.findUnique({
    where: { email: userInfo.email },
  });

  if (!user) {
    // Create new user
    user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: userInfo.email,
          last_signed_in: new Date(),
        },
      });

      // Create profile
      await tx.userProfile.create({
        data: {
          user_id: newUser.id,
          first_name: userInfo.firstName || null,
          last_name: userInfo.lastName || null,
        },
      });

      // Assign default user role
      const userRole = await tx.role.findUnique({
        where: { name: "user" },
      });

      if (userRole) {
        await tx.userRole.create({
          data: {
            user_id: newUser.id,
            role_id: userRole.id,
          },
        });
      }

      return newUser;
    });
  } else {
    // Update last sign in
    await prisma.user.update({
      where: { id: user.id },
      data: { last_signed_in: new Date() },
    });
  }

  // Create session
  await createSession(user.id);

  return user;
}
```

## Adding OAuth Buttons to Sign In

Update `components/auth/SignInForm.tsx`:

```typescript
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Github, Chrome } from "lucide-react"; // Use Chrome icon for Google

// Add to your SignInForm component
export function SignInForm() {
  // ... existing code ...

  return (
    <div className="space-y-4">
      {/* OAuth Buttons */}
      <div className="space-y-2">
        <Button
          variant="outline"
          className="w-full"
          onClick={() => window.location.href = "/api/auth/google"}
        >
          <Chrome className="mr-2 h-4 w-4" />
          Continue with Google
        </Button>

        <Button
          variant="outline"
          className="w-full"
          onClick={() => window.location.href = "/api/auth/github"}
        >
          <Github className="mr-2 h-4 w-4" />
          Continue with GitHub
        </Button>
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <Separator />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or continue with email
          </span>
        </div>
      </div>

      {/* Existing tabs for email/password and magic link */}
      <Tabs defaultValue="password" className="w-full">
        {/* ... existing code ... */}
      </Tabs>
    </div>
  );
}
```

## Security Considerations

### 1. State Parameter

Prevent CSRF attacks by using state parameter:

```typescript
// Generate state
const state = crypto.randomBytes(16).toString("hex");
// Store in session/cookie
cookies().set("oauth_state", state, { httpOnly: true, maxAge: 600 });

// Add to OAuth URL
params.append("state", state);

// Verify in callback
const storedState = cookies().get("oauth_state")?.value;
if (state !== storedState) {
  throw new Error("Invalid state parameter");
}
```

### 2. Account Linking

Handle existing accounts with different auth methods:

```typescript
// Check if email already exists with different auth method
const existingUser = await prisma.user.findUnique({
  where: { email: userInfo.email },
  include: { authMethods: true },
});

if (existingUser && !existingUser.authMethods.find((m) => m.provider === provider)) {
  // Link account or show error
  return NextResponse.redirect("/auth/link-account");
}
```

### 3. Email Verification

Consider email verification for OAuth users:

```typescript
// Store OAuth provider info
await prisma.authMethod.create({
  data: {
    user_id: user.id,
    provider: "google",
    provider_user_id: googleUserId,
    email_verified: true, // OAuth providers verify emails
  },
});
```

## Database Schema Updates

Add auth methods tracking:

```prisma
model AuthMethod {
  id              Int       @id @default(autoincrement())
  created_at      DateTime  @default(now())
  updated_at      DateTime  @updatedAt
  deleted_at      DateTime?

  user_id         Int
  provider        String    // 'email', 'google', 'github', etc.
  provider_user_id String?  // ID from OAuth provider
  email_verified  Boolean   @default(false)

  user            User      @relation(fields: [user_id], references: [id])

  @@unique([provider, provider_user_id])
  @@index([user_id])
}

model User {
  // ... existing fields ...
  authMethods     AuthMethod[]
}
```

## Advanced Features

### 1. Multiple Auth Methods

Allow users to link multiple auth methods:

```typescript
// In account settings
export async function linkAuthMethod(userId: number, provider: string) {
  // Redirect to OAuth flow with linking parameter
  const params = new URLSearchParams({
    linking: "true",
    user_id: userId.toString(),
  });

  return NextResponse.redirect(`/api/auth/${provider}?${params}`);
}
```

### 2. Social Profile Data

Store additional profile data:

```typescript
model SocialProfile {
  id              Int       @id @default(autoincrement())
  user_id         Int
  provider        String
  avatar_url      String?
  profile_url     String?
  raw_data        Json?     // Store full profile data

  user            User      @relation(fields: [user_id], references: [id])

  @@unique([user_id, provider])
}
```

### 3. Refresh Tokens

Store and refresh OAuth tokens:

```typescript
model OAuthToken {
  id              Int       @id @default(autoincrement())
  user_id         Int
  provider        String
  access_token    String    @db.Text
  refresh_token   String?   @db.Text
  expires_at      DateTime?

  user            User      @relation(fields: [user_id], references: [id])

  @@unique([user_id, provider])
}
```

## Provider-Specific Configurations

### Facebook OAuth

```typescript
const FACEBOOK_AUTH_URL = "https://www.facebook.com/v12.0/dialog/oauth";
const params = {
  client_id: process.env.FACEBOOK_APP_ID,
  redirect_uri: process.env.FACEBOOK_REDIRECT_URI,
  scope: "email,public_profile",
};
```

### Microsoft/Azure AD

```typescript
const MICROSOFT_AUTH_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize";
const params = {
  client_id: process.env.MICROSOFT_CLIENT_ID,
  response_type: "code",
  redirect_uri: process.env.MICROSOFT_REDIRECT_URI,
  scope: "openid profile email",
};
```

### Discord OAuth

```typescript
const DISCORD_AUTH_URL = "https://discord.com/api/oauth2/authorize";
const params = {
  client_id: process.env.DISCORD_CLIENT_ID,
  redirect_uri: process.env.DISCORD_REDIRECT_URI,
  response_type: "code",
  scope: "identify email",
};
```

## Testing OAuth Locally

### 1. Use ngrok for HTTPS

```bash
npm install -g ngrok
ngrok http 3000
```

### 2. Update OAuth Redirect URIs

Use the ngrok URL for redirect URIs:

```
https://your-subdomain.ngrok.io/api/auth/callback/google
```

### 3. Test Accounts

Most providers offer test accounts or sandbox environments for development.

## Troubleshooting

### Common Issues

1. **Redirect URI Mismatch**
   - Ensure exact match including protocol and trailing slashes
   - Check for localhost vs 127.0.0.1

2. **Scope Errors**
   - Verify requested scopes are enabled in OAuth app
   - Some scopes require app verification

3. **Token Expiration**
   - Implement token refresh logic
   - Handle expired tokens gracefully

4. **Email Not Provided**
   - Some users hide email on GitHub
   - Request additional scopes
   - Provide alternative sign-up flow

## Best Practices

1. **Error Handling**: Always redirect to sign-in page with error parameter
2. **Loading States**: Show loading during OAuth redirect
3. **Account Linking**: Provide UI for linking/unlinking auth methods
4. **Security**: Always validate state parameter and use HTTPS
5. **Privacy**: Only request necessary scopes
6. **UX**: Clearly indicate which auth method was used
