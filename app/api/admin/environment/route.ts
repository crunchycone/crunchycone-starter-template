import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/auth/permissions";
import { getEnvironmentService } from "@/lib/environment-service";
import { getCrunchyConeAuthService } from "@/lib/crunchycone-auth-service";

// Force dynamic rendering
export const dynamic = "force-dynamic";

// Helper function to determine if a key is sensitive
function isSensitiveKey(key: string): boolean {
  const sensitiveKeywords = [
    "secret", "key", "password", "token", "auth", "api", "private", 
    "credential", "pass", "jwt", "oauth", "github", "google", "aws", 
    "azure", "gcp", "stripe", "paypal", "database", "db", "redis", 
    "session", "cookie", "smtp", "email", "twilio", "sendgrid", 
    "crunchycone", "do", "spaces", "bucket", "access", "client"
  ];
  const lowerKey = key.toLowerCase();
  return sensitiveKeywords.some(keyword => lowerKey.includes(keyword));
}

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

    // Get the unified environment service (automatically detects platform vs local)
    const envService = getEnvironmentService();
    const providerInfo = envService.getProviderInfo();

    // On production local (not platform), restrict access for security
    const isProduction = process.env.NODE_ENV === "production";
    if (isProduction && !providerInfo.isPlatformEnvironment) {
      return NextResponse.json(
        { error: "Environment variables are not available in local production mode" },
        { status: 403 }
      );
    }

    // Check CrunchyCone authentication for platform environments
    let crunchyConeAuth: { isAuthenticated: boolean; source: "api" | "cli" | "unknown" } = { 
      isAuthenticated: false, 
      source: "unknown"
    };

    // Only check auth if we're using remote provider (platform environment)
    if (providerInfo.type === "remote") {
      try {
        const authService = getCrunchyConeAuthService();
        const authResult = await authService.checkAuthentication();
        crunchyConeAuth = {
          isAuthenticated: authResult.success,
          source: authResult.source || "unknown",
        };
      } catch {
        // Auth check failed, return error for platform environments
        return NextResponse.json(
          { error: "CrunchyCone authentication required for platform environment" },
          { status: 401 }
        );
      }

      if (!crunchyConeAuth.isAuthenticated) {
        return NextResponse.json(
          { error: "Not authenticated with CrunchyCone platform" },
          { status: 401 }
        );
      }
    }

    let variables: Array<{
      key: string;
      localValue: string;
      isSecret: boolean;
      crunchyconeValue?: string;
      isRemoteSecret?: boolean;
    }> = [];

    try {
      // Get environment variables using the unified service
      const envVars = await envService.listEnvVars();
      
      // If platform environment and supports secrets, also get secrets
      let secretNames: string[] = [];
      if (providerInfo.isPlatformEnvironment && providerInfo.supportsSecrets) {
        secretNames = await envService.listSecretNames();
      }

      // Convert environment variables to array format
      const envEntries = Object.entries(envVars).map(([key, value]) => ({
        key,
        localValue: providerInfo.isPlatformEnvironment ? "" : (value || ""), // Local value only for local provider
        crunchyconeValue: providerInfo.isPlatformEnvironment ? (value || "") : undefined, // Platform value only for platform provider
        isSecret: !providerInfo.isPlatformEnvironment && isSensitiveKey(key), // Local sensitive detection
        isRemoteSecret: false,
      }));

      // Convert secrets to array format (values are hidden)
      const secretEntries = secretNames.map((key) => ({
        key,
        localValue: "",
        crunchyconeValue: "••••••••", // Masked value for secrets
        isSecret: true,
        isRemoteSecret: true,
      }));

      // Combine environment variables and secrets
      variables = [...envEntries, ...secretEntries];
      
      // Sort alphabetically by key
      variables.sort((a, b) => a.key.localeCompare(b.key));
      
    } catch (error) {
      console.error("Failed to fetch environment variables:", error);
      return NextResponse.json(
        { error: "Failed to fetch environment variables" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      variables,
      platform: {
        type: providerInfo.type,
        isPlatformEnvironment: providerInfo.isPlatformEnvironment,
        supportsSecrets: providerInfo.supportsSecrets,
        isUsingPlatformAPI: providerInfo.isPlatformEnvironment,
      },
      crunchyConeAuth,
      hasCrunchyConeConfig: providerInfo.type === "remote" || crunchyConeAuth.isAuthenticated,
      isAuthenticated: providerInfo.type === "local" || crunchyConeAuth.isAuthenticated,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching environment variables:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
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

    // Get the unified environment service
    const envService = getEnvironmentService();
    const providerInfo = envService.getProviderInfo();

    // On production local (not platform), restrict access for security
    const isProduction = process.env.NODE_ENV === "production";
    if (isProduction && !providerInfo.isPlatformEnvironment) {
      return NextResponse.json(
        { error: "Environment variable editing is not available in local production mode" },
        { status: 403 }
      );
    }

    // Check CrunchyCone authentication for platform environments
    if (providerInfo.type === "remote") {
      try {
        const authService = getCrunchyConeAuthService();
        const authResult = await authService.checkAuthentication();
        if (!authResult.success) {
          return NextResponse.json(
            { error: "Not authenticated with CrunchyCone platform" },
            { status: 401 }
          );
        }
      } catch {
        return NextResponse.json(
          { error: "CrunchyCone authentication required for platform environment" },
          { status: 401 }
        );
      }
    }

    const { key, value } = await request.json();

    if (!key) {
      return NextResponse.json({ error: "Variable key is required" }, { status: 400 });
    }

    // Update environment variable using unified service
    await envService.setEnvVar(key, value);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating environment variable:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
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

    // Get the unified environment service
    const envService = getEnvironmentService();
    const providerInfo = envService.getProviderInfo();

    // On production local (not platform), restrict access for security
    const isProduction = process.env.NODE_ENV === "production";
    if (isProduction && !providerInfo.isPlatformEnvironment) {
      return NextResponse.json(
        { error: "Environment variable deletion is not available in local production mode" },
        { status: 403 }
      );
    }

    // Check CrunchyCone authentication for platform environments
    if (providerInfo.type === "remote") {
      try {
        const authService = getCrunchyConeAuthService();
        const authResult = await authService.checkAuthentication();
        if (!authResult.success) {
          return NextResponse.json(
            { error: "Not authenticated with CrunchyCone platform" },
            { status: 401 }
          );
        }
      } catch {
        return NextResponse.json(
          { error: "CrunchyCone authentication required for platform environment" },
          { status: 401 }
        );
      }
    }

    const { key } = await request.json();

    if (!key) {
      return NextResponse.json({ error: "Variable key is required" }, { status: 400 });
    }

    // Delete environment variable using unified service
    await envService.deleteEnvVar(key);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting environment variable:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
