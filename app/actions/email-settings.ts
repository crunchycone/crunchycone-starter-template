"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/permissions";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { auth } from "@/lib/auth";
import { sendEmail, setEmailProvider, ConsoleEmailProvider, EmailProvider as TemplateEmailProvider } from "@/lib/email/email";
import { createEmailService } from "crunchycone-lib";

const execAsync = promisify(exec);

// Temporary email provider for testing configurations
class TestEmailProvider implements TemplateEmailProvider {
  constructor(private settings: EmailSettings) {}

  async sendEmail(options: { to: string; subject: string; html: string; text?: string; from?: string }): Promise<void> {
    // Build provider-specific configuration for crunchycone-lib
    let providerConfig: any = {};
    
    switch (this.settings.provider) {
      case "smtp":
        providerConfig = {
          host: this.settings.smtpHost,
          port: parseInt(this.settings.smtpPort || "587"),
          secure: this.settings.smtpPort === "465",
          auth: {
            user: this.settings.smtpUser,
            pass: this.settings.smtpPassword,
          },
        };
        break;
      case "sendgrid":
        providerConfig = {
          apiKey: this.settings.sendgridApiKey,
        };
        break;
      case "resend":
        providerConfig = {
          apiKey: this.settings.resendApiKey,
        };
        break;
      case "aws-ses":
        providerConfig = {
          region: this.settings.awsRegion,
          accessKeyId: this.settings.awsAccessKeyId,
          secretAccessKey: this.settings.awsSecretAccessKey,
        };
        break;
      case "mailgun":
        providerConfig = {
          apiKey: this.settings.mailgunApiKey,
          domain: this.settings.mailgunDomain,
        };
        break;
      case "crunchycone":
        // CrunchyCone uses CLI authentication, no config needed
        providerConfig = {};
        break;
    }

    // Try to send actual email using crunchycone-lib
    try {
      // For now, let's set environment variables temporarily for the SMTP provider
      if (this.settings.provider === 'smtp') {
        process.env.SMTP_HOST = this.settings.smtpHost;
        process.env.SMTP_PORT = this.settings.smtpPort;
        process.env.SMTP_USER = this.settings.smtpUser;
        process.env.SMTP_PASS = this.settings.smtpPassword;
        process.env.EMAIL_FROM = this.settings.fromAddress;
      }
      
      const emailService = createEmailService(this.settings.provider as any);
      const result = await emailService.sendEmail({
        from: {
          email: this.settings.fromAddress,
          name: this.settings.fromDisplayName || "Test Email",
        },
        to: [
          {
            email: options.to,
            name: "Test Recipient",
          },
        ],
        subject: options.subject,
        htmlBody: options.html,
        textBody: options.text || options.html,
        providerSettings: {
          provider: this.settings.provider,
          ...providerConfig,
        },
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to send email");
      }

      console.log("=== EMAIL SENT SUCCESSFULLY ===");
      console.log(`Provider: ${this.settings.provider.toUpperCase()}`);
      console.log(`From: ${this.settings.fromAddress} ${this.settings.fromDisplayName ? `(${this.settings.fromDisplayName})` : ''}`);
      console.log(`To: ${options.to}`);
      console.log(`Subject: ${options.subject}`);
      console.log(`✅ Email sent successfully using ${this.settings.provider.toUpperCase()}`);
      console.log("===============================");
    } catch (error) {
      // Log the error and fall back to configuration validation
      console.error("Email sending failed:", error);
      
      console.log("=== EMAIL TEST CONFIGURATION (Fallback) ===");
      console.log(`Provider: ${this.settings.provider.toUpperCase()}`);
      console.log(`From: ${this.settings.fromAddress} ${this.settings.fromDisplayName ? `(${this.settings.fromDisplayName})` : ''}`);
      console.log(`To: ${options.to}`);
      console.log(`Subject: ${options.subject}`);
      
      // Show provider-specific configuration status
      switch (this.settings.provider) {
        case "console":
          console.log("Console Mode: Emails will be logged to console");
          break;
        case "smtp":
          console.log(`SMTP Host: ${this.settings.smtpHost || '[NOT SET]'}`);
          console.log(`SMTP Port: ${this.settings.smtpPort || '[NOT SET]'}`);
          console.log(`SMTP User: ${this.settings.smtpUser || '[NOT SET]'}`);
          console.log(`SMTP Password: ${this.settings.smtpPassword ? '[SET]' : '[NOT SET]'}`);
          break;
        case "sendgrid":
          console.log(`SendGrid API Key: ${this.settings.sendgridApiKey ? '[SET]' : '[NOT SET]'}`);
          break;
        case "resend":
          console.log(`Resend API Key: ${this.settings.resendApiKey ? '[SET]' : '[NOT SET]'}`);
          break;
        case "aws-ses":
          console.log(`AWS Region: ${this.settings.awsRegion || '[NOT SET]'}`);
          console.log(`AWS Access Key ID: ${this.settings.awsAccessKeyId ? '[SET]' : '[NOT SET]'}`);
          console.log(`AWS Secret Access Key: ${this.settings.awsSecretAccessKey ? '[SET]' : '[NOT SET]'}`);
          break;
        case "mailgun":
          console.log(`Mailgun API Key: ${this.settings.mailgunApiKey ? '[SET]' : '[NOT SET]'}`);
          console.log(`Mailgun Domain: ${this.settings.mailgunDomain || '[NOT SET]'}`);
          break;
        case "crunchycone":
          console.log("CrunchyCone: Uses CLI authentication");
          break;
      }
      
      console.log("--- Email Content ---");
      console.log(options.text || options.html);
      console.log("==========================================");
      console.log(`⚠️  Email configuration validated for ${this.settings.provider.toUpperCase()}`);
      console.log("Error occurred during actual email sending - check configuration");
      
      // Re-throw the error so the UI shows the failure
      throw error;
    }
  }
}

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
  fromDisplayName?: string;
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

