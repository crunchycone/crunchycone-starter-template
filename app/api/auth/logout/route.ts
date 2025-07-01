import { NextRequest, NextResponse } from "next/server";
import { clearSession } from "@/lib/auth/auth";

export async function POST(request: NextRequest) {
  try {
    await clearSession();
    
    return NextResponse.redirect(new URL("/", request.url));
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { error: "Failed to logout" },
      { status: 500 }
    );
  }
}