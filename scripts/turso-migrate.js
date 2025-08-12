#!/usr/bin/env node

/**
 * Automated Turso Database Migration System
 * 
 * This script automatically:
 * 1. Creates a migration tracking table
 * 2. Reads all migration files from prisma/migrations
 * 3. Applies only migrations that haven't been run yet
 * 4. Tracks migration history
 */

const { createClient } = require("@libsql/client");
const fs = require("fs");
const path = require("path");

async function runMigrations() {
  const databaseUrl = process.env.DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!databaseUrl || !databaseUrl.startsWith("libsql://")) {
    console.log("ℹ️  Not a Turso database, skipping migrations");
    process.exit(0);
  }

  if (!authToken) {
    console.error("❌ TURSO_AUTH_TOKEN is required for Turso databases");
    process.exit(1);
  }

  console.log("🚀 Starting Turso migration system...");

  let client;
  try {
    client = createClient({
      url: databaseUrl,
      authToken: authToken,
    });
  } catch (error) {
    console.error("❌ Failed to connect to Turso:", error.message);
    process.exit(1);
  }

  // Step 1: Create migration tracking table
  console.log("📊 Setting up migration tracking...");
  try {
    await client.execute(`
      CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
        id TEXT PRIMARY KEY,
        migration_name TEXT NOT NULL UNIQUE,
        applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        logs TEXT
      )
    `);
  } catch (error) {
    console.error("❌ Failed to create migration table:", error.message);
    process.exit(1);
  }

  // Step 2: Get list of applied migrations
  let appliedMigrations = [];
  try {
    const result = await client.execute("SELECT migration_name FROM _prisma_migrations");
    appliedMigrations = result.rows.map(row => row.migration_name);
    console.log(`✓ Found ${appliedMigrations.length} applied migrations`);
  } catch (error) {
    console.error("⚠️  Could not read migration history:", error.message);
  }

  // Step 3: Read migration files
  const migrationsDir = path.join(__dirname, "../prisma/migrations");
  let migrationFolders = [];
  
  try {
    if (fs.existsSync(migrationsDir)) {
      migrationFolders = fs.readdirSync(migrationsDir)
        .filter(f => fs.statSync(path.join(migrationsDir, f)).isDirectory())
        .filter(f => /^\d{14}_/.test(f)) // Only folders starting with timestamp
        .sort(); // Sort chronologically
    }
  } catch (error) {
    console.log("⚠️  No migrations directory found");
  }

  // Step 4: Apply pending migrations
  let migrationsRun = 0;
  let migrationsFailed = 0;

  for (const folder of migrationFolders) {
    if (appliedMigrations.includes(folder)) {
      console.log(`⏭️  Skipping migration: ${folder} (already applied)`);
      continue;
    }

    const migrationPath = path.join(migrationsDir, folder, "migration.sql");
    
    if (!fs.existsSync(migrationPath)) {
      console.log(`⚠️  No migration.sql found in ${folder}`);
      continue;
    }

    console.log(`📝 Applying migration: ${folder}`);
    
    try {
      const migrationSQL = fs.readFileSync(migrationPath, "utf8");
      
      // Split migration into individual statements
      // First remove comment lines, then split by semicolon
      const cleanSQL = migrationSQL
        .split('\n')
        .filter(line => !line.trim().startsWith('--'))
        .join('\n');
      
      const statements = cleanSQL
        .split(";")
        .map(s => s.trim())
        .filter(s => s.length > 0);

      // Execute migration in a transaction-like manner
      let logs = [];
      let statementCount = 0;
      
      console.log(`  Processing ${statements.length} SQL statements...`);
      
      for (const statement of statements) {
        try {
          await client.execute(statement);
          statementCount++;
          const preview = statement.replace(/\s+/g, " ").substring(0, 50);
          logs.push(`✓ ${preview}...`);
          console.log(`  ✓ Statement ${statementCount}/${statements.length}`);
        } catch (error) {
          // Some errors might be acceptable (e.g., index already exists)
          if (error.message.includes("already exists")) {
            logs.push(`ℹ️  Skipped (exists): ${statement.substring(0, 30)}`);
            console.log(`  ℹ️  Skipped statement ${statementCount + 1}/${statements.length} (already exists)`);
          } else {
            console.error(`  ❌ Failed statement ${statementCount + 1}/${statements.length}: ${error.message}`);
            logs.push(`❌ Failed: ${error.message}`);
            throw error; // Re-throw to fail the migration
          }
        }
      }

      // Record successful migration
      const migrationId = `m_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await client.execute({
        sql: `INSERT INTO _prisma_migrations (id, migration_name, logs) VALUES (?, ?, ?)`,
        args: [migrationId, folder, logs.join("\n")]
      });
      
      console.log(`✅ Migration ${folder} applied successfully`);
      migrationsRun++;
      
    } catch (error) {
      console.error(`❌ Migration ${folder} failed:`, error.message);
      migrationsFailed++;
      // Don't exit - try to apply other migrations
    }
  }

  // Step 5: If no migrations exist, generate initial schema
  if (migrationFolders.length === 0) {
    console.log("📝 No migrations found, generating initial schema...");
    
    // Generate SQL from Prisma schema
    const { execSync } = require("child_process");
    
    try {
      const sql = execSync(
        `npx prisma migrate diff --from-empty --to-schema-datamodel /app/prisma/schema.prisma --script`,
        { encoding: "utf8" }
      );
      
      console.log("📊 Applying generated schema...");
      
      const statements = sql
        .split(";")
        .map(s => s.trim())
        .filter(s => s && !s.startsWith("--"));
      
      let successCount = 0;
      for (const statement of statements) {
        try {
          await client.execute(statement);
          successCount++;
        } catch (error) {
          if (!error.message.includes("already exists")) {
            console.error(`⚠️  Statement failed: ${error.message}`);
          }
        }
      }
      
      console.log(`✓ Applied ${successCount} schema statements`);
      
      // Record initial schema as migration
      const migrationId = `m_${Date.now()}_initial`;
      await client.execute({
        sql: `INSERT INTO _prisma_migrations (id, migration_name, logs) VALUES (?, ?, ?)`,
        args: [migrationId, "initial_schema", `Generated and applied ${successCount} statements`]
      });
      
    } catch (error) {
      console.error("❌ Failed to generate initial schema:", error.message);
    }
  }

  // Step 6: Add seed data if needed
  try {
    const roleCheck = await client.execute(`SELECT COUNT(*) as count FROM "Role"`);
    if (roleCheck.rows[0].count === 0) {
      console.log("🌱 Adding seed data...");
      
      await client.execute(`
        INSERT INTO "Role" (id, name, created_at, updated_at) 
        VALUES ('01JZK5AT1CBD1SBW5T3JQ60VPR', 'user', datetime('now'), datetime('now'))
      `);
      
      await client.execute(`
        INSERT INTO "Role" (id, name, created_at, updated_at) 
        VALUES ('01JZK5AT1CBD1SBW5T3JQ60VPS', 'admin', datetime('now'), datetime('now'))
      `);
      
      console.log("✓ Seed data added");
    }
  } catch (error) {
    console.log("ℹ️  Seed data check:", error.message);
  }

  client.close();

  // Summary
  console.log("\n📊 Migration complete!");
  if (migrationsRun > 0) {
    console.log(`   ✅ ${migrationsRun} migrations applied`);
  }
  if (migrationsFailed > 0) {
    console.log(`   ⚠️  ${migrationsFailed} migrations failed`);
  }
  if (migrationsRun === 0 && migrationsFailed === 0) {
    console.log(`   ℹ️  Database is up to date`);
  }

  process.exit(migrationsFailed > 0 ? 1 : 0);
}

// Run migrations
runMigrations().catch(error => {
  console.error("❌ Unexpected error:", error);
  process.exit(1);
});