import { prismaAuth } from "@/lib/auth/prisma-auth";

export async function findUserByEmail(email: string) {
  try {
    const user = await prismaAuth.user.findUnique({
      where: {
        email: email,
        deleted_at: null,
      },
      include: {
        roles: {
          where: { deleted_at: null },
          include: { role: true },
        },
      },
    });
    return user;
  } catch (error) {
    console.error("Error finding user by email:", error);
    return null;
  }
}
