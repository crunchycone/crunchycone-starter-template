#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function log(message) {
  console.log(`📦 ${message}`);
}

function error(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

function success(message) {
  console.log(`✅ ${message}`);
}

function copyFileSync(source, target) {
  let targetFile = target;

  // If target is a directory, a new file with the same name will be created
  if (fs.existsSync(target)) {
    if (fs.lstatSync(target).isDirectory()) {
      targetFile = path.join(target, path.basename(source));
    }
  }

  fs.writeFileSync(targetFile, fs.readFileSync(source));
}

function copyFolderRecursiveSync(source, target, excludeDirs = []) {
  let files = [];

  // Check if folder needs to be created or integrated
  const targetFolder = path.join(target, path.basename(source));
  if (!fs.existsSync(targetFolder)) {
    fs.mkdirSync(targetFolder, { recursive: true });
  }

  // Copy
  if (fs.lstatSync(source).isDirectory()) {
    files = fs.readdirSync(source);
    files.forEach(function (file) {
      const curSource = path.join(source, file);
      
      // Skip excluded directories
      if (excludeDirs.includes(file)) {
        log(`Skipping excluded directory: ${file}`);
        return;
      }

      if (fs.lstatSync(curSource).isDirectory()) {
        copyFolderRecursiveSync(curSource, targetFolder, excludeDirs);
      } else {
        copyFileSync(curSource, targetFolder);
      }
    });
  }
}

function copyDirectoryContents(source, target, excludeDirs = [], excludeFiles = []) {
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }

  const items = fs.readdirSync(source);
  
  items.forEach(item => {
    const sourcePath = path.join(source, item);
    const targetPath = path.join(target, item);
    const stat = fs.lstatSync(sourcePath);

    // Skip excluded directories
    if (stat.isDirectory() && excludeDirs.includes(item)) {
      log(`Skipping excluded directory: ${item}`);
      return;
    }

    // Skip excluded files
    if (stat.isFile() && excludeFiles.includes(item)) {
      log(`Skipping excluded file: ${item}`);
      return;
    }

    if (stat.isDirectory()) {
      // Recursively copy directory
      copyDirectoryContents(sourcePath, targetPath, excludeDirs, excludeFiles);
    } else {
      // Copy file
      copyFileSync(sourcePath, targetPath);
    }
  });
}

function createDistribution() {
  const projectRoot = process.cwd();
  const projectName = path.basename(projectRoot);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const distName = `${projectName}-distribution-${timestamp}`;
  const distPath = path.join(projectRoot, '..', distName);

  log('Creating distribution package...');
  log(`Distribution name: ${distName}`);

  try {
    // Create distribution directory
    log('Creating distribution directory...');
    if (fs.existsSync(distPath)) {
      fs.rmSync(distPath, { recursive: true, force: true });
    }
    fs.mkdirSync(distPath, { recursive: true });

    // List of directories to exclude
    const excludeDirs = [
      '.git',
      '.next',
      'node_modules',
      'dist',
      'build',
      '.turbo',
      'coverage'
    ];

    // List of files to exclude
    const excludeFiles = [
      '.env',
      '.env.local',
      '.env.development.local',
      '.env.test.local',
      '.env.production.local',
      'db/prod.db',
      'db/prod.db-journal',
      'npm-debug.log*',
      'yarn-debug.log*',
      'yarn-error.log*'
    ];

    log('Copying project files...');

    // Create the project directory in the distribution
    const projectDistPath = path.join(distPath, projectName);
    
    // Copy all project contents to the distribution directory
    copyDirectoryContents(projectRoot, projectDistPath, excludeDirs, excludeFiles);

    // Ensure .env.example exists in distribution
    const envExampleTarget = path.join(projectDistPath, '.env.example');
    
    if (fs.existsSync(envExampleTarget)) {
      success('.env.example included in distribution');
    } else {
      log('Warning: .env.example not found in distribution');
    }

    // Create a setup script for the distribution
    const setupScript = `#!/bin/bash

echo "🚀 Setting up ${projectName}..."

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Copy environment variables
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "📝 Copied .env.example to .env"
        echo "⚠️  Please update .env with your configuration"
    else
        echo "⚠️  No .env.example found. Please create .env manually"
    fi
fi

# Reset project to initial state
echo "🔄 Setting up database..."
npm run reset --yes

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update .env with your configuration"
echo "2. Run 'npm run dev' to start development"
echo "3. Visit http://localhost:3000 to setup your admin account"
`;

    const setupScriptPath = path.join(projectDistPath, 'setup.sh');
    fs.writeFileSync(setupScriptPath, setupScript);
    
    // Make setup script executable (on Unix systems)
    try {
      fs.chmodSync(setupScriptPath, '755');
    } catch (e) {
      // Ignore chmod errors on Windows
    }

    success(`Setup script created: setup.sh`);

    // Create README for distribution
    const distributionReadme = `# ${projectName} Distribution

This is a distribution package of the ${projectName} project.

## Quick Setup

### Option 1: Automatic Setup (Recommended)
\`\`\`bash
chmod +x setup.sh
./setup.sh
\`\`\`

### Option 2: Manual Setup
\`\`\`bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Setup database and reset to initial state
npm run reset

# Start development
npm run dev
\`\`\`

## First Time Usage

1. Visit http://localhost:3000
2. You'll be redirected to create your first admin account
3. Enter your email and password
4. Start using the application!

## What's Included

- Complete Next.js application with authentication
- Admin dashboard with user and role management
- Database schema and migrations
- Email system with provider pattern
- Dark mode support
- Comprehensive documentation

## Documentation

- See CLAUDE.md for technical documentation
- See docs/ folder for implementation guides
- See .cursor/rules/ for AI development guidelines

## Support

For issues and questions, please refer to the original repository.

---

Generated on: ${new Date().toISOString()}
`;

    const distReadmePath = path.join(projectDistPath, 'DISTRIBUTION.md');
    fs.writeFileSync(distReadmePath, distributionReadme);
    success('Created DISTRIBUTION.md');

    success(`Distribution created successfully!`);
    success(`Location: ${distPath}`);
    success(`Size: ${(getDirSize(distPath) / 1024 / 1024).toFixed(2)} MB`);
    
    log('');
    log('Distribution contents:');
    log(`- Project files (excluding .git, node_modules, .next)`);
    log(`- .env.example (for configuration)`);
    log(`- setup.sh (automatic setup script)`);
    log(`- DISTRIBUTION.md (setup instructions)`);
    
    log('');
    log('Next steps:');
    log(`1. cd ${distPath}`);
    log(`2. zip -r ${distName}.zip ${path.basename(projectRoot)}/`);
    log(`3. Distribute the ${distName}.zip file`);

  } catch (err) {
    error(`Failed to create distribution: ${err.message}`);
  }
}

function getDirSize(dirPath) {
  let size = 0;
  
  function calculateSize(itemPath) {
    const stat = fs.lstatSync(itemPath);
    
    if (stat.isFile()) {
      size += stat.size;
    } else if (stat.isDirectory()) {
      const items = fs.readdirSync(itemPath);
      items.forEach(item => {
        calculateSize(path.join(itemPath, item));
      });
    }
  }
  
  calculateSize(dirPath);
  return size;
}

// Run the script
createDistribution();