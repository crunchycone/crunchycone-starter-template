# CrunchyCone Starter Template

A production-ready Next.js starter template with authentication, admin dashboard, and role-based access control.

## Features

- 🔐 **Complete Authentication System**
  - Email/password authentication with secure bcrypt hashing
  - Magic link passwordless authentication
  - JWT-based sessions with HTTP-only cookies
  - Password reset with email verification
  - Email verification flow
  - Secure token management with expiration
  - Session management and logout

- 👥 **User Management & RBAC**
  - User profiles with soft delete pattern
  - Role-based access control (RBAC)
  - Default roles: user and admin (system protected)
  - Custom role creation and management
  - Admin dashboard for comprehensive user management
  - First-time admin setup flow
  - User search and pagination
  - Role assignment/removal with protections

- 🎨 **Modern UI/UX**
  - Built with shadcn/ui components
  - Tailwind CSS for responsive styling
  - Full dark mode support with system detection
  - Theme persistence and smooth transitions
  - Responsive design for all screen sizes
  - Loading states, error handling, and success feedback
  - Accessible design with proper contrast ratios

- 📧 **Email System**
  - Provider pattern for easy email service integration
  - Console email provider for development
  - Ready-to-use templates for verification, reset, and magic links
  - Support for SendGrid, Resend, AWS SES, SMTP
  - HTML and text email formats

- 🛠️ **Developer Experience**
  - TypeScript for complete type safety
  - Prisma ORM with SQLite (production database ready)
  - Server Components and Server Actions
  - Comprehensive documentation and guides
  - Cursor IDE integration with smart rules
  - Database migrations and seeding
  - Project reset functionality
  - Cross-platform development support

