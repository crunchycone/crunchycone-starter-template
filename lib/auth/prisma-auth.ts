import { PrismaClient } from "@prisma/client";
import { ulidExtension } from "@/lib/utils/ulid";
import { logger } from "@/lib/utils/logger";

// Configure logging based on environment variable
const logConfig = process.env.PRISMA_LOG_LEVEL
  ? (process.env.PRISMA_LOG_LEVEL.split(",").map((level) => level.trim()) as (
      | "query"
      | "info"
      | "warn"
      | "error"
    )[])
  : undefined;

const clientConfig = logConfig
  ? {
      log: logConfig.map((level) => ({
        level: level as "query" | "info" | "warn" | "error",
        emit: "event" as const,
      })),
    }
  : {};

// Create base Prisma client
const basePrismaAuth = new PrismaClient(clientConfig);

// Set up structured logging event listeners for auth client
if (logConfig) {
  logConfig.forEach((level) => {
    switch (level) {
      case "query":
        basePrismaAuth.$on("query", (e) => {
          logger.debug("Auth Database Query", {
            query: e.query,
            params: e.params,
            duration: `${e.duration}ms`,
            target: e.target,
          });
        });
        break;
      case "info":
        basePrismaAuth.$on("info", (e) => {
          logger.info("Auth Database Info", { message: e.message, target: e.target });
        });
        break;
      case "warn":
        basePrismaAuth.$on("warn", (e) => {
          logger.warn("Auth Database Warning", { message: e.message, target: e.target });
        });
        break;
      case "error":
        basePrismaAuth.$on("error", (e) => {
          logger.error("Auth Database Error", undefined, { message: e.message, target: e.target });
        });
        break;
    }
  });
}

// Prisma client for Auth.js with ULID extension
// This ensures OAuth users get proper ULID IDs
export const prismaAuth = basePrismaAuth.$extends(ulidExtension);
