# Testing Guide

This document provides comprehensive information about testing in the CrunchyCone Vanilla Starter Project.

## Overview

The project includes a comprehensive test suite built with Jest and TypeScript, providing extensive coverage of authentication, security, and core functionality.

## Test Framework

### Technology Stack

- **Jest**: Testing framework with TypeScript support
- **@testing-library/jest-dom**: Extended Jest matchers for DOM testing
- **ES Modules**: Full support for modern JavaScript modules
- **TypeScript**: Complete type safety in tests
- **Mocking**: Comprehensive mocking of external dependencies

### Configuration

Test configuration is managed through:
- `jest.config.js` - Main Jest configuration
- `jest.setup.js` - Global test setup and mocking
- `tsconfig.json` - TypeScript configuration for tests

## Running Tests

### Basic Commands

```bash
# Run all tests
npm test

# Run tests with coverage report
npm test -- --coverage

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test -- --testPathPatterns="auth.test.ts"

# Run tests matching pattern
npm test -- --testNamePattern="OAuth"

# Run tests silently (reduce output)
npm test -- --silent
```

### Coverage Requirements

The project maintains a **70% coverage threshold** for:
- **Branches**: 70% minimum
- **Functions**: 70% minimum
- **Lines**: 70% minimum
- **Statements**: 70% minimum

Coverage reports are generated in the `coverage/` directory.

## Test Structure

### Directory Organization

```
__tests__/
├── lib/
│   ├── auth/
│   │   ├── utils/           # Authentication utility tests
│   │   ├── providers/       # OAuth and credential provider tests
│   │   └── callbacks/       # Session and callback tests
│   └── rate-limit.test.ts   # Rate limiting tests
└── integration/
    └── auth-flows.test.ts   # End-to-end integration tests
```

### Test Categories

1. **Unit Tests**: Individual function and component testing
2. **Integration Tests**: End-to-end workflow testing
3. **Security Tests**: Malicious input and security validation
4. **Error Handling Tests**: Edge cases and error scenarios

## Test Coverage Details

### Authentication Tests (100% Coverage)

**Auth Utilities (`__tests__/lib/auth/utils/`)**
- `password-auth.test.ts` - Password hashing, verification, credential validation
- `role-management.test.ts` - Role assignment, validation, admin protection
- `user-lookup.test.ts` - User search, profile retrieval, error handling
- `profile-sync.test.ts` - OAuth profile synchronization, avatar updates

**Auth Providers (`__tests__/lib/auth/providers/`)**
- `credentials.test.ts` - Email/password authentication, validation
- `google.test.ts` - Google OAuth flow, configuration, error handling
- `github.test.ts` - GitHub OAuth flow, email fetching, profile handling

**Auth Callbacks (`__tests__/lib/auth/callbacks/`)**
- `jwt.test.ts` - JWT token creation, role inclusion, OAuth handling
- `session.test.ts` - Session management, token validation
- `redirect.test.ts` - URL validation, malicious redirect prevention
- `signin.test.ts` - Sign-in flow, OAuth processing, error handling

### Rate Limiting Tests

**File**: `__tests__/lib/rate-limit.test.ts`

**Coverage Areas**:
- Rate limit configuration validation
- Request throttling functionality
- HTTP header validation
- Error response formatting
- Development vs production mode differences
- Rate limit bypass prevention

### Integration Tests

**File**: `__tests__/integration/auth-flows.test.ts`

**Test Scenarios**:
- Complete credentials authentication flow
- OAuth authentication flows (Google, GitHub)
- Rate limiting integration with auth endpoints
- Error handling across multiple components
- Security validation in realistic scenarios

## Mocking Strategy

### External Dependencies

All external dependencies are comprehensively mocked:

```typescript
// Prisma database mocking
jest.mock('./lib/auth/prisma-auth', () => ({
  prismaAuth: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    // ... other models
  },
}))

// NextAuth mocking
jest.mock('next-auth', () => ({
  default: jest.fn(),
}))

// Rate limiting mocking
jest.mock('next-rate-limit', () => {
  const mockLimiter = {
    checkNext: jest.fn().mockResolvedValue({}),
  }
  return jest.fn(() => mockLimiter)
})

// Crypto mocking
jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}))
```

### Benefits of Mocking

- **Isolation**: Tests run independently without external dependencies
- **Speed**: No network calls or database operations
- **Reliability**: Consistent test results regardless of external state
- **Security**: No real data or credentials used in tests

## Security Testing

### Comprehensive Security Validation

**Input Validation Testing**:
- Malicious URL redirect prevention
- Invalid email and password handling
- SQL injection attempt prevention
- XSS attack vector testing

**Authentication Security**:
- OAuth flow security validation
- JWT token security testing
- Session management security
- Password security validation

**Rate Limiting Security**:
- Brute force attack prevention
- Rate limit bypass attempt testing
- IP-based throttling validation
- Security header validation