- 🔧 **Production Ready**
  - Environment-based configuration
  - Security best practices built-in
  - Comprehensive error handling
  - API rate limiting considerations
  - Deployment-ready structure
  - Database migration system
  - Logging and monitoring hooks

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Database**: SQLite with Prisma ORM
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Authentication**: JWT with bcrypt
- **Email**: Provider pattern (console/development)
- **Theme**: next-themes with system detection

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Git

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/crunchycone-starter-template.git
cd crunchycone-starter-template
```

2. Reset the project to initial state:

```bash
npm install
npm run reset
```

3. Start the development server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### 🎯 Quick Setup with Cursor IDE

If you're using [Cursor IDE](https://cursor.sh/), you can set up this project with a single command:

1. **Clone and Open in Cursor**:

```bash
git clone https://github.com/yourusername/crunchycone-starter-template.git
cd crunchycone-starter-template
cursor .
```

2. **Auto-Setup with AI**: In Cursor, simply ask Claude:

```
"setup this project"
```

Claude will automatically:

- ✅ Install all dependencies (`npm install`)
- ✅ Reset the database to fresh state (`npm run reset`)
- ✅ Generate a secure JWT_SECRET automatically
- ✅ Start the development server (`npm run dev`)
- ✅ Open [http://localhost:3000](http://localhost:3000) for you

3. **Create Admin Account**: Visit the opened localhost URL and:

- You'll be redirected to `/auth/setup-admin`
- Enter your email and password for the admin account
- Start using the application immediately

**Why use Cursor?** This project includes comprehensive `.cursor/rules` that help Cursor understand the codebase structure, authentication patterns, database models, and development workflows. Cursor can help you extend the project, add new features, and maintain best practices automatically.

### First-Time Setup

When you first run the application:

1. You'll be redirected to `/auth/setup-admin`
2. Create the first admin account
3. This account will have full admin privileges

## Project Structure

```
crunchycone-starter-template/
├── app/                      # Next.js App Router
│   ├── actions/             # Server Actions
│   ├── admin/               # Admin dashboard pages
│   ├── api/                 # API routes
│   ├── auth/                # Authentication pages
│   └── page.tsx             # Home page
├── components/              # React components
│   ├── ui/                  # shadcn/ui components
│   ├── auth/                # Auth components
│   └── admin/               # Admin components
├── lib/                     # Utility functions
│   ├── auth/                # Authentication utilities
│   └── email/               # Email service
├── prisma/                  # Database configuration
│   ├── schema.prisma        # Database schema
│   └── seed.ts              # Seed script
└── docs/                    # Documentation
```

## Supported User Flows

### 🚀 First-Time Setup Flow

1. **Fresh Installation** → Visit any page
2. **No Admin Detection** → Automatic redirect to `/auth/setup-admin`
3. **Admin Account Creation** → Create first administrator account
4. **Database Initialization** → Sets up default roles and first admin user
5. **Ready to Use** → Application is now fully configured

### 👤 User Registration & Authentication Flows

#### Standard Sign-Up Flow

1. **Visit Sign-Up** → `/auth/signup`
2. **Enter Details** → Email, password, optional profile information
3. **Email Verification** → Receive verification email (console logged in dev)
4. **Verify Email** → Click link in email → `/auth/verify-email?token=...`
5. **Account Activated** → Can now sign in

#### Email/Password Sign-In Flow

1. **Visit Sign-In** → `/auth/signin`
2. **Enter Credentials** → Email and password
3. **Authentication** → Server verifies credentials
4. **Session Created** → JWT token in HTTP-only cookie
5. **Redirect to Dashboard** → Home page or intended destination

#### Magic Link Sign-In Flow

1. **Visit Sign-In** → `/auth/signin` → Magic Link tab
2. **Enter Email** → Request magic link
3. **Email Sent** → Receive magic link email (console logged in dev)
4. **Click Link** → Automatic sign-in via `/api/auth/magic-link?token=...`
5. **Authenticated** → Redirected to home with success message

#### Password Reset Flow

1. **Forgot Password** → Click "Forgot your password?" on sign-in page
2. **Request Reset** → `/auth/forgot-password` → Enter email
3. **Email Sent** → Receive reset link (console logged in dev)
4. **Reset Password** → Click link → `/auth/reset-password?token=...`
5. **New Password** → Enter and confirm new password
6. **Success** → Redirected to sign-in with confirmation

### 🛡️ Admin Management Flows

#### User Management

1. **Access Admin Panel** → `/admin/users` (admin only)
2. **Search Users** → Real-time search by email
3. **View User Details** → Profile information and roles
4. **Manage Roles** → Add/remove roles from users
5. **Send Password Reset** → Send reset email to any user
6. **Protection** → Cannot remove own admin role

#### Role Management

1. **Access Role Panel** → `/admin/roles` (admin only)
2. **View All Roles** → System and custom roles listed
3. **Create Custom Role** → Add new roles beyond user/admin
4. **Delete Roles** → Remove custom roles (if no users assigned)
5. **Protection** → Cannot delete system roles (user, admin)

### 🎨 Theme & Personalization Flows

#### Theme Switching

1. **Theme Toggle** → Available on all pages (top-right)
2. **Options Available** → Light, Dark, System
3. **Persistence** → Theme choice saved across sessions
4. **System Detection** → Automatically follows OS theme preference

### 🔧 Developer & Admin Workflows

#### Project Reset Flow

1. **Reset Command** → `npm run reset` or `npm run reset --yes`
2. **Confirmation** → Interactive prompt (unless --yes flag)
3. **Database Reset** → Removes existing database
4. **Fresh Setup** → Recreates schema and seeds data
5. **Environment Setup** → Copies .env.example if needed
6. **Ready State** → Returns to first-time setup state

#### Database Management

1. **Migrations** → `npx prisma migrate dev --name "description"`
2. **Client Generation** → Automatic after migrations
3. **Seeding** → `npm run db:seed` for default data
4. **Studio Access** → `npm run db:studio` for GUI management

### 📧 Email Verification Flows

#### Email Verification

- **Purpose** → Verify user email addresses
- **Trigger** → Automatic after sign-up
- **Expiry** → 24 hours
- **Action** → Click link to verify email

#### Password Reset

- **Purpose** → Reset forgotten passwords
- **Trigger** → User request via forgot password form
- **Expiry** → 1 hour
- **Action** → Click link to set new password

#### Magic Link

- **Purpose** → Passwordless authentication
- **Trigger** → User request via sign-in form
- **Expiry** → 24 hours
- **Action** → Click link for automatic sign-in

### 🔒 Security & Protection Flows

#### Admin Protection

- **Self-Demotion Prevention** → Admin cannot remove own admin role
- **Last Admin Protection** → Cannot delete the last admin user
- **System Role Protection** → Cannot delete user/admin roles

#### Session Management

- **HTTP-Only Cookies** → Secure token storage
- **Automatic Expiry** → Sessions expire after 7 days
- **Logout Functionality** → Manual session termination
- **Cross-Device** → Independent sessions per device

## Key Features Explained

### Authentication Architecture

The authentication system uses a multi-layered approach:

- **Password Hashing**: bcrypt with salt rounds for secure storage
- **JWT Tokens**: Stateless authentication with different token types
- **Session Management**: HTTP-only cookies for CSRF protection
- **Token Types**: access, verification, reset, magic_link

### Role-Based Access Control (RBAC)

- **System Roles**: `user` (default) and `admin` (elevated permissions)
- **Custom Roles**: Create additional roles for specific permissions
- **Role Assignment**: Many-to-many relationship between users and roles
- **Permission Checks**: Server-side validation using `hasRole()` and `isAdmin()`

### Database Design Patterns

All models follow consistent patterns:

- **Standard Fields**: `id`, `created_at`, `updated_at`, `deleted_at`
- **Soft Deletes**: Records marked as deleted, never physically removed
- **Relationships**: Proper foreign keys and indexes
- **Transactions**: Multi-table operations wrapped in database transactions

## Development

### Database Commands

```bash
# Generate Prisma client
npx prisma generate

