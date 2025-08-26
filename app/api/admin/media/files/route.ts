import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasRole } from "@/lib/auth/permissions";
import { initializeStorageProvider, getStorageProvider } from "crunchycone-lib/services/storage";

interface FileInfo {
  name: string;
  path: string;
  size: number;
  lastModified: string;
  contentType: string;
  visibility: "public" | "private";
  url?: string;
}

export async function GET(_request: NextRequest) {
  try {
    const session = await auth();

    if (!session || !(await hasRole(session.user.id, "admin"))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Initialize storage provider if not already done
    try {
      initializeStorageProvider();
    } catch {
      // Provider might already be initialized
    }

    const provider = getStorageProvider();

    // List all files using the storage provider
    try {
      const listResult = await provider.listFiles();
      console.log("[Media Files] List result:", {
        filesCount: listResult.files.length,
        hasMore: listResult.hasMore,
      });

      const files: FileInfo[] = [];

      for (const fileItem of listResult.files) {
        // Get file visibility
        const visibilityInfo = await provider.getFileVisibility(fileItem.key);

        // Extract file name from the key (path)
        const fileName = fileItem.key.split("/").pop() || fileItem.key;

        const fileInfo: FileInfo = {
          name: fileName,
          path: fileItem.key,
          size: fileItem.size,
          lastModified: fileItem.lastModified
            ? fileItem.lastModified.toISOString()
            : new Date().toISOString(),
          contentType: fileItem.contentType,
          visibility: visibilityInfo.visibility === "public" ? "public" : "private",
        };

        // Add URL for public files
        if (visibilityInfo.publicUrl) {
          fileInfo.url = visibilityInfo.publicUrl;
        }

        files.push(fileInfo);
      }

      // Sort files by last modified (newest first)
      files.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());

      return NextResponse.json({ files });
    } catch (error) {
      // Error handled silently
      console.error("[Media Files] Error details:", {
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
      return NextResponse.json(
        {
          error: "Failed to list files",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 }
      );
    }
  } catch {
    // Error handled silently
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
