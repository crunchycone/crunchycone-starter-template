"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdmin } from "@/lib/auth/permissions";
import { redirect } from "next/navigation";

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

export interface DatabaseTable {
  name: string;
  rowCount: number;
}

export interface TableData {
  columns: string[];
  rows: Record<string, any>[];
  totalCount: number;
}

export async function getDatabaseTables(): Promise<DatabaseTable[]> {
  // Authentication check
  const currentUser = await getCurrentUser();
  if (!currentUser || !(await isAdmin(currentUser.id))) {
    redirect("/auth/signin");
  }

  try {
    // Query SQLite's sqlite_master table to get all tables
    const tables: Array<{ name: string }> = await prisma.$queryRaw`
      SELECT name 
      FROM sqlite_master 
      WHERE type='table' 
        AND name NOT LIKE 'sqlite_%' 
        AND name NOT LIKE '_prisma_%'
      ORDER BY name
    `;

    // Get row count for each table
    const tablesWithCount = await Promise.all(
      tables.map(async (table) => {
        const countResult: Array<{ count: number }> = await prisma.$queryRawUnsafe(
          `SELECT COUNT(*) as count FROM "${table.name}"`
        );
        return {
          name: table.name,
          rowCount: countResult[0]?.count || 0,
        };
      })
    );

    return tablesWithCount;
  } catch (error) {
    console.error("Error fetching database tables:", error);
    throw new Error("Failed to fetch database tables");
  }
}

export async function getTableData(
  tableName: string,
  page: number = 1,
  limit: number = 100
): Promise<TableData> {
  // Authentication check
  const currentUser = await getCurrentUser();
  if (!currentUser || !(await isAdmin(currentUser.id))) {
    redirect("/auth/signin");
  }

  try {
    // Validate table name to prevent SQL injection
    const validTables = await getDatabaseTables();
    const isValidTable = validTables.some(t => t.name === tableName);
    
    if (!isValidTable) {
      throw new Error("Invalid table name");
    }

    // Get total count
    const countResult: Array<{ count: number }> = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*) as count FROM "${tableName}"`
    );
    const totalCount = countResult[0]?.count || 0;

    // Get column information
    const columns: Array<{ name: string }> = await prisma.$queryRawUnsafe(
      `PRAGMA table_info("${tableName}")`
    );
    const columnNames = columns.map(col => col.name);

    // Get paginated data
    const offset = (page - 1) * limit;
    const rows = await prisma.$queryRawUnsafe(
      `SELECT * FROM "${tableName}" LIMIT ${limit} OFFSET ${offset}`
    );

    return {
      columns: columnNames,
      rows: rows as Record<string, any>[],
      totalCount,
    };
  } catch (error) {
    console.error(`Error fetching data from table ${tableName}:`, error);
    throw new Error(`Failed to fetch data from table ${tableName}`);
  }
}