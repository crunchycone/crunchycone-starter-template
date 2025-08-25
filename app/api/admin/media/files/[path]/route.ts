import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasRole } from "@/lib/auth/permissions";

// Try importing crunchycone-lib
let initializeStorageProvider: (() => void) | undefined;
let getStorageProvider:
  | (() => {
      fileExists: (path: string) => Promise<boolean>;
      setFileVisibility: (path: string, visibility: string) => Promise<void>;
      deleteFile: (path: string) => Promise<void>;
    })
  | undefined;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const storageModule = require("crunchycone-lib/services/storage");
  initializeStorageProvider = storageModule.initializeStorageProvider;
  getStorageProvider = storageModule.getStorageProvider;
} catch (importError) {
  console.error("[Storage] Failed to import crunchycone-lib:", importError);
}

export async function PATCH(_request: NextRequest, context: { params: Promise<{ path: string }> }) {
  try {
    const session = await auth();

    if (!session || !(await hasRole(session.user.id, "admin"))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if crunchycone-lib is available
    if (!initializeStorageProvider || !getStorageProvider) {
      return NextResponse.json(
        {
          error: "Storage provider not available",
        },
        { status: 500 }
      );
    }

    const params = await context.params;
    const filePath = decodeURIComponent(params.path);
    const body = await request.json();
    const { visibility } = body;

    if (!["public", "private"].includes(visibility)) {
      return NextResponse.json({ error: "Invalid visibility value" }, { status: 400 });
    }

    // Initialize storage provider if not already done
    try {
      initializeStorageProvider();
    } catch {
      // Provider might already be initialized
    }

    const provider = getStorageProvider()!;

    // Check if file exists
    const fileExists = await provider.fileExists(filePath);
    if (!fileExists) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Update file visibility using the storage provider
    try {
      await provider.setFileVisibility(filePath, visibility);

      return NextResponse.json({
        success: true,
        message: `File visibility changed to ${visibility}`,
      });
    } catch {
      // Error handled silently
      return NextResponse.json(
        {
          error: "Failed to update file visibility",
        },
        { status: 500 }
      );
    }
  } catch {
    // Error handled silently
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ path: string }> }
) {
  try {
    const session = await auth();

    if (!session || !(await hasRole(session.user.id, "admin"))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if crunchycone-lib is available
    if (!initializeStorageProvider || !getStorageProvider) {
      return NextResponse.json(
        {
          error: "Storage provider not available",
        },
        { status: 500 }
      );
    }

    const params = await context.params;
    const filePath = decodeURIComponent(params.path);

    // Initialize storage provider if not already done
    try {
      initializeStorageProvider();
    } catch {
      // Provider might already be initialized
    }

    const provider = getStorageProvider()!;

    // Check if file exists
    const fileExists = await provider.fileExists(filePath);
    if (!fileExists) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Delete the file using the storage provider
    try {
      await provider.deleteFile(filePath);

      return NextResponse.json({
        success: true,
        message: "File deleted successfully",
      });
    } catch {
      // Error handled silently
      return NextResponse.json(
        {
          error: "Failed to delete file",
        },
        { status: 500 }
      );
    }
  } catch {
    // Error handled silently
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
