import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { generateToken, getSession } from "@/lib/auth/auth";
import { isAdmin } from "@/lib/auth/permissions";
import { sendEmail, getPasswordResetEmailTemplate } from "@/lib/email/email";

const prisma = new PrismaClient();

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check admin authentication
    const session = await getSession();
    if (!session || !(await isAdmin(session.userId))) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = parseInt(params.id);
    
    // Find user
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
        deleted_at: null,
      },
    });
    
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }
    
    // Generate reset token
    const resetToken = generateToken(user.id, "reset");
    
    // Send password reset email
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const emailTemplate = getPasswordResetEmailTemplate(resetToken, appUrl);
    await sendEmail({
      ...emailTemplate,
      to: user.email,
    });
    
    return NextResponse.json({
      success: true,
      message: "Password reset link sent",
    });
  } catch (error) {
    console.error("Password reset error:", error);
    return NextResponse.json(
      { error: "Failed to send password reset" },
      { status: 500 }
    );
  }
}