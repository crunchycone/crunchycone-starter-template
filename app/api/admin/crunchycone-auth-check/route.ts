import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/permissions";
import { exec } from "child_process";
import { promisify } from "util";

// Force dynamic rendering
export const dynamic = "force-dynamic";

const execAsync = promisify(exec);

export async function POST(_request: NextRequest) {
  try {
    // Require admin role
    await requireRole("admin");

    // In production, check if CrunchyCone API key is configured
    if (process.env.NODE_ENV === "production") {
      const hasApiKey = !!(process.env.CRUNCHYCONE_API_KEY || process.env.CRUNCHYCONE_API_URL);
      return NextResponse.json({
        authenticated: hasApiKey,
        output: hasApiKey
          ? { success: true, message: "CrunchyCone API key configured" }
          : { success: false, message: "CrunchyCone API key not configured" },
      });
    }

    try {
      // Execute the CrunchyCone CLI auth check command with JSON output
      const { stdout } = await execAsync("npx --yes crunchycone-cli auth check -j", {
        timeout: 10000, // 10 second timeout
      });

      // Parse the JSON output
      const output = stdout.trim();
      try {
        const result = JSON.parse(output);
        const isAuthenticated = result.success === true;

        return NextResponse.json({
          authenticated: isAuthenticated,
          output: result,
        });
      } catch (_parseError) {
        console.error("Failed to parse JSON output:", _parseError);
        return NextResponse.json(
          {
            authenticated: false,
            error: "Invalid JSON response from CLI",
            output: output,
          },
          { status: 500 }
        );
      }
    } catch (error: unknown) {
      // Handle command execution errors
      const execError = error as { stdout?: string; stderr?: string };
      const output = execError.stdout?.trim() || execError.stderr?.trim() || "";

      // Try to parse JSON from error output
      try {
        const result = JSON.parse(output);
        const isAuthenticated = result.success === true;

        return NextResponse.json({
          authenticated: isAuthenticated,
          output: result,
        });
      } catch {
        // If JSON parsing fails, treat as general error
        // Error handled silently
        return NextResponse.json(
          {
            authenticated: false,
            error: "Failed to check authentication status",
            output: output,
          },
          { status: 500 }
        );
      }
    }
  } catch {
    // Error handled silently
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
