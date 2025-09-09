import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/auth/permissions";
import {
  getAllEnvironmentVariables,
  updateEnvironmentVariables,
  getEnvironmentServiceInfo,
  isOnCrunchyConePlatform,
} from "@/lib/environment-service";
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

    // Check platform and provide appropriate access
    const platformInfo = getEnvironmentServiceInfo();
    const isProduction = process.env.NODE_ENV === "production";

    // On platform, always allow access (managed environment)
    // In local production, restrict for security
    if (isProduction && !isOnCrunchyConePlatform()) {
      return NextResponse.json(
        { error: "Environment variables are not available in local production mode" },
        { status: 403 }
      );
    }

    // Get environment data using unified service
    const variablesObject = await getAllEnvironmentVariables();

    // Convert object to array format expected by client
    const variables = Object.entries(variablesObject).map(([key, value]) => ({
      key,
      localValue: value || "",
      isSecret: isSensitiveKey(key),
      // TODO: Add CrunchyCone remote values when implemented
      crunchyconeValue: undefined,
      isRemoteSecret: false,
    }));

    // Check CrunchyCone authentication if needed
    let crunchyConeAuth: { isAuthenticated: boolean; source: "api" | "cli" | "unknown" } = { 
      isAuthenticated: false, 
      source: "unknown"
    };
    try {
      const authService = getCrunchyConeAuthService();
      const authResult = await authService.checkAuthentication();
      crunchyConeAuth = {
        isAuthenticated: authResult.success,
        source: authResult.source || "unknown",
      };
    } catch {
      // Auth check failed, keep defaults
    }

    return NextResponse.json({
      variables,
      platform: {
        type: platformInfo.type,
        isPlatformEnvironment: platformInfo.isPlatformEnvironment,
        supportsSecrets: platformInfo.supportsSecrets,
      },
      crunchyConeAuth,
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

    // Check platform and provide appropriate access
    const isProduction = process.env.NODE_ENV === "production";

    // On platform, always allow access (managed environment)
    // In local production, restrict for security
    if (isProduction && !isOnCrunchyConePlatform()) {
      return NextResponse.json(
        { error: "Environment variable editing is not available in local production mode" },
        { status: 403 }
      );
    }

    const { key, value } = await request.json();

    if (!key) {
      return NextResponse.json({ error: "Variable key is required" }, { status: 400 });
    }

    // Update environment variable using unified service
    const result = await updateEnvironmentVariables({ [key]: value });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to update environment variable" },
        { status: 500 }
      );
    }

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

    // Check platform and provide appropriate access
    const isProduction = process.env.NODE_ENV === "production";

    // On platform, always allow access (managed environment)
    // In local production, restrict for security
    if (isProduction && !isOnCrunchyConePlatform()) {
      return NextResponse.json(
        { error: "Environment variable deletion is not available in local production mode" },
        { status: 403 }
      );
    }

    const { key } = await request.json();

    if (!key) {
      return NextResponse.json({ error: "Variable key is required" }, { status: 400 });
    }

    // Delete environment variable using unified service
    const result = await updateEnvironmentVariables({ [key]: undefined });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to delete environment variable" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting environment variable:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
