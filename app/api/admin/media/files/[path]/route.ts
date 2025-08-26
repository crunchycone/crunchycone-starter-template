import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasRole } from "@/lib/auth/permissions";
import { initializeStorageProvider, getStorageProvider } from "crunchycone-lib/services/storage";

export async function PATCH(request: NextRequest, context: { params: Promise<{ path: string }> }) {
  try {
    const session = await auth();

    if (!session || !(await hasRole(session.user.id, "admin"))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    const provider = getStorageProvider();

    // Check if file exists
    const fileExists = await provider.fileExists(filePath);
    if (!fileExists) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Update file visibility using the storage provider
    try {
      console.log(`[Visibility] Setting ${filePath} to ${visibility}`);
      const result = await provider.setFileVisibility(filePath, visibility);
      console.log(`[Visibility] Result:`, result);
      
      // Check the actual visibility after the change
      const actualVisibility = await provider.getFileVisibility(filePath);
      console.log(`[Visibility] Actual visibility after change:`, actualVisibility);

      return NextResponse.json({
        success: true,
        message: `File visibility changed to ${visibility}`,
        result,
        actualVisibility,
      });
    } catch (error) {
      // Error handled silently
      console.error(`[Visibility] Error changing visibility:`, error);
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

    const params = await context.params;
    const filePath = decodeURIComponent(params.path);

    // Initialize storage provider if not already done
    try {
      initializeStorageProvider();
    } catch {
      // Provider might already be initialized
    }

    const provider = getStorageProvider();

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
