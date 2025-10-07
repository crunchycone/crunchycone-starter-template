import { getUserRoles } from "@/lib/auth/utils/role-management";
import type { JWT } from "next-auth/jwt";
import type { User, Account } from "next-auth";

export async function jwtCallback({
  token,
  user,
  account,
}: {
  token: JWT;
  user?: User;
  account?: Account | null;
}) {
  // Include roles in JWT token
  if (user) {
    console.log("JWT callback - user:", { id: user.id, email: user.email, name: user.name });

    // For OAuth and email provider users, we need to fetch roles from database
    if (
      account?.provider === "google" ||
      account?.provider === "github" ||
      account?.provider === "email"
    ) {
      try {
        const roles = await getUserRoles(user.id);
        token.roles = roles;
        console.log(`Fetched roles for ${account.provider} user:`, roles);
      } catch (error) {
        console.error("Error fetching user roles:", error);
        token.roles = [];
      }
    } else {
      token.roles = (user as { roles?: string[] }).roles || [];
    }

    token.id = user.id;
    console.log("JWT token created with roles:", token.roles);
  }
  return token;
}
