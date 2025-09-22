# Package.json and Lock File Synchronization Rules

## Critical Package Management Guidelines

### 1. Never Commit Mismatched Dependencies
- **ALWAYS** ensure package.json and package-lock.json are in sync before committing
- **NEVER** manually edit package-lock.json - only modify package.json
- **ALWAYS** run `npm install` after modifying package.json to update the lock file

### 2. Dependency Management Commands
- **Adding**: `npm install <package>` (updates both files)
- **Removing**: `npm uninstall <package>` (updates both files)
- **Updating**: `npm update` or `npm install <package>@latest`
- **Clean Install**: `rm -rf node_modules package-lock.json && npm install`

### 3. Pre-Commit Checks
Before any commit involving package.json changes:
1. Verify both files have been modified together
2. Run `npm ls` to check for dependency conflicts
3. Run `npm audit` to check for security vulnerabilities
4. Test that `npm ci` works (simulates fresh install)

### 4. Lock File Best Practices
- **Include** package-lock.json in version control
- **Never ignore** package-lock.json in .gitignore
- **Commit together** - package.json and package-lock.json should be in the same commit
- **Review changes** - check lock file diff for unexpected version bumps

### 5. Troubleshooting Sync Issues
If files are out of sync:
1. Delete node_modules and package-lock.json
2. Run `npm install` to regenerate lock file from package.json
3. Commit both files together
4. For persistent issues, use `npm ci` to verify clean install works

### 6. Team Collaboration
- **Communicate** major dependency changes to team
- **Use exact versions** for critical dependencies in package.json
- **Test thoroughly** after dependency updates
- **Document** any peer dependency requirements

### 7. Automated Checks
The pre-commit hooks automatically verify:
- Package.json and lock file are both staged if either is modified
- `npm ci` runs successfully (validates lock file against package.json)
- Files are properly synchronized before allowing commit
- Install hooks with `npm run hooks:install`

## Red Flags to Watch For
- ❌ Committing only package.json without package-lock.json
- ❌ Committing only package-lock.json without package.json
- ❌ Different dependency versions between local and CI environments
- ❌ `npm install` warnings about peer dependencies
- ❌ Lock file showing different versions than package.json specifies