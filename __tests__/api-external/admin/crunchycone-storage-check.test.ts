import { NextRequest } from "next/server";

// Mock filesystem operations first
jest.mock("fs", () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
}));

// Get references to the mocked functions
import fs from "fs";
const mockExistsSync = fs.existsSync as jest.MockedFunction<typeof fs.existsSync>;
const mockReadFileSync = fs.readFileSync as jest.MockedFunction<typeof fs.readFileSync>;

// Mock other dependencies
jest.mock("@/lib/auth/permissions");
jest.mock("@/lib/crunchycone-auth-service");
jest.mock("@/lib/environment-service");
jest.mock("crunchycone-lib/auth");

// Import after mocking
import { POST } from "@/app/api/admin/crunchycone-storage-check/route";
import { requireRole } from "@/lib/auth/permissions";
import { checkCrunchyConeAuth } from "@/lib/crunchycone-auth-service";
import { isPlatformEnvironment } from "@/lib/environment-service";
import { getCrunchyConeProjectID } from "crunchycone-lib/auth";

const mockRequireRole = requireRole as jest.MockedFunction<typeof requireRole>;
const mockCheckCrunchyConeAuth = checkCrunchyConeAuth as jest.MockedFunction<
  typeof checkCrunchyConeAuth
>;
const mockIsPlatformEnvironment = isPlatformEnvironment as jest.MockedFunction<
  typeof isPlatformEnvironment
>;
const mockGetCrunchyConeProjectID = getCrunchyConeProjectID as jest.MockedFunction<
  typeof getCrunchyConeProjectID
>;

