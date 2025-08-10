import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    const decoded = verifyToken(token);

    if (!decoded || decoded.type !== "reset") {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
    }

    return NextResponse.json({
      valid: true,
      userId: decoded.userId,
    });
  } catch {
    console.error("Token verification error:");
    return NextResponse.json({ error: "Token verification failed" }, { status: 400 });
  }
}
