# API Rate Limiting

This document describes the rate limiting implementation for API endpoints in the CrunchyCone Vanilla Starter Project.

## Overview

Rate limiting is implemented using middleware that intercepts requests before they reach API routes. It provides protection against brute force attacks and abuse while maintaining good user experience.

## Implementation

### Middleware Integration

Rate limiting is implemented in `middleware.ts` and applies to specific API routes:

```typescript
// Applied to these route patterns:
- /api/auth/*
- /api/admin/*
```

### Rate Limiting Logic

The middleware checks the request path and applies appropriate rate limits:

```typescript
// Example configuration
if (pathname.startsWith("/api/auth/signin")) {
  rateLimitConfig = rateLimitConfigs.authSignIn;
  endpoint = "auth-signin";
}
```

## Rate Limit Configuration

### Production Limits

| Endpoint Pattern | Limit | Interval | Description |
|------------------|-------|----------|-------------|
| `/api/auth/signin` | 3 requests | 60 seconds | Login attempts |
| `/api/auth/signup` | 2 requests | 60 seconds | Account registration |
| `/api/auth/*` (reset-password) | 2 requests | 60 seconds | Password reset |
| `/api/auth/*` (general) | 5 requests | 60 seconds | Other auth operations |
| `/api/admin/*` | 30 requests | 60 seconds | Admin panel operations |

### Development Limits

In development mode (`NODE_ENV !== "production"`), limits are significantly higher:

- Auth endpoints: 100 requests/minute
- Admin endpoints: 1000 requests/minute

## HTTP Response Format

### Successful Requests

When rate limit is not exceeded, the following headers are added:

```http
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 4
X-RateLimit-Reset: 2024-01-15T10:30:00.000Z
```

### Rate Limit Exceeded (429)

When rate limit is exceeded, the API returns:

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 2024-01-15T10:30:00.000Z
Retry-After: 45

{
  "error": "Too many requests. Please try again later.",
  "rateLimitExceeded": true
}
```

## Rate Limit Headers

| Header | Description | Example |
|--------|-------------|---------|
| `X-RateLimit-Limit` | Maximum requests allowed in the time window | `5` |
| `X-RateLimit-Remaining` | Requests remaining in current window | `3` |
| `X-RateLimit-Reset` | ISO timestamp when the limit resets | `2024-01-15T10:30:00.000Z` |
| `Retry-After` | Seconds until client can retry | `45` |

## Client Implementation

### JavaScript/TypeScript

```typescript
async function makeAuthRequest(endpoint: string, data: any) {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    // Check for rate limiting
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      const errorData = await response.json();

      throw new Error(`Rate limited. Try again in ${retryAfter} seconds.`);
    }

    return await response.json();
  } catch (error) {
    // Handle rate limiting error
    if (error.message.includes('Rate limited')) {
      // Show user-friendly message
      setError('Too many attempts. Please wait before trying again.');
    }
    throw error;
  }
}
```

### React Hook Example

```typescript
function useRateLimitedRequest() {
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [retryAfter, setRetryAfter] = useState(0);

  const makeRequest = async (url: string, options: RequestInit) => {
    try {
      const response = await fetch(url, options);

      if (response.status === 429) {
        const retrySeconds = parseInt(response.headers.get('Retry-After') || '60');
        setRetryAfter(retrySeconds);
        setIsRateLimited(true);

        // Auto-clear rate limit flag after retry period
        setTimeout(() => {
          setIsRateLimited(false);
          setRetryAfter(0);
        }, retrySeconds * 1000);

        throw new Error('Rate limit exceeded');
      }

      return response;
    } catch (error) {
      throw error;
    }
  };

  return { makeRequest, isRateLimited, retryAfter };
}
```

## Testing Rate Limits

### Manual Testing

1. **Set Development Mode**: Ensure `NODE_ENV` is not set to "production"
2. **Lower Limits**: Temporarily reduce limits in `lib/rate-limit.ts`
3. **Make Requests**: Use curl or Postman to make rapid requests
4. **Verify Response**: Check for 429 responses and proper headers

### Example Test Script

```bash
#!/bin/bash
# Test auth signin rate limiting

URL="http://localhost:3000/api/auth/signin"
DATA='{"email":"test@example.com","password":"testpass"}'

echo "Testing rate limiting on $URL"

for i in {1..6}; do
  echo "Request $i:"
  curl -s -w "HTTP Status: %{http_code}\n" \
    -H "Content-Type: application/json" \
    -d "$DATA" \
    "$URL"
  echo "---"
  sleep 1
