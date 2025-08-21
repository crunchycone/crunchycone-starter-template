import { PrismaClient } from "@prisma/client";
import { ulidExtension } from "@/lib/utils/ulid";

// Prisma client for Auth.js with ULID extension
// This ensures OAuth users get proper ULID IDs
export const prismaAuth = new PrismaClient().$extends(ulidExtension);
