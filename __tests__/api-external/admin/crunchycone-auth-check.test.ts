import { NextRequest } from "next/server";
import { POST } from "@/app/api/admin/crunchycone-auth-check/route";

// Mock the auth and service dependencies
jest.mock("@/lib/auth/permissions");
jest.mock("@/lib/crunchycone-auth-service");
jest.mock("@/lib/platform-utils");

import { requireRole } from "@/lib/auth/permissions";
import { getCrunchyConeAuthService } from "@/lib/crunchycone-auth-service";
import { isPlatformEnvironment } from "@/lib/platform-utils";

const mockRequireRole = requireRole as jest.MockedFunction<typeof requireRole>;
const mockGetCrunchyConeAuthService = getCrunchyConeAuthService as jest.MockedFunction<
  typeof getCrunchyConeAuthService
>;
const mockIsPlatformEnvironment = isPlatformEnvironment as jest.MockedFunction<
  typeof isPlatformEnvironment
>;

describe("/api/admin/crunchycone-auth-check", () => {
  let mockRequest: NextRequest;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequest = new NextRequest("http://localhost:3000/api/admin/crunchycone-auth-check", {
      method: "POST",
    });
  });

  describe("POST /api/admin/crunchycone-auth-check", () => {
    it("should return successful authentication status when authenticated", async () => {
      // Mock admin access
      mockRequireRole.mockResolvedValue(undefined);
      mockIsPlatformEnvironment.mockReturnValue(false);

      // Mock successful auth service
      const mockAuthService = {
        checkAuthentication: jest.fn().mockResolvedValue({
          success: true,
          source: "keychain",
          user: { name: "Test User" },
          project: { id: "test-project" },
          message: "Authenticated successfully",
          error: null,
        }),
      };
      mockGetCrunchyConeAuthService.mockReturnValue(mockAuthService as any);

      const response = await POST(mockRequest);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.authenticated).toBe(true);
      expect(result.output.success).toBe(true);
      expect(result.output.source).toBe("keychain");
      expect(result.output.user.name).toBe("Test User");
      expect(result.output.platform.environment).toBe("local");
      expect(mockRequireRole).toHaveBeenCalledWith("admin");
    });

    it("should return failed authentication status when not authenticated", async () => {
      // Mock admin access
      mockRequireRole.mockResolvedValue(undefined);
      mockIsPlatformEnvironment.mockReturnValue(false);

      // Mock failed auth service
      const mockAuthService = {
        checkAuthentication: jest.fn().mockResolvedValue({
          success: false,
          source: "not_authenticated",
          user: null,
          project: null,
          message: "Not authenticated",
          error: "No valid authentication found",
        }),
      };
      mockGetCrunchyConeAuthService.mockReturnValue(mockAuthService as any);

      const response = await POST(mockRequest);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.authenticated).toBe(false);
      expect(result.output.success).toBe(false);
      expect(result.output.error).toBe("No valid authentication found");
      expect(result.output.platform.environment).toBe("local");
    });

    it("should return platform environment information when in platform mode", async () => {
      // Mock admin access and platform environment
      mockRequireRole.mockResolvedValue(undefined);
      mockIsPlatformEnvironment.mockReturnValue(true);

      // Mock successful auth service for platform
      const mockAuthService = {
        checkAuthentication: jest.fn().mockResolvedValue({
          success: true,
          source: "platform",
          user: { name: "Platform User" },
          project: { id: "platform-project" },
          message: "Platform authenticated",
          error: null,
        }),
      };
      mockGetCrunchyConeAuthService.mockReturnValue(mockAuthService as any);

      const response = await POST(mockRequest);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.output.platform.isPlatform).toBe(true);
      expect(result.output.platform.environment).toBe("platform");
    });

    it("should handle authentication service errors gracefully", async () => {
      // Mock admin access
      mockRequireRole.mockResolvedValue(undefined);
      mockIsPlatformEnvironment.mockReturnValue(false);

      // Mock auth service throwing error
      const mockAuthService = {
        checkAuthentication: jest.fn().mockRejectedValue(new Error("Service unavailable")),
      };
      mockGetCrunchyConeAuthService.mockReturnValue(mockAuthService as any);

      const response = await POST(mockRequest);
      const result = await response.json();

      expect(response.status).toBe(500);
      expect(result.authenticated).toBe(false);
      expect(result.error).toBe("Failed to check authentication status");
      expect(result.output.error).toBe("Service unavailable");
    });

    it("should require admin role and return 401 for unauthorized users", async () => {
      // Mock unauthorized access
      mockRequireRole.mockRejectedValue(new Error("Unauthorized"));

      const response = await POST(mockRequest);
      const result = await response.json();

      expect(response.status).toBe(500);
      expect(result.authenticated).toBe(false);
      expect(mockRequireRole).toHaveBeenCalledWith("admin");
    });

    it("should handle unknown errors gracefully", async () => {
      // Mock admin access
      mockRequireRole.mockResolvedValue(undefined);
      mockIsPlatformEnvironment.mockReturnValue(false);

      // Mock auth service throwing non-Error object
      const mockAuthService = {
        checkAuthentication: jest.fn().mockRejectedValue("Unknown error"),
      };
      mockGetCrunchyConeAuthService.mockReturnValue(mockAuthService as any);

      const response = await POST(mockRequest);
      const result = await response.json();

      expect(response.status).toBe(500);
      expect(result.authenticated).toBe(false);
      expect(result.output.error).toBe("Unknown error");
    });
  });
});
