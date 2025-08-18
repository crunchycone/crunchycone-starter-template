# CrunchyCone Starter Template - Project Guide

## ⚠️ INITIAL SETUP CHECKLIST (RUN IN THIS EXACT ORDER!)

### 🚨 BEFORE YOU START - CHECK THESE IN ORDER:

1. [ ] **Dependencies installed?** Check: `ls node_modules`
   - ❌ If not found → **RUN FIRST**: `npm install`
   - ⚠️ **NOTHING WORKS WITHOUT THIS**
2. [ ] **Environment configured?** Check: `ls .env`
   - ❌ If not found → **RUN SECOND**: `npm run setup-env`
   - This creates .env and generates secure JWT secret automatically
   - ⚠️ **DATABASE SETUP NEEDS THIS**
3. [ ] **Database exists?** Check: `ls prisma/db/prod.db`
   - ❌ If not found → **RUN THIRD**: `npm run db:reset --yes`
   - ⚠️ **APP WON'T START WITHOUT THIS**
4. [ ] **Getting TypeScript/Prisma errors?**
   - ❌ → **RUN**: `npx prisma generate`

### 🎯 QUICK START (First Time Setup - EXACT ORDER)

```bash
# 1. Install dependencies (nothing works without this)
npm install

# 2. Setup environment (database needs this)
npm run setup-env

# 3. Create database (app won't start without this)
npm run db:reset --yes

# 4. Start development server (opens browser automatically)
npm run dev:open
```

⚠️ **CRITICAL**: Must run commands in this EXACT order. Environment MUST be configured before database setup!

### ⚠️ CRITICAL: Schema Change Workflow

**If you modify `prisma/schema.prisma`:**

```bash
# ALWAYS use migrate (includes generate automatically)
npx prisma migrate dev --name "describe-your-changes"

# NEVER run just generate after schema changes
# ❌ npx prisma generate  # WRONG - creates type/database mismatch
```

## Overview

This is a production-ready Next.js starter template with authentication, admin dashboard, and role-based access control. The application uses TypeScript, Tailwind CSS, Prisma ORM with SQLite, and shadcn/ui components.

## Project Structure

```
crunchycone-starter-template/
├── app/                      # Next.js App Router
│   ├── actions/             # Server Actions
│   │   └── admin.ts         # Admin-related server actions
│   ├── admin/               # Admin dashboard pages
│   │   ├── layout.tsx       # Admin layout with sidebar
│   │   ├── page.tsx         # Dashboard home
│   │   ├── users/           # User management
│   │   ├── roles/           # Role management
│   │   ├── database/        # Database viewer
│   │   └── settings/        # Admin settings
│   ├── api/                 # API routes
│   │   ├── auth/           # Authentication endpoints
│   │   └── admin/          # Admin API endpoints
│   ├── auth/               # Authentication pages
│   │   ├── signin/         # Sign in page
│   │   ├── signup/         # Sign up page
│   │   └── setup-admin/    # First-time admin setup
│   ├── globals.css         # Global styles
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Home page
├── components/              # React components
│   ├── ui/                 # shadcn/ui components
│   ├── auth/               # Authentication components
│   │   ├── SignInForm.tsx  # Sign in form (email/password + magic link)
│   │   └── SignUpForm.tsx  # Sign up form
│   └── admin/              # Admin components
│       ├── UserManagementPanel.tsx  # User list and management
│       ├── RoleManagementPanel.tsx  # Role management
│       └── DatabaseViewerPanel.tsx  # Database table viewer
├── db/                      # Database files
│   └── prod.db             # SQLite database (gitignored)
├── lib/                     # Utility functions
│   ├── auth/               # Authentication utilities
│   │   ├── auth.ts         # Core auth functions
│   │   └── permissions.ts  # Role and permission checks
│   ├── utils/              # Utility modules
│   │   └── ulid.ts         # ULID generation and Prisma Client Extensions
│   ├── prisma.ts           # Centralized Prisma client with ULID extension
│   └── utils.ts            # General utilities
├── themes/                  # TypeScript theme system
│   ├── types.ts            # Theme TypeScript interfaces
│   ├── index.ts            # Theme registry and utilities
│   ├── base/               # Core system themes
│   │   ├── light.ts        # Light theme definition
│   │   └── dark.ts         # Dark theme definition
│   └── custom/             # Custom themes
│       ├── ocean.ts        # Ocean blue theme
│       ├── forest.ts       # Forest green theme
│       └── midnight.ts     # Midnight purple theme
└── prisma/                  # Prisma configuration
    ├── schema.prisma       # Database schema
    ├── seed.ts             # Database seeding
    └── migrations/         # Database migrations
```

