import { createCredentialsProvider } from "@/lib/auth/providers/credentials";
import { createGoogleProvider } from "@/lib/auth/providers/google";
import { createGitHubProvider } from "@/lib/auth/providers/github";
import { jwtCallback } from "@/lib/auth/callbacks/jwt";
import { sessionCallback } from "@/lib/auth/callbacks/session";
import { signInCallback } from "@/lib/auth/callbacks/signin";
import { redirectCallback } from "@/lib/auth/callbacks/redirect";
import { applyRateLimit, rateLimitConfigs } from "@/lib/rate-limit";
import * as passwordAuth from "@/lib/auth/utils/password-auth";
import * as userLookup from "@/lib/auth/utils/user-lookup";
import * as roleManagement from "@/lib/auth/utils/role-management";
import { NextRequest } from "next/server";

// Mock all external dependencies
jest.mock("@/lib/auth/utils/password-auth");
jest.mock("@/lib/auth/utils/user-lookup");
jest.mock("@/lib/auth/utils/role-management");
jest.mock("next-rate-limit");

const mockVerifyUserCredentials = passwordAuth.verifyUserCredentials as jest.MockedFunction<
  typeof passwordAuth.verifyUserCredentials
>;
const mockFindUserByEmail = userLookup.findUserByEmail as jest.MockedFunction<
  typeof userLookup.findUserByEmail
>;
const mockGetUserRoles = roleManagement.getUserRoles as jest.MockedFunction<
  typeof roleManagement.getUserRoles
>;
const mockAssignDefaultUserRole = roleManagement.assignDefaultUserRole as jest.MockedFunction<
  typeof roleManagement.assignDefaultUserRole
>;

