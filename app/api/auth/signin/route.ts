import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, createSession, generateToken } from "@/lib/auth/auth";
import { sendEmail, getMagicLinkEmailTemplate } from "@/lib/email/email";
import { z } from "zod";

const signInSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("password"),
    email: z.string().email(),
    password: z.string(),
  }),
  z.object({
    type: z.literal("magiclink"),
    email: z.string().email(),
  }),
]);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validationResult = signInSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Find user by email
    const user = await prisma.user.findUnique({
      where: {
        email: data.email,
        deleted_at: null,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    if (data.type === "password") {
      // Verify password
      if (!user.password) {
        return NextResponse.json(
          { error: "Password sign-in not available for this account" },
          { status: 401 }
        );
      }

      const isValidPassword = await verifyPassword(data.password, user.password);

      if (!isValidPassword) {
        return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
      }

      // Update last signed in
      await prisma.user.update({
        where: { id: user.id },
        data: { last_signed_in: new Date() },
      });

      // Create session
      await createSession(user.id);

      return NextResponse.json({
        success: true,
        message: "Signed in successfully",
      });
    } else {
      // Magic link flow
      const token = generateToken(user.id, "magic_link");

      // Send magic link email
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const emailTemplate = getMagicLinkEmailTemplate(token, appUrl);
      await sendEmail({
        ...emailTemplate,
        to: user.email,
      });

      return NextResponse.json({
        success: true,
        message: "Magic link sent to your email",
      });
    }
  } catch {
    console.error("Sign in error:");
    return NextResponse.json({ error: "Failed to sign in" }, { status: 500 });
  }
}
