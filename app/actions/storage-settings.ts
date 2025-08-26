"use server";

import { auth } from "@/lib/auth";
import { hasRole } from "@/lib/auth/permissions";
import { revalidatePath } from "next/cache";
import fs from "fs";
import path from "path";

interface StorageSettings {
  provider: string;
  // LocalStorage settings
  localStoragePath?: string;
  localStorageBaseUrl?: string;
  
  // AWS S3 settings
  awsAccessKeyId?: string;
  awsSecretAccessKey?: string;
  awsRegion?: string;
  awsBucket?: string;
  awsCloudFrontDomain?: string;
  
  // Digital Ocean Spaces settings
  doAccessKeyId?: string;
  doSecretAccessKey?: string;
  doRegion?: string;
  doBucket?: string;
  doCdnEndpoint?: string;
  
  // Azure Storage settings
  azureAccountName?: string;
  azureAccountKey?: string;
  azureSasToken?: string;
  azureConnectionString?: string;
  azureContainerName?: string;
  azureCdnUrl?: string;
  
  // Google Cloud Storage settings
  gcpProjectId?: string;
  gcpKeyFile?: string;
  gcsBucket?: string;
  gcpCdnUrl?: string;
  
  // CrunchyCone uses CLI authentication and crunchycone.toml project config
  // No additional settings required
}

export async function getStorageSettings(): Promise<{ success: boolean; settings?: StorageSettings; error?: string }> {
  try {
    const session = await auth();
    if (!session || !(await hasRole(session.user.id, "admin"))) {
      return { success: false, error: "Unauthorized" };
    }

    // Read current environment variables
    const settings: StorageSettings = {
      provider: process.env.CRUNCHYCONE_STORAGE_PROVIDER || "localstorage",
      localStoragePath: process.env.CRUNCHYCONE_LOCALSTORAGE_PATH,
      localStorageBaseUrl: process.env.CRUNCHYCONE_LOCALSTORAGE_BASE_URL,
      awsAccessKeyId: process.env.CRUNCHYCONE_AWS_ACCESS_KEY_ID,
      awsSecretAccessKey: process.env.CRUNCHYCONE_AWS_SECRET_ACCESS_KEY,
      awsRegion: process.env.CRUNCHYCONE_AWS_REGION,
      awsBucket: process.env.CRUNCHYCONE_AWS_BUCKET,
      awsCloudFrontDomain: process.env.CRUNCHYCONE_AWS_CLOUDFRONT_DOMAIN,
      doAccessKeyId: process.env.CRUNCHYCONE_DO_ACCESS_KEY_ID,
      doSecretAccessKey: process.env.CRUNCHYCONE_DO_SECRET_ACCESS_KEY,
      doRegion: process.env.CRUNCHYCONE_DO_REGION,
      doBucket: process.env.CRUNCHYCONE_DO_BUCKET,
      doCdnEndpoint: process.env.CRUNCHYCONE_DO_CDN_ENDPOINT,
      azureAccountName: process.env.CRUNCHYCONE_AZURE_ACCOUNT_NAME,
      azureAccountKey: process.env.CRUNCHYCONE_AZURE_ACCOUNT_KEY,
      azureSasToken: process.env.CRUNCHYCONE_AZURE_SAS_TOKEN,
      azureConnectionString: process.env.CRUNCHYCONE_AZURE_CONNECTION_STRING,
      azureContainerName: process.env.CRUNCHYCONE_AZURE_CONTAINER_NAME,
      azureCdnUrl: process.env.CRUNCHYCONE_AZURE_CDN_URL,
      gcpProjectId: process.env.CRUNCHYCONE_GCP_PROJECT_ID,
      gcpKeyFile: process.env.CRUNCHYCONE_GCP_KEY_FILE,
      gcsBucket: process.env.CRUNCHYCONE_GCS_BUCKET,
      gcpCdnUrl: process.env.CRUNCHYCONE_GCP_CDN_URL,
    };

    return { success: true, settings };
  } catch (error) {
    return { success: false, error: "Failed to load storage settings" };
  }
}

