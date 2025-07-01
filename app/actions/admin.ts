"use server";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function checkAdminExists(): Promise<boolean> {
  try {
    const adminRole = await prisma.role.findUnique({
      where: { name: "admin" },
    });
    
    if (!adminRole) return false;
    
    const adminUserCount = await prisma.userRole.count({
      where: {
        role_id: adminRole.id,
        deleted_at: null,
        user: {
          deleted_at: null,
        },
      },
    });
    
    return adminUserCount > 0;
  } catch (error) {
    console.error("Error checking admin existence:", error);
    return false;
  }
}