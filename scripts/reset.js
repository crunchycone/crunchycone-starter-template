#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function log(message, color = '\x1b[0m') {
  console.log(`${color}${message}\x1b[0m`);
}

function logSuccess(message) {
  log(`✅ ${message}`, '\x1b[32m'); // Green
}

function logWarning(message) {
  log(`⚠️  ${message}`, '\x1b[33m'); // Yellow
}

function logError(message) {
  log(`❌ ${message}`, '\x1b[31m'); // Red
}

function logInfo(message) {
  log(`ℹ️  ${message}`, '\x1b[36m'); // Cyan
}

async function askForConfirmation() {
  return new Promise((resolve) => {
    rl.question('\nDo you want to continue? (y/N): ', (answer) => {
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

function hasYesFlag() {
  return process.argv.includes('--yes') || process.argv.includes('-y');
}

async function main() {
  try {
    log('\n🔄 Production Starter Template Reset', '\x1b[1m\x1b[34m'); // Bold Blue
    log('=====================================\n');
    
    logWarning('This will reset the project to its initial state:');
    console.log('  • Remove existing database');
    console.log('  • Create fresh database with default schema');
    console.log('  • Copy .env.example to .env (if needed)');
    console.log('  • Clean Next.js build cache');
    console.log('  • Reset to first-time user experience');
    
    const skipConfirmation = hasYesFlag();
    
    if (skipConfirmation) {
      logInfo('--yes flag detected, skipping confirmation.');
    } else {
      const confirmed = await askForConfirmation();
      
      if (!confirmed) {
        logInfo('Reset cancelled.');
        process.exit(0);
      }
    }

    log('\n🚀 Starting reset process...\n');

    // Step 1: Remove existing database
    const dbPath = path.join(process.cwd(), 'db', 'prod.db');
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
      logSuccess('Removed existing database');
    } else {
      logInfo('No existing database found');
    }

    // Step 2: Copy .env.example to .env if .env doesn't exist
    const envPath = path.join(process.cwd(), '.env');
    const envExamplePath = path.join(process.cwd(), '.env.example');
    
    if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
      fs.copyFileSync(envExamplePath, envPath);
      logSuccess('Created .env file from .env.example');
    } else if (fs.existsSync(envPath)) {
      logInfo('.env file already exists (not overwritten)');
    } else {
      logWarning('.env.example not found - you may need to create .env manually');
    }

    // Step 3: Clean Next.js cache
    const nextCachePath = path.join(process.cwd(), '.next');
    if (fs.existsSync(nextCachePath)) {
      fs.rmSync(nextCachePath, { recursive: true, force: true });
      logSuccess('Cleaned Next.js build cache');
    }

    // Step 4: Reset database with Prisma
    logInfo('Resetting database with Prisma...');
    try {
      execSync('npx prisma migrate reset --force', { 
        stdio: 'pipe',
        cwd: process.cwd()
      });
      logSuccess('Database reset and seeded successfully');
    } catch (error) {
      logError('Failed to reset database with Prisma');
      console.error(error.message);
      process.exit(1);
    }

    // Success message
    log('\n🎉 Reset completed successfully!', '\x1b[1m\x1b[32m'); // Bold Green
    log('================================\n');
    
    logInfo('Next steps:');
    console.log('  1. Run: npm run dev');
    console.log('  2. Open: http://localhost:3000');
    console.log('  3. Complete first-time admin setup');
    console.log('  4. Start building your application!\n');
    
    logInfo('The application is now in its initial state, ready for first-time setup.');

  } catch (error) {
    logError(`Reset failed: ${error.message}`);
    process.exit(1);
  } finally {
    rl.close();
  }
}

main();