export async function updateStorageSettings(settings: StorageSettings): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session || !(await hasRole(session.user.id, "admin"))) {
      return { success: false, error: "Unauthorized" };
    }

    // Read current .env file
    const envPath = path.join(process.cwd(), ".env");
    let envContent = "";
    
    try {
      envContent = fs.readFileSync(envPath, "utf-8");
    } catch {
      // If .env doesn't exist, start with empty content
    }

    // Update storage environment variables
    const updates: Record<string, string | undefined> = {
      CRUNCHYCONE_STORAGE_PROVIDER: settings.provider,
      CRUNCHYCONE_LOCALSTORAGE_PATH: settings.localStoragePath,
      CRUNCHYCONE_LOCALSTORAGE_BASE_URL: settings.localStorageBaseUrl,
      CRUNCHYCONE_AWS_ACCESS_KEY_ID: settings.awsAccessKeyId,
      CRUNCHYCONE_AWS_SECRET_ACCESS_KEY: settings.awsSecretAccessKey,
      CRUNCHYCONE_AWS_REGION: settings.awsRegion,
      CRUNCHYCONE_AWS_BUCKET: settings.awsBucket,
      CRUNCHYCONE_AWS_CLOUDFRONT_DOMAIN: settings.awsCloudFrontDomain,
      CRUNCHYCONE_DO_ACCESS_KEY_ID: settings.doAccessKeyId,
      CRUNCHYCONE_DO_SECRET_ACCESS_KEY: settings.doSecretAccessKey,
      CRUNCHYCONE_DO_REGION: settings.doRegion,
      CRUNCHYCONE_DO_BUCKET: settings.doBucket,
      CRUNCHYCONE_DO_CDN_ENDPOINT: settings.doCdnEndpoint,
      CRUNCHYCONE_AZURE_ACCOUNT_NAME: settings.azureAccountName,
      CRUNCHYCONE_AZURE_ACCOUNT_KEY: settings.azureAccountKey,
      CRUNCHYCONE_AZURE_SAS_TOKEN: settings.azureSasToken,
      CRUNCHYCONE_AZURE_CONNECTION_STRING: settings.azureConnectionString,
      CRUNCHYCONE_AZURE_CONTAINER_NAME: settings.azureContainerName,
      CRUNCHYCONE_AZURE_CDN_URL: settings.azureCdnUrl,
      CRUNCHYCONE_GCP_PROJECT_ID: settings.gcpProjectId,
      CRUNCHYCONE_GCP_KEY_FILE: settings.gcpKeyFile,
      CRUNCHYCONE_GCS_BUCKET: settings.gcsBucket,
      CRUNCHYCONE_GCP_CDN_URL: settings.gcpCdnUrl,
    };

    // Parse existing .env content
    const envLines = envContent.split("\n");
    const envMap = new Map<string, string>();
    const commentLines: string[] = [];
    
    for (const line of envLines) {
      if (line.trim().startsWith("#") || line.trim() === "") {
        commentLines.push(line);
      } else if (line.includes("=")) {
        const [key, ...valueParts] = line.split("=");
        envMap.set(key.trim(), valueParts.join("="));
      } else {
        commentLines.push(line);
      }
    }

    // Update with new values
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined && value !== "") {
        envMap.set(key, value);
      } else {
        envMap.delete(key);
      }
    }

    // Rebuild .env content
    const newEnvLines: string[] = [];
    
    // Add comments and non-storage variables first
    for (const line of envLines) {
      if (line.trim().startsWith("#") || line.trim() === "") {
        newEnvLines.push(line);
      } else if (line.includes("=")) {
        const [key] = line.split("=");
        if (!key.trim().startsWith("CRUNCHYCONE_STORAGE") && 
            !key.trim().startsWith("CRUNCHYCONE_LOCALSTORAGE") &&
            !key.trim().startsWith("CRUNCHYCONE_AWS") &&
            !key.trim().startsWith("CRUNCHYCONE_DO") &&
            !key.trim().startsWith("CRUNCHYCONE_AZURE") &&
            !key.trim().startsWith("CRUNCHYCONE_GCP") &&
            !key.trim().startsWith("CRUNCHYCONE_GCS")) {
          newEnvLines.push(line);
        }
      } else {
        newEnvLines.push(line);
      }
    }

    // Add storage configuration section
    newEnvLines.push("");
    newEnvLines.push("# Storage Configuration");
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined && value !== "") {
        newEnvLines.push(`${key}="${value}"`);
      }
    }

    // Write updated .env file
    fs.writeFileSync(envPath, newEnvLines.join("\n"));

    revalidatePath("/admin/settings");
    return { success: true };
  } catch (error) {
    console.error("Error updating storage settings:", error);
    return { success: false, error: "Failed to update storage settings" };
  }
}

