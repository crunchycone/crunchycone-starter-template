# Security Guide

This document outlines the security features and best practices implemented in the CrunchyCone Vanilla Starter Project.

## Overview

The starter project implements multiple layers of security to protect against common web application vulnerabilities and attacks.

## Rate Limiting

### Protection Against Brute Force Attacks

Built-in rate limiting protects authentication endpoints from brute force attacks using `next-rate-limit` middleware.

**Implementation Files:**
- `lib/rate-limit.ts` - Rate limiting utility
- `middleware.ts` - Middleware integration
- Auth components - Error handling

### Rate Limits (Production)

| Endpoint | Limit | Description |
|----------|-------|-------------|
| **Auth Sign-in** | 3/minute | Login attempts |
| **Auth Sign-up** | 2/minute | Account creation |
| **Password Reset** | 2/minute | Reset requests |
| **General Auth** | 5/minute | Other auth endpoints |
| **Admin APIs** | 30/minute | Admin operations |

### Development Mode

Rate limits are significantly higher in development mode (100-1000 requests/minute) to facilitate testing and development.

### Features

- **IP Detection**: Automatic IP detection from `x-forwarded-for` and `x-real-ip` headers
- **HTTP Headers**: Proper rate limit headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`)
- **Error Messages**: User-friendly error messages in authentication forms
- **Logging**: Comprehensive logging for security monitoring

### Configuration

Rate limits can be customized in `lib/rate-limit.ts`:

```typescript
export const rateLimitConfigs = {
  authSignIn: {
    requests: isDevelopment ? 100 : 3,
    interval: 60 * 1000, // 1 minute
  },
  // ... other configurations
}
```

## Authentication Security

### Password Security

- **Bcrypt Hashing**: All passwords are hashed using bcrypt with appropriate salt rounds
- **Password Requirements**: Minimum 8 characters enforced client and server-side
- **Password Reset**: Secure token-based password reset with 1-hour expiration

### Session Management

- **JWT Tokens**: Secure JWT-based sessions with appropriate expiration
- **HTTP-Only Cookies**: Session cookies are HTTP-only to prevent XSS attacks
- **SameSite Protection**: CSRF protection with SameSite cookie attributes
- **Secure Cookies**: Cookies marked as secure in production (HTTPS only)

### OAuth Security

- **Provider Validation**: Proper OAuth state validation
- **Account Linking**: Secure account linking with email verification
- **Profile Sync**: Safe synchronization of OAuth profile data

## Input Validation

### Zod Schema Validation

All user inputs are validated using Zod schemas:

```typescript
const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
```

### SQL Injection Protection

- **Prisma ORM**: All database queries use Prisma's parameterized queries
- **No Raw SQL**: Avoid raw SQL queries to prevent injection attacks

## Authorization & Access Control

### Role-Based Access Control (RBAC)

- **Admin Protection**: All admin routes require admin role verification
- **Self-Protection**: Admins cannot remove their own admin status
- **Role Validation**: Server-side role checking on all protected endpoints

### API Route Protection

```typescript
// Example protected API route
export async function GET() {
  await requireRole("admin"); // Throws if not admin
  // ... protected logic
}
```

## Security Headers

Middleware automatically adds security headers:

```typescript
// Security headers added by middleware
response.headers.set("X-Frame-Options", "DENY");
response.headers.set("X-Content-Type-Options", "nosniff");
response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
```

## Data Protection

### Soft Deletes

- User data uses soft delete pattern (`deleted_at` timestamp)
- Provides data recovery options while maintaining user privacy

### PII Sanitization

- Structured logging with PII sanitization in production
- Sensitive data is masked in logs and error messages

### Environment Variables

- Automatic detection and masking of sensitive environment variables
- Comprehensive keyword-based detection for secrets and keys

## Production Security Checklist

### Pre-deployment

- [ ] Change `AUTH_SECRET` to a secure random value
- [ ] Enable HTTPS with proper SSL certificates
- [ ] Configure secure database connections
- [ ] Set up proper CORS policies
- [ ] Enable security headers
- [ ] Configure rate limiting for production loads
- [ ] Set up monitoring and alerting
- [ ] Review and audit all environment variables

### Monitoring

- [ ] Set up security event logging
- [ ] Monitor rate limit violations
- [ ] Track failed authentication attempts
- [ ] Set up alerts for suspicious activity
- [ ] Regular security audit logs review

### Database Security

- [ ] Use encrypted connections (SSL/TLS)
- [ ] Implement database access controls
- [ ] Regular database backups
- [ ] Monitor database performance and access patterns

## Security Best Practices

### Code Level

1. **Input Validation**: Always validate inputs on both client and server
2. **Error Handling**: Don't expose sensitive information in error messages
3. **Logging**: Log security events but sanitize sensitive data
4. **Dependencies**: Keep dependencies updated and audit for vulnerabilities

### Infrastructure Level

1. **HTTPS**: Always use HTTPS in production
2. **Firewall**: Configure proper firewall rules
3. **Monitoring**: Set up comprehensive monitoring and alerting
4. **Backups**: Regular encrypted backups with tested recovery procedures

### Operational Level

1. **Access Control**: Implement principle of least privilege
2. **Regular Audits**: Conduct regular security audits
3. **Incident Response**: Have an incident response plan
4. **Training**: Keep team updated on security best practices

## Vulnerability Reporting

If you discover a security vulnerability, please:

1. **Do not** open a public issue
2. Report privately to the project maintainers
3. Include detailed steps to reproduce
4. Allow time for fix before public disclosure

## Security Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security Guidelines](https://nextjs.org/docs/pages/building-your-application/authentication)
- [Auth.js Security Best Practices](https://authjs.dev/concepts/security)
- [Prisma Security Guidelines](https://www.prisma.io/docs/concepts/database-connectors/postgresql#security)

## Security Testing

### Comprehensive Test Coverage

The project includes extensive security testing to validate all security measures:

**Test Coverage:**
- **Authentication Security**: 100% test coverage on auth utilities, providers, and callbacks
- **Rate Limiting**: Comprehensive functional testing of all rate limit configurations
- **Input Validation**: Malicious input testing and edge case validation
- **OAuth Security**: Complete OAuth flow testing including error scenarios
- **Session Security**: JWT token and session management testing

**Test Files:**
- `__tests__/lib/auth/` - Authentication security tests
- `__tests__/lib/rate-limit.test.ts` - Rate limiting and brute force protection tests
- `__tests__/integration/auth-flows.test.ts` - End-to-end security flow tests

**Security Test Features:**
- Malicious URL redirect prevention testing
- Rate limit bypass attempt testing
- Invalid credential handling
- OAuth provider security validation
- Database error security testing
- PII sanitization validation

**Running Security Tests:**
```bash
# Run all security tests
npm test

# Run with coverage (70% minimum required)
npm test -- --coverage

# Run specific security test suites
npm test -- --testPathPatterns="auth|rate-limit"
```

**Continuous Security:**
- All tests run in CI/CD pipelines
- Security tests validate against real attack vectors
- Comprehensive mocking prevents security test data leaks
- Tests verify security headers and configurations

## Updates

This security guide is regularly updated as new features are added and security practices evolve. Check the [changelog](../CHANGELOG.md) for security-related updates.