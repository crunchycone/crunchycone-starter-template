import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function hasRole(userId: string, roleName: string): Promise<boolean> {
  const userRole = await prisma.userRole.findFirst({
    where: {
      user_id: userId,
      role: {
        name: roleName,
      },
      deleted_at: null,
    },
  });

  return !!userRole;
}

export async function requireRole(roleName: string) {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  const hasRequiredRole = await hasRole(session.user.id, roleName);

  if (!hasRequiredRole) {
    redirect("/");
  }

  return session;
}

export async function isAdmin(userId: string): Promise<boolean> {
  return hasRole(userId, "admin");
}

export async function getCurrentUser() {
  const session = await auth();

  if (!session?.user) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: {
      id: session.user.id,
      deleted_at: null,
    },
    include: {
      profile: true,
      roles: {
        where: {
          deleted_at: null,
        },
        include: {
          role: true,
        },
      },
    },
  });

  return user;
}

// Helper function to check if current user is admin (using session roles for performance)
export async function isCurrentUserAdmin(): Promise<boolean> {
  const session = await auth();
  return session?.user?.roles?.includes("admin") || false;
}

// Helper function to check if current user has specific role (using session roles for performance)
export async function currentUserHasRole(roleName: string): Promise<boolean> {
  const session = await auth();
  return session?.user?.roles?.includes(roleName) || false;
}
