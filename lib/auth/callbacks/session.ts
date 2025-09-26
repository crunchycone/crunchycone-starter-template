import type { Session } from "next-auth";
import type { JWT } from "next-auth/jwt";

export async function sessionCallback({ session, token }: { session: Session; token: JWT }) {
  // Include roles and user ID in session
  if (token) {
    session.user.id = token.id as string;
    session.user.roles = token.roles as string[];
  }
  return session;
}
