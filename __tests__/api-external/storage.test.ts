import { NextRequest } from "next/server";

// Mock dependencies first
jest.mock("@/lib/auth/permissions");
jest.mock("crunchycone-lib/storage", () => ({
  createStorageService: jest.fn(),
}));

import { requireRole } from "@/lib/auth/permissions";
import { createStorageService } from "crunchycone-lib/storage";

const mockRequireRole = requireRole as jest.MockedFunction<typeof requireRole>;
const mockCreateStorageService = createStorageService as jest.MockedFunction<
  typeof createStorageService
>;

// Import route handlers after mocking
import { GET as TestStorageGET } from "@/app/api/storage/test/route";
import { GET as FilesGET } from "@/app/api/storage/files/[...segments]/route";

describe("Storage API Routes", () => {
  let mockRequest: NextRequest;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    jest.clearAllMocks();
    originalEnv = process.env;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("GET /api/storage/test", () => {
    beforeEach(() => {
      mockRequest = new NextRequest("http://localhost:3000/api/storage/test", {
        method: "GET",
      });
    });

    it("should test storage connection successfully", async () => {
      // Mock admin access
      mockRequireRole.mockResolvedValue(undefined);

      // Mock successful storage service
      const mockStorageService = {
        testConnection: jest.fn().mockResolvedValue({
          success: true,
          provider: "LocalStorage",
          message: "Connection successful",
          details: {
            writeable: true,
            readable: true,
          },
        }),
      };
      mockCreateStorageService.mockResolvedValue(mockStorageService as any);

      const response = await TestStorageGET(mockRequest);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.provider).toBe("LocalStorage");
      expect(result.message).toBe("Connection successful");
      expect(result.details.writeable).toBe(true);
      expect(mockStorageService.testConnection).toHaveBeenCalled();
    });

    it("should handle storage connection failure", async () => {
      // Mock admin access
      mockRequireRole.mockResolvedValue(undefined);

      // Mock failed storage service
      const mockStorageService = {
        testConnection: jest.fn().mockResolvedValue({
          success: false,
          provider: "AWS S3",
          message: "Connection failed",
          error: "Invalid credentials",
          details: {
            writeable: false,
            readable: false,
          },
        }),
      };
      mockCreateStorageService.mockResolvedValue(mockStorageService as any);

      const response = await TestStorageGET(mockRequest);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(false);
      expect(result.provider).toBe("AWS S3");
      expect(result.error).toBe("Invalid credentials");
    });

    it("should handle storage service creation failure", async () => {
      // Mock admin access
      mockRequireRole.mockResolvedValue(undefined);

      // Mock storage service creation failure
      mockCreateStorageService.mockRejectedValue(new Error("Provider not configured"));

      const response = await TestStorageGET(mockRequest);
      const result = await response.json();

      expect(response.status).toBe(500);
      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to test storage connection");
      expect(result.details).toBe("Provider not configured");
    });

    it("should require admin role", async () => {
      // Mock unauthorized access
      mockRequireRole.mockRejectedValue(new Error("Unauthorized"));

      const response = await TestStorageGET(mockRequest);
      const result = await response.json();

      expect(response.status).toBe(401);
      expect(result.error).toBe("Unauthorized");
      expect(mockRequireRole).toHaveBeenCalledWith("admin");
    });

    it("should handle unknown errors", async () => {
      // Mock admin access
      mockRequireRole.mockResolvedValue(undefined);

      // Mock storage service throwing non-Error object
      mockCreateStorageService.mockRejectedValue("Unknown error");

      const response = await TestStorageGET(mockRequest);
      const result = await response.json();

      expect(response.status).toBe(500);
      expect(result.success).toBe(false);
      expect(result.details).toBe("Unknown error");
    });
  });

  describe("GET /api/storage/files/[...segments]", () => {
    it("should serve public files successfully", async () => {
      // Mock no authentication for public files
      const publicRequest = new NextRequest(
        "http://localhost:3000/api/storage/files/public/image.jpg",
        {
          method: "GET",
        }
      );

      // Mock successful storage service
      const mockStorageService = {
        getFile: jest.fn().mockResolvedValue({
          stream: new ReadableStream(),
          metadata: {
            contentType: "image/jpeg",
            size: 12345,
            lastModified: new Date(),
          },
        }),
      };
      mockCreateStorageService.mockResolvedValue(mockStorageService as any);

      const response = await FilesGET(publicRequest, {
        params: { segments: ["public", "image.jpg"] },
      });

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("image/jpeg");
      expect(mockStorageService.getFile).toHaveBeenCalledWith("public/image.jpg");
    });

    it("should require authentication for private files", async () => {
      // Mock authentication failure for private files
      mockRequireRole.mockRejectedValue(new Error("Unauthorized"));

      const privateRequest = new NextRequest(
        "http://localhost:3000/api/storage/files/private/secret.pdf",
        {
          method: "GET",
        }
      );

      const response = await FilesGET(privateRequest, {
        params: { segments: ["private", "secret.pdf"] },
      });

      expect(response.status).toBe(401);
      const result = await response.json();
      expect(result.error).toBe("Unauthorized");
      expect(mockRequireRole).toHaveBeenCalledWith("user");
    });

    it("should serve private files to authenticated users", async () => {
      // Mock successful authentication for private files
      mockRequireRole.mockResolvedValue(undefined);

      const privateRequest = new NextRequest(
        "http://localhost:3000/api/storage/files/private/document.pdf",
        {
          method: "GET",
        }
      );

      // Mock successful storage service
      const mockStorageService = {
        getFile: jest.fn().mockResolvedValue({
          stream: new ReadableStream(),
          metadata: {
            contentType: "application/pdf",
            size: 54321,
            lastModified: new Date(),
          },
        }),
      };
      mockCreateStorageService.mockResolvedValue(mockStorageService as any);

      const response = await FilesGET(privateRequest, {
        params: { segments: ["private", "document.pdf"] },
      });

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("application/pdf");
      expect(mockStorageService.getFile).toHaveBeenCalledWith("private/document.pdf");
    });

    it("should handle file not found", async () => {
      const publicRequest = new NextRequest(
        "http://localhost:3000/api/storage/files/public/missing.jpg",
        {
          method: "GET",
        }
      );

      // Mock storage service file not found
      const mockStorageService = {
        getFile: jest.fn().mockRejectedValue(new Error("File not found")),
      };
      mockCreateStorageService.mockResolvedValue(mockStorageService as any);

      const response = await FilesGET(publicRequest, {
        params: { segments: ["public", "missing.jpg"] },
      });

      expect(response.status).toBe(404);
      const result = await response.json();
      expect(result.error).toBe("File not found");
    });

    it("should handle storage service errors", async () => {
      const publicRequest = new NextRequest(
        "http://localhost:3000/api/storage/files/public/error.jpg",
        {
          method: "GET",
        }
      );

      // Mock storage service error
      const mockStorageService = {
        getFile: jest.fn().mockRejectedValue(new Error("Storage service unavailable")),
      };
      mockCreateStorageService.mockResolvedValue(mockStorageService as any);

      const response = await FilesGET(publicRequest, {
        params: { segments: ["public", "error.jpg"] },
      });

      expect(response.status).toBe(500);
      const result = await response.json();
      expect(result.error).toBe("Internal server error");
    });

    it("should handle invalid file paths", async () => {
      const invalidRequest = new NextRequest(
        "http://localhost:3000/api/storage/files/../../../etc/passwd",
        {
          method: "GET",
        }
      );

      const response = await FilesGET(invalidRequest, {
        params: { segments: ["../../../etc/passwd"] },
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result.error).toBe("Invalid file path");
    });

    it("should set appropriate cache headers for different file types", async () => {
      const imageRequest = new NextRequest(
        "http://localhost:3000/api/storage/files/public/logo.png",
        {
          method: "GET",
        }
      );

      // Mock successful storage service with image
      const mockStorageService = {
        getFile: jest.fn().mockResolvedValue({
          stream: new ReadableStream(),
          metadata: {
            contentType: "image/png",
            size: 12345,
            lastModified: new Date(),
          },
        }),
      };
      mockCreateStorageService.mockResolvedValue(mockStorageService as any);

      const response = await FilesGET(imageRequest, {
        params: { segments: ["public", "logo.png"] },
      });

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("image/png");
      // Check for cache headers (implementation dependent)
      expect(response.headers.has("Cache-Control")).toBeTruthy();
    });
  });

  describe("Storage Configuration", () => {
    it("should handle different storage providers", async () => {
      mockRequest = new NextRequest("http://localhost:3000/api/storage/test", {
        method: "GET",
      });

      // Mock admin access
      mockRequireRole.mockResolvedValue(undefined);

      // Test AWS S3 provider
      const mockS3Service = {
        testConnection: jest.fn().mockResolvedValue({
          success: true,
          provider: "AWS S3",
          message: "S3 connection successful",
          details: {
            writeable: true,
            readable: true,
            bucket: "test-bucket",
            region: "us-east-1",
          },
        }),
      };
      mockCreateStorageService.mockResolvedValue(mockS3Service as any);

      const response = await TestStorageGET(mockRequest);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.provider).toBe("AWS S3");
      expect(result.details.bucket).toBe("test-bucket");
    });

    it("should handle missing storage configuration", async () => {
      mockRequest = new NextRequest("http://localhost:3000/api/storage/test", {
        method: "GET",
      });

      // Mock admin access
      mockRequireRole.mockResolvedValue(undefined);

      // Mock missing configuration
      mockCreateStorageService.mockRejectedValue(new Error("No storage provider configured"));

      const response = await TestStorageGET(mockRequest);
      const result = await response.json();

      expect(response.status).toBe(500);
      expect(result.success).toBe(false);
      expect(result.details).toBe("No storage provider configured");
    });
  });
});
