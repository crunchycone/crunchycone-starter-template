# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-01-01

### Added
- Initial release of Production Starter Template
- Complete authentication system with email/password and magic links
- JWT-based session management with HTTP-only cookies
- Role-based access control (RBAC) with user and admin roles
- Admin dashboard with user and role management
- First-time admin setup flow
- Email service with provider pattern
- Full dark mode support using next-themes
- Comprehensive documentation in docs/ folder
- Cursor IDE integration files
- SQLite database with Prisma ORM
- Soft delete pattern for all models
- shadcn/ui component library integration
- TypeScript for type safety
- Server Components and Server Actions
- Responsive design for all screen sizes

### Security
- Password hashing with bcrypt
- Secure JWT token generation and validation
- HTTP-only cookies for session storage
- CSRF protection with SameSite cookies
- Input validation with Zod
- Protected admin routes and APIs
- Prevention of self-demotion for admin users

### Documentation
- Comprehensive README with quick start guide
- Technical documentation in CLAUDE.md
- Email provider implementation guide
- Authentication provider implementation guide
- Theme customization guide
- Cursor IDE MDC files for better AI assistance