/**
 * CrunchyCone Authentication Service for Admin Settings
 *
 * Handles authentication for CrunchyCone services (email, storage) in different environments:
 * - Local Development: Uses keytar keychain (from CLI login) or env vars
 * - Platform Deployment: Uses provided CRUNCHYCONE_API_KEY
 *
 * This service replaces direct CLI command execution for auth checking.
 */

import {
  CrunchyConeAuthService,
  type CrunchyConeAuthResult,
  type CrunchyConeAuthServiceConfig,
} from "crunchycone-lib";
import { isOnCrunchyConePlatform } from "./environment-service";

// Global auth service instance
let globalAuthService: CrunchyConeAuthService | null = null;

/**
 * Get the global CrunchyCone auth service instance
 */
export function getCrunchyConeAuthService(
  config?: CrunchyConeAuthServiceConfig
): CrunchyConeAuthService {
  if (!globalAuthService) {
    // Default config optimized for admin settings usage
    const defaultConfig: CrunchyConeAuthServiceConfig = {
      timeout: 10000, // 10 seconds
      preferApi: true, // Prefer API over CLI
      cliTimeout: 15000, // 15 seconds for CLI operations
      ...config,
    };

    globalAuthService = new CrunchyConeAuthService(defaultConfig);
  }
  return globalAuthService;
}

/**
 * Check if user is authenticated with CrunchyCone services
 * Returns detailed authentication information
 */
export async function checkCrunchyConeAuth(): Promise<CrunchyConeAuthResult> {
  try {
    const authService = getCrunchyConeAuthService();
    return await authService.checkAuthentication();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown authentication error";

    return {
      success: false,
      source: isOnCrunchyConePlatform() ? "api" : "cli",
      error: errorMessage,
      message: `Authentication check failed: ${errorMessage}`,
    };
  }
}

/**
 * Simple boolean check for CrunchyCone authentication
 * Useful for quick availability checks
 */
export async function isCrunchyConeAuthenticated(): Promise<boolean> {
  try {
    const result = await checkCrunchyConeAuth();
    return result.success;
  } catch {
    return false;
  }
}

/**
 * Get authentication status with user-friendly messages
 */
export async function getCrunchyConeAuthStatus(): Promise<{
  isAuthenticated: boolean;
  source: "api" | "cli" | "unknown";
  message: string;
  userEmail?: string;
  projectId?: string;
  error?: string;
}> {
  const result = await checkCrunchyConeAuth();

  if (result.success) {
    return {
      isAuthenticated: true,
      source: result.source,
      message: `Authenticated via ${result.source === "api" ? "API key" : "CLI credentials"}`,
      userEmail: result.user?.email,
      projectId: result.project?.project_id,
    };
  }

  // Generate helpful error messages based on environment
  let message = "Not authenticated with CrunchyCone services";

  if (isOnCrunchyConePlatform()) {
    message = "CRUNCHYCONE_API_KEY not available. This should be provided by the platform.";
  } else {
    // Local development - provide setup instructions
    if (result.error?.includes("keytar is not available")) {
      message =
        "CrunchyCone CLI credentials not found. Please set CRUNCHYCONE_API_KEY environment variable or install the CLI and run: crunchycone auth login";
    } else if (result.error?.includes("not found")) {
      message = "CrunchyCone CLI credentials not found. Please run: crunchycone auth login";
    } else {
      message = `Authentication failed: ${result.error || "Unknown error"}`;
    }
  }

  return {
    isAuthenticated: false,
    source: result.source || "unknown",
    message,
    error: result.error,
  };
}

/**
 * Get CrunchyCone API key for direct usage
 * This is useful for services that need the raw API key
 */
export async function getCrunchyConeAPIKey(): Promise<string | null> {
  try {
    // Import the auth functions from crunchycone-lib
    const { getCrunchyConeAPIKeyWithFallback } = await import("crunchycone-lib/auth");
    return await getCrunchyConeAPIKeyWithFallback();
  } catch (error) {
    console.error("Failed to get CrunchyCone API key:", error);
    return null;
  }
}

/**
 * Check if CrunchyCone services are available for testing
 * This includes checking both authentication and basic connectivity
 */
export async function areCrunchyConeServicesAvailable(): Promise<{
  available: boolean;
  reason?: string;
  canUseEmail: boolean;
  canUseStorage: boolean;
}> {
  const authStatus = await getCrunchyConeAuthStatus();

  if (!authStatus.isAuthenticated) {
    return {
      available: false,
      reason: authStatus.message,
      canUseEmail: false,
      canUseStorage: false,
    };
  }

  // If authenticated, services are available
  // Individual service availability is checked by the respective providers
  return {
    available: true,
    canUseEmail: true,
    canUseStorage: true,
  };
}

/**
 * Get authentication instructions for the current environment
 */
export function getCrunchyConeAuthInstructions(): {
  environment: "platform" | "local";
  instructions: string;
  commands?: string[];
} {
  if (isOnCrunchyConePlatform()) {
    return {
      environment: "platform",
      instructions: "Running on CrunchyCone platform. API key should be provided automatically.",
    };
  }

  return {
    environment: "local",
    instructions:
      "To use CrunchyCone services locally, you need to authenticate with the CLI or set an API key.",
    commands: [
      "Option 1: Install CLI and login",
      "npm install -g @crunchycone/cli",
      "crunchycone auth login",
      "",
      "Option 2: Set environment variable",
      "export CRUNCHYCONE_API_KEY=your-api-key",
    ],
  };
}

// Re-export types for convenience
export type { CrunchyConeAuthResult, CrunchyConeAuthServiceConfig };
