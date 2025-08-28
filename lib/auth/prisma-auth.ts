import { PrismaClient } from "@prisma/client";
import { ulidExtension } from "@/lib/utils/ulid";

// Configure logging based on environment variable
const logConfig = process.env.PRISMA_LOG_LEVEL ? 
  process.env.PRISMA_LOG_LEVEL.split(',').map(level => level.trim()) as any[] :
  undefined;

const clientConfig: any = logConfig ? { log: logConfig } : {};

// Prisma client for Auth.js with ULID extension
// This ensures OAuth users get proper ULID IDs
export const prismaAuth = new PrismaClient(clientConfig).$extends(ulidExtension);
