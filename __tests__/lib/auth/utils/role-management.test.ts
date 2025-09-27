import { assignDefaultUserRole, getUserRoles } from "@/lib/auth/utils/role-management";
import { prismaAuth } from "@/lib/auth/prisma-auth";

// Mock the dependencies
jest.mock("@/lib/auth/prisma-auth");

const mockPrismaAuth = prismaAuth as jest.Mocked<typeof prismaAuth>;

describe("role-management", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("assignDefaultUserRole", () => {
    it("should assign user role successfully", async () => {
      const mockRole = {
        id: "role-123",
        name: "user",
      };

      mockPrismaAuth.role.findUnique.mockResolvedValue(mockRole);
      mockPrismaAuth.userRole.create.mockResolvedValue({
        id: "user-role-123",
        user_id: "user-123",
        role_id: "role-123",
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      });

      const result = await assignDefaultUserRole("user-123");

      expect(result).toBe(true);
      expect(mockPrismaAuth.role.findUnique).toHaveBeenCalledWith({
        where: { name: "user" },
      });
      expect(mockPrismaAuth.userRole.create).toHaveBeenCalledWith({
        data: {
          user_id: "user-123",
          role_id: "role-123",
        },
      });
    });

    it("should return false when user role does not exist", async () => {
      mockPrismaAuth.role.findUnique.mockResolvedValue(null);

      const result = await assignDefaultUserRole("user-123");

      expect(result).toBe(false);
      expect(mockPrismaAuth.userRole.create).not.toHaveBeenCalled();
    });

    it("should handle database errors gracefully", async () => {
      mockPrismaAuth.role.findUnique.mockRejectedValue(new Error("Database error"));

      const result = await assignDefaultUserRole("user-123");

      expect(result).toBe(false);
    });
  });

  describe("getUserRoles", () => {
    it("should return user roles successfully", async () => {
      const mockUser = {
        id: "user-123",
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

      const result = await getUserRoles("user-123");

      expect(result).toEqual(["user", "admin"]);
      expect(mockPrismaAuth.user.findUnique).toHaveBeenCalledWith({
        where: { id: "user-123" },
        include: {
          roles: {
            where: { deleted_at: null },
            include: { role: true },
          },
        },
      });
    });

    it("should return empty array when user not found", async () => {
      mockPrismaAuth.user.findUnique.mockResolvedValue(null);

      const result = await getUserRoles("user-123");

      expect(result).toEqual([]);
    });

    it("should return empty array when user has no roles", async () => {
      const mockUser = {
        id: "user-123",
        roles: [],
      };

      mockPrismaAuth.user.findUnique.mockResolvedValue(mockUser);

      const result = await getUserRoles("user-123");

      expect(result).toEqual([]);
    });

    it("should handle database errors gracefully", async () => {
      mockPrismaAuth.user.findUnique.mockRejectedValue(new Error("Database error"));

      const result = await getUserRoles("user-123");

      expect(result).toEqual([]);
    });
  });
});
