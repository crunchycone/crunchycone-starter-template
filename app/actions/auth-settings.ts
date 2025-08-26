"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/permissions";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";

export interface AuthSettings {
  enableEmailPassword: boolean;
  enableMagicLink: boolean;
  enableGoogleAuth: boolean;
  enableGithubAuth: boolean;
  googleClientId?: string;
  googleClientSecret?: string;
  githubClientId?: string;
  githubClientSecret?: string;
}

async function updateEnvFile(settings: AuthSettings) {
  const envPath = join(process.cwd(), ".env");

  try {
    let envContent = await readFile(envPath, "utf-8");

    // Helper function to update or add a variable
    const updateEnvVar = (varName: string, value: string) => {
      const regex = new RegExp(`^${varName}=.*$`, "m");
      const commentedRegex = new RegExp(`^# ${varName}=.*$`, "m");

      if (regex.test(envContent)) {
        // Replace existing active variable
        envContent = envContent.replace(regex, `${varName}=${value}`);
      } else if (commentedRegex.test(envContent)) {
        // Replace existing commented variable
        envContent = envContent.replace(commentedRegex, `${varName}=${value}`);
      } else {
        // Add new variable at the end
        envContent += `\n${varName}=${value}`;
      }
    };

    // Update authentication provider toggles
    updateEnvVar("NEXT_PUBLIC_ENABLE_EMAIL_PASSWORD", settings.enableEmailPassword.toString());
    updateEnvVar("NEXT_PUBLIC_ENABLE_MAGIC_LINK", settings.enableMagicLink.toString());
    updateEnvVar("NEXT_PUBLIC_ENABLE_GOOGLE_AUTH", settings.enableGoogleAuth.toString());
    updateEnvVar("NEXT_PUBLIC_ENABLE_GITHUB_AUTH", settings.enableGithubAuth.toString());

    // Update OAuth credentials only if they are provided and not empty
    if (settings.googleClientId && settings.googleClientId.trim() !== "") {
      updateEnvVar("GOOGLE_CLIENT_ID", `"${settings.googleClientId}"`);
    }
    if (settings.googleClientSecret && settings.googleClientSecret.trim() !== "") {
      updateEnvVar("GOOGLE_CLIENT_SECRET", `"${settings.googleClientSecret}"`);
    }

    if (settings.githubClientId && settings.githubClientId.trim() !== "") {
      updateEnvVar("GITHUB_CLIENT_ID", `"${settings.githubClientId}"`);
    }
    if (settings.githubClientSecret && settings.githubClientSecret.trim() !== "") {
      updateEnvVar("GITHUB_CLIENT_SECRET", `"${settings.githubClientSecret}"`);
    }

    await writeFile(envPath, envContent);
  } catch (error) {
    console.error("Failed to update .env file:", error);
    throw new Error("Failed to update authentication settings");
  }
}

export async function updateAuthSettings(settings: AuthSettings) {
  await requireRole("admin");

  try {
    await updateEnvFile(settings);
    revalidatePath("/admin/settings");

    return {
      success: true,
      message: "Authentication settings updated successfully",
    };
  } catch (error) {
    console.error("Failed to update authentication settings:", error);
    return {
      success: false,
      message: "Failed to update authentication settings",
    };
  }
}

async function readEnvFile(): Promise<Record<string, string>> {
  const envPath = join(process.cwd(), ".env");

  try {
    const envContent = await readFile(envPath, "utf-8");
    const envVars: Record<string, string> = {};

    // Parse .env file
    const lines = envContent.split("\n");
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith("#")) {
        const [key, ...valueParts] = trimmedLine.split("=");
        if (key && valueParts.length > 0) {
          let value = valueParts.join("=");

          // Remove inline comments (anything after # that's not inside quotes)
          const commentIndex = value.indexOf("#");
          if (commentIndex !== -1) {
            // Check if # is inside quotes
            const beforeComment = value.substring(0, commentIndex);
            const openQuotes = (beforeComment.match(/"/g) || []).length;
            const openSingleQuotes = (beforeComment.match(/'/g) || []).length;

            // If # is not inside quotes, remove everything from # onwards
            if (openQuotes % 2 === 0 && openSingleQuotes % 2 === 0) {
              value = value.substring(0, commentIndex).trim();
            }
          }

          // Remove quotes if present
          if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
          ) {
            value = value.slice(1, -1);
          }

          envVars[key.trim()] = value.trim();
        }
      }
    }

    return envVars;
  } catch (error) {
    console.error("Failed to read .env file:", error);
    return {};
  }
}

export async function getCurrentAuthSettings(): Promise<AuthSettings> {
  const envVars = await readEnvFile();

  return {
    enableEmailPassword:
      (envVars.NEXT_PUBLIC_ENABLE_EMAIL_PASSWORD ||
        process.env.NEXT_PUBLIC_ENABLE_EMAIL_PASSWORD) === "true",
    enableMagicLink:
      (envVars.NEXT_PUBLIC_ENABLE_MAGIC_LINK || process.env.NEXT_PUBLIC_ENABLE_MAGIC_LINK) ===
      "true",
    enableGoogleAuth:
      (envVars.NEXT_PUBLIC_ENABLE_GOOGLE_AUTH || process.env.NEXT_PUBLIC_ENABLE_GOOGLE_AUTH) ===
      "true",
    enableGithubAuth:
      (envVars.NEXT_PUBLIC_ENABLE_GITHUB_AUTH || process.env.NEXT_PUBLIC_ENABLE_GITHUB_AUTH) ===
      "true",
    googleClientId: envVars.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID,
    googleClientSecret: envVars.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET,
    githubClientId: envVars.GITHUB_CLIENT_ID || process.env.GITHUB_CLIENT_ID,
    githubClientSecret: envVars.GITHUB_CLIENT_SECRET || process.env.GITHUB_CLIENT_SECRET,
  };
}
