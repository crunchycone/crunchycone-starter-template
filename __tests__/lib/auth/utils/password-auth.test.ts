import { verifyUserCredentials } from "@/lib/auth/utils/password-auth";
import { prismaAuth } from "@/lib/auth/prisma-auth";
import bcrypt from "bcryptjs";

// Mock the dependencies
jest.mock("@/lib/auth/prisma-auth");
jest.mock("bcryptjs");

const mockPrismaAuth = prismaAuth as jest.Mocked<typeof prismaAuth>;
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe("password-auth", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("verifyUserCredentials", () => {
    it("should return null when email is missing", async () => {
      const result = await verifyUserCredentials("", "password123");
      expect(result).toBeNull();
    });

    it("should return null when password is missing", async () => {
      const result = await verifyUserCredentials("test@example.com", "");
      expect(result).toBeNull();
    });

    it("should return null when user is not found", async () => {
      mockPrismaAuth.user.findUnique.mockResolvedValue(null);

      const result = await verifyUserCredentials("test@example.com", "password123");

      expect(result).toBeNull();
      expect(mockPrismaAuth.user.findUnique).toHaveBeenCalledWith({
        where: {
          email: "test@example.com",
          deleted_at: null,
        },
        include: {
          profile: true,
          roles: {
            where: { deleted_at: null },
            include: {
              role: true,
            },
          },
        },
      });
    });

    it("should return null when user has no password", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        password: null,
        name: "Test User",
        image: null,
        profile: null,
        roles: [],
      };

      mockPrismaAuth.user.findUnique.mockResolvedValue(mockUser);

      const result = await verifyUserCredentials("test@example.com", "password123");

      expect(result).toBeNull();
    });

    it("should return null when password verification fails", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        password: "hashed-password",
        name: "Test User",
        image: null,
        profile: null,
        roles: [],
      };

      mockPrismaAuth.user.findUnique.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(false);

      const result = await verifyUserCredentials("test@example.com", "wrong-password");

      expect(result).toBeNull();
      expect(mockBcrypt.compare).toHaveBeenCalledWith("wrong-password", "hashed-password");
    });

    it("should return user data when credentials are valid", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        password: "hashed-password",
        name: "Test User",
        image: "https://example.com/avatar.jpg",
        profile: {
          first_name: "Test",
          last_name: "User",
        },
        roles: [
          {
            role: { name: "user" },
          },
          {
            role: { name: "admin" },
          },
        ],
      };

      mockPrismaAuth.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaAuth.user.update.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(true);

      const result = await verifyUserCredentials("test@example.com", "correct-password");

      expect(result).toEqual({
        id: "user-123",
        email: "test@example.com",
        name: "Test User",
        image: "https://example.com/avatar.jpg",
        roles: ["user", "admin"],
      });

      expect(mockBcrypt.compare).toHaveBeenCalledWith("correct-password", "hashed-password");
      expect(mockPrismaAuth.user.update).toHaveBeenCalledWith({
        where: { id: "user-123" },
        data: { last_signed_in: expect.any(Date) },
      });
    });

    it("should use profile name when user name is missing", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        password: "hashed-password",
        name: null,
        image: null,
        profile: {
          first_name: "Profile",
          last_name: "Name",
        },
        roles: [],
      };

      mockPrismaAuth.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaAuth.user.update.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(true);

      const result = await verifyUserCredentials("test@example.com", "password123");

      expect(result?.name).toBe("Profile Name");
    });

    it("should handle database errors gracefully", async () => {
      mockPrismaAuth.user.findUnique.mockRejectedValue(new Error("Database error"));

      const result = await verifyUserCredentials("test@example.com", "password123");

      expect(result).toBeNull();
    });
  });
});
