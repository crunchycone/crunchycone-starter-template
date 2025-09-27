import { createGoogleProvider } from "@/lib/auth/providers/google";

describe("google provider", () => {
  beforeEach(() => {
    // Reset environment variables
    delete process.env.NEXT_PUBLIC_ENABLE_GOOGLE_AUTH;
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
  });

  describe("createGoogleProvider", () => {
    it("should return null when Google auth is disabled", () => {
      process.env.NEXT_PUBLIC_ENABLE_GOOGLE_AUTH = "false";
      process.env.GOOGLE_CLIENT_ID = "test-client-id";
      process.env.GOOGLE_CLIENT_SECRET = "test-client-secret";

      const provider = createGoogleProvider();

      expect(provider).toBeNull();
    });

    it("should return null when client ID is missing", () => {
      process.env.NEXT_PUBLIC_ENABLE_GOOGLE_AUTH = "true";
      process.env.GOOGLE_CLIENT_SECRET = "test-client-secret";

      const provider = createGoogleProvider();

      expect(provider).toBeNull();
    });

    it("should return null when client secret is missing", () => {
      process.env.NEXT_PUBLIC_ENABLE_GOOGLE_AUTH = "true";
      process.env.GOOGLE_CLIENT_ID = "test-client-id";

      const provider = createGoogleProvider();

      expect(provider).toBeNull();
    });

    it('should create Google provider when properly configured with "true"', () => {
      process.env.NEXT_PUBLIC_ENABLE_GOOGLE_AUTH = "true";
      process.env.GOOGLE_CLIENT_ID = "test-client-id";
      process.env.GOOGLE_CLIENT_SECRET = "test-client-secret";

      const provider = createGoogleProvider();

      expect(provider).toBeDefined();
      expect(provider?.options?.clientId).toBe("test-client-id");
      expect(provider?.options?.clientSecret).toBe("test-client-secret");
    });

    it('should create Google provider when enabled with "1"', () => {
      process.env.NEXT_PUBLIC_ENABLE_GOOGLE_AUTH = "1";
      process.env.GOOGLE_CLIENT_ID = "test-client-id";
      process.env.GOOGLE_CLIENT_SECRET = "test-client-secret";

      const provider = createGoogleProvider();

      expect(provider).toBeDefined();
    });

    it('should return null when enabled is not "true" or "1"', () => {
      process.env.NEXT_PUBLIC_ENABLE_GOOGLE_AUTH = "yes";
      process.env.GOOGLE_CLIENT_ID = "test-client-id";
      process.env.GOOGLE_CLIENT_SECRET = "test-client-secret";

      const provider = createGoogleProvider();

      expect(provider).toBeNull();
    });
  });
});
