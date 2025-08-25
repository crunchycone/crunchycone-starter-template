"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/permissions";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";

export type EmailProvider =
  | "console"
  | "sendgrid"
  | "resend"
  | "aws-ses"
  | "smtp"
  | "mailgun"
  | "crunchycone";

export interface EmailSettings {
  provider: EmailProvider;
  fromAddress: string;
  // Provider-specific settings
  sendgridApiKey?: string;
  resendApiKey?: string;
  awsAccessKeyId?: string;
  awsSecretAccessKey?: string;
  awsRegion?: string;
  smtpHost?: string;
  smtpPort?: string;
  smtpUser?: string;
  smtpPassword?: string;
  smtpSecure?: boolean;
  mailgunApiKey?: string;
  mailgunDomain?: string;
  mailgunHost?: string;
  crunchyconeApiKey?: string;
  crunchyconeApiUrl?: string;
  crunchyconeProjectId?: string;
  // Flags to indicate if values are set via environment (and should not be editable)
  isEnvCrunchyconeApiKey?: boolean;
  isEnvCrunchyconeApiUrl?: boolean;
  isEnvCrunchyconeProjectId?: boolean;
}

async function updateEnvFile(settings: EmailSettings) {
  const envPath = join(process.cwd(), ".env");

  try {
    let envContent = await readFile(envPath, "utf-8");

    // Helper function to update or add a variable
    const updateEnvVar = (varName: string, value: string) => {
      const regex = new RegExp(`^${varName}=.*$`, "m");
      const commentedRegex = new RegExp(`^# ${varName}=.*$`, "m");

      if (regex.test(envContent)) {
        // Replace existing active variable
        envContent = envContent.replace(regex, `${varName}="${value}"`);
      } else if (commentedRegex.test(envContent)) {
        // Replace existing commented variable
        envContent = envContent.replace(commentedRegex, `${varName}="${value}"`);
      } else {
        // Add new variable at the end
        envContent += `\n${varName}="${value}"`;
      }
    };

    // Update CRUNCHYCONE_EMAIL_PROVIDER
    updateEnvVar("CRUNCHYCONE_EMAIL_PROVIDER", settings.provider);

    // Update CRUNCHYCONE_EMAIL_FROM
    updateEnvVar("CRUNCHYCONE_EMAIL_FROM", settings.fromAddress);

    // Set provider-specific settings only for the selected provider
    switch (settings.provider) {
      case "sendgrid":
        if (settings.sendgridApiKey) {
          updateEnvVar("CRUNCHYCONE_SENDGRID_API_KEY", settings.sendgridApiKey);
        }
        break;
      case "resend":
        if (settings.resendApiKey) {
          updateEnvVar("CRUNCHYCONE_RESEND_API_KEY", settings.resendApiKey);
        }
        break;
      case "aws-ses":
        if (settings.awsAccessKeyId) {
          updateEnvVar("CRUNCHYCONE_AWS_ACCESS_KEY_ID", settings.awsAccessKeyId);
        }
        if (settings.awsSecretAccessKey) {
          updateEnvVar("CRUNCHYCONE_AWS_SECRET_ACCESS_KEY", settings.awsSecretAccessKey);
        }
        if (settings.awsRegion) {
          updateEnvVar("CRUNCHYCONE_AWS_REGION", settings.awsRegion);
        }
        break;
      case "smtp":
        if (settings.smtpHost) {
          updateEnvVar("CRUNCHYCONE_SMTP_HOST", settings.smtpHost);
        }
        if (settings.smtpPort) {
          updateEnvVar("CRUNCHYCONE_SMTP_PORT", settings.smtpPort);
        }
        if (settings.smtpUser) {
          updateEnvVar("CRUNCHYCONE_SMTP_USER", settings.smtpUser);
        }
        if (settings.smtpPassword) {
          updateEnvVar("CRUNCHYCONE_SMTP_PASS", settings.smtpPassword);
        }
        if (settings.smtpSecure !== undefined) {
          updateEnvVar("CRUNCHYCONE_SMTP_SECURE", settings.smtpSecure.toString());
        }
        break;
      case "mailgun":
        if (settings.mailgunApiKey) {
          updateEnvVar("CRUNCHYCONE_MAILGUN_API_KEY", settings.mailgunApiKey);
        }
        if (settings.mailgunDomain) {
          updateEnvVar("CRUNCHYCONE_MAILGUN_DOMAIN", settings.mailgunDomain);
        }
        if (settings.mailgunHost) {
          updateEnvVar("CRUNCHYCONE_MAILGUN_HOST", settings.mailgunHost);
        }
        break;
      case "crunchycone":
        // Only update values that are not set via environment variables
        if (settings.crunchyconeApiKey && !settings.isEnvCrunchyconeApiKey) {
          updateEnvVar("CRUNCHYCONE_API_KEY", settings.crunchyconeApiKey);
        }
        if (settings.crunchyconeApiUrl && !settings.isEnvCrunchyconeApiUrl) {
          updateEnvVar("CRUNCHYCONE_API_URL", settings.crunchyconeApiUrl);
        }
        if (settings.crunchyconeProjectId && !settings.isEnvCrunchyconeProjectId) {
          updateEnvVar("CRUNCHYCONE_PROJECT_ID", settings.crunchyconeProjectId);
        }
        break;
    }

    await writeFile(envPath, envContent);
  } catch (error) {
    console.error("Failed to update .env file:", error);
    throw new Error("Failed to update email settings");
  }
}

