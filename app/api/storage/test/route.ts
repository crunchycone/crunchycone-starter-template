import { NextResponse } from "next/server";
import { initializeStorageProvider, getStorageProvider } from "crunchycone-lib/services/storage";
import { requireRole } from "@/lib/auth/permissions";

// Force dynamic rendering
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Require admin role
    await requireRole("admin");
  } catch (error) {
    // Auth errors should return 401
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    // Initialize storage provider if not already done
    try {
      initializeStorageProvider();
    } catch {
      // Provider might already be initialized
    }

    const provider = getStorageProvider();

    // Test connection using isAvailable
    const isAvailable = await provider.isAvailable();

    const providerType = process.env.CRUNCHYCONE_STORAGE_PROVIDER || "LocalStorage";

    return NextResponse.json({
      success: isAvailable,
      provider: providerType,
      message: isAvailable ? "Connection successful" : "Connection failed",
      details: {
        writeable: isAvailable,
        readable: isAvailable,
      },
    });
  } catch (error) {
    console.error("Storage test error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
