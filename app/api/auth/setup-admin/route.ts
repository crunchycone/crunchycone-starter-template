import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const setupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(request: NextRequest) {
  try {
    // Check if admin already exists
    const adminRole = await prisma.role.findUnique({
      where: { name: "admin" },
    });

    if (!adminRole) {
      return NextResponse.json(
        { error: "Admin role not found. Please run database seed." },
        { status: 500 }
      );
    }

    const adminUserCount = await prisma.userRole.count({
      where: {
        role_id: adminRole.id,
        deleted_at: null,
        user: {
          deleted_at: null,
        },
      },
    });

    if (adminUserCount > 0) {
      return NextResponse.json({ error: "Admin user already exists" }, { status: 400 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = setupSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { email, password } = validationResult.data;

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user with admin role in a transaction
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          emailVerified: new Date(), // Mark as verified
          last_signed_in: new Date(),
        },
      });

      // Create user profile
      await tx.userProfile.create({
        data: {
          user_id: newUser.id,
        },
      });

      // Assign admin role
      await tx.userRole.create({
        data: {
          user_id: newUser.id,
          role_id: adminRole.id,
        },
      });

      return newUser;
    });

    // Note: Session creation will be handled by Auth.js after signup
    return NextResponse.json({
      success: true,
      message: "Admin user created successfully",
      user: {
        id: user.id,
        email: user.email,
      },
    });
  } catch {
    console.error("Setup admin error:");
    return NextResponse.json({ error: "Failed to create admin user" }, { status: 500 });
  }
}
