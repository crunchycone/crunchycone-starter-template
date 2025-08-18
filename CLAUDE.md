# CrunchyCone Starter Template

## Setup (Run in Order)

```bash
npm install                    # 1. Dependencies first
npm run setup-env             # 2. Environment (.env + AUTH_SECRET)
npm run db:reset --yes        # 3. Database
npm run dev:open              # 4. Start server
```

**Schema Changes**: `npx prisma migrate dev --name "description"` (never just `generate`)

## Overview

Production-ready Next.js starter with Auth.js v4, admin dashboard, roles, TypeScript, Tailwind CSS, Prisma ORM, shadcn/ui.

## Key Structure

- `app/` - Next.js App Router (actions, admin, auth pages, API routes)
- `components/` - React components (ui, auth, admin, profile)
- `lib/` - Auth.js config, permissions, Prisma clients, utilities
- `themes/` - TypeScript theme system (light, dark, ocean, forest, midnight)
- `prisma/` - Schema, migrations, seeding

## Database Models

**Core Models**: User, UserProfile, Role, UserRole (many-to-many)
**Patterns**: ULID IDs (auto-generated), soft deletes (`deleted_at`), timestamps
**Query**: Always filter `deleted_at: null` for active records

## Authentication (Auth.js v4)

**Providers**: Credentials (email/password), Email (magic links), Google OAuth, GitHub OAuth
**Sessions**: JWT with Prisma adapter
**Console Email**: Development magic links logged to console

**Key Functions**: `getCurrentUser()`, `hasRole()`, `isAdmin()`, `checkAdminExists()`

**Auth Flows**: 
- Setup: Check admin exists → redirect to setup if none
- Sign-up: Register → auto sign-in
- Sign-in: Email/password or magic link
- Reset: JWT token (1hr) → new password

**Sessions**: JWT in HTTP-only cookies, `auth()` for server, `useSession()` for client

**Usage**:
- Client: `useSession()`, `signIn()`, `signOut()`
- Server: `const session = await auth()`
- API: Check session, return 401 if unauthorized

## Server Actions vs API Routes

**Server Actions**: Form submissions, DB mutations, admin ops, revalidation
**API Routes**: External integrations, OAuth callbacks, file uploads, webhooks

**Server Action Pattern**: 
1. Auth check (`await auth()`)
2. Validate data
3. DB operation
4. `revalidatePath()` 
5. Redirect/return

**Real-time Updates**: Use `revalidatePath()` after mutations for immediate UI updates


**Don't Mix**: Use Server Actions directly in forms, not fetch() calls




## Admin Dashboard

**Pages**: Dashboard, Users, Roles, Database Viewer, Settings
**Features**: Search, pagination, role management, password reset
**Protection**: All routes/APIs require admin role, self-protection (can't remove own admin)
**API**: User/role management endpoints at `/api/admin/*`

## Components

**shadcn/ui**: Button, Card, Form, Input, Dialog, Table, Toast, etc.
**Custom**: SignInForm (tabs), SignUpForm, UserManagementPanel, RoleManagementPanel

## Pages

**Public**: Home, sign-in, sign-up, setup-admin
**User**: Profile
**Admin**: Dashboard, users, roles, database, settings

## Profile System

**Features**: User info display, OAuth linking/unlinking (with safety checks), auto profile sync
**OAuth**: Google + GitHub integration with account linking, profile enrichment, avatar sync

## OAuth Providers

**Google**: Google Cloud Console + env vars (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`)
**GitHub**: GitHub OAuth App + env vars (`GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`)
**Features**: Auto UI, account linking, profile sync, role assignment, avatar sync
**Details**: Complete setup guide in `docs/auth-providers.md`

## Database Support

**Types**: SQLite (dev), Turso (libSQL), PostgreSQL, MySQL
**Config**: `DATABASE_URL` + `TURSO_AUTH_TOKEN` (for Turso)

**Turso Features**: Auto-migration system, tracking table, schema generation, seeding
**Production**: Docker-ready, auto-init, safe restarts

**Commands**: `npx prisma migrate dev`, `npm run db:reset`, `npm run db:seed`

**Best Practices**: Transactions, soft deletes, proper indexes
**Workflow**: Schema change → migrate (not generate) → auto client generation

## Environment Variables

**Required**: `AUTH_SECRET`, `AUTH_URL`, `DATABASE_URL`, `EMAIL_FROM`, `NEXT_PUBLIC_APP_URL`
**Optional**: `TURSO_AUTH_TOKEN` (for Turso), OAuth provider vars
**OAuth**: `GOOGLE_CLIENT_ID/SECRET`, `GITHUB_CLIENT_ID/SECRET`, provider toggles
**Auto-generated**: `npm run setup-env` creates .env with AUTH_SECRET

## Development

**Workflow**: Schema → migrate → server actions → components → pages
**Security**: Role checks, self-protection, bcrypt, HTTP-only cookies, JWT expiry

## Email System

**Current**: Console provider (dev-friendly)
**Templates**: Verification, password reset, magic link
**Production**: SendGrid, Resend, AWS SES, SMTP (see `docs/email-providers.md`)
**Pattern**: Swappable provider interface

## Theme System

**Themes**: Light, Dark, Ocean, Forest, Midnight, System
**Features**: TypeScript-based, dynamic toggle, persistent preferences, Tailwind v4 ready
**Structure**: `themes/base/` (light, dark), `themes/custom/` (ocean, forest, midnight)
**Utilities**: `getAllThemes()`, `getTheme()`, `validateTheme()`, `generateThemeCSS()`

## Recent Updates

- **Auth.js v4**: Complete migration from custom JWT, Prisma adapter, console email provider
- **Prisma**: Client Extensions API, modernized config, ULID auto-generation
- **Themes**: TypeScript system with 5 themes, type-safe registry
- **Git**: Local database exclusions

## Troubleshooting

**Common Issues**: No admin loop (`npm run db:seed`), DB locked (restart), type errors (`npx prisma generate`)
**Debug**: `rm -f db/prod.db && npm run db:reset`, `npm run build`

## Docker Deployment

**Auto-Detection**: Cloudflare, Render, Fly.io, GCP based on env vars
**Database Setup**: Auto-detects SQLite/Turso/PostgreSQL/MySQL, runs migrations
**Zero Config**: Platform-specific ports, migration modes, error handling

## Documentation

See `docs/` folder: email providers, auth providers, theme customization

## Cursor AI Rules

**Location**: `.cursor/rules/` folder
**Files**: project, database, auth, admin, prisma, server-actions, themes, setup
**Benefits**: Consistent patterns, context-aware assistance, anti-pattern prevention

## Contributing

Follow patterns, add types, handle errors, update docs, test thoroughly, maintain security
