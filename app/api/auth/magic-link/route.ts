import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, createSession } from "@/lib/auth/auth";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.redirect(new URL("/auth/signin?error=no_token", request.url));
    }

    // Verify the token
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.redirect(new URL("/auth/signin?error=invalid_token", request.url));
    }

    if (decoded.type !== "magic_link") {
      return NextResponse.redirect(new URL("/auth/signin?error=invalid_token_type", request.url));
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: {
        id: decoded.userId,
        deleted_at: null,
      },
    });

    if (!user) {
      return NextResponse.redirect(new URL("/auth/signin?error=user_not_found", request.url));
    }

    // Update last signed in
    await prisma.user.update({
      where: { id: user.id },
      data: { last_signed_in: new Date() },
    });

    // Create session
    await createSession(user.id);

    // Redirect to home page with success message
    return NextResponse.redirect(new URL("/?message=magic_link_success", request.url));
  } catch {
    console.error("Magic link authentication error:");
    return NextResponse.redirect(new URL("/auth/signin?error=authentication_failed", request.url));
  }
}
