import { NextRequest } from "next/server";

// Mock the environment service modules first
jest.mock("@/lib/auth/permissions");
jest.mock("@/lib/environment-service");

import { requireRole } from "@/lib/auth/permissions";
import { getEnvironmentService } from "@/lib/environment-service";

const mockRequireRole = requireRole as jest.MockedFunction<typeof requireRole>;
const mockGetEnvironmentService = getEnvironmentService as jest.MockedFunction<
  typeof getEnvironmentService
>;

// Import route handlers after mocking
import { POST as POSTSync } from "@/app/api/admin/environment/sync/route";
import { POST as POSTPush } from "@/app/api/admin/environment/push/route";
import { POST as POSTPull } from "@/app/api/admin/environment/pull/route";

describe("Environment Sync API Routes", () => {
  let mockRequest: NextRequest;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    jest.clearAllMocks();
    originalEnv = process.env;
    mockRequest = new NextRequest("http://localhost:3000/api/admin/environment/sync", {
      method: "POST",
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("POST /api/admin/environment/sync", () => {
    it("should sync environment variables successfully", async () => {
      // Mock admin access
      mockRequireRole.mockResolvedValue(undefined);

      // Mock environment service
      const mockEnvService = {
        syncEnvVars: jest.fn().mockResolvedValue({
          success: true,
          added: ["NEW_VAR"],
          updated: ["EXISTING_VAR"],
          removed: ["OLD_VAR"],
          conflicts: [],
          summary: "Synced 3 variables",
        }),
        getProviderInfo: jest.fn().mockReturnValue({
          isPlatformEnvironment: false,
        }),
      };
      mockGetEnvironmentService.mockReturnValue(mockEnvService as any);

      const response = await POSTSync(mockRequest);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.added).toEqual(["NEW_VAR"]);
      expect(result.updated).toEqual(["EXISTING_VAR"]);
      expect(result.removed).toEqual(["OLD_VAR"]);
      expect(mockEnvService.syncEnvVars).toHaveBeenCalled();
    });

    it("should handle sync conflicts", async () => {
      // Mock admin access
      mockRequireRole.mockResolvedValue(undefined);

      // Mock environment service with conflicts
      const mockEnvService = {
        syncEnvVars: jest.fn().mockResolvedValue({
          success: false,
          added: [],
          updated: [],
          removed: [],
          conflicts: [
            {
              key: "DATABASE_URL",
              localValue: "sqlite://local.db",
              remoteValue: "postgres://remote.db",
              resolution: "manual",
            },
          ],
          summary: "Sync failed due to conflicts",
        }),
        getProviderInfo: jest.fn().mockReturnValue({
          isPlatformEnvironment: false,
        }),
      };
      mockGetEnvironmentService.mockReturnValue(mockEnvService as any);

      const response = await POSTSync(mockRequest);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(false);
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].key).toBe("DATABASE_URL");
    });

    it("should restrict sync in production local mode", async () => {
      // Mock admin access and production local environment
      mockRequireRole.mockResolvedValue(undefined);
      process.env.NODE_ENV = "production";

      // Mock environment service
      const mockEnvService = {
        getProviderInfo: jest.fn().mockReturnValue({
          isPlatformEnvironment: false,
        }),
      };
      mockGetEnvironmentService.mockReturnValue(mockEnvService as any);

      const response = await POSTSync(mockRequest);
      const result = await response.json();

      expect(response.status).toBe(403);
      expect(result.error).toBe(
        "Environment synchronization is not available in local production mode"
      );
    });

    it("should handle service errors", async () => {
      // Mock admin access
      mockRequireRole.mockResolvedValue(undefined);

      // Mock environment service with error
      const mockEnvService = {
        syncEnvVars: jest.fn().mockRejectedValue(new Error("Sync service error")),
        getProviderInfo: jest.fn().mockReturnValue({
          isPlatformEnvironment: false,
        }),
      };
      mockGetEnvironmentService.mockReturnValue(mockEnvService as any);

      const response = await POSTSync(mockRequest);
      const result = await response.json();

      expect(response.status).toBe(500);
      expect(result.error).toBe("Internal server error");
    });
  });

  describe("POST /api/admin/environment/push", () => {
    it("should push environment variables successfully", async () => {
      // Mock admin access
      mockRequireRole.mockResolvedValue(undefined);

      // Mock environment service
      const mockEnvService = {
        pushEnvVars: jest.fn().mockResolvedValue({
          success: true,
          pushed: ["API_URL", "DATABASE_URL"],
          skipped: ["NODE_ENV"],
          errors: [],
          summary: "Pushed 2 variables to remote",
        }),
        getProviderInfo: jest.fn().mockReturnValue({
          isPlatformEnvironment: false,
        }),
      };
      mockGetEnvironmentService.mockReturnValue(mockEnvService as any);

      mockRequest = new NextRequest("http://localhost:3000/api/admin/environment/push", {
        method: "POST",
        body: JSON.stringify({
          keys: ["API_URL", "DATABASE_URL", "NODE_ENV"],
          overwrite: true,
        }),
      });

      const response = await POSTPush(mockRequest);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.pushed).toEqual(["API_URL", "DATABASE_URL"]);
      expect(result.skipped).toEqual(["NODE_ENV"]);
      expect(mockEnvService.pushEnvVars).toHaveBeenCalledWith(
        ["API_URL", "DATABASE_URL", "NODE_ENV"],
        true
      );
    });

    it("should handle push errors", async () => {
      // Mock admin access
      mockRequireRole.mockResolvedValue(undefined);

      // Mock environment service with errors
      const mockEnvService = {
        pushEnvVars: jest.fn().mockResolvedValue({
          success: false,
          pushed: ["API_URL"],
          skipped: [],
          errors: [
            {
              key: "DATABASE_URL",
              error: "Invalid value format",
            },
          ],
          summary: "Push partially failed",
        }),
        getProviderInfo: jest.fn().mockReturnValue({
          isPlatformEnvironment: false,
        }),
      };
      mockGetEnvironmentService.mockReturnValue(mockEnvService as any);

      mockRequest = new NextRequest("http://localhost:3000/api/admin/environment/push", {
        method: "POST",
        body: JSON.stringify({
          keys: ["API_URL", "DATABASE_URL"],
          overwrite: false,
        }),
      });

      const response = await POSTPush(mockRequest);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].key).toBe("DATABASE_URL");
    });

    it("should return 400 for invalid request", async () => {
      // Mock admin access
      mockRequireRole.mockResolvedValue(undefined);

      // Mock environment service
      const mockEnvService = {
        getProviderInfo: jest.fn().mockReturnValue({
          isPlatformEnvironment: false,
        }),
      };
      mockGetEnvironmentService.mockReturnValue(mockEnvService as any);

      mockRequest = new NextRequest("http://localhost:3000/api/admin/environment/push", {
        method: "POST",
        body: JSON.stringify({
          // Missing keys array
          overwrite: true,
        }),
      });

      const response = await POSTPush(mockRequest);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.error).toBe("Invalid request: keys array is required");
    });
  });

  describe("POST /api/admin/environment/pull", () => {
    it("should pull environment variables successfully", async () => {
      // Mock admin access
      mockRequireRole.mockResolvedValue(undefined);

      // Mock environment service
      const mockEnvService = {
        pullEnvVars: jest.fn().mockResolvedValue({
          success: true,
          pulled: ["REMOTE_API_URL", "REMOTE_CONFIG"],
          updated: ["EXISTING_VAR"],
          conflicts: [],
          summary: "Pulled 3 variables from remote",
        }),
        getProviderInfo: jest.fn().mockReturnValue({
          isPlatformEnvironment: false,
        }),
      };
      mockGetEnvironmentService.mockReturnValue(mockEnvService as any);

      mockRequest = new NextRequest("http://localhost:3000/api/admin/environment/pull", {
        method: "POST",
        body: JSON.stringify({
          keys: ["REMOTE_API_URL", "REMOTE_CONFIG", "EXISTING_VAR"],
          overwrite: true,
        }),
      });

      const response = await POSTPull(mockRequest);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.pulled).toEqual(["REMOTE_API_URL", "REMOTE_CONFIG"]);
      expect(result.updated).toEqual(["EXISTING_VAR"]);
      expect(mockEnvService.pullEnvVars).toHaveBeenCalledWith(
        ["REMOTE_API_URL", "REMOTE_CONFIG", "EXISTING_VAR"],
        true
      );
    });

    it("should handle pull conflicts", async () => {
      // Mock admin access
      mockRequireRole.mockResolvedValue(undefined);

      // Mock environment service with conflicts
      const mockEnvService = {
        pullEnvVars: jest.fn().mockResolvedValue({
          success: false,
          pulled: [],
          updated: [],
          conflicts: [
            {
              key: "DATABASE_URL",
              localValue: "sqlite://local.db",
              remoteValue: "postgres://remote.db",
              resolution: "manual",
            },
          ],
          summary: "Pull stopped due to conflicts",
        }),
        getProviderInfo: jest.fn().mockReturnValue({
          isPlatformEnvironment: false,
        }),
      };
      mockGetEnvironmentService.mockReturnValue(mockEnvService as any);

      mockRequest = new NextRequest("http://localhost:3000/api/admin/environment/pull", {
        method: "POST",
        body: JSON.stringify({
          keys: ["DATABASE_URL"],
          overwrite: false,
        }),
      });

      const response = await POSTPull(mockRequest);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(false);
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].key).toBe("DATABASE_URL");
    });

    it("should restrict pull in production local mode", async () => {
      // Mock admin access and production local environment
      mockRequireRole.mockResolvedValue(undefined);
      process.env.NODE_ENV = "production";

      // Mock environment service
      const mockEnvService = {
        getProviderInfo: jest.fn().mockReturnValue({
          isPlatformEnvironment: false,
        }),
      };
      mockGetEnvironmentService.mockReturnValue(mockEnvService as any);

      mockRequest = new NextRequest("http://localhost:3000/api/admin/environment/pull", {
        method: "POST",
        body: JSON.stringify({
          keys: ["API_URL"],
          overwrite: false,
        }),
      });

      const response = await POSTPull(mockRequest);
      const result = await response.json();

      expect(response.status).toBe(403);
      expect(result.error).toBe(
        "Environment variable pulling is not available in local production mode"
      );
    });
  });

  describe("Authorization", () => {
    it("should require admin role for all sync operations", async () => {
      // Mock unauthorized access
      mockRequireRole.mockRejectedValue(new Error("Unauthorized"));

      // Test sync endpoint
      const syncResponse = await POSTSync(mockRequest);
      const syncResult = await syncResponse.json();
      expect(syncResponse.status).toBe(500);
      expect(syncResult.error).toBe("Internal server error");

      // Test push endpoint
      mockRequest = new NextRequest("http://localhost:3000/api/admin/environment/push", {
        method: "POST",
        body: JSON.stringify({ keys: ["TEST"], overwrite: false }),
      });
      const pushResponse = await POSTPush(mockRequest);
      const pushResult = await pushResponse.json();
      expect(pushResponse.status).toBe(500);
      expect(pushResult.error).toBe("Internal server error");

      // Test pull endpoint
      mockRequest = new NextRequest("http://localhost:3000/api/admin/environment/pull", {
        method: "POST",
        body: JSON.stringify({ keys: ["TEST"], overwrite: false }),
      });
      const pullResponse = await POSTPull(mockRequest);
      const pullResult = await pullResponse.json();
      expect(pullResponse.status).toBe(500);
      expect(pullResult.error).toBe("Internal server error");

      // Verify admin role was checked for all operations
      expect(mockRequireRole).toHaveBeenCalledTimes(3);
      expect(mockRequireRole).toHaveBeenCalledWith("admin");
    });
  });
});
