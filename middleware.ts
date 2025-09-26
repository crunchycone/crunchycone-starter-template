import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { applyRateLimit, rateLimitConfigs } from "./lib/rate-limit";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const startTime = Date.now();

  // Apply rate limiting for auth and admin endpoints
  let rateLimitConfig = null;
  let endpoint = "";

  if (pathname.startsWith("/api/auth/signin")) {
    rateLimitConfig = rateLimitConfigs.authSignIn;
    endpoint = "auth-signin";
  } else if (pathname.startsWith("/api/auth/signup")) {
    rateLimitConfig = rateLimitConfigs.authSignUp;
    endpoint = "auth-signup";
  } else if (pathname.includes("reset-password")) {
    rateLimitConfig = rateLimitConfigs.passwordReset;
    endpoint = "password-reset";
  } else if (pathname.startsWith("/api/auth/")) {
    rateLimitConfig = rateLimitConfigs.auth;
    endpoint = "auth";
  } else if (pathname.startsWith("/api/admin/")) {
    rateLimitConfig = rateLimitConfigs.admin;
    endpoint = "admin";
  }

  // Apply rate limiting if config exists
  if (rateLimitConfig) {
    const result = await applyRateLimit(request, rateLimitConfig);

    if (!result.success) {
      const ip =
        request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
      console.warn(`Rate limit exceeded for ${endpoint}:`, {
        ip,
        pathname,
        userAgent: request.headers.get("user-agent"),
        timestamp: new Date().toISOString(),
        limit: result.limit,
        reset: result.reset,
      });

      return NextResponse.json(
        {
          error: "Too many requests. Please try again later.",
          rateLimitExceeded: true,
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": result.limit.toString(),
            "X-RateLimit-Remaining": result.remaining.toString(),
            "X-RateLimit-Reset": result.reset.toISOString(),
            "Retry-After": Math.round((result.reset.getTime() - Date.now()) / 1000).toString(),
          },
        }
      );
    }
  }

  // Log incoming request (if detailed logging is enabled)
  if (process.env.LOG_LEVEL === "debug") {
    // Use console.log directly in middleware for Edge Runtime compatibility
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: "debug",
      message: `Incoming Request: ${request.method} ${pathname}`,
      meta: {
        method: request.method,
        url: request.url,
        pathname: pathname,
        userAgent: request.headers.get("user-agent"),
        referer: request.headers.get("referer"),
        ip: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown",
      },
    };
    console.log(JSON.stringify(logEntry));
  }

  // Skip middleware for static files and API routes (except auth)
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.includes(".") ||
    (pathname.startsWith("/api") && !pathname.startsWith("/api/auth"))
  ) {
    return NextResponse.next();
  }

  // Add the current pathname to headers so server components can access it
  const response = NextResponse.next();
  response.headers.set("x-pathname", request.nextUrl.pathname + request.nextUrl.search);

  // Add rate limit headers to successful responses if rate limiting was applied
  if (rateLimitConfig) {
    const result = await applyRateLimit(request, rateLimitConfig);
    if (result.success) {
      response.headers.set("X-RateLimit-Limit", result.limit.toString());
      response.headers.set("X-RateLimit-Remaining", result.remaining.toString());
      response.headers.set("X-RateLimit-Reset", result.reset.toISOString());
    }
  }

  // Log response (if detailed logging is enabled)
  if (process.env.LOG_LEVEL === "debug") {
    const duration = Date.now() - startTime;
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: "debug",
      message: `Response: ${request.method} ${pathname} ${response.status}`,
      meta: {
        method: request.method,
        url: request.url,
        pathname: pathname,
        status: response.status,
        duration: `${duration}ms`,
      },
    };
    console.log(JSON.stringify(logEntry));
  }

  // Add security headers
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  return response;
}

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
