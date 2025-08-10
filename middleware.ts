import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionEdge, isProtectedRoute, isAuthRoute, debugEdgeAuth } from "@/lib/auth/edge-auth";

// Enable debug logging (set to false in production)
const DEBUG = process.env.NODE_ENV === "development";

export async function middleware(request: NextRequest) {
  const pathname = new URL(request.url).pathname;

  // Debug logging in development
  if (DEBUG) {
    debugEdgeAuth(request);
  }

  // Skip middleware for static files, api routes (except auth endpoints)
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.includes(".") || // Skip files with extensions
    (pathname.startsWith("/api") && !pathname.startsWith("/api/auth"))
  ) {
    return NextResponse.next();
  }

  try {
    // Get session using Edge-compatible auth
    const session = await getSessionEdge(request);
    const isAuthenticated = !!session;

    if (DEBUG) {
      console.log("[Middleware] Path:", pathname);
      console.log("[Middleware] Authenticated:", isAuthenticated);
      console.log(
        "[Middleware] Session:",
        session ? { userId: session.userId, type: session.type } : null
      );
    }

    // Handle protected routes
    if (isProtectedRoute(pathname)) {
      if (!isAuthenticated) {
        if (DEBUG) {
          console.log("[Middleware] Redirecting to signin - protected route without auth");
        }
        const url = new URL("/auth/signin", request.url);
        url.searchParams.set("from", pathname);
        return NextResponse.redirect(url);
      }

      // Check admin routes
      if (pathname.startsWith("/admin")) {
        // For now, we'll let the page handle admin role checking
        // In a future enhancement, we could check roles in middleware
        if (DEBUG) {
          console.log("[Middleware] Admin route - deferring role check to page");
        }
      }
    }

    // Handle auth routes when already authenticated
    if (isAuthRoute(pathname) && isAuthenticated) {
      if (DEBUG) {
        console.log("[Middleware] Redirecting to home - auth route while authenticated");
      }
      // Don't redirect from setup-admin if no admin exists
      if (pathname === "/auth/setup-admin") {
        // Let the page handle this check
        return NextResponse.next();
      }
      return NextResponse.redirect(new URL("/", request.url));
    }

    // Continue with the request
    const response = NextResponse.next();

    // Add security headers
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

    return response;
  } catch {
    console.error("[Middleware] Error:");
    // On error, allow the request to continue
    // The page will handle authentication
    return NextResponse.next();
  }
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
