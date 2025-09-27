import { NextRequest } from "next/server";
import { GET, PUT, DELETE } from "@/app/api/admin/environment/route";
import { existsSync } from "fs";

// Mock the dependencies
jest.mock("@/lib/auth/permissions");
jest.mock("@/lib/environment-service");
jest.mock("fs");

import { requireRole } from "@/lib/auth/permissions";
import {
  getEnvironmentService,
  getMergedEnvironmentVariables,
  getDualEnvironmentServices,
  isPlatformEnvironment,
} from "@/lib/environment-service";

const mockRequireRole = requireRole as jest.MockedFunction<typeof requireRole>;
const mockGetEnvironmentService = getEnvironmentService as jest.MockedFunction<
  typeof getEnvironmentService
>;
const mockGetMergedEnvironmentVariables = getMergedEnvironmentVariables as jest.MockedFunction<
  typeof getMergedEnvironmentVariables
>;
const mockGetDualEnvironmentServices = getDualEnvironmentServices as jest.MockedFunction<
  typeof getDualEnvironmentServices
>;
const mockIsPlatformEnvironment = isPlatformEnvironment as jest.MockedFunction<
  typeof isPlatformEnvironment
>;
const mockExistsSync = existsSync as jest.MockedFunction<typeof existsSync>;

