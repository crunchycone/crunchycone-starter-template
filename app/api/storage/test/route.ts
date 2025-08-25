import { NextResponse } from "next/server";

export async function GET() {
  console.log("[Storage Test] Route hit successfully");
  return NextResponse.json({ message: "Storage API is working" });
}
