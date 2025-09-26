import bcrypt from "bcryptjs";
import { prismaAuth } from "@/lib/auth/prisma-auth";

export async function verifyUserCredentials(email: string, password: string) {
  if (!email || !password) {
    return null;
  }

  try {
    // Find user with roles and profile
    const user = await prismaAuth.user.findUnique({
      where: {
        email: email,
        deleted_at: null,
      },
      include: {
        profile: true,
        roles: {
          where: { deleted_at: null },
          include: {
            role: true,
          },
        },
      },
    });

    if (!user || !user.password) {
      return null;
    }

    // Verify password using bcrypt
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return null;
    }

    // Update last signed in
    await prismaAuth.user.update({
      where: { id: user.id },
      data: { last_signed_in: new Date() },
    });

    // Return user object for session
    return {
      id: user.id,
      email: user.email,
      name:
        user.name ||
        `${user.profile?.first_name || ""} ${user.profile?.last_name || ""}`.trim() ||
        null,
      image: user.image,
      roles: user.roles.map((ur) => ur.role.name),
    };
  } catch (error) {
    console.error("Auth error:", error);
    return null;
  }
}
