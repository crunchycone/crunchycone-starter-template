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
 * Prisma Client Extension for automatic ULID generation
 */
export const ulidExtension = Prisma.defineExtension({
  name: "ulid-extension",
  query: {
    user: {
      create({ args, query }) {
        args.data.id = args.data.id || generateId();
        return query(args);
      },
      createMany({ args, query }) {
        if (Array.isArray(args.data)) {
          args.data = args.data.map((item) => ({
            ...item,
            id: item.id || generateId(),
          }));
        }
        return query(args);
      },
      upsert({ args, query }) {
        args.create.id = args.create.id || generateId();
        return query(args);
      },
    },
    userProfile: {
      create({ args, query }) {
        args.data.id = args.data.id || generateId();
        return query(args);
      },
      createMany({ args, query }) {
        if (Array.isArray(args.data)) {
          args.data = args.data.map((item) => ({
            ...item,
            id: item.id || generateId(),
          }));
        }
        return query(args);
      },
      upsert({ args, query }) {
        args.create.id = args.create.id || generateId();
        return query(args);
      },
    },
    role: {
      create({ args, query }) {
        args.data.id = args.data.id || generateId();
        return query(args);
      },
      createMany({ args, query }) {
        if (Array.isArray(args.data)) {
          args.data = args.data.map((item) => ({
            ...item,
            id: item.id || generateId(),
          }));
        }
        return query(args);
      },
      upsert({ args, query }) {
        args.create.id = args.create.id || generateId();
        return query(args);
      },
    },
    userRole: {
      create({ args, query }) {
        args.data.id = args.data.id || generateId();
        return query(args);
      },
      createMany({ args, query }) {
        if (Array.isArray(args.data)) {
          args.data = args.data.map((item) => ({
            ...item,
            id: item.id || generateId(),
          }));
        }
        return query(args);
      },
      upsert({ args, query }) {
        args.create.id = args.create.id || generateId();
        return query(args);
      },
    },
  },
});

/**
 * Create a Prisma client with ULID extension
 */
export function createPrismaClient() {
  let basePrisma: PrismaClient;

  // Configure logging based on environment variable
  const logConfig = process.env.PRISMA_LOG_LEVEL ? 
    process.env.PRISMA_LOG_LEVEL.split(',').map(level => level.trim()) as any[] :
    undefined;

  const clientConfig: any = logConfig ? { log: logConfig } : {};

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

      basePrisma = new PrismaClient({ ...clientConfig, adapter });
      console.log("✅ Turso adapter initialized successfully");
    } catch (error) {
      console.error("Failed to initialize Turso adapter, falling back to standard client:", error);
      basePrisma = new PrismaClient(clientConfig);
    }
  } else {
    // Standard SQLite/PostgreSQL/MySQL
    basePrisma = new PrismaClient(clientConfig);
  }

  // Apply ULID extension
  const prisma = basePrisma.$extends(ulidExtension);
  return prisma;
}
