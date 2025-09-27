import { createGitHubProvider } from "@/lib/auth/providers/github";

// Mock fetch for GitHub API calls
global.fetch = jest.fn();

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe("github provider", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment variables
    delete process.env.NEXT_PUBLIC_ENABLE_GITHUB_AUTH;
    delete process.env.GITHUB_CLIENT_ID;
    delete process.env.GITHUB_CLIENT_SECRET;
  });

  describe("createGitHubProvider", () => {
    it("should return null when GitHub auth is disabled", () => {
      process.env.NEXT_PUBLIC_ENABLE_GITHUB_AUTH = "false";
      process.env.GITHUB_CLIENT_ID = "test-client-id";
      process.env.GITHUB_CLIENT_SECRET = "test-client-secret";

      const provider = createGitHubProvider();

      expect(provider).toBeNull();
    });

    it("should return null when client ID is missing", () => {
      process.env.NEXT_PUBLIC_ENABLE_GITHUB_AUTH = "true";
      process.env.GITHUB_CLIENT_SECRET = "test-client-secret";

      const provider = createGitHubProvider();

      expect(provider).toBeNull();
    });

    it("should return null when client secret is missing", () => {
      process.env.NEXT_PUBLIC_ENABLE_GITHUB_AUTH = "true";
      process.env.GITHUB_CLIENT_ID = "test-client-id";

      const provider = createGitHubProvider();

      expect(provider).toBeNull();
    });

    it("should create GitHub provider when properly configured", () => {
      process.env.NEXT_PUBLIC_ENABLE_GITHUB_AUTH = "true";
      process.env.GITHUB_CLIENT_ID = "test-client-id";
      process.env.GITHUB_CLIENT_SECRET = "test-client-secret";

      const provider = createGitHubProvider();

      expect(provider).toBeDefined();
      expect(provider?.options?.clientId).toBe("test-client-id");
      expect(provider?.options?.clientSecret).toBe("test-client-secret");
      expect(provider?.options?.authorization?.params?.scope).toBe("read:user user:email");
    });

    describe("profile function", () => {
      let provider: any;

      beforeEach(() => {
        process.env.NEXT_PUBLIC_ENABLE_GITHUB_AUTH = "true";
        process.env.GITHUB_CLIENT_ID = "test-client-id";
        process.env.GITHUB_CLIENT_SECRET = "test-client-secret";
        provider = createGitHubProvider();
      });

      it("should return profile when email is already present", async () => {
        const mockProfile = {
          id: 12345,
          name: "John Doe",
          login: "johndoe",
          email: "john@example.com",
          avatar_url: "https://github.com/avatar.jpg",
        };

        const tokens = { access_token: "test-token" };

        const result = await provider.options.profile(mockProfile, tokens);

        expect(result).toEqual({
          id: "12345",
          name: "John Doe",
          email: "john@example.com",
          image: "https://github.com/avatar.jpg",
        });

        expect(mockFetch).not.toHaveBeenCalled();
      });

      it("should fetch primary email when not present in profile", async () => {
        const mockProfile = {
          id: 12345,
          name: "John Doe",
          login: "johndoe",
          avatar_url: "https://github.com/avatar.jpg",
        };

        const mockEmails = [
          { email: "secondary@example.com", primary: false },
          { email: "primary@example.com", primary: true },
        ];

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockEmails),
        } as Response);

        const tokens = { access_token: "test-token" };

        const result = await provider.options.profile(mockProfile, tokens);

        expect(result).toEqual({
          id: "12345",
          name: "John Doe",
          email: "primary@example.com",
          image: "https://github.com/avatar.jpg",
        });

        expect(mockFetch).toHaveBeenCalledWith("https://api.github.com/user/emails", {
          headers: {
            Authorization: "token test-token",
            "User-Agent": "NextAuth",
          },
        });
      });

      it("should use login as name when name is missing", async () => {
        const mockProfile = {
          id: 12345,
          login: "johndoe",
          email: "john@example.com",
          avatar_url: "https://github.com/avatar.jpg",
        };

        const tokens = { access_token: "test-token" };

        const result = await provider.options.profile(mockProfile, tokens);

        expect(result).toEqual({
          id: "12345",
          name: "johndoe",
          email: "john@example.com",
          image: "https://github.com/avatar.jpg",
        });
      });

      it("should handle fetch errors gracefully", async () => {
        const mockProfile = {
          id: 12345,
          name: "John Doe",
          login: "johndoe",
          avatar_url: "https://github.com/avatar.jpg",
        };

        mockFetch.mockRejectedValueOnce(new Error("Network error"));

        const tokens = { access_token: "test-token" };

        const result = await provider.options.profile(mockProfile, tokens);

        expect(result).toEqual({
          id: "12345",
          name: "John Doe",
          email: undefined,
          image: "https://github.com/avatar.jpg",
        });
      });

      it("should handle empty emails array", async () => {
        const mockProfile = {
          id: 12345,
          name: "John Doe",
          login: "johndoe",
          avatar_url: "https://github.com/avatar.jpg",
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]),
        } as Response);

        const tokens = { access_token: "test-token" };

        const result = await provider.options.profile(mockProfile, tokens);

        expect(result.email).toBeUndefined();
      });
    });
  });
});
