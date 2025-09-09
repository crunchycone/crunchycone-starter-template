/**
 * Unified Environment Service for CrunchyCone Starter
 *
 * Automatically detects runtime environment and provides appropriate backend:
 * - Local Development (CRUNCHYCONE_PLATFORM != "1"): Uses .env files
 * - Platform Deployment (CRUNCHYCONE_PLATFORM = "1"): Uses CrunchyCone API
 *
 * This service replaces direct .env file manipulation throughout the application.
 */

import {
  getCrunchyConeEnvironmentService,
  isPlatformEnvironment,
  type CrunchyConeEnvironmentService,
  type EnvironmentServiceConfig,
} from "crunchycone-lib/environment";

// Global service instance for application-wide use
let globalEnvironmentService: CrunchyConeEnvironmentService | null = null;

/**
 * Get the global environment service instance
 * Automatically detects platform and configures appropriate provider
 */
export function getEnvironmentService(
  config?: EnvironmentServiceConfig
): CrunchyConeEnvironmentService {
  if (!globalEnvironmentService) {
    globalEnvironmentService = getCrunchyConeEnvironmentService(config);
  }
  return globalEnvironmentService;
}

/**
 * Check if running on CrunchyCone platform
 */
export function isOnCrunchyConePlatform(): boolean {
  return isPlatformEnvironment();
}

/**
 * Helper function to bulk update environment variables
 * Handles the differences between local (.env) and platform (API) environments
 */
export async function updateEnvironmentVariables(
  variables: Record<string, string | undefined>,
  options: {
    removeEmpty?: boolean; // Whether to delete variables with empty values
  } = {}
): Promise<{ success: boolean; error?: string }> {
  try {
    const envService = getEnvironmentService();
    const { removeEmpty = true } = options;

    // Separate variables to set vs delete
    const varsToSet: Record<string, string> = {};
    const varsToDelete: string[] = [];

    for (const [key, value] of Object.entries(variables)) {
      if (value === undefined || (removeEmpty && value === "")) {
        varsToDelete.push(key);
      } else {
        varsToSet[key] = value;
      }
    }

    // Set variables (bulk operation for efficiency)
    if (Object.keys(varsToSet).length > 0) {
      await envService.setEnvVars(varsToSet);
    }

    // Delete variables (individual operations)
    for (const key of varsToDelete) {
      try {
        await envService.deleteEnvVar(key);
      } catch (error) {
        // Continue if deletion fails (variable might not exist)
        console.warn(`Failed to delete environment variable ${key}:`, error);
      }
    }

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Failed to update environment variables:", error);
    return {
      success: false,
      error: `Failed to update environment variables: ${errorMessage}`,
    };
  }
}

/**
 * Get multiple environment variables at once
 */
export async function getEnvironmentVariables(
  keys: string[]
): Promise<Record<string, string | undefined>> {
  try {
    const envService = getEnvironmentService();
    const result: Record<string, string | undefined> = {};

    for (const key of keys) {
      result[key] = await envService.getEnvVar(key);
    }

    return result;
  } catch (error) {
    console.error("Failed to get environment variables:", error);
    return {};
  }
}

/**
 * Get all environment variables
 */
export async function getAllEnvironmentVariables(): Promise<Record<string, string>> {
  try {
    const envService = getEnvironmentService();
    return await envService.listEnvVars();
  } catch (error) {
    console.error("Failed to get all environment variables:", error);
    return {};
  }
}

/**
 * Check if environment service supports secrets (only on platform)
 */
export function supportsSecrets(): boolean {
  const envService = getEnvironmentService();
  return envService.supportsSecrets();
}

/**
 * Get information about the current environment service configuration
 */
export function getEnvironmentServiceInfo(): {
  type: "local" | "remote";
  supportsSecrets: boolean;
  isPlatformEnvironment: boolean;
} {
  const envService = getEnvironmentService();
  return envService.getProviderInfo();
}

/**
 * Legacy compatibility: Simulate writing to .env file format
 * This helps with migration from direct file writing
 */
export async function updateEnvironmentSection(
  sectionName: string,
  variables: Record<string, string | undefined>
): Promise<{ success: boolean; error?: string }> {
  console.log(`Updating environment section: ${sectionName}`);

  // In the new approach, we don't have sections - just set all variables
  return await updateEnvironmentVariables(variables);
}

// Re-export types for convenience
export type { CrunchyConeEnvironmentService, EnvironmentServiceConfig };
