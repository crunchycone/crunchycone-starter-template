import { NextRequest } from "next/server";

// Mock dependencies first
jest.mock("@/lib/auth/permissions");
jest.mock("crunchycone-lib/services/storage", () => ({
  initializeStorageProvider: jest.fn(),
  getStorageProvider: jest.fn(),
}));

import { requireRole } from "@/lib/auth/permissions";
import { getStorageProvider } from "crunchycone-lib/services/storage";

const mockRequireRole = requireRole as jest.MockedFunction<typeof requireRole>;
const mockGetStorageProvider = getStorageProvider as jest.MockedFunction<typeof getStorageProvider>;

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

      // Mock successful storage provider
      const mockProvider = {
        isAvailable: jest.fn().mockResolvedValue(true),
      };
      mockGetStorageProvider.mockReturnValue(mockProvider as any);

      const response = await TestStorageGET(mockRequest);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.message).toBe("Connection successful");
      expect(result.details.writeable).toBe(true);
      expect(mockProvider.isAvailable).toHaveBeenCalled();
    });

    it("should handle storage connection failure", async () => {
      // Mock admin access
      mockRequireRole.mockResolvedValue(undefined);

      // Mock failed storage provider
      const mockProvider = {
        isAvailable: jest.fn().mockResolvedValue(false),
      };
      mockGetStorageProvider.mockReturnValue(mockProvider as any);

      const response = await TestStorageGET(mockRequest);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(false);
      expect(result.message).toBe("Connection failed");
    });

    it("should handle storage provider errors", async () => {
      // Mock admin access
      mockRequireRole.mockResolvedValue(undefined);

      // Mock storage provider throwing error
      mockGetStorageProvider.mockImplementation(() => {
        throw new Error("Provider not configured");
      });

      const response = await TestStorageGET(mockRequest);
      const result = await response.json();

      expect(response.status).toBe(500);
      expect(result.success).toBe(false);
      expect(result.error).toBe("Provider not configured");
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

      // Mock storage provider throwing non-Error object
      mockGetStorageProvider.mockImplementation(() => {
        throw "Unknown error";
      });

      const response = await TestStorageGET(mockRequest);
      const result = await response.json();

      expect(response.status).toBe(500);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
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

      // Mock successful storage provider
      const mockProvider = {
        getFileStream: jest.fn().mockResolvedValue({
          stream: new ReadableStream(),
          contentType: "image/jpeg",
          contentLength: 12345,
          streamType: "web",
          isPartialContent: false,
        }),
      };
      mockGetStorageProvider.mockReturnValue(mockProvider as any);

      const response = await FilesGET(publicRequest, {
        params: Promise.resolve({ segments: ["public", "image.jpg"] }),
      });

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("image/jpeg");
      expect(mockProvider.getFileStream).toHaveBeenCalledWith("public/image.jpg");
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
        params: Promise.resolve({ segments: ["private", "secret.pdf"] }),
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

      // Mock successful storage provider
      const mockProvider = {
        getFileStream: jest.fn().mockResolvedValue({
          stream: new ReadableStream(),
          contentType: "application/pdf",
          contentLength: 54321,
          streamType: "web",
          isPartialContent: false,
        }),
      };
      mockGetStorageProvider.mockReturnValue(mockProvider as any);

      const response = await FilesGET(privateRequest, {
        params: Promise.resolve({ segments: ["private", "document.pdf"] }),
      });

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("application/pdf");
      expect(mockProvider.getFileStream).toHaveBeenCalledWith("private/document.pdf");
    });

    it("should handle file not found", async () => {
      const publicRequest = new NextRequest(
        "http://localhost:3000/api/storage/files/public/missing.jpg",
        {
          method: "GET",
        }
      );

      // Mock storage provider file not found
      const mockProvider = {
        getFileStream: jest.fn().mockRejectedValue(new Error("File not found")),
      };
      mockGetStorageProvider.mockReturnValue(mockProvider as any);

      const response = await FilesGET(publicRequest, {
        params: Promise.resolve({ segments: ["public", "missing.jpg"] }),
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

      // Mock storage provider error
      const mockProvider = {
        getFileStream: jest.fn().mockRejectedValue(new Error("Storage service unavailable")),
      };
      mockGetStorageProvider.mockReturnValue(mockProvider as any);

      const response = await FilesGET(publicRequest, {
        params: Promise.resolve({ segments: ["public", "error.jpg"] }),
      });

      expect(response.status).toBe(500);
      const result = await response.json();
      expect(result.error).toBe("Storage service unavailable");
    });

    it("should handle invalid file paths", async () => {
      const invalidRequest = new NextRequest(
        "http://localhost:3000/api/storage/files/../../../etc/passwd",
        {
          method: "GET",
        }
      );

      const response = await FilesGET(invalidRequest, {
        params: Promise.resolve({ segments: ["../../../etc/passwd"] }),
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

      // Mock successful storage provider with image
      const mockProvider = {
        getFileStream: jest.fn().mockResolvedValue({
          stream: new ReadableStream(),
          contentType: "image/png",
          contentLength: 12345,
          streamType: "web",
          isPartialContent: false,
        }),
      };
      mockGetStorageProvider.mockReturnValue(mockProvider as any);

      const response = await FilesGET(imageRequest, {
        params: Promise.resolve({ segments: ["public", "logo.png"] }),
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
      process.env.CRUNCHYCONE_STORAGE_PROVIDER = "AWS S3";
      const mockProvider = {
        isAvailable: jest.fn().mockResolvedValue(true),
      };
      mockGetStorageProvider.mockReturnValue(mockProvider as any);

      const response = await TestStorageGET(mockRequest);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.provider).toBe("AWS S3");
    });

    it("should handle missing storage configuration", async () => {
      mockRequest = new NextRequest("http://localhost:3000/api/storage/test", {
        method: "GET",
      });

      // Mock admin access
      mockRequireRole.mockResolvedValue(undefined);

      // Mock missing configuration
      mockGetStorageProvider.mockImplementation(() => {
        throw new Error("No storage provider configured");
      });

      const response = await TestStorageGET(mockRequest);
      const result = await response.json();

      expect(response.status).toBe(500);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
