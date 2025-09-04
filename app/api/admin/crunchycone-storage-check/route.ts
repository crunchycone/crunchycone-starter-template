import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/permissions";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";

// Force dynamic rendering
export const dynamic = "force-dynamic";

const execAsync = promisify(exec);

interface CrunchyConeProject {
  project_id: string;
  [key: string]: unknown;
}

export async function POST(_request: NextRequest) {
  try {
    // Require admin role
    await requireRole("admin");

    const result = {
      authenticated: false,
      hasProject: false,
      authDetails: null as Record<string, unknown> | null,
      projectDetails: null as CrunchyConeProject | null,
      error: null as string | null,
    };

    // In production, check if CrunchyCone API key is configured
    if (process.env.NODE_ENV === "production") {
      const hasApiKey = !!(process.env.CRUNCHYCONE_API_KEY || process.env.CRUNCHYCONE_API_URL);
      result.authenticated = hasApiKey;
      result.authDetails = hasApiKey
        ? { success: true, message: "CrunchyCone API key configured" }
        : { success: false, message: "CrunchyCone API key not configured" };
    } else {
      // Check authentication status in development
      try {
        const { stdout } = await execAsync("npx --yes crunchycone-cli auth check -j", {
          timeout: 10000, // 10 second timeout
        });

        const output = stdout.trim();
        try {
          const authResult = JSON.parse(output);
          result.authenticated = authResult.success === true;
          result.authDetails = authResult;
        } catch {
          result.error = "Invalid JSON response from auth CLI";
          result.authDetails = { success: false, message: output };
        }
      } catch (error: unknown) {
        const execError = error as { stdout?: string; stderr?: string };
        const output = execError.stdout?.trim() || execError.stderr?.trim() || "";

        try {
          const authResult = JSON.parse(output);
          result.authenticated = authResult.success === true;
          result.authDetails = authResult;
        } catch {
          result.error = "Failed to check authentication status";
          result.authDetails = { success: false, message: output || "Command execution failed" };
        }
      }
    }

    // Check for crunchycone.toml project configuration
    try {
      const tomlPath = path.join(process.cwd(), "crunchycone.toml");

      if (fs.existsSync(tomlPath)) {
        const tomlContent = fs.readFileSync(tomlPath, "utf-8");

        // Parse TOML for project_id (simple parsing)
        const projectIdMatch = tomlContent.match(/^project_id\s*=\s*['"](.*?)['"]$/m);
        if (projectIdMatch) {
          result.hasProject = true;
          result.projectDetails = {
            project_id: projectIdMatch[1],
            configFile: "crunchycone.toml",
          };
        } else {
          result.hasProject = false;
          result.projectDetails = null;
        }
      } else {
        result.hasProject = false;
        result.projectDetails = null;
      }
    } catch {
      result.hasProject = false;
      result.projectDetails = null;
      if (!result.error) {
        result.error = "Failed to check project configuration";
      }
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
