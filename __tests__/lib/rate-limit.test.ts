import { NextRequest } from "next/server";

// Mock next-rate-limit before importing the module
jest.mock("next-rate-limit");

// Now import after mocking
import { applyRateLimit, rateLimitConfigs } from "@/lib/rate-limit";
import rateLimit from "next-rate-limit";

const mockRateLimit = rateLimit as jest.MockedFunction<typeof rateLimit>;

describe("rate-limit", () => {
  let mockLimiter: any;
  let mockRequest: NextRequest;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock the limiter instance
    mockLimiter = {
      checkNext: jest.fn(),
    };
    mockRateLimit.mockReturnValue(mockLimiter);

    // Create a mock NextRequest
    mockRequest = {
      headers: new Map([
        ["x-forwarded-for", "192.168.1.1"],
        ["user-agent", "Mozilla/5.0"],
      ]),
      nextUrl: new URL("http://localhost:3000/api/auth/signin"),
    } as any;
  });

  describe("rateLimitConfigs", () => {
    it("should have different limits for development and production", () => {
      // Test development mode
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      // Re-import to get fresh config
      jest.resetModules();
      const { rateLimitConfigs: devConfigs } = await import("@/lib/rate-limit");

      expect(devConfigs.authSignIn.requests).toBe(100);
      expect(devConfigs.admin.requests).toBe(1000);

      // Test production mode
      process.env.NODE_ENV = "production";
      jest.resetModules();
      const { rateLimitConfigs: prodConfigs } = await import("@/lib/rate-limit");

      expect(prodConfigs.authSignIn.requests).toBe(3);
      expect(prodConfigs.admin.requests).toBe(30);

      // Restore
      process.env.NODE_ENV = originalNodeEnv;
    });

    it("should have correct configuration structure", () => {
      expect(rateLimitConfigs).toHaveProperty("auth");
      expect(rateLimitConfigs).toHaveProperty("authSignIn");
      expect(rateLimitConfigs).toHaveProperty("authSignUp");
      expect(rateLimitConfigs).toHaveProperty("passwordReset");
      expect(rateLimitConfigs).toHaveProperty("admin");

      // Check each config has required properties
      Object.values(rateLimitConfigs).forEach((config) => {
        expect(config).toHaveProperty("requests");
        expect(config).toHaveProperty("interval");
        expect(typeof config.requests).toBe("number");
        expect(typeof config.interval).toBe("number");
      });
    });
  });

  describe("applyRateLimit", () => {
    it("should return success when rate limit is not exceeded", async () => {
      mockLimiter.checkNext.mockResolvedValue({});

      const config = { requests: 5, interval: 60000 };
      const result = await applyRateLimit(mockRequest, config);

      expect(result.success).toBe(true);
      expect(result.limit).toBe(5);
      expect(result.remaining).toBe(5);
      expect(result.reset).toBeInstanceOf(Date);
      expect(mockLimiter.checkNext).toHaveBeenCalledWith(mockRequest, 5);
    });

    it("should return failure when rate limit is exceeded", async () => {
      mockLimiter.checkNext.mockRejectedValue(new Error("Rate limit exceeded"));

      const config = { requests: 3, interval: 60000 };
      const result = await applyRateLimit(mockRequest, config);

      expect(result.success).toBe(false);
      expect(result.limit).toBe(3);
      expect(result.remaining).toBe(0);
      expect(result.reset).toBeInstanceOf(Date);
      expect(mockLimiter.checkNext).toHaveBeenCalledWith(mockRequest, 3);
    });

    it("should handle different request configurations", async () => {
      mockLimiter.checkNext.mockResolvedValue({});

      const config = { requests: 10, interval: 30000 };
      const result = await applyRateLimit(mockRequest, config);

      expect(result.success).toBe(true);
      expect(result.limit).toBe(10);
      expect(mockLimiter.checkNext).toHaveBeenCalledWith(mockRequest, 10);
    });

    it("should calculate reset time correctly", async () => {
      mockLimiter.checkNext.mockResolvedValue({});

      const config = { requests: 5, interval: 60000 };
      const beforeTime = Date.now();
      const result = await applyRateLimit(mockRequest, config);
      const afterTime = Date.now();

      expect(result.reset.getTime()).toBeGreaterThanOrEqual(beforeTime + 60000);
      expect(result.reset.getTime()).toBeLessThanOrEqual(afterTime + 60000);
    });

    it("should work with different rate limit configs", async () => {
      mockLimiter.checkNext.mockResolvedValue({});

      // Test with auth sign-in config
      const authResult = await applyRateLimit(mockRequest, rateLimitConfigs.authSignIn);
      expect(authResult.success).toBe(true);

      // Test with admin config
      const adminResult = await applyRateLimit(mockRequest, rateLimitConfigs.admin);
      expect(adminResult.success).toBe(true);

      expect(mockLimiter.checkNext).toHaveBeenCalledTimes(2);
    });

    it("should handle errors from rate limiter gracefully", async () => {
      mockLimiter.checkNext.mockRejectedValue(new Error("Network error"));

      const config = { requests: 5, interval: 60000 };
      const result = await applyRateLimit(mockRequest, config);

      expect(result.success).toBe(false);
      expect(result.limit).toBe(5);
      expect(result.remaining).toBe(0);
      expect(result.reset).toBeInstanceOf(Date);
    });
  });

  describe("rate limiter initialization", () => {
    it("should initialize rate limiter with correct configuration", () => {
      expect(mockRateLimit).toHaveBeenCalledWith({
        interval: 60 * 1000,
        uniqueTokenPerInterval: 500,
      });
    });
  });
});
