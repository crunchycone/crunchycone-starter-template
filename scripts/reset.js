#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function log(message, color = "\x1b[0m") {
  console.log(`${color}${message}\x1b[0m`);
}

function logSuccess(message) {
  log(`✅ ${message}`, "\x1b[32m"); // Green
}

function logWarning(message) {
  log(`⚠️  ${message}`, "\x1b[33m"); // Yellow
}

function logError(message) {
  log(`❌ ${message}`, "\x1b[31m"); // Red
}

function logInfo(message) {
  log(`ℹ️  ${message}`, "\x1b[36m"); // Cyan
}

async function askForConfirmation() {
  return new Promise((resolve) => {
    rl.question("\nDo you want to continue? (y/N): ", (answer) => {
      resolve(answer.toLowerCase() === "y" || answer.toLowerCase() === "yes");
    });
  });
}

function hasYesFlag() {
  return process.argv.includes("--yes") || process.argv.includes("-y");
}

function hasJwtOnlyFlag() {
  return process.argv.includes("--jwt-only") || process.argv.includes("--jwt");
}

async function generateJwtOnly() {
  try {
    log("\n🔐 JWT Secret Generation", "\x1b[1m\x1b[34m"); // Bold Blue
    log("========================\n");

    const envPath = path.join(process.cwd(), ".env");
    const envExamplePath = path.join(process.cwd(), ".env.example");
    const crypto = require("crypto");

    // Step 1: Create .env if it doesn't exist
    if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
      fs.copyFileSync(envExamplePath, envPath);
      logSuccess("Created .env file from .env.example");
    } else if (!fs.existsSync(envPath)) {
      logError(".env file not found and no .env.example to copy from");
      process.exit(1);
    }

    // Step 2: Generate JWT_SECRET
    const envContent = fs.readFileSync(envPath, "utf8");
    const hasDefaultJwtSecret = envContent.includes(
      'JWT_SECRET="your-secret-key-change-in-production"'
    );

    if (hasDefaultJwtSecret || envContent.match(/JWT_SECRET=""/)) {
      const jwtSecret = crypto.randomBytes(32).toString("hex");
      const updatedEnvContent = envContent.replace(
        /JWT_SECRET="[^"]*"/,
        `JWT_SECRET="${jwtSecret}"`
      );
      fs.writeFileSync(envPath, updatedEnvContent);
      logSuccess("Generated secure JWT_SECRET");
    } else {
      logInfo("JWT_SECRET already configured");
    }

    log("\n✅ JWT generation completed!", "\x1b[1m\x1b[32m");
    return true;
  } catch (error) {
    logError(`JWT generation failed: ${error.message}`);
    return false;
  }
}

async function main() {
  try {
    // Handle JWT-only mode
    if (hasJwtOnlyFlag()) {
      const success = await generateJwtOnly();
      process.exit(success ? 0 : 1);
    }

    log("\n🔄 CrunchyCone Starter Template Reset", "\x1b[1m\x1b[34m"); // Bold Blue
    log("=====================================\n");

    // Check if database exists for first-run detection
    const dbPath = path.join(process.cwd(), "db", "prod.db");
    const isFirstRun = !fs.existsSync(dbPath);

    logWarning("This will reset the project to its initial state:");
    console.log("  • Remove existing database");
    console.log("  • Create fresh database with default schema");
    console.log("  • Copy .env.example to .env (if needed)");
    console.log("  • Clean Next.js build cache");
    console.log("  • Reset to first-time user experience");

    const skipConfirmation = hasYesFlag() || isFirstRun;

    if (isFirstRun) {
      logInfo("First-time setup detected, skipping confirmation.");
    } else if (hasYesFlag()) {
      logInfo("--yes flag detected, skipping confirmation.");
    } else {
      const confirmed = await askForConfirmation();

      if (!confirmed) {
        logInfo("Reset cancelled.");
        process.exit(0);
      }
    }

    log("\n🚀 Starting reset process...\n");

    // Step 1: Remove existing database
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
      logSuccess("Removed existing database");
    } else {
      logInfo("No existing database found");
    }

    // Step 2: Copy .env.example to .env if .env doesn't exist
    const envPath = path.join(process.cwd(), ".env");
    const envExamplePath = path.join(process.cwd(), ".env.example");
    const crypto = require("crypto");

    let envFileCreated = false;

    if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
      fs.copyFileSync(envExamplePath, envPath);
      logSuccess("Created .env file from .env.example");
      envFileCreated = true;
    } else if (fs.existsSync(envPath)) {
      logInfo(".env file already exists (not overwritten)");
    } else {
      logWarning(".env.example not found - you may need to create .env manually");
    }

    // Generate JWT_SECRET if needed
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, "utf8");
      const hasDefaultJwtSecret = envContent.includes(
        'JWT_SECRET="your-secret-key-change-in-production"'
      );
      const forceNewSecret =
        process.argv.includes("--new-secret") || process.argv.includes("--new-jwt");

      if (hasDefaultJwtSecret || forceNewSecret) {
        const jwtSecret = crypto.randomBytes(32).toString("hex");
        const updatedEnvContent = envContent.replace(
          /JWT_SECRET="[^"]*"/,
          `JWT_SECRET="${jwtSecret}"`
        );
        fs.writeFileSync(envPath, updatedEnvContent);

        if (forceNewSecret && !hasDefaultJwtSecret) {
          logSuccess("Generated new JWT_SECRET (forced)");
        } else {
          logSuccess("Generated secure JWT_SECRET (replaced default)");
        }
      } else if (!envFileCreated) {
        logInfo("JWT_SECRET already configured (use --new-secret to regenerate)");
      }
    }

    // Step 3: Clean Next.js cache
    const nextCachePath = path.join(process.cwd(), ".next");
    if (fs.existsSync(nextCachePath)) {
      fs.rmSync(nextCachePath, { recursive: true, force: true });
      logSuccess("Cleaned Next.js build cache");
    }

    // Step 4: Check for migrations and reset database
    const migrationsPath = path.join(process.cwd(), "prisma", "migrations");
    const hasMigrations =
      fs.existsSync(migrationsPath) && fs.readdirSync(migrationsPath).some((f) => f.match(/^\d+_/));

    if (!hasMigrations) {
      logInfo("No migrations found, creating initial migration...");
      try {
        execSync("npx prisma migrate dev --name init --skip-seed", {
          stdio: "inherit",
          cwd: process.cwd(),
        });
        logSuccess("Initial migration created");
      } catch (error) {
        logError("Failed to create initial migration");
        console.error(error.message);
        process.exit(1);
      }
    }

    // Step 5: Reset database with Prisma
    logInfo("Resetting database with Prisma...");
    try {
      execSync("npx prisma migrate reset --force", {
        stdio: "pipe",
        cwd: process.cwd(),
      });
      logSuccess("Database reset and seeded successfully");
    } catch (error) {
      logError("Failed to reset database with Prisma");
      console.error(error.message);
      process.exit(1);
    }

    // Success message
    log("\n🎉 Reset completed successfully!", "\x1b[1m\x1b[32m"); // Bold Green
    log("================================\n");

    logInfo("Next steps:");
    console.log("  1. Run: npm run dev");
    console.log("  2. Open: http://localhost:3000");
    console.log("  3. Complete first-time admin setup");
    console.log("  4. Start building your application!\n");

    logInfo("The application is now in its initial state, ready for first-time setup.");
  } catch (error) {
    logError(`Reset failed: ${error.message}`);
    process.exit(1);
  } finally {
    rl.close();
  }
}

main();