export async function testStorageConnection(settings: StorageSettings): Promise<{ success: boolean; error?: string; details?: string }> {
  try {
    const session = await auth();
    if (!session || !(await hasRole(session.user.id, "admin"))) {
      return { success: false, error: "Unauthorized" };
    }

    // Import crunchycone-lib storage classes
    const { initializeStorageProvider, getStorageProvider } = await import("crunchycone-lib/services/storage");

    // Temporarily set environment variables for testing
    const originalEnvVars = new Map<string, string | undefined>();
    const testEnvVars: Record<string, string> = {
      CRUNCHYCONE_STORAGE_PROVIDER: settings.provider,
    };

    // Add provider-specific environment variables
    switch (settings.provider) {
      case "localstorage":
        if (settings.localStoragePath) testEnvVars.CRUNCHYCONE_LOCALSTORAGE_PATH = settings.localStoragePath;
        if (settings.localStorageBaseUrl) testEnvVars.CRUNCHYCONE_LOCALSTORAGE_BASE_URL = settings.localStorageBaseUrl;
        break;
      case "aws":
        if (settings.awsAccessKeyId) testEnvVars.CRUNCHYCONE_AWS_ACCESS_KEY_ID = settings.awsAccessKeyId;
        if (settings.awsSecretAccessKey) testEnvVars.CRUNCHYCONE_AWS_SECRET_ACCESS_KEY = settings.awsSecretAccessKey;
        if (settings.awsRegion) testEnvVars.CRUNCHYCONE_AWS_REGION = settings.awsRegion;
        if (settings.awsBucket) testEnvVars.CRUNCHYCONE_AWS_BUCKET = settings.awsBucket;
        if (settings.awsCloudFrontDomain) testEnvVars.CRUNCHYCONE_AWS_CLOUDFRONT_DOMAIN = settings.awsCloudFrontDomain;
        break;
      case "digitalocean":
        if (settings.doAccessKeyId) testEnvVars.CRUNCHYCONE_DO_ACCESS_KEY_ID = settings.doAccessKeyId;
        if (settings.doSecretAccessKey) testEnvVars.CRUNCHYCONE_DO_SECRET_ACCESS_KEY = settings.doSecretAccessKey;
        if (settings.doRegion) testEnvVars.CRUNCHYCONE_DO_REGION = settings.doRegion;
        if (settings.doBucket) testEnvVars.CRUNCHYCONE_DO_BUCKET = settings.doBucket;
        if (settings.doCdnEndpoint) testEnvVars.CRUNCHYCONE_DO_CDN_ENDPOINT = settings.doCdnEndpoint;
        break;
      case "azure":
        if (settings.azureAccountName) testEnvVars.CRUNCHYCONE_AZURE_ACCOUNT_NAME = settings.azureAccountName;
        if (settings.azureAccountKey) testEnvVars.CRUNCHYCONE_AZURE_ACCOUNT_KEY = settings.azureAccountKey;
        if (settings.azureSasToken) testEnvVars.CRUNCHYCONE_AZURE_SAS_TOKEN = settings.azureSasToken;
        if (settings.azureConnectionString) testEnvVars.CRUNCHYCONE_AZURE_CONNECTION_STRING = settings.azureConnectionString;
        if (settings.azureContainerName) testEnvVars.CRUNCHYCONE_AZURE_CONTAINER_NAME = settings.azureContainerName;
        if (settings.azureCdnUrl) testEnvVars.CRUNCHYCONE_AZURE_CDN_URL = settings.azureCdnUrl;
        break;
      case "gcp":
        if (settings.gcpProjectId) testEnvVars.CRUNCHYCONE_GCP_PROJECT_ID = settings.gcpProjectId;
        if (settings.gcpKeyFile) testEnvVars.CRUNCHYCONE_GCP_KEY_FILE = settings.gcpKeyFile;
        if (settings.gcsBucket) testEnvVars.CRUNCHYCONE_GCS_BUCKET = settings.gcsBucket;
        if (settings.gcpCdnUrl) testEnvVars.CRUNCHYCONE_GCP_CDN_URL = settings.gcpCdnUrl;
        break;
      case "crunchycone":
        // CrunchyCone uses CLI authentication and crunchycone.toml project config
        // No additional environment variables needed for testing
        break;
    }

    // Backup and set test environment variables
    for (const [key, value] of Object.entries(testEnvVars)) {
      originalEnvVars.set(key, process.env[key]);
      process.env[key] = value;
    }

    try {
      // Initialize and test the storage provider
      initializeStorageProvider();
      const provider = getStorageProvider();
      
      // Test if provider is available
      const isAvailable = await provider.isAvailable();
      
      if (isAvailable) {
        // Try to list files to ensure connection works
        const listResult = await provider.listFiles({ limit: 1 });
        return { 
          success: true, 
          details: `Successfully connected to ${settings.provider} storage. Found ${listResult.totalCount || 0} files.`
        };
      } else {
        return { 
          success: false, 
          error: `${settings.provider} storage provider is not available`,
          details: "Provider failed availability check"
        };
      }
    } finally {
      // Restore original environment variables
      for (const [key, originalValue] of originalEnvVars) {
        if (originalValue === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = originalValue;
        }
      }
    }
  } catch (error) {
    return { 
      success: false, 
      error: "Storage connection test failed",
      details: error instanceof Error ? error.message : "Unknown error"
    };
  }
}