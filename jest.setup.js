import '@testing-library/jest-dom'

// Mock environment variables for testing
process.env.NODE_ENV = 'test'
process.env.AUTH_SECRET = 'test-secret-key-for-jest-testing-only'
process.env.DATABASE_URL = 'file:./test.db'
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'

// Mock NextAuth
jest.mock('next-auth', () => ({
  default: jest.fn(),
}))

// Mock Prisma client - using relative path since module doesn't exist yet
jest.mock('./lib/auth/prisma-auth', () => ({
  prismaAuth: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    role: {
      findUnique: jest.fn(),
    },
    userRole: {
      create: jest.fn(),
    },
  },
}))

// Mock crunchycone-lib
jest.mock('crunchycone-lib', () => ({
  createEmailService: jest.fn(() => ({
    sendEmail: jest.fn().mockResolvedValue({ success: true }),
  })),
  getEmailTemplateService: jest.fn(() => ({
    previewTemplate: jest.fn().mockResolvedValue({
      subject: 'Test Subject',
      html: '<p>Test HTML</p>',
      text: 'Test Text',
    }),
  })),
}))

// Mock next-rate-limit
jest.mock('next-rate-limit', () => {
  const mockLimiter = {
    checkNext: jest.fn().mockResolvedValue({}),
  }
  return jest.fn(() => mockLimiter)
})

// Mock bcryptjs
jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}))