## Database Models

### User Model

```prisma
model User {
  id             String    @id @default("")  // ULID generated by Client Extension
  created_at     DateTime  @default(now())
  updated_at     DateTime  @updatedAt
  deleted_at     DateTime?

  email          String    @unique
  password       String?   // Optional for magic link users
  last_signed_in DateTime?

  profile        UserProfile?
  roles          UserRole[]
}
```

### UserProfile Model

```prisma
model UserProfile {
  id         String    @id @default("")  // ULID generated by Client Extension
  created_at DateTime  @default(now())
  updated_at DateTime  @updatedAt
  deleted_at DateTime?

  user_id    String    @unique
  first_name String?
  last_name  String?

  user       User      @relation(fields: [user_id], references: [id])
}
```

### Role Model

```prisma
model Role {
  id         String    @id @default("")  // ULID generated by Client Extension
  created_at DateTime  @default(now())
  updated_at DateTime  @updatedAt
  deleted_at DateTime?

  name       String    @unique

  users      UserRole[]
}
```

### UserRole Model (Many-to-Many)

```prisma
model UserRole {
  id         String    @id @default("")  // ULID generated by Client Extension
  created_at DateTime  @default(now())
  updated_at DateTime  @updatedAt
  deleted_at DateTime?

  user_id    String
  role_id    String

  user       User      @relation(fields: [user_id], references: [id])
  role       Role      @relation(fields: [role_id], references: [id])

  @@unique([user_id, role_id])
}
```

### Important Database Patterns

- All models include `created_at`, `updated_at`, and `deleted_at` (soft delete)
- Use soft deletes by setting `deleted_at` instead of hard deleting records
- Always filter by `deleted_at: null` when querying active records
- **IDs are ULIDs**: All primary keys use ULID (Universally Unique Lexicographically Sortable Identifier) strings
  - Generated automatically by Prisma Client Extension when creating records
  - 26-character strings that are sortable by creation time
  - Example: `01JZK5AT1CBD1SBW5T3JQ60VPR`
  - No need to manually generate IDs - the Client Extension handles it

## Authentication System

### Core Functions (lib/auth/auth.ts)

- `hashPassword(password)` - Hash passwords with bcrypt (10 salt rounds)
- `verifyPassword(password, hash)` - Verify password against hash
- `createSession(userId)` - Create user session with HTTP-only cookie
- `getSession(token?)` - Get current session from cookie or token
- `clearSession()` - Clear session cookie

### Token Functions (lib/auth/token.ts)

- `generateToken(userId, type)` - Generate JWT tokens
- `verifyToken(token)` - Verify and decode JWT tokens
- **Token Types**: access (7d), verification (1d), reset (1h), magic_link (1d)

### Permission Functions (lib/auth/permissions.ts)

- `hasRole(userId, roleName)` - Check if user has specific role
- `requireRole(roleName)` - Server action that redirects if role missing
- `isAdmin(userId)` - Check if user is admin
- `getCurrentUser()` - Get current user with profile and roles
- `checkAdminExists()` - Check if any admin user exists

### Complete Authentication Flows

#### First-Time Setup Flow

1. **Admin Check**: `checkAdminExists()` on every page load
2. **No Admin Found**: Redirect to `/auth/setup-admin`
3. **Admin Creation**: Create first admin account with profile and admin role
4. **System Ready**: Application becomes fully functional
5. **Protection**: Once admin exists, `/auth/setup-admin` redirects to home page

#### Sign-Up Flow

1. **Registration**: `/auth/signup` with email/password
2. **Verification Token**: Generate 24-hour verification token
3. **Email Sent**: Verification email to console (dev) or email provider
4. **Email Verification**: `/auth/verify-email?token=...` validates and activates account
5. **Account Active**: User can now sign in

#### Sign-In Flows

**Email/Password**:

1. **Credentials**: User enters email/password at `/auth/signin`
2. **Verification**: `verifyPassword()` against bcrypt hash
3. **Session**: `createSession()` creates JWT token in HTTP-only cookie
4. **Redirect**: To intended page or home

**Magic Link**:

1. **Email Request**: User enters email for magic link
2. **Token Generation**: Create magic_link token (24-hour expiry)
3. **Email Sent**: Magic link email to console (dev) or email provider
4. **Auto Sign-In**: `/api/auth/magic-link?token=...` validates and creates session
5. **Redirect**: To home with success message

