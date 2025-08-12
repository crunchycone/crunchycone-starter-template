import { ulid } from "ulid";
import { Prisma, PrismaClient } from "@prisma/client";

/**
 * Generate a new ULID
 */
export function generateId(): string {
  return ulid();
}

/**
 * Validate if a string is a valid ULID
 */
export function isValidUlid(id: string): boolean {
  // ULID is exactly 26 characters and uses Crockford's Base32
  const ulidRegex = /^[0-9A-HJKMNP-TV-Z]{26}$/;
  return ulidRegex.test(id);
}

/**
 * Prisma middleware to automatically generate ULIDs for new records
 */
export const ulidMiddleware: Prisma.Middleware = async (params, next) => {
  // List of all models that use ULID
  const modelsWithUlid = ["User", "UserProfile", "Role", "UserRole"];

  if (modelsWithUlid.includes(params.model || "")) {
    if (params.action === "create") {
      // Single create
      if (!params.args.data.id) {
        params.args.data.id = generateId();
      }
    } else if (params.action === "createMany") {
      // Multiple creates
      if (Array.isArray(params.args.data)) {
        params.args.data = params.args.data.map((item: { id?: string }) => ({
          ...item,
          id: item.id || generateId(),
        }));
      }
    } else if (params.action === "upsert") {
      // Upsert - only generate ID for create
      if (!params.args.create.id) {
        params.args.create.id = generateId();
      }
    }
  }

  return next(params);
};

/**
 * Create a Prisma client with ULID middleware
 */
export function createPrismaClient() {
  let prisma: PrismaClient;

  // Check if we're using Turso (libSQL)
  if (process.env.DATABASE_URL?.startsWith("libsql://") && process.env.TURSO_AUTH_TOKEN) {
    try {
      // Import Turso adapter - webpack is configured to handle these files
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { PrismaLibSQL } = require("@prisma/adapter-libsql");

      const adapter = new PrismaLibSQL({
        url: process.env.DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN,
      });

      prisma = new PrismaClient({ adapter });
      console.log("✅ Turso adapter initialized successfully");
    } catch (error) {
      console.error("Failed to initialize Turso adapter, falling back to standard client:", error);
      prisma = new PrismaClient();
    }
  } else {
    // Standard SQLite/PostgreSQL/MySQL
    prisma = new PrismaClient();
  }

  prisma.$use(ulidMiddleware);
  return prisma;
}
