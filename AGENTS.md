# AI Agent Instructions

This document provides structured guidance for AI agents working with the CrunchyCone Vanilla Starter Project, referencing the detailed rules in `.cursor/rules/`.

## Rule Integration Framework

All agents should follow patterns defined in `.cursor/rules/` before making any code changes or architectural decisions.

### Core Rule Files

📋 **Base Rules**: `.cursor/rules/project.md` - Core project patterns, conventions, anti-patterns
📋 **Setup Rules**: `.cursor/rules/setup.md` - Environment setup, installation, initialization flows

### Domain-Specific Rules

#### Authentication & Security

📋 **Auth Rules**: `.cursor/rules/auth.md` - Auth flows, session handling, security patterns

- Session management with Auth.js v4
- Role-based access control patterns
- OAuth provider integration
- Security best practices and JWT handling

#### Database Operations

📋 **Database Rules**: `.cursor/rules/database.md` - Query patterns, migrations, best practices

- Prisma client usage and extensions
- ULID generation and soft delete patterns
- Transaction handling and error management
- Always filter `deleted_at: null` for active records

📋 **Prisma Rules**: `.cursor/rules/prisma.md` - Schema changes, client usage, migration patterns

- Schema change workflow: modify → migrate → never just generate
- Migration naming conventions
- Client generation and type safety

#### Application Architecture

📋 **Server Actions**: `.cursor/rules/server-actions.md` - Action patterns, validation, revalidation

- Server Action vs API Route decision matrix
- Form handling and revalidation patterns
- Error handling and user feedback

📋 **Admin Rules**: `.cursor/rules/admin.md` - Dashboard patterns, permissions, role management

- Admin route protection patterns
- User management and role assignment
- Self-protection mechanisms (admin can't remove own admin role)

#### UI & Theming

📋 **Theme Rules**: `.cursor/rules/themes.md` - Theme system, customization, TypeScript patterns

- TypeScript-based theme system usage
- Theme toggle implementation
- CSS custom property generation

## Agent Behavior Guidelines

### Before Making Changes

1. **Read relevant rule files** from `.cursor/rules/` for the domain you're working in
2. **Check existing patterns** in the codebase before implementing new solutions
3. **Follow established conventions** rather than creating new patterns

### Code Modification Priorities

1. **Edit existing files** over creating new ones
2. **Use established patterns** from the codebase
3. **Reference rule files** for implementation details
4. **Maintain type safety** and follow TypeScript patterns

### Security Requirements

- Always check authentication state in protected routes
- Implement proper role-based access control
- Never expose sensitive data in client-side code
- Use established security patterns from auth rules

### UI Component Guidelines

- Check `components/ui/` before creating custom components
- Install from shadcn/ui registry when needed: `npx shadcn@latest add [component]`
- Combine existing primitives before building custom solutions
- Follow Tailwind CSS and accessibility patterns

## Rule Reference Matrix

| Task Type           | Primary Rule        | Secondary Rules                   | Key Patterns                          |
| ------------------- | ------------------- | --------------------------------- | ------------------------------------- |
| Auth Implementation | `auth.md`           | `project.md`, `server-actions.md` | Session handling, role checks         |
| Database Changes    | `database.md`       | `prisma.md`                       | Soft deletes, ULID IDs, migrations    |
| Admin Features      | `admin.md`          | `auth.md`, `server-actions.md`    | Role protection, self-protection      |
| Server Actions      | `server-actions.md` | `auth.md`, `database.md`          | Validation, revalidation, auth checks |
| UI Components       | `project.md`        | `themes.md`                       | shadcn/ui patterns, theme integration |
| Schema Updates      | `prisma.md`         | `database.md`                     | Migration workflow, type generation   |
| Theme Work          | `themes.md`         | `project.md`                      | TypeScript themes, CSS generation     |
| Environment Setup   | `setup.md`          | `project.md`                      | Initialization order, env vars        |

## Context-Aware Decision Making

### When to Use Server Actions vs API Routes

📋 **Reference**: `.cursor/rules/server-actions.md`

- **Server Actions**: Form submissions, DB mutations, admin operations, revalidation needs
- **API Routes**: External integrations, OAuth callbacks, file uploads, webhooks

### When to Create New Components

📋 **Reference**: `.cursor/rules/project.md`

1. Check existing `components/ui/` components first
2. Install from shadcn/ui if missing: `npx shadcn@latest add [component]`
3. Combine existing components before creating custom ones
4. Only create custom when no existing solution fits

### Database Operation Patterns

📋 **Reference**: `.cursor/rules/database.md`, `.cursor/rules/prisma.md`

- Always use transactions for multi-table operations
- Filter `deleted_at: null` for active record queries
- Use ULID IDs (auto-generated) for new records
- Follow migration workflow: schema change → migrate → auto client generation

## Error Prevention

### Common Anti-Patterns to Avoid

- Creating new files when editing existing ones would suffice
- Using `prisma generate` instead of `prisma migrate dev`
- Mixing Server Actions with fetch() calls
- Creating custom UI components when shadcn/ui exists
- Bypassing authentication checks in protected routes
- Not using soft delete patterns for data removal

### Quality Assurance Checklist

- [ ] Relevant `.cursor/rules/` files consulted
- [ ] Existing patterns followed
- [ ] Authentication properly implemented
- [ ] Type safety maintained
- [ ] Error handling included
- [ ] Documentation updated if needed
- [ ] Security best practices followed

## Integration with CLAUDE.md

This document works in tandem with CLAUDE.md:

- **CLAUDE.md**: High-level project overview and quick reference
- **AGENTS.md**: Detailed agent behavior and rule integration
- **`.cursor/rules/`**: Specific implementation patterns and anti-patterns

For implementation details, always reference the specific rule files in `.cursor/rules/` before making changes.