describe("Auth Integration Flows", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset environment variables
    delete process.env.NEXT_PUBLIC_ENABLE_EMAIL_PASSWORD;
    delete process.env.NEXT_PUBLIC_ENABLE_GOOGLE_AUTH;
    delete process.env.NEXT_PUBLIC_ENABLE_GITHUB_AUTH;
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    delete process.env.GITHUB_CLIENT_ID;
    delete process.env.GITHUB_CLIENT_SECRET;
  });

  describe("Complete Credentials Auth Flow", () => {
    it("should complete full credentials authentication flow", async () => {
      // Setup environment for credentials
      process.env.NEXT_PUBLIC_ENABLE_EMAIL_PASSWORD = "true";

      // Mock user verification
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        name: "Test User",
        image: null,
        roles: ["user"],
      };
      mockVerifyUserCredentials.mockResolvedValue(mockUser);

      // 1. Provider Creation
      const provider = createCredentialsProvider();
      expect(provider).toBeDefined();
      expect(provider?.name).toBe("credentials");

      // 2. Authentication
      const authResult = await provider!.authorize({
        email: "test@example.com",
        password: "password123",
      });
      expect(authResult).toEqual(mockUser);

      // 3. JWT Token Creation
      const jwtResult = await jwtCallback({
        token: {},
        user: mockUser,
        account: { provider: "credentials" },
      });
      expect(jwtResult.id).toBe("user-123");
      expect(jwtResult.roles).toEqual(["user"]);

      // 4. Session Creation
      const sessionResult = await sessionCallback({
        session: {
          user: { id: "", email: "test@example.com", name: "Test User", roles: [] },
          expires: "2024-12-31T23:59:59.000Z",
        },
        token: jwtResult,
      });
      expect(sessionResult.user.id).toBe("user-123");
      expect(sessionResult.user.roles).toEqual(["user"]);

      // 5. Sign-in Callback (for credentials, just returns true)
      const signInResult = await signInCallback({
        user: mockUser,
        account: { provider: "credentials", type: "credentials" },
      });
      expect(signInResult).toBe(true);

      // 6. Redirect after successful auth
      const redirectResult = await redirectCallback({
        url: "/dashboard",
        baseUrl: "http://localhost:3000",
      });
      expect(redirectResult).toBe("http://localhost:3000/dashboard");
    });
  });

  describe("Complete OAuth Flow (Google)", () => {
    it("should complete full Google OAuth flow for existing user", async () => {
      // Setup environment for Google OAuth
      process.env.NEXT_PUBLIC_ENABLE_GOOGLE_AUTH = "true";
      process.env.GOOGLE_CLIENT_ID = "test-client-id";
      process.env.GOOGLE_CLIENT_SECRET = "test-client-secret";

      // Mock existing user
      const mockDbUser = {
        id: "user-123",
        email: "test@example.com",
        roles: [{ role: { name: "user" } }],
      };
      mockFindUserByEmail.mockResolvedValue(mockDbUser as any);
      mockGetUserRoles.mockResolvedValue(["user"]);

      // 1. Provider Creation
      const provider = createGoogleProvider();
      expect(provider).toBeDefined();
      expect(provider?.options?.clientId).toBe("test-client-id");

      // 2. Sign-in Callback (OAuth user processing)
      const oauthUser = {
        id: "google-user-123",
        email: "test@example.com",
        name: "Test User",
        image: "https://lh3.googleusercontent.com/avatar",
      };
      const signInResult = await signInCallback({
        user: oauthUser,
        account: { provider: "google", type: "oauth" },
        profile: {
          email: "test@example.com",
          name: "Test User",
          picture: "https://lh3.googleusercontent.com/avatar",
        },
      });
      expect(signInResult).toBe(true);
      expect(mockFindUserByEmail).toHaveBeenCalledWith("test@example.com");

      // 3. JWT Token Creation with role fetching
      const jwtResult = await jwtCallback({
        token: {},
        user: oauthUser,
        account: { provider: "google" },
      });
      expect(jwtResult.id).toBe("google-user-123");
      expect(jwtResult.roles).toEqual(["user"]);
      expect(mockGetUserRoles).toHaveBeenCalledWith("google-user-123");

      // 4. Session Creation
      const sessionResult = await sessionCallback({
        session: {
          user: { id: "", email: "test@example.com", name: "Test User", roles: [] },
          expires: "2024-12-31T23:59:59.000Z",
        },
        token: jwtResult,
      });
      expect(sessionResult.user.id).toBe("google-user-123");
      expect(sessionResult.user.roles).toEqual(["user"]);
    });

    it("should complete full Google OAuth flow for new user", async () => {
      // Setup environment
      process.env.NEXT_PUBLIC_ENABLE_GOOGLE_AUTH = "true";
      process.env.GOOGLE_CLIENT_ID = "test-client-id";
      process.env.GOOGLE_CLIENT_SECRET = "test-client-secret";

      // Mock new user (not found in database)
      mockFindUserByEmail.mockResolvedValue(null);
      mockGetUserRoles.mockResolvedValue(["user"]); // Default role after creation

      const newUser = {
        id: "google-new-user-456",
        email: "newuser@example.com",
        name: "New User",
        image: "https://lh3.googleusercontent.com/avatar",
      };

      // Sign-in callback for new user
      const signInResult = await signInCallback({
        user: newUser,
        account: { provider: "google", type: "oauth" },
        profile: {
          email: "newuser@example.com",
          name: "New User",
          picture: "https://lh3.googleusercontent.com/avatar",
        },
      });
      expect(signInResult).toBe(true);
      expect(mockFindUserByEmail).toHaveBeenCalledWith("newuser@example.com");

      // JWT callback should fetch roles from database
      const jwtResult = await jwtCallback({
        token: {},
        user: newUser,
        account: { provider: "google" },
      });
      expect(jwtResult.id).toBe("google-new-user-456");
      expect(jwtResult.roles).toEqual(["user"]);
    });
  });

  describe("Rate Limiting Integration", () => {
    let mockRequest: NextRequest;

    beforeEach(() => {
      mockRequest = {
        headers: new Map([
          ["x-forwarded-for", "192.168.1.1"],
          ["user-agent", "Mozilla/5.0"],
        ]),
        nextUrl: new URL("http://localhost:3000/api/auth/signin"),
      } as any;
    });

    it("should integrate rate limiting with auth endpoints", async () => {
      // Mock rate limiter to allow requests
      const mockLimiter = {
        checkNext: jest.fn().mockResolvedValue({}),
      };
      const { default: rateLimit } = await import("next-rate-limit");
      (rateLimit as jest.MockedFunction<typeof rateLimit>).mockReturnValue(mockLimiter);

      // Test auth sign-in rate limiting
      const authResult = await applyRateLimit(mockRequest, rateLimitConfigs.authSignIn);
      expect(authResult.success).toBe(true);
      expect(authResult.limit).toBe(rateLimitConfigs.authSignIn.requests);

      // Test admin rate limiting
      const adminResult = await applyRateLimit(mockRequest, rateLimitConfigs.admin);
      expect(adminResult.success).toBe(true);
      expect(adminResult.limit).toBe(rateLimitConfigs.admin.requests);
    });

    it("should block requests when rate limit is exceeded", async () => {
      // Mock rate limiter to reject requests
      const mockLimiter = {
        checkNext: jest.fn().mockRejectedValue(new Error("Rate limit exceeded")),
      };
      const { default: rateLimit } = await import("next-rate-limit");
      (rateLimit as jest.MockedFunction<typeof rateLimit>).mockReturnValue(mockLimiter);

      const result = await applyRateLimit(mockRequest, rateLimitConfigs.authSignIn);
      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
    });
  });

  describe("Error Handling Flows", () => {
    it("should handle provider creation failures gracefully", () => {
      // Test Google provider with missing credentials
      process.env.NEXT_PUBLIC_ENABLE_GOOGLE_AUTH = "true";
      // Missing CLIENT_ID and CLIENT_SECRET

      const googleProvider = createGoogleProvider();
      expect(googleProvider).toBeNull();

      // Test GitHub provider with missing credentials
      process.env.NEXT_PUBLIC_ENABLE_GITHUB_AUTH = "true";
      // Missing CLIENT_ID and CLIENT_SECRET

      const githubProvider = createGitHubProvider();
      expect(githubProvider).toBeNull();
    });

    it("should handle authentication failures in complete flow", async () => {
      // Mock failed user verification
      mockVerifyUserCredentials.mockResolvedValue(null);

      const provider = createCredentialsProvider();
      const authResult = await provider!.authorize({
        email: "invalid@example.com",
        password: "wrongpassword",
      });

      expect(authResult).toBeNull();
      expect(mockVerifyUserCredentials).toHaveBeenCalledWith(
        "invalid@example.com",
        "wrongpassword"
      );
    });

    it("should handle database errors in OAuth flow", async () => {
      // Setup Google OAuth
      process.env.NEXT_PUBLIC_ENABLE_GOOGLE_AUTH = "true";
      process.env.GOOGLE_CLIENT_ID = "test-client-id";
      process.env.GOOGLE_CLIENT_SECRET = "test-client-secret";

      // Mock database error
      mockFindUserByEmail.mockRejectedValue(new Error("Database connection failed"));

      const oauthUser = {
        id: "google-user-123",
        email: "test@example.com",
        name: "Test User",
      };

      // Should handle error gracefully and still return true
      const signInResult = await signInCallback({
        user: oauthUser,
        account: { provider: "google", type: "oauth" },
      });
      expect(signInResult).toBe(true);
    });
  });

  describe("Security Flows", () => {
    it("should handle OAuth user without email", async () => {
      const userWithoutEmail = {
        id: "github-user-123",
        email: null,
        name: "User Without Email",
      };

      const signInResult = await signInCallback({
        user: userWithoutEmail,
        account: { provider: "github", type: "oauth" },
      });

      expect(signInResult).toBe(false);
      expect(mockFindUserByEmail).not.toHaveBeenCalled();
    });

    it("should prevent malicious redirects", async () => {
      const maliciousUrls = [
        "https://evil.com/steal-tokens",
        "http://malicious-site.com/phishing",
        "javascript:alert(document.cookie)",
      ];

      for (const url of maliciousUrls) {
        const result = await redirectCallback({
          url,
          baseUrl: "http://localhost:3000",
        });
        expect(result).toBe("http://localhost:3000/");
      }
    });

    it("should handle role assignment for existing users without roles", async () => {
      // Mock existing user without roles
      const mockDbUser = {
        id: "user-123",
        email: "test@example.com",
        roles: [], // No roles
      };
      mockFindUserByEmail.mockResolvedValue(mockDbUser as any);
      mockAssignDefaultUserRole.mockResolvedValue(true);

      const oauthUser = {
        id: "google-user-123",
        email: "test@example.com",
        name: "Test User",
      };

      const signInResult = await signInCallback({
        user: oauthUser,
        account: { provider: "google", type: "oauth" },
      });

      expect(signInResult).toBe(true);
      expect(mockAssignDefaultUserRole).toHaveBeenCalledWith("user-123");
    });
  });
});
