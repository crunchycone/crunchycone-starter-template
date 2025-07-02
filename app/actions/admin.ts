"use server";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function checkAdminExists(): Promise<boolean> {
  try {
    // First check if there are ANY users in the database
    const totalUserCount = await prisma.user.count({
      where: {
        deleted_at: null,
      },
    });
    
    // If no users exist at all, don't require admin setup
    if (totalUserCount === 0) {
      return true; // Pretend admin exists to skip setup
    }
    
    // If users exist, check if any are admins
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

export async function isDatabaseEmpty(): Promise<boolean> {
  try {
    const userCount = await prisma.user.count({
      where: {
        deleted_at: null,
      },
    });
    
    return userCount === 0;
  } catch (error) {
    console.error("Error checking if database is empty:", error);
    return false;
  }
}