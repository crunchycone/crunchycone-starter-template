"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdmin } from "@/lib/auth/permissions";
import { redirect } from "next/navigation";

export async function checkAdminExists(): Promise<boolean> {
  try {
    // Check if admin role exists
    const adminRole = await prisma.role.findUnique({
      where: { name: "admin" },
    });

    if (!adminRole) return false;

    // Check if any users have the admin role
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
  } catch {
    console.error("Error checking admin existence:");
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
  } catch {
    console.error("Error checking if database is empty:");
    return false;
  }
}

export interface DatabaseTable {
  name: string;
  rowCount: number;
}

export interface TableData {
  columns: string[];
  rows: Record<string, unknown>[];
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
  } catch {
    console.error("Error fetching database tables:");
    throw new Error("Failed to fetch database tables");
  }
}

export async function getTableData(
  tableName: string,
  page: number = 1,
  limit: number = 100,
  sortColumn?: string,
  sortDirection: "asc" | "desc" = "asc"
): Promise<TableData> {
  // Authentication check
  const currentUser = await getCurrentUser();
  if (!currentUser || !(await isAdmin(currentUser.id))) {
    redirect("/auth/signin");
  }

  try {
    // Validate table name to prevent SQL injection
    const validTables = await getDatabaseTables();
    const isValidTable = validTables.some((t) => t.name === tableName);

    if (!isValidTable) {
      throw new Error("Invalid table name");
    }

    // Get column information
    const columns: Array<{ name: string }> = await prisma.$queryRawUnsafe(
      `PRAGMA table_info("${tableName}")`
    );
    const columnNames = columns.map((col) => col.name);

    // Validate sort column if provided
    if (sortColumn) {
      const isValidColumn = columnNames.includes(sortColumn);
      if (!isValidColumn) {
        throw new Error("Invalid sort column");
      }
    }

    // Get total count
    const countResult: Array<{ count: number }> = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*) as count FROM "${tableName}"`
    );
    const totalCount = countResult[0]?.count || 0;

    // Build query with optional sorting
    const offset = (page - 1) * limit;
    let query = `SELECT * FROM "${tableName}"`;

    if (sortColumn) {
      // Use double quotes for column names to handle special characters
      query += ` ORDER BY "${sortColumn}" ${sortDirection.toUpperCase()}`;
    }

    query += ` LIMIT ${limit} OFFSET ${offset}`;

    const rows = await prisma.$queryRawUnsafe(query);

    return {
      columns: columnNames,
      rows: rows as Record<string, unknown>[],
      totalCount,
    };
  } catch {
    console.error(`Error fetching data from table ${tableName}`);
    throw new Error(`Failed to fetch data from table ${tableName}`);
  }
}
