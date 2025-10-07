import { NextRequest, NextResponse } from "next/server";
import { initializeStorageProvider, getStorageProvider } from "crunchycone-lib/services/storage";
import { requireRole } from "@/lib/auth/permissions";
import { lookup } from "mime-types";

// Force dynamic rendering
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ segments: string[] }> }
) {
  try {
    // Await params
    const params = await context.params;
    const filePath = params.segments.join("/");

    // Validate file path
    if (!filePath || filePath.includes("..")) {
      return NextResponse.json({ error: "Invalid file path" }, { status: 400 });
    }

    // Check if this is a private file
    const isPrivate = filePath.startsWith("private/");

    // Require authentication for private files
    if (isPrivate) {
      try {
        await requireRole("user");
      } catch (error) {
        return NextResponse.json(
          { error: error instanceof Error ? error.message : "Unauthorized" },
          { status: 401 }
        );
      }
    }

    // Initialize storage provider if not already done
    try {
      initializeStorageProvider();
    } catch {
      // Provider might already be initialized
    }

    const provider = getStorageProvider();

    // Get file stream
    const fileResult = await provider.getFileStream?.(filePath);

    if (!fileResult || !fileResult.stream) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Determine content type
    const contentType = fileResult.contentType || lookup(filePath) || "application/octet-stream";

    // Convert ReadableStream to Response
    return new Response(fileResult.stream as ReadableStream, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
        ...(fileResult.contentLength && { "Content-Length": String(fileResult.contentLength) }),
      },
    });
  } catch (error) {
    console.error("Storage file error:", error);

    // Check for specific error types
    if (error instanceof Error) {
      if (error.message.includes("not found") || error.message.includes("404")) {
        return NextResponse.json({ error: "File not found" }, { status: 404 });
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