export async function updateEmailSettings(formData: FormData) {
  await requireRole("admin");

  const provider = formData.get("provider") as EmailProvider;
  const fromAddress = formData.get("fromAddress") as string;

  if (!provider || !fromAddress) {
    throw new Error("Provider and from address are required");
  }

  const settings: EmailSettings = {
    provider,
    fromAddress,
  };

  // Get provider-specific settings
  switch (provider) {
    case "sendgrid":
      settings.sendgridApiKey = formData.get("sendgridApiKey") as string;
      break;
    case "resend":
      settings.resendApiKey = formData.get("resendApiKey") as string;
      break;
    case "aws-ses":
      settings.awsAccessKeyId = formData.get("awsAccessKeyId") as string;
      settings.awsSecretAccessKey = formData.get("awsSecretAccessKey") as string;
      settings.awsRegion = formData.get("awsRegion") as string;
      break;
    case "smtp":
      settings.smtpHost = formData.get("smtpHost") as string;
      settings.smtpPort = formData.get("smtpPort") as string;
      settings.smtpUser = formData.get("smtpUser") as string;
      settings.smtpPassword = formData.get("smtpPassword") as string;
      settings.smtpSecure = formData.get("smtpSecure") === "true";
      break;
    case "mailgun":
      settings.mailgunApiKey = formData.get("mailgunApiKey") as string;
      settings.mailgunDomain = formData.get("mailgunDomain") as string;
      settings.mailgunHost = (formData.get("mailgunHost") as string) || "api.mailgun.net";
      break;
    case "crunchycone":
      settings.crunchyconeApiKey = formData.get("crunchyconeApiKey") as string;
      settings.crunchyconeApiUrl = formData.get("crunchyconeApiUrl") as string;
      settings.crunchyconeProjectId = formData.get("crunchyconeProjectId") as string;
      break;
  }

  await updateEnvFile(settings);

  revalidatePath("/admin/settings");
  redirect("/admin/settings?updated=true");
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

export async function getCurrentEmailSettings(): Promise<EmailSettings> {
  const envVars = await readEnvFile();

  // Check if CrunchyCone settings are set via environment variables (not .env file)
  const isEnvCrunchyconeApiKey = !envVars.CRUNCHYCONE_API_KEY && !!process.env.CRUNCHYCONE_API_KEY;
  const isEnvCrunchyconeApiUrl = !envVars.CRUNCHYCONE_API_URL && !!process.env.CRUNCHYCONE_API_URL;
  const isEnvCrunchyconeProjectId =
    !envVars.CRUNCHYCONE_PROJECT_ID && !!process.env.CRUNCHYCONE_PROJECT_ID;

  return {
    provider:
      (envVars.CRUNCHYCONE_EMAIL_PROVIDER as EmailProvider) ||
      (process.env.CRUNCHYCONE_EMAIL_PROVIDER as EmailProvider) ||
      "console",
    fromAddress:
      envVars.CRUNCHYCONE_EMAIL_FROM ||
      process.env.CRUNCHYCONE_EMAIL_FROM ||
      envVars.EMAIL_FROM ||
      process.env.EMAIL_FROM ||
      "noreply@example.com",
    sendgridApiKey:
      envVars.CRUNCHYCONE_SENDGRID_API_KEY || process.env.CRUNCHYCONE_SENDGRID_API_KEY,
    resendApiKey: envVars.CRUNCHYCONE_RESEND_API_KEY || process.env.CRUNCHYCONE_RESEND_API_KEY,
    awsAccessKeyId:
      envVars.CRUNCHYCONE_AWS_ACCESS_KEY_ID || process.env.CRUNCHYCONE_AWS_ACCESS_KEY_ID,
    awsSecretAccessKey:
      envVars.CRUNCHYCONE_AWS_SECRET_ACCESS_KEY || process.env.CRUNCHYCONE_AWS_SECRET_ACCESS_KEY,
    awsRegion: envVars.CRUNCHYCONE_AWS_REGION || process.env.CRUNCHYCONE_AWS_REGION,
    smtpHost: envVars.CRUNCHYCONE_SMTP_HOST || process.env.CRUNCHYCONE_SMTP_HOST,
    smtpPort: envVars.CRUNCHYCONE_SMTP_PORT || process.env.CRUNCHYCONE_SMTP_PORT,
    smtpUser: envVars.CRUNCHYCONE_SMTP_USER || process.env.CRUNCHYCONE_SMTP_USER,
    smtpPassword: envVars.CRUNCHYCONE_SMTP_PASS || process.env.CRUNCHYCONE_SMTP_PASS,
    smtpSecure: (envVars.CRUNCHYCONE_SMTP_SECURE || process.env.CRUNCHYCONE_SMTP_SECURE) === "true",
    mailgunApiKey: envVars.CRUNCHYCONE_MAILGUN_API_KEY || process.env.CRUNCHYCONE_MAILGUN_API_KEY,
    mailgunDomain: envVars.CRUNCHYCONE_MAILGUN_DOMAIN || process.env.CRUNCHYCONE_MAILGUN_DOMAIN,
    mailgunHost: envVars.CRUNCHYCONE_MAILGUN_HOST || process.env.CRUNCHYCONE_MAILGUN_HOST,
    crunchyconeApiKey: envVars.CRUNCHYCONE_API_KEY || process.env.CRUNCHYCONE_API_KEY,
    crunchyconeApiUrl: envVars.CRUNCHYCONE_API_URL || process.env.CRUNCHYCONE_API_URL,
    crunchyconeProjectId: envVars.CRUNCHYCONE_PROJECT_ID || process.env.CRUNCHYCONE_PROJECT_ID,
    // Environment flags
    isEnvCrunchyconeApiKey,
    isEnvCrunchyconeApiUrl,
    isEnvCrunchyconeProjectId,
  };
}
