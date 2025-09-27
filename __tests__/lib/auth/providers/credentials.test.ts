import { createCredentialsProvider } from "@/lib/auth/providers/credentials";
import * as passwordAuth from "@/lib/auth/utils/password-auth";

// Mock the dependencies
jest.mock("@/lib/auth/utils/password-auth");

const mockVerifyUserCredentials = passwordAuth.verifyUserCredentials as jest.MockedFunction<
  typeof passwordAuth.verifyUserCredentials
>;

describe("credentials provider", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment variables
    delete process.env.NEXT_PUBLIC_ENABLE_EMAIL_PASSWORD;
  });

  describe("createCredentialsProvider", () => {
    it("should create credentials provider when enabled", () => {
      const provider = createCredentialsProvider();

      expect(provider).toBeDefined();
      expect(provider?.name).toBe("Credentials");
      expect(provider?.options?.credentials).toEqual({
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      });
    });

    it("should return null when explicitly disabled", () => {
      process.env.NEXT_PUBLIC_ENABLE_EMAIL_PASSWORD = "false";

      const provider = createCredentialsProvider();

      expect(provider).toBeNull();
    });

    it("should create provider when not specified (default enabled)", () => {
      const provider = createCredentialsProvider();

      expect(provider).toBeDefined();
    });

    describe("authorize function", () => {
      let provider: any;

      beforeEach(() => {
        provider = createCredentialsProvider();
      });

      it("should return null when email is missing", async () => {
        const result = await provider.options.authorize({
          password: "password123",
        });

        expect(result).toBeNull();
        expect(mockVerifyUserCredentials).not.toHaveBeenCalled();
      });

      it("should return null when password is missing", async () => {
        const result = await provider.options.authorize({
          email: "test@example.com",
        });

        expect(result).toBeNull();
        expect(mockVerifyUserCredentials).not.toHaveBeenCalled();
      });

      it("should call verifyUserCredentials with correct parameters", async () => {
        const mockUser = {
          id: "user-123",
          email: "test@example.com",
          name: "Test User",
          image: null,
          roles: ["user"],
        };

        mockVerifyUserCredentials.mockResolvedValue(mockUser);

        const result = await provider.options.authorize({
          email: "test@example.com",
          password: "password123",
        });

        expect(result).toEqual(mockUser);
        expect(mockVerifyUserCredentials).toHaveBeenCalledWith("test@example.com", "password123");
      });

      it("should return null when verifyUserCredentials returns null", async () => {
        mockVerifyUserCredentials.mockResolvedValue(null);

        const result = await provider.options.authorize({
          email: "test@example.com",
          password: "wrong-password",
        });

        expect(result).toBeNull();
        expect(mockVerifyUserCredentials).toHaveBeenCalledWith(
          "test@example.com",
          "wrong-password"
        );
      });
    });
  });
});
