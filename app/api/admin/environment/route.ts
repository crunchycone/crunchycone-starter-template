import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/auth/permissions";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    // Check authentication and admin status
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userIsAdmin = await isAdmin(session.user.id);
    if (!userIsAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // Only allow in non-production environments for security
    const isProduction = process.env.NODE_ENV === "production";
    if (isProduction) {
      return NextResponse.json(
        { error: "Environment variables are not available in production mode" },
        { status: 403 }
      );
    }

    // Get environment data
    const envData = await getEnvironmentData();

    return NextResponse.json({
      variables: envData.variables,
      hasCrunchyConeConfig: envData.hasCrunchyConeConfig,
      isAuthenticated: envData.isAuthenticated,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching environment variables:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Check authentication and admin status
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userIsAdmin = await isAdmin(session.user.id);
    if (!userIsAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // Only allow in non-production environments for security
    const isProduction = process.env.NODE_ENV === "production";
    if (isProduction) {
      return NextResponse.json(
        { error: "Environment variable editing is not available in production mode" },
        { status: 403 }
      );
    }

    const { key, value } = await request.json();

    if (!key) {
      return NextResponse.json({ error: "Variable key is required" }, { status: 400 });
    }

    // Update .env file
    const success = await updateEnvVariable(key, value);
    
    if (!success) {
      return NextResponse.json({ error: "Failed to update .env file" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating environment variable:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Check authentication and admin status
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userIsAdmin = await isAdmin(session.user.id);
    if (!userIsAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // Only allow in non-production environments for security
    const isProduction = process.env.NODE_ENV === "production";
    if (isProduction) {
      return NextResponse.json(
        { error: "Environment variable deletion is not available in production mode" },
        { status: 403 }
      );
    }

    const { key } = await request.json();

    if (!key) {
      return NextResponse.json({ error: "Variable key is required" }, { status: 400 });
    }

    // Delete from .env file
    const success = await deleteEnvVariable(key);
    
    if (!success) {
      return NextResponse.json({ error: "Failed to delete from .env file" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting environment variable:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function getEnvironmentData() {
  const variables = [];

  // Check for crunchycone.toml
  const crunchyConeConfigPath = path.join(process.cwd(), "crunchycone.toml");
  const hasCrunchyConeConfig = fs.existsSync(crunchyConeConfigPath);

  // Read .env file if it exists
  const envFilePath = path.join(process.cwd(), ".env");
  let envFileVars: Record<string, string> = {};
  
  try {
    if (fs.existsSync(envFilePath)) {
      const envFileContent = fs.readFileSync(envFilePath, "utf8");
      envFileVars = parseEnvFile(envFileContent);
    } else {
      // No .env file found
      return { variables: [], hasCrunchyConeConfig };
    }
  } catch (error) {
    console.error("Error reading .env file:", error);
    return { variables: [], hasCrunchyConeConfig };
  }

  // Get CrunchyCone values if config exists and user is authenticated
  let crunchyConeData: {envVars: Record<string, string>, secrets: Record<string, string>} = {envVars: {}, secrets: {}};
  let isAuthenticated = false;
  
  if (hasCrunchyConeConfig) {
    try {
      isAuthenticated = await checkCrunchyConeAuth();
      if (isAuthenticated) {
        crunchyConeData = await fetchCrunchyConeVariables();
      }
    } catch (error) {
      console.error("Error fetching CrunchyCone data:", error);
    }
  }

  // Combine all CrunchyCone data
  const allCrunchyConeVars = { ...crunchyConeData.envVars, ...crunchyConeData.secrets };

  // Process .env file variables
  for (const [key, value] of Object.entries(envFileVars)) {
    const hasRemoteValue = key in allCrunchyConeVars;
    const isRemoteSecret = key in crunchyConeData.secrets;
    
    variables.push({
      key,
      localValue: value || "",
      crunchyconeValue: hasRemoteValue ? allCrunchyConeVars[key] : undefined,
      isSecret: isSensitiveKey(key), // Always use local detection for the checkbox
      isRemoteSecret, // Track if it's actually a secret in CrunchyCone (for display)
    });
  }

  // Add any CrunchyCone-only variables that don't exist locally
  for (const [key, value] of Object.entries(allCrunchyConeVars)) {
    if (!(key in envFileVars)) {
      const isRemoteSecret = key in crunchyConeData.secrets;
      
      variables.push({
        key,
        localValue: "",
        crunchyconeValue: value,
        isSecret: isSensitiveKey(key), // Always use local detection for the checkbox
        isRemoteSecret, // Track if it's actually a secret in CrunchyCone (for display)
      });
    }
  }

  // Sort alphabetically
  variables.sort((a, b) => a.key.localeCompare(b.key));

  return { variables, hasCrunchyConeConfig, isAuthenticated };
}

async function checkCrunchyConeAuth(): Promise<boolean> {
  try {
    const { execSync } = require("child_process");
    const result = execSync("npx --yes crunchycone-cli auth check --json", {
      stdio: "pipe",
      encoding: "utf8",
      timeout: 10000,
    });
    
    const response = JSON.parse(result);
    return response.data?.authenticated === true;
  } catch (error) {
    console.error("Failed to check CrunchyCone authentication:", error);
    return false;
  }
}

async function fetchCrunchyConeVariables(): Promise<{envVars: Record<string, string>, secrets: Record<string, string>}> {
  try {
    const { execSync } = require("child_process");
    
    // Fetch environment variables
    let envVars: Record<string, string> = {};
    try {
      const envResult = execSync("npx --yes crunchycone-cli env ls --json", {
        stdio: "pipe",
        encoding: "utf8",
        timeout: 10000,
      });
      
      const envResponse = JSON.parse(envResult);
      if (envResponse.success && envResponse.data && envResponse.data.variables) {
        for (const variable of envResponse.data.variables) {
          envVars[variable.key] = String(variable.value);
        }
      }
    } catch (error) {
      console.error("Failed to fetch CrunchyCone env vars:", error);
    }
    
    // Fetch secrets
    let secrets: Record<string, string> = {};
    try {
      const secretsResult = execSync("npx --yes crunchycone-cli secrets ls --json", {
        stdio: "pipe",
        encoding: "utf8",
        timeout: 10000,
      });
      
      const secretsResponse = JSON.parse(secretsResult);
      if (secretsResponse.success && secretsResponse.data && secretsResponse.data.secrets) {
        for (const [key, value] of Object.entries(secretsResponse.data.secrets)) {
          // For secrets, we just mark them as existing with a placeholder
          secrets[key] = "••••••••";
        }
      }
    } catch (error) {
      console.error("Failed to fetch CrunchyCone secrets:", error);
    }
    
    return { envVars, secrets };
  } catch (error) {
    console.error("Failed to fetch CrunchyCone data:", error);
    return { envVars: {}, secrets: {} };
  }
}

function parseEnvFile(content: string): Record<string, string> {
  const vars: Record<string, string> = {};
  const lines = content.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    // Find the first = character
    const equalIndex = trimmed.indexOf("=");
    if (equalIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, equalIndex).trim();
    let value = trimmed.slice(equalIndex + 1).trim();

    // Remove quotes if present
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    vars[key] = value;
  }

  return vars;
}

function isSensitiveKey(key: string): boolean {
  const sensitiveKeywords = [
    "secret", "password", "token", "auth", "private",
    "credential", "pass", "jwt", "oauth", "github", "google", "aws",
    "azure", "gcp", "stripe", "paypal", "database", "db", "redis",
    "session", "cookie", "smtp", "twilio", "sendgrid",
    "access", "client"
  ];

  // More specific CrunchyCone patterns that are actually secrets
  const crunchyconeSecretPatterns = [
    "crunchycone_api_key", "crunchycone_token", "crunchycone_secret",
    "crunchycone_auth", "crunchycone_password", "crunchycone_credential"
  ];

  const lowerKey = key.toLowerCase();
  
  
  // Check general sensitive keywords
  if (sensitiveKeywords.some(keyword => lowerKey.includes(keyword))) {
    return true;
  }
  
  // Check specific CrunchyCone secret patterns
  return crunchyconeSecretPatterns.some(pattern => lowerKey.includes(pattern));
}

async function updateEnvVariable(key: string, value: string): Promise<boolean> {
  try {
    const envFilePath = path.join(process.cwd(), ".env");
    
    if (!fs.existsSync(envFilePath)) {
      // Create .env file if it doesn't exist
      fs.writeFileSync(envFilePath, `${key}="${value}"\n`);
      return true;
    }

    const envContent = fs.readFileSync(envFilePath, "utf8");
    const lines = envContent.split("\n");
    let found = false;
    
    // Update existing variable or add new one
    const updatedLines = lines.map(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const equalIndex = trimmed.indexOf("=");
        if (equalIndex > 0) {
          const lineKey = trimmed.slice(0, equalIndex).trim();
          if (lineKey === key) {
            found = true;
            return `${key}="${value}"`;
          }
        }
      }
      return line;
    });

    // If not found, add to the end
    if (!found) {
      updatedLines.push(`${key}="${value}"`);
    }

    fs.writeFileSync(envFilePath, updatedLines.join("\n"));
    return true;
  } catch (error) {
    console.error("Error updating .env file:", error);
    return false;
  }
}

async function deleteEnvVariable(key: string): Promise<boolean> {
  try {
    const envFilePath = path.join(process.cwd(), ".env");
    
    if (!fs.existsSync(envFilePath)) {
      return true; // Nothing to delete
    }

    const envContent = fs.readFileSync(envFilePath, "utf8");
    const lines = envContent.split("\n");
    
    // Filter out the variable to delete
    const updatedLines = lines.filter(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const equalIndex = trimmed.indexOf("=");
        if (equalIndex > 0) {
          const lineKey = trimmed.slice(0, equalIndex).trim();
          return lineKey !== key;
        }
      }
      return true;
    });

    fs.writeFileSync(envFilePath, updatedLines.join("\n"));
    return true;
  } catch (error) {
    console.error("Error deleting from .env file:", error);
    return false;
  }
}

