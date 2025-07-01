import { PrismaClient } from "@prisma/client";
import { getSession } from "./auth";
import { redirect } from "next/navigation";

const prisma = new PrismaClient();

export async function hasRole(userId: number, roleName: string): Promise<boolean> {
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
  const session = await getSession();
  
  if (!session) {
    redirect("/auth/signin");
  }
  
  const hasRequiredRole = await hasRole(session.userId, roleName);
  
  if (!hasRequiredRole) {
    redirect("/");
  }
  
  return session;
}

export async function isAdmin(userId: number): Promise<boolean> {
  return hasRole(userId, "admin");
}

export async function getCurrentUser() {
  const session = await getSession();
  
  if (!session) {
    return null;
  }
  
  const user = await prisma.user.findUnique({
    where: {
      id: session.userId,
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