# Create a new migration
npx prisma migrate dev --name your-migration-name

# Reset database (drop, create, migrate, seed)
npm run db:reset

# Open Prisma Studio
npm run db:studio

# Run seed script
npm run db:seed

# Reset project to initial state (with confirmation)
npm run reset

# Reset project without confirmation prompt
npm run reset --yes
```

### Distribution Commands

```bash
# Create distribution package for sharing/deployment
npm run distribute
```

The `npm run distribute` command creates a clean distribution package that:

- ✅ Excludes `.git`, `node_modules`, `.next`, and build artifacts
- ✅ Excludes environment files (keeps `.env.example`)
- ✅ Excludes database files (for fresh setup)
- ✅ Includes setup script for easy installation
- ✅ Creates timestamped distribution folder
- ✅ Includes distribution documentation

**Usage:**

1. Run `npm run distribute` in your project
2. Navigate to the created distribution folder
3. Zip the folder: `zip -r distribution-name.zip project-folder/`
4. Share the zip file with others

**Recipients can then:**

1. Extract the zip file
2. Run `./setup.sh` (or follow manual setup in DISTRIBUTION.md)
3. Start developing immediately

### Project Reset

The `npm run reset` command resets the project to its initial state:

- Removes existing database
- Creates fresh database with schema and seed data
- Copies .env.example to .env (if needed)
- **Automatically generates a secure JWT_SECRET** (only if using default value)
- Cleans Next.js build cache
- Prompts for confirmation before proceeding (unless `--yes` flag is used)

**Options:**

- `npm run reset` - Interactive mode with confirmation prompt
- `npm run reset --yes` (or `-y`) - Skip confirmation and reset immediately
- `npm run reset --new-secret` - Also generates a new JWT_SECRET
- `npm run reset --yes --new-secret` - Skip confirmation and generate new JWT_SECRET

This is useful for:

- Setting up the project for new developers
- Starting fresh during development
- Demonstrating the first-time setup flow
- Automated scripts and CI/CD pipelines (use `--yes` flag)

### Adding New Features

1. **Database Changes**: Update `prisma/schema.prisma` and run migrations
2. **Server Actions**: Add to `app/actions/`
3. **API Routes**: Create in `app/api/`
4. **Components**: Build in `components/`
5. **Pages**: Add to `app/`

### Email Configuration

By default, emails are logged to the console. To use a real email provider:

1. Choose a provider (SendGrid, Resend, AWS SES, SMTP)
2. Follow the guide in `docs/email-providers.md`
3. Update environment variables
4. Initialize the provider in your app

## Environment Variables

Create a `.env` file with these variables:

```env
# Database
DATABASE_URL="file:./db/prod.db"

# Authentication
JWT_SECRET="your-secret-key-change-in-production"  # Auto-generated during setup
# Note: Changing JWT_SECRET will invalidate all existing sessions

# Email
EMAIL_FROM="noreply@example.com"

# Application
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Email Provider (optional)
EMAIL_PROVIDER="console"  # or sendgrid, resend, aws-ses, smtp
```

## Security Considerations

- ✅ Passwords hashed with bcrypt
- ✅ JWT tokens with appropriate expiry
- ✅ HTTP-only cookies for sessions
- ✅ CSRF protection with SameSite cookies
- ✅ Input validation with Zod
- ✅ SQL injection protection via Prisma
- ✅ Admin role protection

## Production Deployment

### Pre-deployment Checklist

1. [ ] Change `JWT_SECRET` to a secure random value
2. [ ] Configure a production email provider
3. [ ] Set up proper `NEXT_PUBLIC_APP_URL`
4. [ ] Enable HTTPS
5. [ ] Configure database backups
6. [ ] Set up monitoring and logging
7. [ ] Review and update CORS settings
8. [ ] Test all authentication flows

### Database

For production, consider migrating from SQLite to:

- PostgreSQL (recommended)
- MySQL
- SQL Server

Update the `DATABASE_URL` and Prisma provider accordingly.

## Testing

```bash
# Run type checking
npm run type-check

# Run linting
npm run lint

# Build for production
npm run build
```

## Documentation

Detailed guides are available in the `docs/` folder:

- [Email Providers Guide](./docs/email-providers.md)
- [Authentication Providers Guide](./docs/auth-providers.md)
- [Theme Customization Guide](./docs/theme-customization.md)
- [Technical Documentation (CLAUDE.md)](./CLAUDE.md)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## Support

For issues, questions, or contributions:

- Open an issue on GitHub
- Check existing documentation
- Review closed issues for solutions

## Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Database ORM by [Prisma](https://www.prisma.io/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
