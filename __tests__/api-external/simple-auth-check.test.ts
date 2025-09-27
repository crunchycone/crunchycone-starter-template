import { NextRequest } from "next/server";

// Mock all dependencies properly
jest.mock("@/lib/auth/permissions");
jest.mock("@/lib/platform-utils");
jest.mock("@/lib/crunchycone-auth-service");

import { requireRole } from "@/lib/auth/permissions";
import { isPlatformEnvironment } from "@/lib/platform-utils";
import { getCrunchyConeAuthService } from "@/lib/crunchycone-auth-service";

const mockRequireRole = requireRole as jest.MockedFunction<typeof requireRole>;
const mockIsPlatformEnvironment = isPlatformEnvironment as jest.MockedFunction<
  typeof isPlatformEnvironment
>;
const mockGetCrunchyConeAuthService = getCrunchyConeAuthService as jest.MockedFunction<
  typeof getCrunchyConeAuthService
>;

// Import route handlers after mocking
import { POST } from "@/app/api/admin/crunchycone-auth-check/route";

describe("Simple CrunchyCone Auth Check API Test", () => {
  let mockRequest: NextRequest;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequest = new NextRequest("http://localhost:3000/api/admin/crunchycone-auth-check", {
      method: "POST",
    });
  });

  it("should require admin role", async () => {
    // Mock unauthorized access
    mockRequireRole.mockRejectedValue(new Error("Unauthorized"));

    const response = await POST(mockRequest);
    const result = await response.json();

    expect(response.status).toBe(500);
    expect(result.authenticated).toBe(false);
    expect(mockRequireRole).toHaveBeenCalledWith("admin");
  });

  it("should return successful authentication status", async () => {
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
    mockGetCrunchyConeAuthService.mockReturnValue(mockAuthService);

    const response = await POST(mockRequest);
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.authenticated).toBe(true);
    expect(result.output.success).toBe(true);
    expect(result.output.source).toBe("keychain");
    expect(result.output.user.name).toBe("Test User");
    expect(result.output.platform.environment).toBe("local");
  });

  it("should handle authentication service errors", async () => {
    // Mock admin access
    mockRequireRole.mockResolvedValue(undefined);
    mockIsPlatformEnvironment.mockReturnValue(false);

    // Mock auth service throwing error
    const mockAuthService = {
      checkAuthentication: jest.fn().mockRejectedValue(new Error("Service unavailable")),
    };
    mockGetCrunchyConeAuthService.mockReturnValue(mockAuthService);

    const response = await POST(mockRequest);
    const result = await response.json();

    expect(response.status).toBe(500);
    expect(result.authenticated).toBe(false);
    expect(result.error).toBe("Failed to check authentication status");
    expect(result.output.error).toBe("Service unavailable");
  });
});
