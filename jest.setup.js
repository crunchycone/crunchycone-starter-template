import "@testing-library/jest-dom";

// Mock environment variables for testing
process.env.NODE_ENV = "test";
process.env.AUTH_SECRET = "test-secret-key-for-jest-testing-only";
process.env.DATABASE_URL = "file:./test.db";
process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";

// Mock NextAuth
jest.mock("next-auth", () =>
  jest.fn(() => ({
    providers: [],
    session: { strategy: "jwt" },
    callbacks: {},
  }))
);

// Mock next-auth/next
jest.mock("next-auth/next", () => ({
  getServerSession: jest.fn(),
}));

// Mock @auth/prisma-adapter to avoid ES module issues
jest.mock("@auth/prisma-adapter", () => ({
  PrismaAdapter: jest.fn(() => ({
    createUser: jest.fn(),
    getUser: jest.fn(),
    getUserByEmail: jest.fn(),
    getUserByAccount: jest.fn(),
    updateUser: jest.fn(),
    deleteUser: jest.fn(),
    linkAccount: jest.fn(),
    unlinkAccount: jest.fn(),
    createSession: jest.fn(),
    getSessionAndUser: jest.fn(),
    updateSession: jest.fn(),
    deleteSession: jest.fn(),
    createVerificationToken: jest.fn(),
    useVerificationToken: jest.fn(),
  })),
}));

// Mock Prisma client - using relative path since module doesn't exist yet
jest.mock("./lib/auth/prisma-auth", () => ({
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
}));

// Mock crunchycone-lib
jest.mock("crunchycone-lib", () => ({
  createEmailService: jest.fn(() => ({
    sendEmail: jest.fn().mockResolvedValue({ success: true }),
  })),
  getEmailTemplateService: jest.fn(() => ({
    previewTemplate: jest.fn().mockResolvedValue({
      subject: "Test Subject",
      html: "<p>Test HTML</p>",
      text: "Test Text",
    }),
  })),
}));

// Mock next-rate-limit
jest.mock("next-rate-limit", () => {
  const mockLimiter = {
    checkNext: jest.fn().mockResolvedValue({}),
  };
  return jest.fn(() => mockLimiter);
});

// Mock bcryptjs
jest.mock("bcryptjs", () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));
