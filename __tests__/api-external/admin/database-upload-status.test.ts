import { NextRequest } from "next/server";

// Mock dependencies first
jest.mock("@/lib/auth/permissions");

// Mock database upload action functions directly
jest.mock("@/app/actions/database-upload", () => ({
  getUploadStatus: jest.fn(),
}));

import { getUploadStatus } from "@/app/actions/database-upload";
const mockGetUploadStatus = getUploadStatus as jest.MockedFunction<typeof getUploadStatus>;

import { requireRole } from "@/lib/auth/permissions";

const mockRequireRole = requireRole as jest.MockedFunction<typeof requireRole>;

// Import route handlers after mocking
import { GET, POST } from "@/app/api/admin/database-upload-status/route";

describe("/api/admin/database-upload-status", () => {
  let mockRequest: NextRequest;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/admin/database-upload-status", () => {
    beforeEach(() => {
      mockRequest = new NextRequest("http://localhost:3000/api/admin/database-upload-status", {
        method: "GET",
      });
    });

    it("should return upload status successfully", async () => {
      // Mock admin access
      mockRequireRole.mockResolvedValue(undefined);

      // Mock successful status check
      mockGetUploadStatus.mockResolvedValue({
        success: true,
        status: "completed",
        lastUpload: new Date("2024-01-15T10:30:00Z"),
        fileSize: 1024000,
        uploadDuration: 5000,
        error: null,
        metadata: {
          databaseType: "sqlite",
          compressionUsed: true,
          encryptionUsed: true,
        },
      });

      const response = await GET(mockRequest);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.status).toBe("completed");
      expect(result.lastUpload).toBe("2024-01-15T10:30:00.000Z");
      expect(result.fileSize).toBe(1024000);
      expect(result.metadata.databaseType).toBe("sqlite");
      expect(mockGetUploadStatus).toHaveBeenCalled();
    });

    it("should return upload in progress status", async () => {
      // Mock admin access
      mockRequireRole.mockResolvedValue(undefined);

      // Mock upload in progress
      mockGetUploadStatus.mockResolvedValue({
        success: true,
        status: "uploading",
        progress: 65,
        startTime: new Date("2024-01-15T10:25:00Z"),
        estimatedCompletion: new Date("2024-01-15T10:35:00Z"),
        error: null,
        metadata: {
          databaseType: "sqlite",
          fileSize: 2048000,
        },
      });

      const response = await GET(mockRequest);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.status).toBe("uploading");
      expect(result.progress).toBe(65);
      expect(result.estimatedCompletion).toBeTruthy();
    });

    it("should return upload failed status with error details", async () => {
      // Mock admin access
      mockRequireRole.mockResolvedValue(undefined);

      // Mock upload failure
      mockGetUploadStatus.mockResolvedValue({
        success: false,
        status: "failed",
        lastAttempt: new Date("2024-01-15T10:20:00Z"),
        error: "Connection timeout to upload service",
        retryCount: 3,
        nextRetry: new Date("2024-01-15T11:00:00Z"),
        metadata: {
          databaseType: "sqlite",
          errorCode: "TIMEOUT",
        },
      });

      const response = await GET(mockRequest);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(false);
      expect(result.status).toBe("failed");
      expect(result.error).toBe("Connection timeout to upload service");
      expect(result.retryCount).toBe(3);
      expect(result.nextRetry).toBeTruthy();
    });

    it("should handle service errors gracefully", async () => {
      // Mock admin access
      mockRequireRole.mockResolvedValue(undefined);

      // Mock service throwing error
      mockGetUploadStatus.mockRejectedValue(new Error("Service unavailable"));

      const response = await GET(mockRequest);
      const result = await response.json();

      expect(response.status).toBe(500);
      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to get upload status");
      expect(result.details).toBe("Service unavailable");
    });

    it("should require admin role", async () => {
      // Mock unauthorized access
      mockRequireRole.mockRejectedValue(new Error("Unauthorized"));

      const response = await GET(mockRequest);
      const result = await response.json();

      expect(response.status).toBe(401);
      expect(result.error).toBe("Unauthorized");
      expect(mockRequireRole).toHaveBeenCalledWith("admin");
    });

    it("should handle no previous uploads", async () => {
      // Mock admin access
      mockRequireRole.mockResolvedValue(undefined);

      // Mock no previous uploads
      mockGetUploadStatus.mockResolvedValue({
        success: true,
        status: "never_uploaded",
        lastUpload: null,
        error: null,
        metadata: {
          databaseType: "sqlite",
          ready: true,
        },
      });

      const response = await GET(mockRequest);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.status).toBe("never_uploaded");
      expect(result.lastUpload).toBeNull();
    });
  });

  describe("POST /api/admin/database-upload-status", () => {
    beforeEach(() => {
      mockRequest = new NextRequest("http://localhost:3000/api/admin/database-upload-status", {
        method: "POST",
        body: JSON.stringify({
          force: false,
          compression: true,
          encryption: true,
        }),
      });
    });

    it("should start database upload successfully", async () => {
      // Mock admin access
      mockRequireRole.mockResolvedValue(undefined);

      // Mock successful upload start
      mockUploadDatabase.mockResolvedValue({
        success: true,
        status: "started",
        uploadId: "upload-123",
        estimatedDuration: 300000, // 5 minutes
        fileSize: 1024000,
        metadata: {
          databaseType: "sqlite",
          compressionUsed: true,
          encryptionUsed: true,
        },
      });

      const response = await POST(mockRequest);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.status).toBe("started");
      expect(result.uploadId).toBe("upload-123");
      expect(result.estimatedDuration).toBe(300000);
      expect(mockUploadDatabase).toHaveBeenCalledWith({
        force: false,
        compression: true,
        encryption: true,
      });
    });

    it("should handle upload already in progress", async () => {
      // Mock admin access
      mockRequireRole.mockResolvedValue(undefined);

      // Mock upload already in progress
      mockUploadDatabase.mockResolvedValue({
        success: false,
        status: "already_in_progress",
        currentUploadId: "upload-456",
        progress: 45,
        error: "Upload already in progress",
        metadata: {
          startTime: new Date("2024-01-15T10:20:00Z"),
        },
      });

      const response = await POST(mockRequest);
      const result = await response.json();

      expect(response.status).toBe(409);
      expect(result.success).toBe(false);
      expect(result.status).toBe("already_in_progress");
      expect(result.currentUploadId).toBe("upload-456");
      expect(result.progress).toBe(45);
    });

    it("should handle forced upload when one is in progress", async () => {
      // Mock admin access
      mockRequireRole.mockResolvedValue(undefined);

      mockRequest = new NextRequest("http://localhost:3000/api/admin/database-upload-status", {
        method: "POST",
        body: JSON.stringify({
          force: true,
          compression: false,
          encryption: true,
        }),
      });

      // Mock forced upload success
      mockUploadDatabase.mockResolvedValue({
        success: true,
        status: "started",
        uploadId: "upload-789",
        previousUploadCancelled: true,
        metadata: {
          databaseType: "sqlite",
          compressionUsed: false,
          encryptionUsed: true,
          forcedStart: true,
        },
      });

      const response = await POST(mockRequest);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.previousUploadCancelled).toBe(true);
      expect(mockUploadDatabase).toHaveBeenCalledWith({
        force: true,
        compression: false,
        encryption: true,
      });
    });

    it("should handle upload preparation failure", async () => {
      // Mock admin access
      mockRequireRole.mockResolvedValue(undefined);

      // Mock upload preparation failure
      mockUploadDatabase.mockResolvedValue({
        success: false,
        status: "preparation_failed",
        error: "Database is locked",
        retryAfter: 30000, // 30 seconds
        metadata: {
          databaseType: "sqlite",
          lockingProcess: "migration",
        },
      });

      const response = await POST(mockRequest);
      const result = await response.json();

      expect(response.status).toBe(500);
      expect(result.success).toBe(false);
      expect(result.status).toBe("preparation_failed");
      expect(result.error).toBe("Database is locked");
      expect(result.retryAfter).toBe(30000);
    });

    it("should handle service connection errors", async () => {
      // Mock admin access
      mockRequireRole.mockResolvedValue(undefined);

      // Mock service throwing error
      mockUploadDatabase.mockRejectedValue(new Error("Upload service unavailable"));

      const response = await POST(mockRequest);
      const result = await response.json();

      expect(response.status).toBe(500);
      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to start database upload");
      expect(result.details).toBe("Upload service unavailable");
    });

    it("should validate request body", async () => {
      // Mock admin access
      mockRequireRole.mockResolvedValue(undefined);

      mockRequest = new NextRequest("http://localhost:3000/api/admin/database-upload-status", {
        method: "POST",
        body: JSON.stringify({
          // Missing required fields or invalid data
          compression: "invalid",
        }),
      });

      const response = await POST(mockRequest);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.error).toBe("Invalid request body");
    });

    it("should require admin role for uploads", async () => {
      // Mock unauthorized access
      mockRequireRole.mockRejectedValue(new Error("Unauthorized"));

      const response = await POST(mockRequest);
      const result = await response.json();

      expect(response.status).toBe(401);
      expect(result.error).toBe("Unauthorized");
      expect(mockRequireRole).toHaveBeenCalledWith("admin");
    });

    it("should handle different database types", async () => {
      // Mock admin access
      mockRequireRole.mockResolvedValue(undefined);

      // Mock PostgreSQL upload
      mockUploadDatabase.mockResolvedValue({
        success: true,
        status: "started",
        uploadId: "upload-postgres-001",
        estimatedDuration: 600000, // 10 minutes for larger DB
        fileSize: 5242880, // 5MB
        metadata: {
          databaseType: "postgresql",
          compressionUsed: true,
          encryptionUsed: true,
          tables: 25,
          records: 100000,
        },
      });

      const response = await POST(mockRequest);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.metadata.databaseType).toBe("postgresql");
      expect(result.metadata.tables).toBe(25);
      expect(result.fileSize).toBe(5242880);
    });
  });
});