describe("/api/admin/environment", () => {
  let mockRequest: NextRequest;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    jest.clearAllMocks();
    originalEnv = process.env;
    mockRequest = new NextRequest("http://localhost:3000/api/admin/environment", {
      method: "GET",
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("GET /api/admin/environment", () => {
    it("should return environment variables in platform mode", async () => {
      // Mock admin access and platform environment
      mockRequireRole.mockResolvedValue(undefined);
      mockIsPlatformEnvironment.mockReturnValue(true);

      // Mock environment service
      const mockEnvService = {
        listEnvVars: jest.fn().mockResolvedValue({
          NODE_ENV: "production",
          API_URL: "https://api.example.com",
        }),
        listSecretNames: jest.fn().mockResolvedValue(["DATABASE_PASSWORD", "API_KEY"]),
        getProviderInfo: jest.fn().mockReturnValue({
          supportsSecrets: true,
          isPlatformEnvironment: true,
        }),
      };
      mockGetEnvironmentService.mockReturnValue(mockEnvService as any);

      const response = await GET(mockRequest);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.variables).toHaveLength(4); // 2 env vars + 2 secrets
      expect(result.variables.find((v: any) => v.key === "NODE_ENV")).toEqual({
        key: "NODE_ENV",
        remoteValue: "production",
        isSecret: false,
        isRemoteSecret: false,
      });
      expect(result.variables.find((v: any) => v.key === "DATABASE_PASSWORD")).toEqual({
        key: "DATABASE_PASSWORD",
        remoteValue: "••••••••",
        isSecret: true,
        isRemoteSecret: true,
      });
      expect(result.platform.isPlatformEnvironment).toBe(true);
      expect(result.platform.supportsSecrets).toBe(true);
    });

    it("should return merged variables in local mode with CrunchyCone config", async () => {
      // Mock admin access and local environment
      mockRequireRole.mockResolvedValue(undefined);
      mockIsPlatformEnvironment.mockReturnValue(false);
      mockExistsSync.mockReturnValue(true); // crunchycone.toml exists

      // Mock merged environment variables
      mockGetMergedEnvironmentVariables.mockResolvedValue({
        variables: [
          {
            key: "DATABASE_URL",
            localValue: "sqlite://local.db",
            remoteValue: "postgres://remote.db",
            isSecret: true,
            isRemoteSecret: false,
            hasConflict: true,
          },
          {
            key: "API_URL",
            localValue: undefined,
            remoteValue: "https://api.crunchycone.dev",
            isSecret: false,
            isRemoteSecret: false,
            hasConflict: false,
          },
        ],
        supportsRemoteSecrets: true,
      });

      const response = await GET(mockRequest);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.variables).toHaveLength(2);
      expect(result.variables[0]).toEqual({
        key: "DATABASE_URL",
        localValue: "sqlite://local.db",
        remoteValue: "postgres://remote.db",
        isSecret: true,
        isRemoteSecret: false,
        hasConflict: true,
      });
      expect(result.platform.supportsLocalRemoteSync).toBe(true);
      expect(result.crunchyConeAuth.isAuthenticated).toBe(true);
    });

    it("should return only local variables when no CrunchyCone config", async () => {
      // Mock admin access and local environment
      mockRequireRole.mockResolvedValue(undefined);
      mockIsPlatformEnvironment.mockReturnValue(false);
      mockExistsSync.mockReturnValue(false); // no crunchycone.toml

      // Mock dual environment services
      const mockLocalService = {
        listEnvVars: jest.fn().mockResolvedValue({
          NODE_ENV: "development",
          DATABASE_URL: "sqlite://local.db",
        }),
      };
      mockGetDualEnvironmentServices.mockReturnValue({
        local: mockLocalService,
      } as any);

      const response = await GET(mockRequest);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.variables).toHaveLength(2);
      expect(result.variables.find((v: any) => v.key === "DATABASE_URL")).toEqual({
        key: "DATABASE_URL",
        localValue: "sqlite://local.db",
        isSecret: true, // Sensitive key detection
      });
      expect(result.crunchyConeAuth.isAuthenticated).toBe(false);
      expect(result.crunchyConeAuth.source).toBe("project_not_available");
    });

    it("should restrict access in production local mode", async () => {
      // Mock admin access and production local environment
      mockRequireRole.mockResolvedValue(undefined);
      mockIsPlatformEnvironment.mockReturnValue(false);
      process.env.NODE_ENV = "production";

      const response = await GET(mockRequest);
      const result = await response.json();

      expect(response.status).toBe(403);
      expect(result.error).toBe("Environment variables are not available in local production mode");
    });

    it("should handle CrunchyCone API authentication errors", async () => {
      // Mock admin access and platform environment
      mockRequireRole.mockResolvedValue(undefined);
      mockIsPlatformEnvironment.mockReturnValue(true);

      // Mock environment service with 401 error
      const mockEnvService = {
        listEnvVars: jest.fn().mockRejectedValue(new Error("401 Unauthorized")),
        getProviderInfo: jest.fn().mockReturnValue({
          supportsSecrets: false,
          isPlatformEnvironment: true,
        }),
      };
      mockGetEnvironmentService.mockReturnValue(mockEnvService as any);

      const response = await GET(mockRequest);
      const result = await response.json();

      expect(response.status).toBe(502);
      expect(result.error).toBe(
        "CrunchyCone API authentication failed. Please check your API key and permissions."
      );
    });

    it("should handle NEXT_REDIRECT errors properly", async () => {
      // Mock admin access
      mockRequireRole.mockResolvedValue(undefined);
      mockIsPlatformEnvironment.mockReturnValue(true);

      // Mock environment service with NEXT_REDIRECT error
      const mockEnvService = {
        listEnvVars: jest.fn().mockRejectedValue(new Error("NEXT_REDIRECT")),
        getProviderInfo: jest.fn().mockReturnValue({
          supportsSecrets: false,
          isPlatformEnvironment: true,
        }),
      };
      mockGetEnvironmentService.mockReturnValue(mockEnvService as any);

      await expect(GET(mockRequest)).rejects.toThrow("NEXT_REDIRECT");
    });

    it("should handle generic service errors", async () => {
      // Mock admin access and platform environment
      mockRequireRole.mockResolvedValue(undefined);
      mockIsPlatformEnvironment.mockReturnValue(true);

      // Mock environment service with generic error
      const mockEnvService = {
        listEnvVars: jest.fn().mockRejectedValue(new Error("Service error")),
        getProviderInfo: jest.fn().mockReturnValue({
          supportsSecrets: false,
          isPlatformEnvironment: true,
        }),
      };
      mockGetEnvironmentService.mockReturnValue(mockEnvService as any);

      const response = await GET(mockRequest);
      const result = await response.json();

      expect(response.status).toBe(500);
      expect(result.error).toBe("Failed to fetch environment variables");
    });
  });

  describe("PUT /api/admin/environment", () => {
    it("should update environment variable successfully", async () => {
      // Mock admin access
      mockRequireRole.mockResolvedValue(undefined);

      // Mock environment service
      const mockEnvService = {
        setEnvVar: jest.fn().mockResolvedValue(undefined),
        getProviderInfo: jest.fn().mockReturnValue({
          isPlatformEnvironment: false,
        }),
      };
      mockGetEnvironmentService.mockReturnValue(mockEnvService as any);

      mockRequest = new NextRequest("http://localhost:3000/api/admin/environment", {
        method: "PUT",
        body: JSON.stringify({
          key: "API_URL",
          value: "https://api.example.com",
          isSecret: false,
        }),
      });

      const response = await PUT(mockRequest);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(mockEnvService.setEnvVar).toHaveBeenCalledWith("API_URL", "https://api.example.com");
    });

    it("should update secret successfully", async () => {
      // Mock admin access
      mockRequireRole.mockResolvedValue(undefined);

      // Mock environment service
      const mockEnvService = {
        setSecret: jest.fn().mockResolvedValue(undefined),
        getProviderInfo: jest.fn().mockReturnValue({
          isPlatformEnvironment: false,
        }),
      };
      mockGetEnvironmentService.mockReturnValue(mockEnvService as any);

      mockRequest = new NextRequest("http://localhost:3000/api/admin/environment", {
        method: "PUT",
        body: JSON.stringify({
          key: "DATABASE_PASSWORD",
          value: "secret123",
          isSecret: true,
        }),
      });

      const response = await PUT(mockRequest);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(mockEnvService.setSecret).toHaveBeenCalledWith("DATABASE_PASSWORD", "secret123");
    });

    it("should restrict editing in production local mode", async () => {
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

      mockRequest = new NextRequest("http://localhost:3000/api/admin/environment", {
        method: "PUT",
        body: JSON.stringify({
          key: "API_URL",
          value: "https://api.example.com",
          isSecret: false,
        }),
      });

      const response = await PUT(mockRequest);
      const result = await response.json();

      expect(response.status).toBe(403);
      expect(result.error).toBe(
        "Environment variable editing is not available in local production mode"
      );
    });

    it("should return 400 for missing key", async () => {
      // Mock admin access
      mockRequireRole.mockResolvedValue(undefined);

      // Mock environment service
      const mockEnvService = {
        getProviderInfo: jest.fn().mockReturnValue({
          isPlatformEnvironment: false,
        }),
      };
      mockGetEnvironmentService.mockReturnValue(mockEnvService as any);

      mockRequest = new NextRequest("http://localhost:3000/api/admin/environment", {
        method: "PUT",
        body: JSON.stringify({
          value: "https://api.example.com",
          isSecret: false,
        }),
      });

      const response = await PUT(mockRequest);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.error).toBe("Variable key is required");
    });
  });

  describe("DELETE /api/admin/environment", () => {
    it("should delete environment variable successfully", async () => {
      // Mock admin access
      mockRequireRole.mockResolvedValue(undefined);

      // Mock environment service
      const mockEnvService = {
        deleteEnvVar: jest.fn().mockResolvedValue(undefined),
        getProviderInfo: jest.fn().mockReturnValue({
          isPlatformEnvironment: false,
        }),
      };
      mockGetEnvironmentService.mockReturnValue(mockEnvService as any);

      mockRequest = new NextRequest("http://localhost:3000/api/admin/environment", {
        method: "DELETE",
        body: JSON.stringify({
          key: "API_URL",
          isSecret: false,
        }),
      });

      const response = await DELETE(mockRequest);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(mockEnvService.deleteEnvVar).toHaveBeenCalledWith("API_URL");
    });

    it("should delete secret successfully", async () => {
      // Mock admin access
      mockRequireRole.mockResolvedValue(undefined);

      // Mock environment service
      const mockEnvService = {
        deleteSecret: jest.fn().mockResolvedValue(undefined),
        getProviderInfo: jest.fn().mockReturnValue({
          isPlatformEnvironment: false,
        }),
      };
      mockGetEnvironmentService.mockReturnValue(mockEnvService as any);

      mockRequest = new NextRequest("http://localhost:3000/api/admin/environment", {
        method: "DELETE",
        body: JSON.stringify({
          key: "DATABASE_PASSWORD",
          isSecret: true,
        }),
      });

      const response = await DELETE(mockRequest);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(mockEnvService.deleteSecret).toHaveBeenCalledWith("DATABASE_PASSWORD");
    });

    it("should restrict deletion in production local mode", async () => {
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

      mockRequest = new NextRequest("http://localhost:3000/api/admin/environment", {
        method: "DELETE",
        body: JSON.stringify({
          key: "API_URL",
          isSecret: false,
        }),
      });

      const response = await DELETE(mockRequest);
      const result = await response.json();

      expect(response.status).toBe(403);
      expect(result.error).toBe(
        "Environment variable deletion is not available in local production mode"
      );
    });

    it("should return 400 for missing key", async () => {
      // Mock admin access
      mockRequireRole.mockResolvedValue(undefined);

      // Mock environment service
      const mockEnvService = {
        getProviderInfo: jest.fn().mockReturnValue({
          isPlatformEnvironment: false,
        }),
      };
      mockGetEnvironmentService.mockReturnValue(mockEnvService as any);

      mockRequest = new NextRequest("http://localhost:3000/api/admin/environment", {
        method: "DELETE",
        body: JSON.stringify({
          isSecret: false,
        }),
      });

      const response = await DELETE(mockRequest);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.error).toBe("Variable key is required");
    });

    it("should handle service errors gracefully", async () => {
      // Mock admin access
      mockRequireRole.mockResolvedValue(undefined);

      // Mock environment service with error
      const mockEnvService = {
        deleteEnvVar: jest.fn().mockRejectedValue(new Error("Service error")),
        getProviderInfo: jest.fn().mockReturnValue({
          isPlatformEnvironment: false,
        }),
      };
      mockGetEnvironmentService.mockReturnValue(mockEnvService as any);

      mockRequest = new NextRequest("http://localhost:3000/api/admin/environment", {
        method: "DELETE",
        body: JSON.stringify({
          key: "API_URL",
          isSecret: false,
        }),
      });

      const response = await DELETE(mockRequest);
      const result = await response.json();

      expect(response.status).toBe(500);
      expect(result.error).toBe("Internal server error");
    });
  });
});