#### Password Reset Flow

1. **Reset Request**: User clicks "Forgot password?" → `/auth/forgot-password`
2. **Email Lookup**: Find user by email (no enumeration - always returns success)
3. **Reset Token**: Generate reset token (1-hour expiry)
4. **Email Sent**: Reset link email to console (dev) or email provider
5. **Password Reset**: `/auth/reset-password?token=...` validates token
6. **Token Verification**: Server-side validation via `/api/auth/verify-reset-token`
7. **New Password**: User sets new password via `/api/auth/reset-password`
8. **Success**: Redirect to sign-in with confirmation message

### Session Management

- **JWT Tokens**: Stored in HTTP-only cookies
- **CSRF Protection**: SameSite cookie policy
- **Expiry**: 7 days for access tokens
- **Security**: Secure flag in production
- **Logout**: Manual session termination available

## Server Actions vs API Routes

### When to Use Server Actions vs API Routes

This project uses **Server Actions** for most data mutations and form submissions, with **API Routes** reserved for specific use cases. Understanding this distinction is crucial for maintaining consistent patterns.

#### Use Server Actions For:

- **Form submissions** (sign up, sign in, password reset)
- **Database mutations** (creating, updating, deleting records)
- **Admin operations** (user management, role assignments)
- **Authentication flows** that don't require external redirects
- **Any operation that needs to revalidate cached data**

#### Use API Routes For:

- **External integrations** (webhooks, third-party API endpoints)
- **Authentication endpoints** that set cookies (magic links, OAuth callbacks)
- **File uploads** with external storage
- **Operations that need custom response headers**
- **Endpoints consumed by external services**

### Server Action Patterns

#### Basic Server Action Structure

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser, isAdmin } from "@/lib/auth/permissions";

export async function createUserAction(formData: FormData) {
  // 1. Authentication check
  const currentUser = await getCurrentUser();
  if (!currentUser || !(await isAdmin(currentUser.id))) {
    redirect("/auth/signin");
  }

  // 2. Data validation
  const email = formData.get("email") as string;
  if (!email || !email.includes("@")) {
    throw new Error("Invalid email");
  }

  // 3. Database operation
  const user = await prisma.user.create({
    data: { email, password: hashedPassword },
  });

  // 4. Revalidate affected pages
  revalidatePath("/admin/users");
  revalidatePath("/admin");

  // 5. Redirect or return
  redirect("/admin/users");
}
```

#### Data Mutation with Real-time Updates

```typescript
export async function toggleUserRoleAction(
  userId: number,
  roleId: number,
  action: "add" | "remove"
) {
  const currentUser = await getCurrentUser();
  if (!currentUser || !(await isAdmin(currentUser.id))) {
    throw new Error("Unauthorized");
  }

  // Prevent self-demotion
  if (userId === currentUser.id && action === "remove") {
    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (role?.name === "admin") {
      throw new Error("Cannot remove your own admin role");
    }
  }

  if (action === "add") {
    await prisma.userRole.create({
      data: { user_id: userId, role_id: roleId },
    });
  } else {
    await prisma.userRole.updateMany({
      where: { user_id: userId, role_id: roleId },
      data: { deleted_at: new Date() },
    });
  }

  // Revalidate all affected pages
  revalidatePath("/admin/users");
  revalidatePath("/admin");
  revalidatePath(`/admin/users/${userId}`);
}
```

### Authentication Patterns with Server Actions

#### Form-based Authentication

```typescript
// app/actions/auth.ts
"use server";

export async function signInAction(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const user = await prisma.user.findUnique({
    where: { email, deleted_at: null },
  });

  if (!user || !(await verifyPassword(password, user.password))) {
    throw new Error("Invalid credentials");
  }

  await createSession(user.id);
  redirect("/");
}
```

#### Component Usage

```typescript
// components/auth/SignInForm.tsx
import { signInAction } from '@/app/actions/auth'

export function SignInForm() {
  return (
    <form action={signInAction}>
      <input name="email" type="email" required />
      <input name="password" type="password" required />
      <button type="submit">Sign In</button>
    </form>
  )
}
```

### Why Not Mix Patterns

#### ❌ Don't Do This (Mixing Client Fetch with Server Actions)

```typescript
// Bad: Using fetch to call server actions
const handleSubmit = async (formData) => {
  const response = await fetch("/api/users", {
    method: "POST",
    body: JSON.stringify(formData),
  });
  // Then manually handling revalidation, errors, etc.
};
```

#### ✅ Do This (Pure Server Action)

```typescript
// Good: Direct server action usage
<form action={createUserAction}>
  <input name="email" />
  <button type="submit">Create User</button>