    // Update CRUNCHYCONE_EMAIL_FROM_DISPLAY (optional)
    if (settings.fromDisplayName) {
      updateEnvVar("CRUNCHYCONE_EMAIL_FROM_DISPLAY", settings.fromDisplayName);
    }

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

export async function updateEmailSettings(formDataOrSettings: FormData | EmailSettings) {
  await requireRole("admin");

  let settings: EmailSettings;

  if (formDataOrSettings instanceof FormData) {
    // Handle FormData input
    const formData = formDataOrSettings;
    const provider = formData.get("provider") as EmailProvider;
    const fromAddress = formData.get("fromAddress") as string;
    const fromDisplayName = formData.get("fromDisplayName") as string || undefined;

    if (!provider || !fromAddress) {
      return { success: false, message: "Provider and from address are required" };
    }

    settings = { provider, fromAddress, fromDisplayName };

    // Get provider-specific settings from FormData
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
  } else {
    // Handle EmailSettings object input
    settings = formDataOrSettings;
    
    if (!settings.provider || !settings.fromAddress) {
      return { success: false, message: "Provider and from address are required" };
    }
  }

  try {
    await updateEnvFile(settings);
    revalidatePath("/admin/settings");
    
    return {
      success: true,
      message: "Email settings updated successfully. Restart the application for changes to take effect.",
    };
  } catch (error) {
    console.error("Failed to update email settings:", error);
    return {
      success: false,
      message: "Failed to update email settings",
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
    fromDisplayName:
      envVars.CRUNCHYCONE_EMAIL_FROM_DISPLAY ||
      process.env.CRUNCHYCONE_EMAIL_FROM_DISPLAY ||
      undefined,
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

export async function testEmailConfiguration(settings: EmailSettings) {
  await requireRole("admin");

  try {
    // Basic validation
    if (!settings.fromAddress || !settings.provider) {
      return {
        success: false,
        message: "From address and provider are required",
      };
    }

    // Provider-specific validation
    switch (settings.provider) {
      case "console":
        // Console provider always works
        break;
      
      case "sendgrid":
        if (!settings.sendgridApiKey) {
          return { success: false, message: "SendGrid API key is required" };
        }
        break;
      
      case "resend":
        if (!settings.resendApiKey) {
          return { success: false, message: "Resend API key is required" };
        }
        break;
      
      case "aws-ses":
        if (!settings.awsAccessKeyId || !settings.awsSecretAccessKey || !settings.awsRegion) {
          return { success: false, message: "AWS credentials and region are required" };
        }
        break;
      
      case "smtp":
        if (!settings.smtpHost || !settings.smtpPort || !settings.smtpUser || !settings.smtpPassword) {
          return { success: false, message: "SMTP host, port, username, and password are required" };
        }
        break;
      
      case "mailgun":
        if (!settings.mailgunApiKey || !settings.mailgunDomain) {
          return { success: false, message: "Mailgun API key and domain are required" };
        }
        break;
      
      case "crunchycone":
        // CrunchyCone uses CLI authentication, no API key needed
        break;
      
      default:
        return { success: false, message: "Unknown email provider" };
    }

    // Send actual test email using the current configuration
    try {
      const session = await auth();
      if (!session?.user?.email) {
        return {
          success: false,
          message: "No authenticated user found to send test email to",
        };
      }

      // For console provider, just validate and show what would be sent
      if (settings.provider === "console") {
        console.log("=== TEST EMAIL (Console Mode) ===");
        console.log(`Provider: ${settings.provider}`);
        console.log(`From: ${settings.fromAddress} ${settings.fromDisplayName ? `(${settings.fromDisplayName})` : ''}`);
        console.log(`To: ${session.user.email}`);
        console.log(`Subject: Email Configuration Test - ${settings.provider.toUpperCase()}`);
        console.log("--- Email would be logged here in production ---");
        console.log("=====================================");
        
        return {
          success: true,
          message: `Console mode test successful - check server logs for email details`,
        };
      }

      // Create test email content using template pattern
      const testEmailContent = {
        to: session.user.email,
        subject: `Email Configuration Test - ${settings.provider.toUpperCase()}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Email Configuration Test</h2>
            <p>Congratulations! Your ${settings.provider} email configuration is working correctly.</p>
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Provider:</strong> ${settings.provider}</p>
              <p><strong>From:</strong> ${settings.fromAddress}</p>
              <p><strong>To:</strong> ${session.user.email}</p>
            </div>
            <p>This is a test email sent from your application to verify the email configuration.</p>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
            <p style="color: #666; font-size: 14px;">Sent at: ${new Date().toISOString()}</p>
          </div>
        `,
        text: `
Email Configuration Test

Congratulations! Your ${settings.provider} email configuration is working correctly.

Provider: ${settings.provider}
From: ${settings.fromAddress}  
To: ${session.user.email}

This is a test email sent from your application to verify the email configuration.

Sent at: ${new Date().toISOString()}
        `.trim(),
      };

      // Store current email provider
      const originalProvider = new ConsoleEmailProvider(); // Default fallback
      
      // Temporarily set up the test email provider with current settings
      const testProvider = new TestEmailProvider(settings);
      setEmailProvider(testProvider);
      
      try {
        // Send email using the template's sendEmail function with test provider
        await sendEmail(testEmailContent);
        
        return {
          success: true,
          message: `Test email sent successfully to ${session.user.email} using ${settings.provider}`,
        };
      } finally {
        // Restore original provider
        setEmailProvider(originalProvider);
      }
    } catch (error) {
      console.error("Email test error:", error);
      return {
        success: false,
        message: `Failed to send test email: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }

  } catch (error) {
    console.error("Email configuration test error:", error);
    return {
      success: false,
      message: "Failed to test email configuration",
    };
  }
}

export async function checkEmailProviderAvailability(provider: EmailProvider): Promise<{ success: boolean; available: boolean; message: string }> {
  await requireRole("admin");

  try {
    let available = false;
    
    switch (provider) {
      case 'sendgrid':
        try {
          await import('@sendgrid/mail');
          available = true;
        } catch (error) {
          available = false;
        }
        break;
      case 'resend':
        try {
          await import('resend');
          available = true;
        } catch (error) {
          available = false;
        }
        break;
      case 'aws-ses':
        // AWS SES requires @aws-sdk/client-ses package
        available = false;
        break;
      default:
        // For other providers (console, smtp, mailgun, crunchycone), assume they're available
        available = true;
    }
    
    return {
      success: true,
      available,
      message: available ? `${provider} is available` : `${provider} is not available - missing dependencies`
    };
  } catch (error) {
    console.error(`Error checking ${provider} availability:`, error);
    return {
      success: false,
      available: false,
      message: `Failed to check ${provider} availability`
    };
  }
}

export async function checkCrunchyConeAuth() {
  await requireRole("admin");

  try {
    const { stdout, stderr } = await execAsync("npx --yes crunchycone-cli auth check -j");
    
    if (stderr) {
      console.error("CrunchyCone CLI stderr:", stderr);
    }

    try {
      const result = JSON.parse(stdout);
      const authenticated = result.data?.authenticated || result.authenticated || false;
      const user = result.data?.user || result.user || null;
      
      return {
        success: true,
        authenticated: !!authenticated,
        user: user,
        message: authenticated 
          ? "Successfully authenticated with CrunchyCone" 
          : "Not authenticated with CrunchyCone",
      };
    } catch (parseError) {
      // If JSON parsing fails, check if stdout contains success indicators
      const isAuthenticated = stdout.includes("authenticated") && 
                             !stdout.includes("not authenticated") &&
                             !stdout.includes("unauthenticated");
      
      return {
        success: true,
        authenticated: isAuthenticated,
        user: null,
        message: isAuthenticated 
          ? "Successfully authenticated with CrunchyCone"
          : "Not authenticated with CrunchyCone",
      };
    }
  } catch (error: any) {
    // When not authenticated, the CLI returns non-zero exit code but may have JSON in stderr
    if (error.stderr) {
      try {
        const result = JSON.parse(error.stderr);
        return {
          success: true,
          authenticated: false,
          user: null,
          message: result.message || "Not authenticated with CrunchyCone",
        };
      } catch (parseError) {
        // Ignore parse error and continue to generic error handling
      }
    }
    
    console.error("Failed to check CrunchyCone auth:", error);
    return {
      success: false,
      authenticated: false,
      user: null,
      message: "Failed to check CrunchyCone authentication status. Make sure crunchycone-cli is installed.",
    };
  }
}
