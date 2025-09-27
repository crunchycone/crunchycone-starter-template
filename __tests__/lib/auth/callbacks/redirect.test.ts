import { redirectCallback } from "@/lib/auth/callbacks/redirect";

// Mock console.log to avoid noise in tests
const mockConsoleLog = jest.spyOn(console, "log").mockImplementation(() => {});

describe("redirect callback", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    mockConsoleLog.mockRestore();
  });

  describe("redirectCallback", () => {
    const baseUrl = "http://localhost:3000";

    it("should allow redirect to signin page with path", async () => {
      const url = "/auth/signin";

      const result = await redirectCallback({ url, baseUrl });

      expect(result).toBe("/auth/signin");
      expect(mockConsoleLog).toHaveBeenCalledWith("Redirect callback:", { url, baseUrl });
    });

    it("should allow redirect to signin page with full URL", async () => {
      const url = `${baseUrl}/auth/signin`;

      const result = await redirectCallback({ url, baseUrl });

      expect(result).toBe(`${baseUrl}/auth/signin`);
    });

    it("should redirect to home when URL equals baseUrl", async () => {
      const url = baseUrl;

      const result = await redirectCallback({ url, baseUrl });

      expect(result).toBe(`${baseUrl}/`);
      expect(mockConsoleLog).toHaveBeenCalledWith("No specific redirect URL, sending to home");
    });

    it("should handle relative URLs by prepending baseUrl", async () => {
      const url = "/dashboard";

      const result = await redirectCallback({ url, baseUrl });

      expect(result).toBe(`${baseUrl}/dashboard`);
    });

    it("should allow URLs on the same origin", async () => {
      const url = `${baseUrl}/profile`;

      const result = await redirectCallback({ url, baseUrl });

      expect(result).toBe(`${baseUrl}/profile`);
    });

    it("should reject URLs from different origins and default to home", async () => {
      const url = "https://evil.com/malicious";

      const result = await redirectCallback({ url, baseUrl });

      expect(result).toBe(`${baseUrl}/`);
    });

    it("should handle malformed URLs gracefully", async () => {
      const url = "not-a-valid-url";

      const result = await redirectCallback({ url, baseUrl });

      expect(result).toBe(`${baseUrl}/`);
    });

    it("should handle signin URL with query parameters", async () => {
      const url = "/auth/signin?callbackUrl=/dashboard";

      const result = await redirectCallback({ url, baseUrl });

      expect(result).toBe("/auth/signin?callbackUrl=/dashboard");
    });

    it("should handle signin URL variations", async () => {
      const urls = ["/auth/signin/", "/auth/signin#section", `${baseUrl}/auth/signin?param=value`];

      for (const url of urls) {
        const result = await redirectCallback({ url, baseUrl });
        expect(result).toBe(url);
      }
    });

    it("should handle complex relative paths", async () => {
      const testCases = [
        { url: "/admin/users", expected: `${baseUrl}/admin/users` },
        { url: "/api/auth/callback", expected: `${baseUrl}/api/auth/callback` },
        { url: "/", expected: `${baseUrl}/` },
      ];

      for (const { url, expected } of testCases) {
        const result = await redirectCallback({ url, baseUrl });
        expect(result).toBe(expected);
      }
    });

    it("should handle different baseUrl formats", async () => {
      const testCases = [
        { baseUrl: "https://example.com", url: "/dashboard" },
        { baseUrl: "http://localhost:3000", url: "/profile" },
        { baseUrl: "https://app.production.com", url: "/settings" },
      ];

      for (const { baseUrl: testBaseUrl, url } of testCases) {
        const result = await redirectCallback({ url, baseUrl: testBaseUrl });
        expect(result).toBe(`${testBaseUrl}${url}`);
      }
    });

    it("should log redirect attempts", async () => {
      const url = "/test";
      const result = await redirectCallback({ url, baseUrl });

      expect(mockConsoleLog).toHaveBeenCalledWith("Redirect callback:", { url, baseUrl });
      expect(result).toBe(`${baseUrl}/test`);
    });

    it("should handle empty URL", async () => {
      const url = "";

      const result = await redirectCallback({ url, baseUrl });

      expect(result).toBe(`${baseUrl}/`);
    });

    it("should handle URL with only query parameters", async () => {
      const url = "?param=value";

      const result = await redirectCallback({ url, baseUrl });

      expect(result).toBe(`${baseUrl}/`);
    });

    it("should handle URL with only hash", async () => {
      const url = "#section";

      const result = await redirectCallback({ url, baseUrl });

      expect(result).toBe(`${baseUrl}/`);
    });
  });
});
