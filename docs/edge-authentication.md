# Edge Runtime Authentication

## Overview

This document explains the Edge Runtime-compatible authentication implementation that solves the JWT token verification issues in Next.js middleware.

## Problem Solved

The original implementation faced issues where JWT tokens could not be verified in middleware due to:

- Edge Runtime vs Node.js runtime differences
- Environment variable access patterns
- `jsonwebtoken` library incompatibility with Edge Runtime

## Solution Architecture

### 1. Dual Authentication Strategy

We maintain two separate authentication implementations:

- **`lib/auth/auth.ts`** - Node.js runtime (Server Components, API Routes)
  - Uses `jsonwebtoken` library
  - Full Node.js capabilities
  - Handles all server-side authentication

- **`lib/auth/edge-auth.ts`** - Edge Runtime (Middleware)
  - Uses `jose` library v6 (Edge-compatible)
  - Limited Edge Runtime environment
  - Handles middleware authentication checks

### 2. Token Structure

JWT tokens contain minimal information for security:

```json
{
  "userId": "user-id-here",
  "type": "access|verification|reset|magic_link"
}
```

**Note**: Email is intentionally NOT included in tokens to prevent exposure of sensitive information.

### 3. Cookie Configuration

Cookies are configured with explicit security settings:

```typescript
{
  httpOnly: true,              // Not accessible via JavaScript
  secure: true,                // HTTPS only in production
  sameSite: "lax",            // CSRF protection
  maxAge: 60 * 60 * 24 * 7,   // 7 days
  path: "/"                    // Available site-wide
}
```

## Implementation Details

### Edge-Compatible Token Verification

```typescript
// Uses jose library for Edge Runtime
export async function verifyTokenEdge(token: string): Promise<EdgeSession | null> {
  const secret = new TextEncoder().encode(JWT_SECRET);
  const { payload } = await jose.jwtVerify(token, secret, {
    algorithms: ["HS256"],
  });
  // ... validation logic
}
```

### Middleware Authentication Flow

1. Request arrives at middleware
2. Extract token from cookies
3. Verify token using Edge-compatible function
4. Allow/deny access based on authentication state
5. Add security headers to response

### Protected Routes

The middleware automatically protects:

- `/admin/*` - Admin dashboard
- `/profile/*` - User profiles
- `/dashboard/*` - User dashboards

### Debug Logging

In development mode, comprehensive logging helps troubleshoot issues:

- Token generation/verification
- Session creation/retrieval
- Middleware decisions
- Edge Runtime environment details

## Security Considerations

1. **JWT_SECRET** must be properly configured in production
2. Tokens do not contain sensitive information (no email, PII)
3. HTTP-only cookies prevent XSS attacks
4. SameSite policy prevents CSRF attacks
5. Secure flag ensures HTTPS in production

## Invalid Token Handling

When a JWT token becomes invalid (e.g., after changing JWT_SECRET):

- The token is treated as if no session exists
- Users are redirected to sign in
- Cookies cannot be deleted in Server Components (Next.js limitation)
- Invalid tokens are simply ignored until they expire or user signs in again

## Testing

To test the implementation:

1. Ensure `JWT_SECRET` is set in `.env`
2. Run the application in development mode
3. Monitor console logs for authentication flow
4. Test protected routes with/without authentication

## Troubleshooting

### Token Verification Fails in Middleware

Check:

- JWT_SECRET is available in Edge Runtime
- Token format matches expected structure
- jose library is properly installed

### Cookies Not Being Sent

Verify:

- Same domain/subdomain
- HTTPS in production
- SameSite policy compatibility

### Debug Mode

Enable debug logging by running in development:

```bash
NODE_ENV=development npm run dev
```

## Future Enhancements

1. Add role-based checks in middleware
2. Implement token refresh mechanism
3. Add rate limiting in middleware
4. Enhanced security headers
