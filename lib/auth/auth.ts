import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { generateToken, verifyToken } from "./token";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Re-export token functions for backward compatibility
export { generateToken, verifyToken };

export async function createSession(userId: string): Promise<string> {
  if (process.env.NODE_ENV === "development") {
    console.log("[Auth] Creating session for user:", userId);
  }

  const token = generateToken(userId, "access");
  const cookieStore = await cookies();

  cookieStore.set("auth-token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });

  if (process.env.NODE_ENV === "development") {
    console.log("[Auth] Session created successfully");
  }

  return token;
}

export async function getSession(token?: string): Promise<{ userId: string } | null> {
  if (!token) {
    try {
      const cookieStore = await cookies();
      token = cookieStore.get("auth-token")?.value;

      if (process.env.NODE_ENV === "development") {
        console.log("[Auth] Getting session from cookie:", token ? "token found" : "no token");
      }
    } catch {
      if (process.env.NODE_ENV === "development") {
        console.log("[Auth] Error accessing cookies");
      }
      return null;
    }
  }

  if (!token) {
    if (process.env.NODE_ENV === "development") {
      console.log("[Auth] No session token found");
    }
    return null;
  }

  const decoded = verifyToken(token);
  if (!decoded || decoded.type !== "access") {
    if (process.env.NODE_ENV === "development") {
      console.log("[Auth] Invalid session token:", decoded ? "wrong type" : "decode failed");
    }

    // Note: Cannot delete cookies in Server Components
    // Invalid tokens will be ignored and treated as no session

    return null;
  }

  if (process.env.NODE_ENV === "development") {
    console.log("[Auth] Valid session found for user:", decoded.userId);
  }

  return { userId: decoded.userId };
}

export async function clearSession(): Promise<void> {
  if (process.env.NODE_ENV === "development") {
    console.log("[Auth] Clearing session");
  }

  const cookieStore = await cookies();
  cookieStore.delete("auth-token");

  if (process.env.NODE_ENV === "development") {
    console.log("[Auth] Session cleared");
  }
}
