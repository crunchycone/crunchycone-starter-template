"use server";

import { auth } from "@/lib/auth";
import jwt from "jsonwebtoken";

export async function generatePasswordResetTokenAction() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return {
        success: false,
        error: "Not authenticated",
      };
    }

    // Generate reset token (1 hour expiry)
    const secret = process.env.AUTH_SECRET;
    if (!secret) {
      throw new Error("AUTH_SECRET not configured");
    }

    const resetToken = jwt.sign({ userId: session.user.id, type: "reset" }, secret, {
      expiresIn: "1h",
    });

    // Generate the reset URL
    const resetUrl = `/auth/reset-password?token=${resetToken}&fromProfile=true`;

    return {
      success: true,
      resetUrl,
    };
  } catch (error) {
    console.error("Generate password reset token error:", error);
    return {
      success: false,
      error: "Failed to generate reset link",
    };
  }
}
