"use server";

import { clearSession } from "@/lib/auth/auth";
import { redirect } from "next/navigation";

/**
 * Server action to clear invalid session and redirect to home
 * Use this when you need to clear an invalid token
 */
export async function clearInvalidSessionAction() {
  await clearSession();
  redirect("/");
}

/**
 * Server action to sign out
 */
export async function signOutAction() {
  await clearSession();
  redirect("/auth/signin");
}
