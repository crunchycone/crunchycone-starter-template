# Documentation

This directory contains detailed guides for extending the CrunchyCone Vanilla Starter Project.

## Available Guides

### 📧 [Email Providers](./email-providers.md)

Learn how to implement different email providers:

- Console (development-friendly logging)
- CrunchyCone email service
- SendGrid
- Resend
- AWS SES
- SMTP (Gmail, custom servers)
- Mailgun
- Auto-preview email templates feature

### 🔐 [Authentication Providers](./auth-providers.md)

Add OAuth and social login providers:

- Google OAuth
- GitHub OAuth
- Facebook Login
- Microsoft/Azure AD
- Discord
- Generic OAuth2 implementation

### 🎨 [Theme Customization](./theme-customization.md)

Create and customize themes:

- TypeScript-based theme system
- Adding preset themes (Ocean, Forest, Midnight)
- User-customizable themes
- Dynamic theme loading with type safety
- Theme editor component
- Color utilities and guidelines
- System theme detection

### 🐳 [Container Deployment](./container-deployment.md)

Deploy to production container platforms:

- Docker with Node.js 24 and optimized builds
- Render.com, Fly.io, Google Cloud Run
- AWS App Runner, Railway, DigitalOcean
- Database migration automation
- Production logging and monitoring

### 🔒 [Security Guide](./security.md)

Comprehensive security documentation:

- Rate limiting and brute force protection
- Authentication and session security
- Input validation and SQL injection prevention
- Security headers and CSRF protection
- Production security checklist
- Vulnerability reporting guidelines

### 🚦 [API Rate Limiting](./api-rate-limiting.md)

Detailed API rate limiting documentation:

- Rate limit configuration and endpoints
- HTTP response formats and headers
- Client implementation examples
- Testing and monitoring strategies
- Troubleshooting and customization
- Security considerations and best practices

### 🧪 [Testing Guide](./testing.md)

Comprehensive testing documentation:

- Jest test framework with TypeScript support
- Authentication and security test coverage
- Rate limiting and integration testing
- Mocking strategies and test structure
- CI/CD integration and coverage requirements
- Security testing and vulnerability validation

## Quick Links

- [Main README](../README.md) - Project overview and quick start
- [CLAUDE.md](../CLAUDE.md) - Technical documentation for developers
- [Container Deployment](./container-deployment.md) - Production deployment guide

## Contributing

When adding new features or providers:

1. Update the relevant documentation
2. Include code examples
3. Document environment variables
4. Add troubleshooting tips
5. Update CLAUDE.md if needed
