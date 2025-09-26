import { NextRequest } from "next/server";
import rateLimit from "next-rate-limit";

// Create rate limiter instance
const limiter = rateLimit({
  interval: 60 * 1000, // 60 seconds
  uniqueTokenPerInterval: 500, // Max 500 unique IPs per window
});

// Rate limiting configurations for different endpoints
const isDevelopment = process.env.NODE_ENV === "development";

export const rateLimitConfigs = {
  auth: {
    requests: isDevelopment ? 100 : 5, // 5 requests per minute (more lenient in dev)
    interval: 60 * 1000,
  },
  authSignIn: {
    requests: isDevelopment ? 100 : 3, // 3 sign-in attempts per minute
    interval: 60 * 1000,
  },
  authSignUp: {
    requests: isDevelopment ? 100 : 2, // 2 sign-ups per minute
    interval: 60 * 1000,
  },
  passwordReset: {
    requests: isDevelopment ? 100 : 2, // 2 password reset requests per minute
    interval: 60 * 1000,
  },
  admin: {
    requests: isDevelopment ? 1000 : 30, // 30 admin requests per minute
    interval: 60 * 1000,
  },
};

// Get client IP address (currently unused but may be needed for future enhancements)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getClientIP(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIP = request.headers.get("x-real-ip");

  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  if (realIP) {
    return realIP;
  }

  // Fallback to a default identifier if no IP can be determined
  return "anonymous";
}

// Apply rate limiting
export async function applyRateLimit(
  request: NextRequest,
  config: { requests: number; interval: number }
): Promise<{ success: boolean; limit: number; remaining: number; reset: Date }> {
  try {
    await limiter.checkNext(request, config.requests);
    return {
      success: true,
      limit: config.requests,
      remaining: config.requests, // Would need custom tracking for accurate remaining
      reset: new Date(Date.now() + config.interval),
    };
  } catch {
    return {
      success: false,
      limit: config.requests,
      remaining: 0,
      reset: new Date(Date.now() + config.interval),
    };
  }
}
