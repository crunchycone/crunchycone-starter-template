import { prismaAuth } from "@/lib/auth/prisma-auth";

export async function assignDefaultUserRole(userId: string) {
  try {
    const userRole = await prismaAuth.role.findUnique({
      where: { name: "user" },
    });

    if (userRole) {
      await prismaAuth.userRole.create({
        data: {
          user_id: userId,
          role_id: userRole.id,
        },
      });
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error assigning default user role:", error);
    return false;
  }
}

export async function getUserRoles(userId: string): Promise<string[]> {
  try {
    const userWithRoles = await prismaAuth.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          where: { deleted_at: null },
          include: { role: true },
        },
      },
    });
    return userWithRoles?.roles.map((ur) => ur.role.name) || [];
  } catch (error) {
    console.error("Error fetching user roles:", error);
    return [];
  }
}