describe("/api/admin/crunchycone-storage-check", () => {
  let mockRequest: NextRequest;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    jest.clearAllMocks();
    originalEnv = process.env;
    mockRequest = new NextRequest("http://localhost:3000/api/admin/crunchycone-storage-check", {
      method: "POST",
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("POST /api/admin/crunchycone-storage-check", () => {
    it("should return platform authentication when in platform mode with env vars", async () => {
      // Mock admin access and platform environment
      mockRequireRole.mockResolvedValue(undefined);
      mockIsPlatformEnvironment.mockReturnValue(true);

      // Set platform environment variables
      process.env.CRUNCHYCONE_API_KEY = "test-api-key";
      process.env.CRUNCHYCONE_PROJECT_ID = "test-project-id";

      const response = await POST(mockRequest);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.authenticated).toBe(true);
      expect(result.hasProject).toBe(true);
      expect(result.authDetails.success).toBe(true);
      expect(result.authDetails.message).toBe("CrunchyCone configured for platform environment");
      expect(result.projectDetails.project_id).toBe("test-project-id");
      expect(result.projectDetails.configFile).toBe("environment variables (platform mode)");
    });

    it("should use local auth service when not in platform mode", async () => {
      // Mock admin access and local environment
      mockRequireRole.mockResolvedValue(undefined);
      mockIsPlatformEnvironment.mockReturnValue(false);

      // Mock successful local auth
      mockCheckCrunchyConeAuth.mockResolvedValue({
        success: true,
        message: "Authenticated via keychain",
        user: { name: "Local User" },
        source: "keychain",
        error: null,
      });

      // Mock project ID from library
      mockGetCrunchyConeProjectID.mockReturnValue("local-project-id");

      const response = await POST(mockRequest);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.authenticated).toBe(true);
      expect(result.hasProject).toBe(true);
      expect(result.authDetails.success).toBe(true);
      expect(result.authDetails.source).toBe("keychain");
      expect(result.projectDetails.project_id).toBe("local-project-id");
      expect(result.projectDetails.configFile).toBe("crunchycone.toml");
    });

    it("should handle authentication failure gracefully", async () => {
      // Mock admin access and local environment
      mockRequireRole.mockResolvedValue(undefined);
      mockIsPlatformEnvironment.mockReturnValue(false);

      // Mock failed local auth
      mockCheckCrunchyConeAuth.mockResolvedValue({
        success: false,
        message: "Not authenticated",
        user: null,
        source: "none",
        error: "Authentication failed",
      });

      // Mock no project ID
      mockGetCrunchyConeProjectID.mockReturnValue(null);

      const response = await POST(mockRequest);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.authenticated).toBe(false);
      expect(result.hasProject).toBe(false);
      expect(result.authDetails.success).toBe(false);
      expect(result.error).toBe("Authentication failed");
    });

    it("should fallback to manual TOML parsing when library function fails", async () => {
      // Mock admin access and local environment
      mockRequireRole.mockResolvedValue(undefined);
      mockIsPlatformEnvironment.mockReturnValue(false);

      // Mock successful auth but library project ID failure
      mockCheckCrunchyConeAuth.mockResolvedValue({
        success: true,
        message: "Authenticated",
        user: { name: "User" },
        source: "keychain",
        error: null,
      });

      // Mock library function returning null
      mockGetCrunchyConeProjectID.mockReturnValue(null);

      // Mock file system operations for manual parsing
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue('project_id = "manual-project-id"');

      const response = await POST(mockRequest);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.authenticated).toBe(true);
      expect(result.hasProject).toBe(true);
      expect(result.projectDetails.project_id).toBe("manual-project-id");
      expect(mockExistsSync).toHaveBeenCalled();
      expect(mockReadFileSync).toHaveBeenCalled();
    });

    it("should handle auth service throwing errors", async () => {
      // Mock admin access and local environment
      mockRequireRole.mockResolvedValue(undefined);
      mockIsPlatformEnvironment.mockReturnValue(false);

      // Mock auth service throwing error
      mockCheckCrunchyConeAuth.mockRejectedValue(new Error("Network error"));

      // Mock no project ID
      mockGetCrunchyConeProjectID.mockReturnValue(null);

      const response = await POST(mockRequest);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.authenticated).toBe(false);
      expect(result.error).toBe("Network error");
      expect(result.authDetails.success).toBe(false);
      expect(result.authDetails.message).toBe("Failed to check authentication status");
    });

    it("should handle project configuration errors", async () => {
      // Mock admin access and local environment
      mockRequireRole.mockResolvedValue(undefined);
      mockIsPlatformEnvironment.mockReturnValue(false);

      // Mock successful auth
      mockCheckCrunchyConeAuth.mockResolvedValue({
        success: true,
        message: "Authenticated",
        user: { name: "User" },
        source: "keychain",
        error: null,
      });

      // Mock project ID functions throwing errors
      mockGetCrunchyConeProjectID.mockImplementation(() => {
        throw new Error("Config error");
      });
      mockExistsSync.mockImplementation(() => {
        throw new Error("File system error");
      });

      const response = await POST(mockRequest);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.authenticated).toBe(true);
      expect(result.hasProject).toBe(false);
      expect(result.projectDetails).toBeNull();
    });

    it("should return 401 for unauthorized users", async () => {
      // Mock unauthorized access
      mockRequireRole.mockRejectedValue(new Error("Unauthorized"));

      const response = await POST(mockRequest);
      const result = await response.json();

      expect(response.status).toBe(401);
      expect(result.error).toBe("Unauthorized");
      expect(mockRequireRole).toHaveBeenCalledWith("admin");
    });

    it("should handle platform mode with missing environment variables", async () => {
      // Mock admin access and platform environment
      mockRequireRole.mockResolvedValue(undefined);
      mockIsPlatformEnvironment.mockReturnValue(true);

      // No environment variables set
      delete process.env.CRUNCHYCONE_API_KEY;
      delete process.env.CRUNCHYCONE_PROJECT_ID;

      // Mock local auth fallback
      mockCheckCrunchyConeAuth.mockResolvedValue({
        success: false,
        message: "No platform auth",
        user: null,
        source: "none",
        error: "Missing credentials",
      });

      mockGetCrunchyConeProjectID.mockReturnValue(null);

      const response = await POST(mockRequest);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.authenticated).toBe(false);
      expect(result.hasProject).toBe(false);
    });

    it("should handle TOML parsing with different quote styles", async () => {
      // Mock admin access and local environment
      mockRequireRole.mockResolvedValue(undefined);
      mockIsPlatformEnvironment.mockReturnValue(false);

      mockCheckCrunchyConeAuth.mockResolvedValue({
        success: true,
        message: "Authenticated",
        user: { name: "User" },
        source: "keychain",
        error: null,
      });

      mockGetCrunchyConeProjectID.mockReturnValue(null);
      mockExistsSync.mockReturnValue(true);

      // Test single quotes
      mockReadFileSync.mockReturnValue("project_id = 'single-quote-project'");

      const response = await POST(mockRequest);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.projectDetails.project_id).toBe("single-quote-project");
    });
  });
});
