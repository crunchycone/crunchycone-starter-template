import { findUserByEmail } from "@/lib/auth/utils/user-lookup";
import { prismaAuth } from "@/lib/auth/prisma-auth";

// Mock the dependencies
jest.mock("@/lib/auth/prisma-auth");

const mockPrismaAuth = prismaAuth as jest.Mocked<typeof prismaAuth>;

describe("user-lookup", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("findUserByEmail", () => {
    it("should find user by email successfully", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        name: "Test User",
        roles: [
          {
            role: { name: "user" },
          },
        ],
      };

      mockPrismaAuth.user.findUnique.mockResolvedValue(mockUser);

      const result = await findUserByEmail("test@example.com");

      expect(result).toEqual(mockUser);
      expect(mockPrismaAuth.user.findUnique).toHaveBeenCalledWith({
        where: {
          email: "test@example.com",
          deleted_at: null,
        },
        include: {
          roles: {
            where: { deleted_at: null },
            include: { role: true },
          },
        },
      });
    });

    it("should return null when user not found", async () => {
      mockPrismaAuth.user.findUnique.mockResolvedValue(null);

      const result = await findUserByEmail("nonexistent@example.com");

      expect(result).toBeNull();
    });

    it("should handle database errors gracefully", async () => {
      mockPrismaAuth.user.findUnique.mockRejectedValue(new Error("Database error"));

      const result = await findUserByEmail("test@example.com");

      expect(result).toBeNull();
    });
  });
});