</form>
```

### Revalidation Strategies

#### Path Revalidation

```typescript
// Revalidate specific pages after mutations
revalidatePath("/admin/users"); // User list page
revalidatePath("/admin"); // Dashboard page
revalidatePath(`/admin/users/${id}`); // Specific user page
```

#### Tag Revalidation

```typescript
// For more complex caching scenarios
revalidateTag("users");
revalidateTag("admin-dashboard");
```

### Error Handling in Server Actions

```typescript
export async function serverActionWithErrorHandling(formData: FormData) {
  try {
    // Validation
    const validatedData = schema.parse({
      email: formData.get("email"),
      password: formData.get("password"),
    });

    // Database operation
    const result = await prisma.user.create({
      data: validatedData,
    });

    revalidatePath("/users");
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: "Validation failed", details: error.errors };
    }
    return { success: false, error: "Operation failed" };
  }
}
```

### Common Anti-Patterns to Avoid

1. **Don't use middleware for auth when using Server Actions** - Check auth directly in the action
2. **Don't mix fetch() with Server Actions** - Use one pattern consistently
3. **Don't forget revalidatePath()** - UI won't update without it
4. **Don't use Server Actions for GET operations** - Use Server Components for data fetching
5. **Don't call Server Actions from useEffect** - Use form actions or event handlers

## Admin Dashboard

### Complete Admin Features

1. **Dashboard Home** (`/admin`)
   - User statistics (total, active, recent signups)
   - Recent user list with creation dates
   - Quick metrics and overview
   - Navigation to all admin functions

2. **User Management** (`/admin/users`)
   - **Search & Filter**: Real-time search users by email
   - **Pagination**: Handle large user bases efficiently
   - **User Details**: View complete profile information
   - **Password Reset**: Send reset emails to any user
   - **Role Management**:
     - View all roles assigned to a user
     - Add any available role to users (including custom roles)
     - Remove roles from users with role-specific protection
     - **Self-Protection**: Cannot remove your own admin role
     - **Real-time Updates**: UI updates immediately after role changes
     - **Visual Indicators**: Clear role badges and status

3. **Role Management** (`/admin/roles`)
   - **View All Roles**: System and custom roles with user counts
   - **Create Custom Roles**: Add new roles beyond user/admin
   - **Delete Custom Roles**: Remove roles (only if no users assigned)
   - **System Protection**: Cannot delete user/admin roles
   - **Ordering**: Roles ordered by ID for consistency
   - **Real-time Updates**: List updates immediately after changes

4. **Settings Panel** (`/admin/settings`)
   - Application configuration overview
   - Email provider status
   - Security configuration display
   - System information

5. **Database Viewer** (`/admin/database`)
   - **Table List View**: Browse all database tables with row counts
   - **Table Data View**: Inspect table contents with pagination
   - **Column Display**: View all columns and their data types
   - **Pagination**: Navigate through large tables (100 rows per page)
   - **Security**: SQL injection protection with table validation
   - **Performance**: Efficient querying with proper limits

### Admin Access Control

- **Route Protection**: All `/admin/*` routes require admin role
- **API Protection**: All `/api/admin/*` endpoints verify admin status
- **Component Protection**: Admin components check permissions
- **Navigation Guards**: Automatic redirects for non-admin users

### Admin API Routes

- `POST /api/admin/users/[id]/reset-password` - Send password reset
- `POST /api/admin/users/[id]/roles` - Add role to user
- `DELETE /api/admin/users/[id]/roles` - Remove role from user
- `POST /api/admin/roles` - Create new role
- `DELETE /api/admin/roles/[id]` - Delete role

## UI Components

### shadcn/ui Components Used

- Button, Card, Form, Input, Label
- Dialog, DropdownMenu, Table
- Toast, Alert, Tabs, Select
- Separator, Avatar, Badge

### Custom Components

#### Auth Components

- **SignInForm**: Tabbed form with email/password and magic link options
- **SignUpForm**: Registration with password confirmation

#### Admin Components

- **UserManagementPanel**: Full user management interface with search, pagination, and actions
- **RoleManagementPanel**: Role CRUD operations with protections
- **DatabaseViewerPanel**: Database table browser with data inspection

## Key Pages

### Public Pages

- `/` - Home page (shows setup, sign in, or user info based on state)
- `/auth/signin` - Sign in page
- `/auth/signup` - Sign up page
- `/auth/setup-admin` - First-time admin setup (only if no admin exists)

### Protected Pages (Admin Only)

- `/admin` - Admin dashboard
- `/admin/users` - User management
- `/admin/roles` - Role management
- `/admin/database` - Database viewer
- `/admin/settings` - Admin settings

## Working with the Database

### Supported Database Types

The application supports multiple database configurations:

1. **SQLite (Local Development)**: `file:./db/prod.db`
2. **Turso (Production libSQL)**: `libsql://[DATABASE_URL]` 
3. **PostgreSQL**: Standard PostgreSQL connection strings
4. **MySQL**: Standard MySQL connection strings

### Database Configuration

#### SQLite (Default)
```env
DATABASE_URL="file:./db/prod.db"
```

#### Turso (libSQL Cloud)
```env
DATABASE_URL="libsql://[your-database-url]"
TURSO_AUTH_TOKEN="[your-auth-token]"
```

### Turso Database Integration

The application includes full support for **Turso** (libSQL) databases with automated migration and setup:

#### Features:
- **Automatic Migration System**: Custom migration runner for Turso (`scripts/turso-migrate.js`)
- **Migration Tracking**: Maintains `_prisma_migrations` table for applied migrations
- **Schema Generation**: Auto-generates initial schema if no migrations exist
- **Seed Data**: Automatically adds default roles when database is empty
- **Error Handling**: Graceful handling of migration failures with detailed logging

#### How It Works:
1. **Detection**: Unified entrypoint script detects `libsql://` DATABASE_URL
2. **Validation**: Ensures `TURSO_AUTH_TOKEN` is present
3. **Migration Runner**: Executes `turso-migrate.js` with:
   - Connection to Turso database using `@libsql/client`
   - Reading Prisma migration files from `prisma/migrations/`
   - Applying only new migrations (tracks what's been applied)
   - Fallback to schema generation if no migrations exist
4. **Seeding**: Adds default user/admin roles if database is empty

#### Production Deployment:
- Works seamlessly in Docker containers
- No manual migration steps required
- Automatic database initialization on first deploy
- Safe to restart - won't re-run applied migrations

### Common Commands

```bash
# Generate Prisma client after schema changes
npx prisma generate

# Create and apply migrations
npx prisma migrate dev --name description

# Reset database and run seed (SQLite only)
npm run db:reset

# Open Prisma Studio
npm run db:studio

# Run seed script
npm run db:seed

# Manual Turso migration (if needed)
node scripts/turso-migrate.js
```

### Database Best Practices

1. Always use transactions for multi-table operations
2. Use soft deletes (set `deleted_at`) instead of hard deletes
3. Include proper indexes for frequently queried fields
4. Filter by `deleted_at: null` for active records
5. **For Turso**: Ensure migrations are tested locally with SQLite first
6. **For Production**: Use environment-specific DATABASE_URL values

### CRITICAL: Database Development Flow

**ALWAYS follow this sequence when modifying `prisma/schema.prisma`:**

1. **Modify the schema** (add/remove/change models, fields, relations, etc.)
2. **Create migration FIRST**: `npx prisma migrate dev --name "descriptive-name"`
3. **Prisma generates client automatically** during migration

**Why this order matters:**

- Migrations update the actual database structure
- Prisma generate syncs TypeScript types with the database
- Running generate before migration creates type/database mismatches

### Schema Change Scenarios:

**For structural changes** (new models, fields, relations):

```bash
# 1. Edit schema.prisma
# 2. Create migration (this also runs prisma generate)
npx prisma migrate dev --name "add-user-preferences-table"
```

**For non-structural changes** (comments, formatting):

```bash
# Only regenerate client
npx prisma generate
```

**Migration Naming Conventions:**

- `add-model-name` - New models
- `update-model-field` - Field changes
- `remove-unused-table` - Deletions
- `add-indexes` - Performance improvements

**Never run migrations automatically** - they can be destructive and need review.

## Environment Variables

### Required Variables

Create a `.env` file with the following variables:

#### Core Application
```env
JWT_SECRET="your-secret-key"
EMAIL_FROM="noreply@example.com"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

#### Database Configuration

**For SQLite (Local Development):**
```env
DATABASE_URL="file:./db/prod.db"
```

**For Turso (Production):**
```env
DATABASE_URL="libsql://[your-database-url]"
TURSO_AUTH_TOKEN="[your-auth-token]"
```

**For PostgreSQL:**
```env
DATABASE_URL="postgresql://user:password@host:port/database"
```

**For MySQL:**
```env
DATABASE_URL="mysql://user:password@host:port/database"
```

### Environment Variable Details

- **DATABASE_URL**: Database connection string (determines database type)
- **TURSO_AUTH_TOKEN**: Required for Turso/libSQL databases (obtain from Turso dashboard)
- **JWT_SECRET**: Secret key for JWT token signing (auto-generated by `npm run setup-env`)
- **EMAIL_FROM**: Default sender email address for system emails
- **NEXT_PUBLIC_APP_URL**: Public URL of your application (used in email links)

## Development Workflow

### Adding New Features

1. Update Prisma schema if needed
2. Run migrations: `npx prisma migrate dev`
3. Create server actions in `app/actions/`
4. Create API routes in `app/api/`
5. Build UI components in `components/`
6. Add pages in `app/`
7. Update this documentation

### Security Considerations

- All admin routes check for admin role
- Users cannot remove their own admin role
- System roles (user, admin) cannot be deleted
- Cannot delete last admin user
- Passwords are hashed with bcrypt
- Sessions use HTTP-only cookies
- JWT tokens have appropriate expiry times

## Email System

The email system uses a provider pattern for maximum flexibility and easy integration:

### Email Provider Architecture (`lib/email/email.ts`)

```typescript
interface EmailProvider {
  sendEmail(options: EmailOptions): Promise<void>;
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}
```

### Current Implementation

- **ConsoleEmailProvider**: Logs emails to console (perfect for development)
- **Provider Pattern**: Easy to swap between different email services
- **Global Configuration**: Set once, use everywhere

### Email Templates (Built-in)

- **Verification Email**: `getVerificationEmailTemplate(token, appUrl)`
  - Purpose: Verify user email addresses after registration
  - Expiry: 24 hours
  - Route: `/auth/verify-email?token=...`
  - HTML + Text versions included

- **Password Reset Email**: `getPasswordResetEmailTemplate(token, appUrl)`
  - Purpose: Reset forgotten passwords
  - Expiry: 1 hour (security requirement)
  - Route: `/auth/reset-password?token=...`
  - Clear instructions and security warnings

- **Magic Link Email**: `getMagicLinkEmailTemplate(token, appUrl)`
  - Purpose: Passwordless authentication
  - Expiry: 24 hours
  - Route: `/api/auth/magic-link?token=...` (direct API for security)
  - Automatic sign-in on click

### Production Email Providers (see docs/email-providers.md)

- **SendGrid**: Enterprise-grade email delivery
- **Resend**: Developer-focused email API
- **AWS SES**: Scalable cloud email service
- **SMTP**: Traditional email servers (Gmail, custom)
- **Development Tools**: Mailtrap, Ethereal Email for testing

### Email Provider Setup

```typescript
// Initialize provider on app start
import { setEmailProvider } from "@/lib/email/email";
import { SendGridProvider } from "@/lib/email/providers/sendgrid";

setEmailProvider(new SendGridProvider(process.env.SENDGRID_API_KEY));
```

## TypeScript Theme System

The application includes a modern TypeScript-based theme system with `next-themes` for maximum maintainability and type safety:

### 🎨 Features

- **Multiple Themes**: Light, Dark, Ocean, Forest, Midnight + System theme detection
- **Type Safety**: Complete TypeScript interfaces for all theme definitions
- **Organized Structure**: Themes organized in folders with clear separation
- **Dynamic Theme Toggle**: Component automatically reads from theme registry
- **Theme Utilities**: Built-in validation, CSS generation, and management functions
- **Persistent Preferences**: Theme choices saved across sessions
- **No Flash on Load**: Smooth theme transitions without FOUC
- **Tailwind v4 Ready**: Future-proof architecture for Tailwind CSS v4

### 📁 Theme Directory Structure

```
themes/
├── types.ts              # TypeScript interfaces and types
├── index.ts               # Theme registry and utility functions
├── base/                  # Core system themes
│   ├── light.ts          # Light theme definition
│   └── dark.ts           # Dark theme definition
└── custom/                # Custom themes
    ├── ocean.ts          # Ocean Blue theme
    ├── forest.ts         # Forest Green theme
    └── midnight.ts       # Midnight Purple theme
```

### 🚀 Theme Toggle Implementation

The theme toggle dynamically loads available themes:

```typescript
// components/theme-toggle.tsx
import { getThemesByCategory } from "@/themes";

const baseThemes = getThemesByCategory("base");      // [light, dark]
const customThemes = getThemesByCategory("custom");  // [ocean, forest, midnight]
```

### 🎯 Adding a New Theme

1. **Create Theme File**: `themes/custom/yourtheme.ts`
2. **Register in Registry**: Add to `themes/index.ts`
3. **Generate CSS**: Use utility function to create CSS
4. **Update Provider**: Add theme name to `app/layout.tsx`

See complete documentation in `/themes/README.md`

### 🎨 Available Themes

- **Light** (`light`) - Clean, bright theme
- **Dark** (`dark`) - Professional dark theme  
- **Ocean** (`ocean`) - Blue ocean-inspired theme 🌊
- **Forest** (`forest`) - Green nature-inspired theme 🌲
- **Midnight** (`midnight`) - Purple night-inspired theme 🌙
- **System** (`system`) - Automatically follows OS preference

### 🔧 Theme Utilities

```typescript
import { 
  getAllThemes, 
  getTheme, 
  validateTheme,
  generateThemeCSS 
} from "@/themes";

// Get all available themes
const themes = getAllThemes();

// Get specific theme
const oceanTheme = getTheme("ocean");

// Validate theme structure
const validation = validateTheme(newTheme);

// Generate CSS from theme object
const css = generateThemeCSS(oceanTheme);
```

## Recent Updates in This Session

### ✅ Prisma Client Extensions Migration
- **Migrated from deprecated Prisma middleware to Client Extensions API**
- Updated ULID auto-generation system for better performance and future compatibility
- Fixed deprecation warnings in `/lib/utils/ulid.ts` and `/lib/prisma.ts`

### ✅ Prisma Configuration Modernization  
- **Created `prisma.config.ts`** to replace deprecated package.json seed configuration
- Added proper environment variable loading with `dotenv/config`
- Fixed `npm run db:reset` command failures

### ✅ TypeScript Theme System Implementation
- **Completely reorganized theme system** with TypeScript objects for maintainability
- Added 3 custom themes: Ocean (🌊), Forest (🌲), Midnight (🌙)
- Created `/themes/` directory with organized theme definitions
- Implemented type-safe theme registry with validation utilities
- Enhanced ThemeToggle component with dynamic theme loading
- Future-proofed for Tailwind CSS v4 compatibility

### ✅ Git Local Exclusions
- Added `prisma/prod.db` to local git exclude (`.git/info/exclude`)
- Database files now excluded locally without affecting team `.gitignore`

## Future Enhancements

1. **Email Service**: Implement real email sending (SendGrid, Resend, etc.)
2. **Two-Factor Authentication**: Add 2FA support  
3. **API Rate Limiting**: Implement rate limiting for API routes
4. **Audit Logs**: Track admin actions
5. **User Profiles**: Expand user profile functionality
6. **File Uploads**: Add avatar/profile picture support
7. **Automated Theme CSS Generation**: Build-time script for theme CSS
8. **Theme Marketplace**: Share themes between projects

## Troubleshooting

### Common Issues

1. **"No admin exists" loop**: Run `npm run db:seed` to create default roles
2. **Database locked**: Stop all running processes and restart
3. **Type errors**: Run `npx prisma generate` after schema changes
4. **Auth not working**: Check JWT_SECRET environment variable

### Debug Commands

```bash
# Check database content
npm run db:studio

# Reset everything
rm -f db/prod.db && npm run db:reset

# Check for TypeScript errors
npm run build
```

## Unified Docker Entrypoint System

The application uses a sophisticated entrypoint script (`scripts/unified-entrypoint.sh`) that automatically detects and configures the environment for different deployment platforms and database types.

### Platform Auto-Detection

The entrypoint automatically detects the deployment platform:

- **Cloudflare Containers**: `CLOUDFLARE_DEPLOYMENT_ID` or `CLOUDFLARE_LOCATION`
- **Render.com**: `RENDER_SERVICE_ID` or `RENDER=true`
- **Fly.io**: `FLY_APP_NAME` or `PRIMARY_REGION`
- **Google Cloud Run**: `PORT` + `K_SERVICE`
- **Default**: Falls back to standard configuration

### Database Auto-Detection and Setup

The entrypoint intelligently handles different database types:

#### Turso (libSQL) Databases
**Detection**: `DATABASE_URL` starts with `libsql://`

1. **Validation**: Ensures `TURSO_AUTH_TOKEN` is present
2. **Migration Runner**: Executes `scripts/turso-migrate.js`
3. **Features**:
   - Creates `_prisma_migrations` tracking table
   - Applies only new migrations from `prisma/migrations/`
   - Generates initial schema if no migrations exist
   - Adds seed data (default roles) if database is empty
   - Graceful error handling with detailed logging

#### SQLite Databases
**Detection**: `DATABASE_URL` starts with `file:`

1. **Path Extraction**: Parses database file path from URL
2. **Directory Setup**: Creates database directory if missing
3. **Permission Checks**: Validates write permissions
4. **Database Initialization**:
   - If database missing: runs migrations + seeding
   - If database exists: applies pending migrations
   - Uses `prisma migrate deploy` with fallback to `prisma db push`

#### External Databases (PostgreSQL/MySQL)
**Detection**: All other `DATABASE_URL` formats

1. **Migration Deployment**: Uses standard `prisma migrate deploy`
2. **Fallback**: Uses `prisma db push --skip-generate` if migrations fail
3. **Production Ready**: Handles external database connections

### Platform-Specific Configuration

#### Cloudflare Containers
- **Port**: Fixed to `8080` (Cloudflare requirement)
- **Migration Mode**: Strict error handling (`MIGRATION_STRICT=true`)
- **Enhanced Logging**: More detailed error reporting

#### Default Platforms (Render, GCP, Fly.io)
- **Port**: Uses environment `PORT` variable
- **Migration Mode**: Graceful error handling (`MIGRATION_STRICT=false`)
- **Hostname**: Binds to `0.0.0.0` for container networking

### Key Features

1. **Zero Configuration**: Automatically detects and configures environment
2. **Database Agnostic**: Supports SQLite, Turso, PostgreSQL, MySQL
3. **Platform Agnostic**: Works across major container platforms
4. **Error Resilience**: Graceful handling of migration failures
5. **Development Friendly**: Detailed logging and status reporting
6. **Production Ready**: Optimized for different deployment environments

### Entrypoint Flow

```bash
🚀 Platform Detection → 🔧 Configuration → 🗄️ Database Setup → ✨ App Start
```

1. **Platform Detection**: Auto-detects deployment environment
2. **Configuration**: Applies platform-specific settings
3. **Database Setup**: Detects database type and runs appropriate setup
4. **Application Start**: Launches Next.js with optimized configuration

This unified approach ensures consistent behavior across all deployment environments while automatically handling the complexities of different platforms and database types.

## Additional Documentation

For detailed implementation guides, see the `docs/` folder:

- [Email Providers Guide](./docs/email-providers.md) - Implement SendGrid, Resend, AWS SES, etc.
- [Authentication Providers Guide](./docs/auth-providers.md) - Add Google, GitHub, Facebook OAuth
- [Theme Customization Guide](./docs/theme-customization.md) - Create custom themes and color schemes
- [Documentation Index](./docs/README.md) - Overview of all guides

## Cursor AI Rules

This project includes comprehensive development rules in the `.cursor/rules` folder that provide detailed guidance for Cursor AI. These rules ensure consistent implementation patterns and help maintain project integrity:

### Available Rules:

- **`project.mdc`** - Overall project architecture, supported flows, and extension points
- **`database.mdc`** - Database design patterns, ULID implementation, and Prisma workflows
- **`auth.mdc`** - Complete authentication flows, security patterns, and permission systems
- **`admin.mdc`** - Admin dashboard features, access control, and component patterns
- **`prisma.mdc`** - Schema change workflows, migration best practices, and conventions
- **`server-actions.mdc`** - Server Actions vs API Routes patterns, form integration, and revalidation
- **`themes.mdc`** - Theme system implementation, adding new themes, and customization options
- **`setup.mdc`** - Automated project setup rules for new installations

### How to Use These Rules:

1. **For Cursor AI**: The rules automatically apply based on file patterns and provide context-aware assistance
2. **For Developers**: Reference these files when implementing new features to ensure consistency
3. **For Customization**: Modify the rules to match your team's specific requirements

### Key Benefits:

- Consistent code patterns across the entire codebase
- Automatic guidance for common tasks (auth, database, themes, etc.)
- Prevention of anti-patterns and common mistakes
- Clear documentation of architectural decisions
- Context-aware assistance based on what you're working on

## Contributing

When adding new features:

1. Follow existing patterns for consistency
2. Add proper TypeScript types
3. Include error handling
4. Update this documentation
5. Test both happy and error paths
6. Consider mobile responsiveness
7. Maintain security best practices
8. Update relevant documentation in `docs/` folder