### Example Security Test

```typescript
describe('Security Flows', () => {
  it('should prevent malicious redirects', async () => {
    const maliciousUrls = [
      'https://evil.com/steal-tokens',
      'javascript:alert(document.cookie)',
      'http://malicious-site.com/phishing',
    ]

    for (const url of maliciousUrls) {
      const result = await redirectCallback({
        url,
        baseUrl: 'http://localhost:3000',
      })
      expect(result).toBe('http://localhost:3000/')
    }
  })
})
```

## Test Environment

### Environment Variables

Tests run with isolated environment variables:

```javascript
// jest.setup.js
process.env.NODE_ENV = 'test'
process.env.AUTH_SECRET = 'test-secret-key-for-jest-testing-only'
process.env.DATABASE_URL = 'file:./test.db'
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
```

### Test Database

Tests use mocked database operations to:
- Avoid dependency on real database
- Ensure consistent test results
- Prevent test data pollution
- Enable parallel test execution

## Writing New Tests

### Test File Structure

```typescript
import { functionToTest } from '@/lib/module'
import * as dependencies from '@/lib/dependencies'

// Mock dependencies
jest.mock('@/lib/dependencies')

const mockDependency = dependencies.someFunction as jest.MockedFunction<
  typeof dependencies.someFunction
>

describe('Module Name', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('functionToTest', () => {
    it('should handle normal case', () => {
      // Arrange
      mockDependency.mockResolvedValue('expected-result')

      // Act
      const result = functionToTest('input')

      // Assert
      expect(result).toBe('expected-result')
      expect(mockDependency).toHaveBeenCalledWith('input')
    })

    it('should handle error case', () => {
      // Test error scenarios
    })

    it('should handle edge case', () => {
      // Test edge cases
    })
  })
})
```

### Testing Best Practices

1. **Arrange-Act-Assert**: Clear test structure
2. **Descriptive Names**: Test names explain what is being tested
3. **Mock Isolation**: Each test starts with clean mocks
4. **Error Testing**: Always test error scenarios
5. **Edge Cases**: Test boundary conditions
6. **Security**: Include security-focused test cases

### Test Coverage Requirements

When adding new features:
- Maintain 70% minimum coverage
- Test both success and failure paths
- Include security validation tests
- Add integration tests for complex flows
- Mock all external dependencies

## Continuous Integration

### CI/CD Integration

Tests are designed to run in CI/CD pipelines:

```bash
# CI/CD command
npm ci && npm test -- --coverage --ci
```

**CI/CD Benefits**:
- Automated testing on every commit
- Coverage validation before deployment
- Security test validation
- Consistent test environment

### Pre-commit Hooks

Git hooks run tests automatically:
- Linting validation
- Type checking
- Basic test validation
- Package synchronization

## Debugging Tests

### Common Issues

**Jest ES Module Issues**:
```bash
# Solution: Ensure jest.config.js uses ES modules
export default createJestConfig(customJestConfig)
```

**Mock Resolution Issues**:
```typescript
// Solution: Mock before importing
jest.mock('module')
import { functionToTest } from 'module'
```

**TypeScript Issues**:
```bash
# Solution: Check tsconfig.json includes test files
"include": ["**/*.ts", "**/*.tsx", "__tests__/**/*"]
```

### Debug Commands

```bash
# Run with verbose output
npm test -- --verbose

# Run specific test with debugging
npm test -- --testPathPatterns="specific.test.ts" --verbose

# Debug mode
node --inspect-brk node_modules/.bin/jest --runInBand
```

## Performance Testing

### Test Performance

- Tests run in under 30 seconds
- Parallel execution enabled
- Minimal setup/teardown
- Efficient mocking strategy

### Monitoring Test Performance

```bash
# Check test timing
npm test -- --verbose

# Profile slow tests
npm test -- --detectSlowTests
```

## Future Enhancements

### Planned Improvements

1. **E2E Testing**: Add Playwright for browser testing
2. **Visual Testing**: Screenshot comparison tests
3. **Load Testing**: Performance validation tests
4. **API Testing**: Dedicated API endpoint testing
5. **Mobile Testing**: Responsive design validation

### Test Automation

- Automated test generation
- Mutation testing for coverage validation
- Performance regression testing
- Security vulnerability scanning

## Resources

### Documentation

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Library](https://testing-library.com/docs/)
- [TypeScript Testing](https://typescript-eslint.io/docs/linting/type-linting/)

### Best Practices

- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Security Testing Guide](https://owasp.org/www-community/Security_Testing_Guide)
- [CI/CD Testing Strategies](https://docs.github.com/en/actions/automating-builds-and-tests/building-and-testing-nodejs)

## Support

For testing-related questions:
1. Check existing test files for patterns
2. Review Jest configuration files
3. Consult testing documentation
4. Follow established mocking patterns