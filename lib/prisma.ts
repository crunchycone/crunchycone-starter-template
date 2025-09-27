import { createPrismaClient } from "./utils/ulid";

// Global storage for lazy-initialized Prisma Client
const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

// Lazy getter for Prisma client - only creates when first accessed
function getPrismaClient() {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }
  return globalForPrisma.prisma;
}

// Export a Proxy that creates the client only when accessed
export const prisma = new Proxy({} as ReturnType<typeof createPrismaClient>, {
  get(target, prop) {
    const client = getPrismaClient();
    const value = client[prop as keyof typeof client];
    return typeof value === "function" ? value.bind(client) : value;
  },
  has(target, prop) {
    const client = getPrismaClient();
    return prop in client;
  },
  ownKeys() {
    const client = getPrismaClient();
    return Object.keys(client);
  },
  getOwnPropertyDescriptor(target, prop) {
    const client = getPrismaClient();
    return Object.getOwnPropertyDescriptor(client, prop);
  },
});
