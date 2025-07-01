import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { generateToken } from "@/lib/auth/auth";
import { sendEmail, getPasswordResetEmailTemplate } from "@/lib/email/email";
import { z } from "zod";

const prisma = new PrismaClient();

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validationResult = forgotPasswordSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }
    
    const { email } = validationResult.data;
    
    // Find user by email
    const user = await prisma.user.findUnique({
      where: {
        email,
        deleted_at: null,
      },
    });
    
    // Always return success response to prevent email enumeration
    // Don't reveal whether the email exists or not for security
    if (!user) {
      return NextResponse.json({
        success: true,
        message: "If an account with that email exists, we've sent a password reset link",
      });
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
      message: "If an account with that email exists, we've sent a password reset link",
    });
    
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}