import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

export function verifyToken(token: string): { userId: number; type: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: number;
      type: string;
    };
    return decoded;
  } catch {
    return null;
  }
}

export function generateToken(
  userId: number,
  type: "access" | "verification" | "reset" | "magic_link"
): string {
  const TOKEN_EXPIRY = {
    access: "7d",
    verification: "1d",
    reset: "1h",
    magic_link: "1d",
  };

  return jwt.sign(
    {
      userId,
      type,
    },
    JWT_SECRET,
    {
      expiresIn: TOKEN_EXPIRY[type],
    }
  );
}