import { jwtVerify } from "jose";
import { NextRequest } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

export interface EdgeSession {
  userId: string;
  type: string;
  iat?: number;
  exp?: number;
}

/**
 * Verify JWT token in Edge Runtime context using jose library
 * @param token - JWT token string
 * @returns Decoded payload or null if invalid
 */
export async function verifyTokenEdge(token: string): Promise<EdgeSession | null> {
  if (!JWT_SECRET || JWT_SECRET === "your-secret-key-change-in-production") {
    console.error("[Edge Auth] JWT_SECRET not properly configured");
    return null;
  }

  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ["HS256"],
    });

    // Validate required fields
    if (!payload.userId || !payload.type) {
      console.error("[Edge Auth] Invalid token payload - missing required fields");
      return null;
    }

    // Only accept access tokens for session
    if (payload.type !== "access") {
      console.error("[Edge Auth] Invalid token type for session:", payload.type);
      return null;
    }

    return {
      userId: payload.userId as string,
      type: payload.type as string,
      iat: payload.iat,
      exp: payload.exp,
    };
  } catch (error) {
    const err = error as { code?: string };
    if (err.code === "ERR_JWS_SIGNATURE_VERIFICATION_FAILED") {
      if (process.env.NODE_ENV === "development") {
        console.log("[Edge Auth] Invalid JWT signature - token was signed with a different secret");
      }
    } else if (err.code === "ERR_JWT_EXPIRED") {
      if (process.env.NODE_ENV === "development") {
        console.log("[Edge Auth] JWT token has expired");
      }
    } else if (process.env.NODE_ENV === "development") {
      console.error("[Edge Auth] Token verification failed:");
    }
    return null;
  }
}

/**
 * Get session from request cookies in Edge Runtime
 * @param request - NextRequest object
 * @returns Session data or null if no valid session
 */
export async function getSessionEdge(request: NextRequest): Promise<EdgeSession | null> {
  const token = request.cookies.get("auth-token")?.value;

  if (!token) {
    console.log("[Edge Auth] No auth token found in cookies");
    return null;
  }

  console.log("[Edge Auth] Found auth token, verifying...");
  const session = await verifyTokenEdge(token);

  if (!session) {
    console.log("[Edge Auth] Token verification failed");
    return null;
  }

  console.log("[Edge Auth] Session verified for user:", session.userId);
  return session;
}

/**
 * Check if a path requires authentication
 * @param pathname - Request pathname
 * @returns Boolean indicating if path is protected
 */
export function isProtectedRoute(pathname: string): boolean {
  // Define protected routes
  const protectedRoutes = [
    "/admin",
    "/profile",
    "/dashboard",
    // Add more protected routes as needed
  ];

  // Check if the path starts with any protected route
  return protectedRoutes.some((route) => pathname.startsWith(route));
}

/**
 * Check if a path is an auth route (signin, signup, etc)
 * @param pathname - Request pathname
 * @returns Boolean indicating if path is an auth route
 */
export function isAuthRoute(pathname: string): boolean {
  const authRoutes = [
    "/auth/signin",
    "/auth/signup",
    "/auth/forgot-password",
    "/auth/reset-password",
    "/auth/verify-email",
  ];

  return authRoutes.some((route) => pathname.startsWith(route));
}

/**
 * Debug helper for Edge Runtime environment
 * @param request - NextRequest object
 */
export function debugEdgeAuth(request: NextRequest): void {
  console.log("[Edge Auth Debug] ============================");
  console.log("[Edge Auth Debug] URL:", request.url);
  console.log("[Edge Auth Debug] Method:", request.method);
  console.log("[Edge Auth Debug] Pathname:", new URL(request.url).pathname);
  console.log("[Edge Auth Debug] Has JWT_SECRET:", !!JWT_SECRET);

  // Get all cookies using the Edge Runtime API
  const cookiesList: string[] = [];
  request.cookies.getAll().forEach((cookie) => {
    cookiesList.push(`${cookie.name}=${cookie.value.substring(0, 20)}...`);
  });
  console.log("[Edge Auth Debug] Cookies:", cookiesList);

  console.log("[Edge Auth Debug] ============================");
}