done
```

### Automated Testing

The project includes comprehensive rate limiting tests in the test suite:

**Test Files:**
- `__tests__/lib/rate-limit.test.ts` - Core rate limiting functionality tests
- `__tests__/integration/auth-flows.test.ts` - Integration tests with authentication

**Test Coverage:**
- Rate limit configuration validation
- Different endpoint limit testing
- Rate limit exceeded scenarios
- HTTP header validation
- Error handling and recovery
- Development vs production mode testing

**Running Rate Limit Tests:**
```bash
# Run rate limiting tests specifically
npm test -- --testPathPatterns="rate-limit"

# Run all tests including rate limiting
npm test

# Run with coverage to see rate limiting test coverage
npm test -- --coverage
```

**Jest Test Example:**
```typescript
// Example from actual test suite
describe('Rate Limiting', () => {
  it('should rate limit auth signin requests', async () => {
    const config = { requests: 3, interval: 60000 }

    // First request should succeed
    const result1 = await applyRateLimit(mockRequest, config)
    expect(result1.success).toBe(true)

    // Configure limiter to reject subsequent requests
    mockLimiter.checkNext.mockRejectedValue(new Error('Rate limit exceeded'))

    // Rate limited request should fail
    const result2 = await applyRateLimit(mockRequest, config)
    expect(result2.success).toBe(false)
    expect(result2.remaining).toBe(0)
  });
});
```

**Security Test Features:**
- Mock-based testing to prevent actual rate limit triggering
- Comprehensive error scenario testing
- Rate limit bypass attempt validation
- Integration with authentication flow testing
- HTTP response header validation

## Monitoring and Logging

### Rate Limit Events

Rate limit violations are logged with details:

```typescript
console.warn(`Rate limit exceeded for ${endpoint}:`, {
  ip: "192.168.1.1",
  pathname: "/api/auth/signin",
  userAgent: "Mozilla/5.0...",
  timestamp: "2024-01-15T10:25:30.000Z",
  limit: 3,
  reset: "2024-01-15T10:26:00.000Z"
});
```

### Metrics to Monitor

- **Rate limit violations per endpoint**
- **IP addresses with repeated violations**
- **User agents triggering rate limits**
- **Peak request times and patterns**

### Alerting

Set up alerts for:
- High rate of 429 responses
- Repeated violations from same IP
- Potential DDoS patterns

## Configuration

### Customizing Limits

Edit `lib/rate-limit.ts` to modify rate limits:

```typescript
export const rateLimitConfigs = {
  authSignIn: {
    requests: isDevelopment ? 100 : 5, // Increase to 5 for production
    interval: 60 * 1000, // Keep 1-minute window
  },
  // Add new endpoints
  customEndpoint: {
    requests: 10,
    interval: 30 * 1000, // 30 seconds
  }
};
```

### Adding New Endpoints

1. **Define Configuration**: Add to `rateLimitConfigs`
2. **Update Middleware**: Add path matching logic
3. **Test**: Verify rate limiting works as expected

```typescript
// In middleware.ts
if (pathname.startsWith("/api/custom/")) {
  rateLimitConfig = rateLimitConfigs.customEndpoint;
  endpoint = "custom";
}
```

## Troubleshooting

### Common Issues

1. **Rate Limits Too Strict**: Users unable to complete normal flows
   - **Solution**: Increase limits or reduce time windows

2. **Development Testing Difficult**: Limits interfere with testing
   - **Solution**: Ensure `NODE_ENV` is not "production" in development

3. **Shared IP Issues**: Multiple users behind same IP getting rate limited
   - **Solution**: Consider user-based rate limiting for authenticated routes

4. **Load Balancer Issues**: IP detection not working correctly
   - **Solution**: Configure proper header forwarding in load balancer

### Debug Mode

Enable detailed logging by setting `LOG_LEVEL=debug`:

```bash
LOG_LEVEL=debug npm run dev
```

This will show detailed rate limiting decisions and IP detection logic.

## Security Considerations

### IP Spoofing

- Rate limiting relies on IP addresses which can be spoofed
- Use in combination with other security measures
- Consider authenticated user-based rate limiting for additional protection

### Bypass Attempts

- Monitor for attempts to bypass rate limiting
- Consider implementing additional layers (CAPTCHA, account lockouts)
- Use web application firewalls for additional protection

### Performance Impact

- In-memory rate limiting has minimal performance overhead
- Monitor memory usage with high traffic
- Consider Redis-based rate limiting for distributed systems

## Future Enhancements

Potential improvements to the rate limiting system:

1. **Redis Backend**: For distributed applications
2. **User-Based Limits**: Rate limit per authenticated user
3. **Dynamic Limits**: Adjust limits based on user reputation
4. **CAPTCHA Integration**: Require CAPTCHA after rate limit exceeded
5. **Geographic Limits**: Different limits based on user location
6. **API Key Limits**: Different limits for API consumers