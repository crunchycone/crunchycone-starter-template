import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

export function verifyToken(token: string): { userId: string; type: string } | null {
  try {
    if (!token) {
      console.error("[Token] No token provided to verifyToken");
      return null;
    }

    if (!JWT_SECRET || JWT_SECRET === "your-secret-key-change-in-production") {
      console.error("[Token] JWT_SECRET not properly configured");
      return null;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      type: string;
    };

    if (process.env.NODE_ENV === "development") {
      console.log("[Token] Token verified successfully:", {
        userId: decoded.userId,
        type: decoded.type,
      });
    }

    return decoded;
  } catch (error) {
    const err = error as { name?: string; message?: string };
    if (err.name === "JsonWebTokenError" && err.message === "invalid signature") {
      if (process.env.NODE_ENV === "development") {
        console.log("[Token] Invalid JWT signature - token was signed with a different secret");
      }
    } else if (err.name === "TokenExpiredError") {
      if (process.env.NODE_ENV === "development") {
        console.log("[Token] JWT token has expired");
      }
    } else if (process.env.NODE_ENV === "development") {
      console.error("[Token] Token verification failed:");
    }
    return null;
  }
}

export function generateToken(
  userId: string,
  type: "access" | "verification" | "reset" | "magic_link"
): string {
  const TOKEN_EXPIRY = {
    access: "7d",
    verification: "1d",
    reset: "1h",
    magic_link: "1d",
  };

  if (!userId) {
    throw new Error("[Token] Cannot generate token without userId");
  }

  if (!JWT_SECRET || JWT_SECRET === "your-secret-key-change-in-production") {
    throw new Error("[Token] JWT_SECRET not properly configured for token generation");
  }

  const token = jwt.sign(
    {
      userId,
      type,
    } as object,
    JWT_SECRET as string,
    {
      expiresIn: TOKEN_EXPIRY[type],
    } as jwt.SignOptions
  );

  if (process.env.NODE_ENV === "development") {
    console.log("[Token] Token generated:", {
      userId,
      type,
      expiresIn: TOKEN_EXPIRY[type],
    });
  }

  return token;
}
