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

export async function createSession(userId: number): Promise<string> {
  const token = generateToken(userId, "access");
  const cookieStore = await cookies();
  
  cookieStore.set("auth-token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });
  
  return token;
}

export async function getSession(token?: string): Promise<{ userId: number } | null> {
  if (!token) {
    const cookieStore = await cookies();
    token = cookieStore.get("auth-token")?.value;
  }
  
  if (!token) {
    return null;
  }
  
  const decoded = verifyToken(token);
  if (!decoded || decoded.type !== "access") {
    return null;
  }
  
  return { userId: decoded.userId };
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete("auth-token");
}